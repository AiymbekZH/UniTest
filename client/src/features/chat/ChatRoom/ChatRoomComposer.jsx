import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, FileText, Image as ImageIcon, Paperclip, Send, Sticker as StickerIcon, X } from 'lucide-react';
import VoiceRecorder from '../../../components/chat/VoiceRecorder';
import StickerPicker from '../../stickers/StickerPicker';
// Phase 4b-A: @mention autocomplete. Only relevant when the chat is
// a group (members prop populated); the dropdown is silently skipped
// otherwise so DMs stay simple.
import MentionAutocomplete, { filterMembers } from '../mentions/MentionAutocomplete';

/**
 * Composer for the new chat shell. Wraps:
 *   - growing textarea with send-on-Enter
 *   - file picker (single file at a time for now; multi/album = Phase 4)
 *   - inline VoiceRecorder (already has preview-then-send from Phase 0)
 *   - reply preview banner with cancel
 *   - edit mode (when `editingMessage` is non-null) — submit calls
 *     `onEdit(text)` instead of `onSend`
 *
 * onSend / onEdit return false on hard pre-flight failures so the
 * composer keeps the user's text. Same contract as the legacy
 * ChatInput so we inherit the Phase 0 fixes.
 */
function classifyAttachment(att) {
  if (att.mimetype?.startsWith('image/')) return 'image';
  if (att.mimetype?.startsWith('video/')) return 'video';
  if (att.mimetype?.startsWith('audio/')) return 'audio';
  return 'file';
}

export default function ChatRoomComposer({
  onSend,
  onEdit,
  onTypingPing,
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  disabled,
  placeholder = 'Сообщение...',
  // Group members for @mention autocomplete. Pass an empty array (or
  // undefined) to disable the feature — e.g. for DM chats.
  members = [],
}) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  // ── Mention autocomplete state (Phase 4b-A) ──
  // `mentionRange` holds the [start, end) caret indices spanning the
  // active `@token` being typed. null when not in mention mode.
  const [mentionRange, setMentionRange] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  // VoiceRecorder's current phase. When it's anything other than 'idle'
  // the composer gives the voice UI the whole row — otherwise textarea +
  // paperclip + send + recorder all compete for the same flex line and
  // on narrow mobile the row overflows the viewport, which then scrolls
  // the entire page sideways and makes messages above look "shifted".
  const [voicePhase, setVoicePhase] = useState('idle');
  // Whether the sticker picker bottom-sheet is open. Held in composer
  // state (not a parent prop) because no other component needs to know.
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const fileRef = useRef(null);
  const textRef = useRef(null);
  const voiceActive = voicePhase === 'recording' || voicePhase === 'preview';

  // When entering edit mode, prefill text with the message being edited.
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || '');
      setAttachments([]);
      // Defer focus so React commits the value first.
      requestAnimationFrame(() => textRef.current?.focus());
    } else {
      setText('');
    }
  }, [editingMessage?._id]);

  // Auto-resize textarea up to a cap. Cleaner than relying on rows= alone.
  const autosize = () => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };
  useEffect(autosize, [text]);

  // ── Mention detection on text/caret change ──
  // The composer doesn't track caret position via state (it relies on
  // the native textarea cursor). Whenever the user types, we read the
  // current selectionStart and look LEFT until we either hit an `@`
  // (mention starts) or whitespace / start-of-input (no mention
  // here). This avoids needing a fully controlled caret API and works
  // identically with paste / cut / arrow-key edits.
  const detectMention = (value, caret) => {
    if (caret == null || caret < 1) return null;
    let start = caret - 1;
    while (start >= 0) {
      const ch = value[start];
      if (ch === '@') {
        // Anchor the mention only if the @ is at the start OR
        // preceded by whitespace — otherwise we'd trigger on
        // "[email protected]" mid-typing.
        const prev = start === 0 ? ' ' : value[start - 1];
        if (/\s/.test(prev)) {
          return { start, end: caret };
        }
        return null;
      }
      // Stop searching backwards on whitespace; the user typed past
      // the mention region and is no longer in mention mode.
      if (/\s/.test(ch)) return null;
      start--;
    }
    return null;
  };

  const onTextChange = (e) => {
    const value = e.target.value;
    setText(value);
    onTypingPing?.();
    if (members && members.length > 0) {
      const range = detectMention(value, e.target.selectionStart);
      setMentionRange(range);
      // Reset highlight to the first row whenever the query string
      // changes — stale indices into a smaller filtered list could
      // overshoot and select "nothing".
      setMentionIndex(0);
    }
  };

  // Refresh mention detection on caret moves that don't go through
  // onChange (arrow keys, mouse clicks).
  const onSelect = (e) => {
    if (!members || members.length === 0) return;
    const range = detectMention(e.target.value, e.target.selectionStart);
    setMentionRange(range);
  };

  // The query string is everything after the @ in the active range.
  const mentionQuery = useMemo(() => {
    if (!mentionRange) return '';
    return text.slice(mentionRange.start + 1, mentionRange.end);
  }, [text, mentionRange]);

  const mentionMatches = useMemo(
    () => (mentionRange ? filterMembers(members, mentionQuery) : []),
    [members, mentionQuery, mentionRange]
  );

  // Insert `@username ` over the current mention range.
  const applyMention = (user) => {
    if (!mentionRange || !user?.username) return;
    const before = text.slice(0, mentionRange.start);
    const after = text.slice(mentionRange.end);
    // Trailing space lets the user keep typing immediately and also
    // matches the regex word-boundary contract on the server.
    const insertion = `@${user.username} `;
    const newText = before + insertion + after;
    setText(newText);
    setMentionRange(null);
    setMentionIndex(0);
    // Re-focus + place caret right after the inserted token.
    requestAnimationFrame(() => {
      const el = textRef.current;
      if (!el) return;
      el.focus();
      const pos = before.length + insertion.length;
      try { el.setSelectionRange(pos, pos); } catch (_) { /* noop */ }
    });
  };

  const submit = () => {
    const trimmed = text.trim();
    if (editingMessage) {
      if (!trimmed) return;
      const result = onEdit?.(editingMessage, trimmed);
      if (result === false) return;
      setText('');
      onCancelEdit?.();
      return;
    }
    if (!trimmed && attachments.length === 0) return;

    if (attachments.length === 0) {
      // Plain text path — unchanged.
      const result = onSend({ text: trimmed, type: 'text', replyTo: replyTo?._id });
      if (result === false) return;
      setText('');
      onCancelReply?.();
      return;
    }

    // Album / single-attachment path. We send ONE message per
    // attachment because socket.io's maxHttpBufferSize (5 MB) caps
    // total packet size and 10 photos can blow past that. Sending
    // serially keeps each below the limit and lets the optimistic
    // store interleave the bubbles in the order they were issued.
    //
    // Caption rules:
    //   - The text caption (if any) goes ONLY on the first
    //     attachment, matching Telegram's album convention. Repeat
    //     captions on every bubble would be noise.
    //   - replyTo is duplicated on every message so any of the
    //     batch shows the reply context if scrolled to.
    let hadFailure = false;
    attachments.forEach((att, idx) => {
      const result = onSend({
        text: idx === 0 ? trimmed : '',
        type: classifyAttachment(att),
        attachments: [att],
        replyTo: replyTo?._id,
      });
      if (result === false) hadFailure = true;
    });
    if (hadFailure) return;

    setText('');
    setAttachments([]);
    onCancelReply?.();
  };

  const onKey = (e) => {
    // Mention dropdown takes priority over send/escape when active so
    // arrow keys / Enter pick a member instead of moving the caret.
    if (mentionRange && mentionMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(i => (i + 1) % mentionMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(i => (i - 1 + mentionMatches.length) % mentionMatches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyMention(mentionMatches[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionRange(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      if (editingMessage) onCancelEdit?.();
      else if (replyTo) onCancelReply?.();
    }
  };

  // ── File / album helpers (Phase 4b-C) ──
  // The composer used to accept a single attachment. We now accept up
  // to MAX_ALBUM_FILES at once so users can pick or drop a batch. The
  // SEND path iterates and emits one message per attachment because
  // bumping the socket.io maxHttpBufferSize (5 MB) to fit a 25 MB
  // album in one packet is more disruption than its worth.
  const MAX_FILE_BYTES = 7 * 1024 * 1024;
  const MAX_ALBUM_FILES = 10;

  const readFileToAttachment = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      data: reader.result,
      mimetype: file.type,
      filename: file.name,
      size: file.size,
      preview: file.type.startsWith('image/') || file.type.startsWith('video/') ? reader.result : null,
    });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Append (or replace) attachments from a FileList / array of File.
  // We dedupe + cap + size-check before showing them in the preview.
  const ingestFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    // Single-file case is just a special case of multi for code paths;
    // the album UX (multiple thumbnails, grid preview) only kicks in
    // when >1.
    const accepted = [];
    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) {
        alert(`Файл «${f.name}» слишком большой (лимит ~5 МБ).`);
        continue;
      }
      accepted.push(f);
      if (accepted.length + attachments.length >= MAX_ALBUM_FILES) break;
    }
    if (accepted.length === 0) return;

    try {
      const additions = await Promise.all(accepted.map(readFileToAttachment));
      setAttachments(prev => [...prev, ...additions].slice(0, MAX_ALBUM_FILES));
    } catch (err) {
      alert('Не удалось прочитать файлы.');
    }
  };

  const onFile = (e) => {
    ingestFiles(e.target.files);
    e.target.value = '';
  };

  // Drag & drop on the composer surface. We keep it simple — any drop
  // anywhere on the row triggers ingest. The dragOver visual feedback
  // is handled via state below.
  const [isDragging, setIsDragging] = useState(false);
  const onDragEnter = (e) => {
    if (disabled) return;
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      setIsDragging(true);
    }
  };
  const onDragOver = (e) => {
    if (disabled) return;
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };
  const onDragLeave = (e) => {
    // Only flip back when leaving the composer subtree (currentTarget).
    if (e.currentTarget === e.target) setIsDragging(false);
  };
  const onDrop = (e) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files?.length) ingestFiles(files);
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const onVoice = (voiceData) => {
    const result = onSend?.({
      text: '',
      type: 'audio',
      attachments: [voiceData],
      replyTo: replyTo?._id,
    });
    if (result === false) return;
    onCancelReply?.();
  };

  // Sticker pick: send as a one-attachment 'sticker' message. The bubble's
  // sticker-rendering branch unwraps `attachments[0].data` directly, so
  // the schema lines up with everything else; only the discriminator
  // (`type`) differs from a regular image upload.
  const onStickerPick = (sticker) => {
    if (!sticker?.image) return;
    setStickerPickerOpen(false);
    const result = onSend?.({
      text: '',
      type: 'sticker',
      attachments: [{
        data: sticker.image,
        mimetype: sticker.mimetype || 'image/webp',
        filename: `sticker_${sticker._id}.${(sticker.mimetype || 'image/webp').split('/')[1] || 'webp'}`,
        size: 0,
      }],
      replyTo: replyTo?._id,
    });
    if (result === false) return;
    onCancelReply?.();
  };

  const canSubmit = !disabled && (text.trim() || attachments.length > 0 || editingMessage);
  const isEdit = Boolean(editingMessage);

  return (
    <div
      className={`relative flex-shrink-0 border-t-2 bg-white px-3 py-2.5 transition dark:bg-slate-800 sm:px-4 sm:py-3 ${
        isDragging
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-slate-200 dark:border-slate-700'
      }`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag-overlay: shows up over the composer when files are
          being dragged in. pointer-events-none so it doesn't block
          the underlying drop handlers. */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary-500 bg-primary-50/90 text-xs font-black text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
          Отпустите файлы для отправки
        </div>
      )}
      {/* Reply banner */}
      {replyTo && !isEdit && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border-2 border-primary-400 bg-primary-50/50 px-3 py-2 text-xs dark:border-primary-500 dark:bg-primary-900/15">
          <div className="min-w-0 flex-1 truncate">
            <span className="font-bold text-primary-600 dark:text-primary-300">
              Ответ {replyTo.sender?.firstName || ''}
            </span>
            <span className="ml-2 text-slate-500 dark:text-slate-400">
              {replyTo.text?.slice(0, 80) || '(вложение)'}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            aria-label="Отменить"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Edit banner */}
      {isEdit && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs dark:border-amber-500 dark:bg-amber-900/15">
          <span className="font-bold text-amber-700 dark:text-amber-200">Редактирование</span>
          <span className="ml-2 truncate text-slate-500 dark:text-slate-400">
            {editingMessage.text?.slice(0, 80)}
          </span>
          <button
            type="button"
            onClick={onCancelEdit}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            aria-label="Отменить редакт"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Attachment preview — single chip when 1 file, scrollable
          thumbnail strip when >1 (album mode). Each thumb has its own
          remove button so users can prune the batch. */}
      {attachments.length > 0 && !isEdit && (
        attachments.length === 1 ? (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-slate-100 px-2 py-2 dark:bg-slate-700/60">
            {attachments[0].preview ? (
              <img src={attachments[0].preview} alt="" className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-600">
                <FileText size={20} className="text-slate-500" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                {attachments[0].filename}
              </p>
              <p className="text-[10px] text-slate-500">{(attachments[0].size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={() => setAttachments([])}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-600"
              aria-label="Убрать"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="mb-2 rounded-xl bg-slate-100 p-2 dark:bg-slate-700/60">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-black text-slate-600 dark:text-slate-300">
                Альбом · {attachments.length} файлов
              </p>
              <button
                type="button"
                onClick={() => setAttachments([])}
                className="text-[10px] font-bold text-slate-500 hover:text-red-500 transition"
              >
                Очистить
              </button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative flex-shrink-0">
                  {att.preview ? (
                    <img src={att.preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg bg-slate-200 px-1 dark:bg-slate-600">
                      <FileText size={16} className="text-slate-500" />
                      <span className="truncate text-[8px] font-bold text-slate-500">{att.filename}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow dark:border-slate-700"
                    aria-label="Убрать"
                  >
                    <X size={9} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Action row.
          min-w-0 on the flex parent AND on children guarantees that
          intrinsic widths don't push the row past the viewport — the
          textarea correctly shrinks and VoiceRecorder's recording UI
          can claim full-width without dragging everything off-screen. */}
      <div className="flex min-w-0 items-end gap-2">
        {/* File picker + textarea + send: hidden while voice is active */}
        {!voiceActive && (
          <>
            {!isEdit && (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={disabled}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  aria-label="Прикрепить"
                >
                  <Paperclip size={18} strokeWidth={2.4} />
                </button>
                {/* Sticker shortcut. Hidden while there's draft text/file
                    so the input area stays clean during normal typing. */}
                {!text.trim() && attachments.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setStickerPickerOpen(v => !v)}
                    disabled={disabled}
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition disabled:opacity-50 ${
                      stickerPickerOpen
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-200'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                    }`}
                    aria-label="Стикеры"
                    title="Стикеры"
                  >
                    <StickerIcon size={18} strokeWidth={2.4} />
                  </button>
                )}
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt,.zip"
              onChange={onFile}
            />

            {/* Textarea + mention dropdown wrapper. The dropdown is
                position-absolute and the wrapper is position-relative
                so it floats directly above the input regardless of
                composer width on mobile. */}
            <div className="relative min-w-0 flex-1">
              <textarea
                ref={textRef}
                rows={1}
                value={text}
                onChange={onTextChange}
                onSelect={onSelect}
                onKeyDown={onKey}
                placeholder={isEdit ? 'Изменить сообщение...' : placeholder}
                disabled={disabled}
                className="min-h-[40px] w-full resize-none rounded-2xl border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <MentionAutocomplete
                open={Boolean(mentionRange) && mentionMatches.length > 0 && !isEdit}
                members={members}
                query={mentionQuery}
                selectedIndex={mentionIndex}
                onIndexChange={setMentionIndex}
                onSelect={applyMention}
              />
            </div>
          </>
        )}

        {/* Voice recorder. Mounted whenever the draft is empty and the
            composer isn't in edit mode so the button is always reachable;
            once the user starts recording, `voicePhase` becomes
            'recording' / 'preview' and we give this component the whole
            row by hiding siblings above. */}
        {!isEdit && !text.trim() && attachments.length === 0 && !disabled && (
          <VoiceRecorder
            onRecorded={onVoice}
            onCancel={() => {}}
            onPhaseChange={setVoicePhase}
          />
        )}

        {!voiceActive && (
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 transition active:translate-y-[2px] dark:border-white ${
              canSubmit ? 'bg-primary-500 text-white' : 'bg-slate-200 text-slate-400 dark:bg-slate-700'
            }`}
            style={canSubmit ? { boxShadow: '0 3px 0 #9a3412' } : undefined}
            aria-label={isEdit ? 'Сохранить' : 'Отправить'}
          >
            {isEdit ? <Check size={16} strokeWidth={2.8} /> : <Send size={15} strokeWidth={2.6} />}
          </button>
        )}
      </div>

      {/* Sticker picker — modal-style overlay rendered alongside the
          composer. Lives at this level (not in ChatLayout) so the close
          button + backdrop click can directly clear the open state. */}
      <StickerPicker
        open={stickerPickerOpen}
        onClose={() => setStickerPickerOpen(false)}
        onPick={onStickerPick}
      />
      {/* Closing tag of the outer composer wrapper. */}
    </div>
  );
}

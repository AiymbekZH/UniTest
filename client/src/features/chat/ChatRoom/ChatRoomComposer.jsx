import { useEffect, useRef, useState } from 'react';
import { Check, FileText, Image as ImageIcon, Paperclip, Send, X } from 'lucide-react';
import VoiceRecorder from '../../../components/chat/VoiceRecorder';

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
}) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const fileRef = useRef(null);
  const textRef = useRef(null);

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

    let result;
    if (attachments.length > 0) {
      const att = attachments[0];
      result = onSend({
        text: trimmed,
        type: classifyAttachment(att),
        attachments,
        replyTo: replyTo?._id,
      });
    } else {
      result = onSend({ text: trimmed, type: 'text', replyTo: replyTo?._id });
    }
    if (result === false) return;

    setText('');
    setAttachments([]);
    onCancelReply?.();
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      if (editingMessage) onCancelEdit?.();
      else if (replyTo) onCancelReply?.();
    }
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 7 * 1024 * 1024) {
      // Server cap is ~5MB raw / ~7MB base64; keep client cap aligned.
      alert('Файл слишком большой. Лимит ~5 МБ.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachments([{
        data: reader.result, // data: URL — bubble strips the prefix when needed
        mimetype: file.type,
        filename: file.name,
        size: file.size,
        preview: file.type.startsWith('image/') || file.type.startsWith('video/') ? reader.result : null,
      }]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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

  const canSubmit = !disabled && (text.trim() || attachments.length > 0 || editingMessage);
  const isEdit = Boolean(editingMessage);

  return (
    <div className="flex-shrink-0 border-t-2 border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800 sm:px-4 sm:py-3">
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

      {/* Attachment preview */}
      {attachments.length > 0 && !isEdit && (
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
      )}

      {/* Action row */}
      <div className="flex items-end gap-2">
        {!isEdit && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Прикрепить"
          >
            <Paperclip size={18} strokeWidth={2.4} />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt,.zip"
          onChange={onFile}
        />

        <textarea
          ref={textRef}
          rows={1}
          value={text}
          onChange={(e) => { setText(e.target.value); onTypingPing?.(); }}
          onKeyDown={onKey}
          placeholder={isEdit ? 'Изменить сообщение...' : placeholder}
          disabled={disabled}
          className="min-h-[40px] flex-1 resize-none rounded-2xl border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />

        {/* Voice recorder visible only when no draft text/attachment/edit */}
        {!isEdit && !text.trim() && attachments.length === 0 && !disabled && (
          <VoiceRecorder onRecorded={onVoice} onCancel={() => {}} />
        )}

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
      </div>
    </div>
  );
}

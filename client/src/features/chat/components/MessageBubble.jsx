import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, Check, CheckCheck, Clock, Copy, CornerUpLeft, Download, Edit3,
  FileText, Forward, MoreVertical, Pin, Reply, RotateCw, Smile, Trash2,
} from 'lucide-react';
import AudioPlayer from '../../../components/chat/AudioPlayer';
// Phase 4b-A: render @mentions as styled clickable spans inside the
// message text. Plain text passes through unchanged when no mentions
// were extracted server-side.
import MentionText from '../mentions/MentionText';
// Phase 4 album rendering: when ChatRoomMessages identifies a streak
// of consecutive image/video messages from the same sender, it
// renders only the leader bubble and passes `albumTiles` so the
// attachment block becomes a grid instead of stacked images.
import AlbumGrid from '../album/AlbumGrid';

/**
 * Phase 2 unified bubble. Lives in features/chat/ next to the new shell.
 * The legacy bubble at `components/chat/MessageBubble.jsx` keeps
 * rendering the legacy `/messages` and `/groups/:id` pages — Phase 5
 * will retire it.
 *
 * What's new vs. the legacy bubble:
 *   - `forwardedFrom` snapshot rendered as "Переслано от X" with a tap
 *     to navigate to the sender profile.
 *   - `editedAt` shows a small "(изм.)" tag.
 *   - Edit + Forward + Copy actions inside a single overflow menu so
 *     the toolbar isn't 9 buttons wide.
 *   - All Phase 0 status icons (sending / failed / retry) are kept.
 *
 * This bubble works for both DM and group messages — there is no
 * `kind` prop because the schema is identical at the rendering layer.
 * Group-only behavior (pin) is gated by `canPin`. DM-only behavior
 * (read receipts) is gated by `isReadByOther`.
 */
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
const NAME_PALETTE = [
  '#f97316', '#ea580c', '#fb923c', '#10b981', '#f59e0b', '#ef4444',
  '#84cc16', '#14b8a6', '#d97706', '#e11d48', '#a16207', '#b45309',
];

function nameColor(userId, roleColor) {
  if (roleColor && roleColor !== '#f97316') return roleColor;
  const hash = (userId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return NAME_PALETTE[hash % NAME_PALETTE.length];
}

function fmtTime(d) {
  return new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function attachmentSrc(att) {
  return att.data?.startsWith('data:') ? att.data : `data:${att.mimetype};base64,${att.data}`;
}

export default function MessageBubble({
  message,
  isOwn,
  roleColor,
  isReadByOther,
  isHighlighted,
  canPin,
  canEdit,
  canDeleteEveryone,
  // Phase 4b-A: needed to highlight @mentions of the viewer.
  currentUserId,
  // Phase 4 album rendering. When non-null, the bubble's attachment
  // block is replaced by an AlbumGrid showing every tile from the
  // streak (including ones whose underlying messages are NOT this
  // bubble). Each tile carries its own messageId so the carousel
  // can navigate correctly. The leader's own attachments are
  // already part of `albumTiles` — don't double-render.
  albumTiles,
  // callbacks
  onReply,
  onReact,
  onPin,
  onDelete,
  onEdit,
  onForward,
  onCopy,
  onPreviewMedia,
  onRetry,
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactPickerOpen, setReactPickerOpen] = useState(false);

  const sender = message.sender;
  const senderColor = useMemo(() => nameColor(sender?._id, roleColor), [sender?._id, roleColor]);
  const status = message.status; // 'sending' | 'failed' | undefined
  const isPending = status === 'sending' || status === 'failed';

  // ── Deleted / system ──
  if (message.isDeleted) {
    return (
      <div className={`mb-1 flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[70%] rounded-2xl bg-slate-100 px-4 py-2 text-xs italic text-slate-400 dark:bg-slate-700/50">
          Сообщение удалено
        </div>
      </div>
    );
  }
  if (message.type === 'system') {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-400 dark:bg-slate-700/50">
          {message.text}
        </span>
      </div>
    );
  }

  // ── Status icon for own messages ──
  function renderStatus() {
    if (!isOwn) return null;
    if (status === 'sending') {
      return <Clock size={12} className="text-orange-100/70 animate-pulse" strokeWidth={2.4} />;
    }
    if (status === 'failed') {
      return (
        <button
          type="button"
          onClick={() => onRetry?.(message)}
          className="inline-flex items-center gap-1 rounded-md bg-red-100/90 px-1.5 py-[2px] text-[10px] font-bold text-red-700 transition hover:bg-red-200 dark:bg-red-500/30 dark:text-red-50 dark:hover:bg-red-500/40"
          title="Не удалось — повторить"
        >
          <AlertCircle size={11} strokeWidth={2.6} />
          <RotateCw size={10} strokeWidth={2.6} />
        </button>
      );
    }
    return isReadByOther
      ? <CheckCheck size={12} className="text-orange-100" strokeWidth={2.6} />
      : <Check size={12} className="text-orange-100/80" strokeWidth={2.4} />;
  }

  return (
    <div
      data-msg-id={message._id}
      className={`group relative mb-2 flex transition-all duration-500 ${
        isOwn ? 'justify-end' : 'justify-start'
      } ${isHighlighted ? 'rounded-2xl ring-4 ring-amber-300 ring-offset-2 dark:ring-amber-500/60' : ''}`}
    >
      {!isOwn && (
        <button
          type="button"
          onClick={() => sender?._id && navigate(`/profile/${sender._id}`)}
          className="mr-2 mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-bold text-slate-500 transition hover:scale-[1.03] dark:bg-slate-600 dark:text-slate-300"
        >
          {sender?.avatar
            ? <img src={sender.avatar} alt="" className="h-full w-full object-cover" />
            : (sender?.firstName?.[0] || '?').toUpperCase()}
        </button>
      )}

      <div className={`min-w-[120px] max-w-[75%] ${isOwn ? 'order-1' : ''}`}>
        {/* ── Forwarded-from banner ── */}
        {message.forwardedFrom?.senderName && (
          <div className={`mb-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-300 ${
            isOwn ? 'self-end' : ''
          }`}>
            <CornerUpLeft size={10} strokeWidth={2.6} />
            <span className="truncate">Переслано от {message.forwardedFrom.senderName}</span>
          </div>
        )}

        {/* ── Reply target preview ── */}
        {message.replyTo && !message.replyTo.isDeleted && (
          <div className={`mb-1 truncate border-l-2 pl-3 text-[11px] ${
            isOwn ? 'border-primary-200 text-orange-100' : 'border-slate-300 text-slate-500 dark:border-slate-500 dark:text-slate-400'
          }`}>
            <span className="font-medium">{message.replyTo.sender?.firstName || '...'}</span>
            : {message.replyTo.text?.slice(0, 60) || '(вложение)'}
          </div>
        )}

        {/* ── Bubble body ── */}
        <div className={`relative rounded-2xl px-4 py-2.5 ${
          isOwn
            ? 'rounded-br-md bg-primary-500 text-white'
            : 'rounded-bl-md bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
        }`}>
          {!isOwn && (
            <button
              type="button"
              onClick={() => sender?._id && navigate(`/profile/${sender._id}`)}
              className="mb-0.5 text-[11px] font-semibold transition hover:opacity-80"
              style={{ color: senderColor }}
            >
              {sender?.firstName} {sender?.lastName}
            </button>
          )}

          {message.text && (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              <MentionText
                text={message.text}
                mentions={message.mentions}
                currentUserId={currentUserId}
              />
            </p>
          )}

          {/* ── Stickers ── */}
          {message.type === 'sticker' && message.attachments?.[0] && (
            <img
              src={attachmentSrc(message.attachments[0])}
              alt="sticker"
              className="mt-1 max-h-[180px] max-w-[180px] object-contain"
              draggable={false}
            />
          )}

          {/* ── Album grid (Phase 4) ── */}
          {/* When this bubble is the leader of an image/video streak,
              we render the WHOLE streak's attachments in a single grid
              instead of stacking the leader's own attachments. The
              other streak messages are skipped at the parent level. */}
          {Array.isArray(albumTiles) && albumTiles.length > 1 && message.type !== 'sticker' && (
            <AlbumGrid
              tiles={albumTiles}
              onPreviewMedia={onPreviewMedia}
              isOwn={isOwn}
            />
          )}

          {/* ── Other attachments (image/video/audio/file) ── */}
          {/* Skip the legacy stacked render when an album grid is
              already showing the attachments. */}
          {!Array.isArray(albumTiles) && message.type !== 'sticker' && message.attachments?.map((att, idx) => {
            const src = attachmentSrc(att);
            const isImg = att.mimetype?.startsWith('image/');
            const isVid = att.mimetype?.startsWith('video/');
            const isAud = att.mimetype?.startsWith('audio/');
            const isPdf = att.mimetype === 'application/pdf';
            return (
              <div key={idx} className="mt-2">
                {isImg && (
                  <button
                    type="button"
                    onClick={() => onPreviewMedia?.({ kind: 'image', attachment: att })}
                    className="block overflow-hidden rounded-xl"
                  >
                    <img src={src} alt={att.filename} className="max-h-[300px] max-w-full rounded-xl object-contain transition hover:opacity-95" />
                  </button>
                )}
                {isVid && (
                  <button
                    type="button"
                    onClick={() => onPreviewMedia?.({ kind: 'video', attachment: att })}
                    className="block w-full overflow-hidden rounded-xl"
                  >
                    <video src={src} className="max-h-[300px] w-full rounded-xl bg-black object-contain" muted playsInline />
                  </button>
                )}
                {isAud && (
                  <AudioPlayer
                    data={att.data}
                    mimetype={att.mimetype}
                    filename={att.filename}
                    tone={isOwn ? 'own' : 'other'}
                  />
                )}
                {(isPdf || (!isImg && !isVid && !isAud)) && (
                  <a
                    href={src}
                    download={att.filename}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition ${
                      isOwn
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500'
                    }`}
                  >
                    <FileText size={14} />
                    {att.filename || 'Файл'}
                    <Download size={12} />
                  </a>
                )}
              </div>
            );
          })}

          <div className={`mt-1 flex items-center gap-1.5 ${isOwn ? 'justify-end' : ''}`}>
            {message.isPinned && <Pin size={10} className={isOwn ? 'text-orange-100' : 'text-amber-500'} />}
            {message.isEdited && (
              <span className={`text-[10px] italic ${isOwn ? 'text-orange-100/80' : 'text-slate-400'}`}>
                изм.
              </span>
            )}
            <span className={`text-[10px] ${isOwn ? 'text-orange-100' : 'text-slate-400'}`}>
              {fmtTime(message.createdAt)}
            </span>
            {renderStatus()}
          </div>
        </div>

        {/* ── Reactions row ── */}
        {Array.isArray(message.reactions) && message.reactions.length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : ''}`}>
            {message.reactions.map((r) => {
              const count = r.users?.length || 0;
              if (count === 0) return null;
              return (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => onReact?.(message, r.emoji)}
                  className="inline-flex items-center gap-1 rounded-full border-2 border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <span className="text-sm leading-none">{r.emoji}</span>
                  <span>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Quick actions row (hover/long-press) ── */}
        <div className={`relative mt-1 flex items-center gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 ${
          isOwn ? 'justify-end' : ''
        } ${isPending ? 'pointer-events-none opacity-0' : ''}`}>
          {onReact && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setReactPickerOpen(v => !v)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-500 transition hover:border-amber-300 hover:text-amber-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-amber-400"
                title="Реакция"
              >
                <Smile size={12} strokeWidth={2.4} />
              </button>
              {reactPickerOpen && (
                <div
                  className={`absolute z-30 mb-1 flex gap-0.5 rounded-full border-2 border-slate-900 bg-white p-1 dark:border-white dark:bg-slate-800 ${
                    isOwn ? 'right-0 bottom-full' : 'left-0 bottom-full'
                  }`}
                  style={{ boxShadow: '0 3px 0 #0f172a' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {QUICK_REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { onReact(message, emoji); setReactPickerOpen(false); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-base transition hover:scale-125 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {onReply && (
            <button
              type="button"
              onClick={() => onReply(message)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              title="Ответить"
            >
              <Reply size={12} strokeWidth={2.4} />
            </button>
          )}

          {canPin && onPin && (
            <button
              type="button"
              onClick={() => onPin(message)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-500 transition hover:border-amber-300 hover:text-amber-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-amber-400"
              title={message.isPinned ? 'Открепить' : 'Закрепить'}
            >
              <Pin size={12} strokeWidth={2.4} />
            </button>
          )}

          {/* Overflow menu hosts edit/forward/copy/delete to keep toolbar slim */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              title="Ещё"
            >
              <MoreVertical size={12} strokeWidth={2.4} />
            </button>
            {menuOpen && (
              <div
                className={`absolute z-20 mt-1.5 min-w-[170px] rounded-2xl border-2 border-slate-900 bg-white p-1.5 dark:border-white dark:bg-slate-800 ${
                  isOwn ? 'right-0' : 'left-0'
                }`}
                style={{ boxShadow: '0 4px 0 #0f172a' }}
                onClick={(e) => e.stopPropagation()}
              >
                {canEdit && message.type === 'text' && onEdit && (
                  <button
                    type="button"
                    onClick={() => { onEdit(message); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Edit3 size={13} /> Редактировать
                  </button>
                )}
                {onForward && (
                  <button
                    type="button"
                    onClick={() => { onForward(message); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Forward size={13} /> Переслать
                  </button>
                )}
                {onCopy && message.text && (
                  <button
                    type="button"
                    onClick={() => { onCopy(message); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Copy size={13} /> Скопировать
                  </button>
                )}
                {onDelete && (
                  <>
                    <button
                      type="button"
                      onClick={() => { onDelete(message, 'self'); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Trash2 size={13} /> Удалить у себя
                    </button>
                    {(isOwn || canDeleteEveryone) && (
                      <button
                        type="button"
                        onClick={() => { onDelete(message, 'everyone'); setMenuOpen(false); }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-black text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={13} /> Удалить у всех
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

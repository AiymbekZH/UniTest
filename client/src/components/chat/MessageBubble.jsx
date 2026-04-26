import { useMemo, useState } from 'react';
import AudioPlayer from './AudioPlayer';
import { Check, CheckCheck, Download, FileText, Pin, Reply, Smile, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const CHAT_COLORS = [
  '#f97316', '#ea580c', '#fb923c', '#10b981', '#f59e0b', '#ef4444',
  '#84cc16', '#14b8a6', '#d97706', '#e11d48', '#a16207', '#b45309',
];

function getUserColor(userId, roleColor) {
  if (roleColor && roleColor !== '#f97316') return roleColor;
  const hash = (userId || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CHAT_COLORS[hash % CHAT_COLORS.length];
}

function timeStr(date) {
  return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function getAttachmentSrc(attachment) {
  return attachment.data?.startsWith('data:')
    ? attachment.data
    : `data:${attachment.mimetype};base64,${attachment.data}`;
}

export default function MessageBubble({
  message,
  isOwn,
  onReply,
  onDelete,
  onPin,
  deleteOptions,
  canPin,
  roleColor,
  onPreviewMedia,
  isReadByOther,
  onReact,
  isHighlighted,
}) {
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const [inviteState, setInviteState] = useState(message.meta?.duelStatus || '');
  const [inviteBusy, setInviteBusy] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;

  const sender = message.sender;
  const nameColor = useMemo(() => getUserColor(sender?._id, roleColor), [sender?._id, roleColor]);

  const handleArenaInvite = async (action) => {
    if (!message.meta?.roomId) return;

    if (action === 'join') {
      navigate(`/arena/code/${message.meta.joinCode}`);
      return;
    }

    setInviteBusy(true);
    try {
      const endpoint = action === 'accept' ? 'accept-duel' : 'decline-duel';
      await api.post(`/arena/rooms/${message.meta.roomId}/${endpoint}`);
      const nextState = action === 'accept' ? 'accepted' : 'declined';
      setInviteState(nextState);
      if (action === 'accept') {
        navigate(`/arena/code/${message.meta.joinCode}`);
      } else {
        toast.success('Дуэль отклонена');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Не удалось обработать приглашение');
    } finally {
      setInviteBusy(false);
    }
  };

  if (message.isDeleted) {
    return (
      <div className={`flex mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[70%] rounded-2xl bg-gray-100 px-4 py-2 dark:bg-slate-700/50">
          <p className="text-xs italic text-gray-400">Сообщение удалено</p>
        </div>
      </div>
    );
  }

  if (message.type === 'system') {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] text-gray-400 dark:bg-slate-700/50">
          {message.text}
        </span>
      </div>
    );
  }

  if (message.type === 'arena_invite') {
    const isDuelInvite = message.meta?.sourceType === 'dm_duel';
    const canRespond = Boolean(isDuelInvite && currentUserId && message.meta?.invitedUserId === currentUserId && !isOwn);

    return (
      <div className={`group relative mb-2 flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        {!isOwn && (
          <button
            type="button"
            onClick={() => sender?._id && navigate(`/profile/${sender._id}`)}
            className="mr-2 mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-bold text-gray-500 transition hover:scale-[1.03] dark:bg-slate-600 dark:text-gray-300"
          >
            {sender?.avatar ? <img src={sender.avatar} alt="" className="h-full w-full object-cover" /> : (sender?.firstName?.[0] || '?').toUpperCase()}
          </button>
        )}

        <div className={`min-w-[160px] max-w-[75%] ${isOwn ? 'order-1' : ''}`}>
          <div className={`relative rounded-3xl border px-4 py-4 ${
            isOwn
              ? 'border-primary-400 bg-primary-500 text-white'
              : 'border-orange-200 bg-orange-50 text-dark dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-white'
          }`}>
            {!isOwn && (
              <button
                type="button"
                onClick={() => sender?._id && navigate(`/profile/${sender._id}`)}
                className="mb-1 text-[11px] font-semibold transition hover:opacity-80"
                style={{ color: nameColor }}
              >
                {sender?.firstName} {sender?.lastName}
              </button>
            )}
            <p className="text-sm font-semibold">{message.text || 'Приглашение в Arena'}</p>
            <p className={`mt-1 text-xs ${isOwn ? 'text-orange-100' : 'text-gray-500 dark:text-gray-300'}`}>
              {isDuelInvite ? 'Личная дуэль' : 'Присоединяйся к живой комнате по коду'}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {!isDuelInvite && (
                <button
                  type="button"
                  onClick={() => handleArenaInvite('join')}
                  className={`rounded-2xl px-4 py-2 text-xs font-semibold transition ${
                    isOwn
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-white text-orange-600 hover:bg-orange-100 dark:bg-slate-800 dark:text-orange-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Открыть арену
                </button>
              )}

              {isDuelInvite && canRespond && !inviteState && (
                <>
                  <button
                    type="button"
                    onClick={() => handleArenaInvite('accept')}
                    disabled={inviteBusy}
                    className="rounded-2xl bg-primary-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Принять
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArenaInvite('decline')}
                    disabled={inviteBusy}
                    className="rounded-2xl bg-white px-4 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    Отклонить
                  </button>
                </>
              )}

              {isDuelInvite && (inviteState || isOwn) && (
                <button
                  type="button"
                  onClick={() => navigate(`/arena/code/${message.meta.joinCode}`)}
                  className={`rounded-2xl px-4 py-2 text-xs font-semibold transition ${
                    isOwn
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-white text-orange-600 hover:bg-orange-100 dark:bg-slate-800 dark:text-orange-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {inviteState === 'declined' ? 'Дуэль отклонена' : 'Открыть арену'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const availableDeleteOptions = deleteOptions || { self: false, everyone: false };

  return (
    <div
      data-msg-id={message._id}
      className={`group relative mb-2 flex rounded-2xl transition-all duration-500 ${isOwn ? 'justify-end' : 'justify-start'} ${isHighlighted ? 'ring-4 ring-amber-300 ring-offset-2 ring-offset-transparent dark:ring-amber-500/60' : ''}`}
    >
      {!isOwn && (
        <button
          type="button"
          onClick={() => sender?._id && navigate(`/profile/${sender._id}`)}
          className="mr-2 mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-bold text-gray-500 transition hover:scale-[1.03] dark:bg-slate-600 dark:text-gray-300"
        >
          {sender?.avatar ? (
            <img src={sender.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            (sender?.firstName?.[0] || '?').toUpperCase()
          )}
        </button>
      )}

      <div className={`min-w-[120px] max-w-[70%] ${isOwn ? 'order-1' : ''}`}>
        {message.replyTo && !message.replyTo.isDeleted && (
          <div className={`mb-1 max-w-full truncate border-l-2 pl-3 text-[11px] ${
            isOwn
              ? 'border-primary-200 text-orange-100'
              : 'border-gray-300 text-gray-500 dark:border-slate-500 dark:text-gray-400'
          }`}>
            <button
              type="button"
              onClick={() => message.replyTo.sender?._id && navigate(`/profile/${message.replyTo.sender._id}`)}
              className="font-medium transition hover:opacity-80"
            >
              {message.replyTo.sender?.firstName}
            </button>
            : {message.replyTo.text?.slice(0, 60) || '(вложение)'}
          </div>
        )}

        <div className={`relative rounded-2xl px-4 py-2.5 ${
          isOwn
            ? 'rounded-br-md bg-primary-500 text-white'
            : 'rounded-bl-md bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-100'
        }`}>
          {!isOwn && (
            <button
              type="button"
              onClick={() => sender?._id && navigate(`/profile/${sender._id}`)}
              className="mb-0.5 text-[11px] font-semibold transition hover:opacity-80"
              style={{ color: nameColor }}
            >
              {sender?.firstName} {sender?.lastName}
            </button>
          )}

          {message.text && (
            <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
          )}

          {message.attachments?.map((attachment, index) => {
            const attachmentSrc = getAttachmentSrc(attachment);
            const isImage = attachment.mimetype?.startsWith('image/');
            const isVideo = attachment.mimetype?.startsWith('video/');
            const isAudio = attachment.mimetype?.startsWith('audio/');
            const isPdf = attachment.mimetype === 'application/pdf';

            return (
              <div key={index} className="mt-2">
                {isImage && (
                  <button
                    type="button"
                    onClick={() => onPreviewMedia?.({ kind: 'image', attachment, label: 'Изображение' })}
                    className="block overflow-hidden rounded-xl"
                  >
                    <img
                      src={attachmentSrc}
                      alt={attachment.filename}
                      className="max-h-[300px] max-w-full rounded-xl object-contain transition hover:opacity-95"
                    />
                  </button>
                )}

                {isVideo && (
                  <button
                    type="button"
                    onClick={() => onPreviewMedia?.({ kind: 'video', attachment, label: 'Видео' })}
                    className="block w-full overflow-hidden rounded-xl"
                  >
                    <video
                      src={attachmentSrc}
                      className="max-h-[300px] w-full rounded-xl bg-black object-contain"
                      muted
                      playsInline
                    />
                  </button>
                )}

                {isAudio && (
                  <AudioPlayer data={attachment.data} mimetype={attachment.mimetype} filename={attachment.filename} />
                )}

                {isPdf && (
                  <button
                    type="button"
                    onClick={() => onPreviewMedia?.({ kind: 'pdf', attachment, label: 'PDF' })}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition ${
                      isOwn
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-600 dark:text-gray-200 dark:hover:bg-slate-500'
                    }`}
                  >
                    <FileText size={14} />
                    Открыть PDF
                  </button>
                )}

                {!isImage && !isVideo && !isAudio && !isPdf && (
                  <a
                    href={attachmentSrc}
                    download={attachment.filename}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition ${
                      isOwn
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-600 dark:text-gray-200 dark:hover:bg-slate-500'
                    }`}
                  >
                    <FileText size={14} />
                    {attachment.filename}
                    <Download size={12} />
                  </a>
                )}
              </div>
            );
          })}

          <div className={`mt-1 flex items-center gap-1.5 ${isOwn ? 'justify-end' : ''}`}>
            {message.isPinned && <Pin size={10} className={isOwn ? 'text-orange-100' : 'text-amber-500'} />}
            <span className={`text-[10px] ${isOwn ? 'text-orange-100' : 'text-gray-400'}`}>
              {timeStr(message.createdAt)}
            </span>
            {isOwn && (
              isReadByOther
                ? <CheckCheck size={12} className="text-orange-100" strokeWidth={2.6} />
                : <Check size={12} className="text-orange-100/80" strokeWidth={2.4} />
            )}
          </div>
        </div>

        {/* Reactions row */}
        {Array.isArray(message.reactions) && message.reactions.length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : ''}`}>
            {message.reactions.map((r) => {
              const count = r.users?.length || 0;
              if (count === 0) return null;
              const isMine = r.users?.some(u => String(u?._id || u) === String(currentUserId));
              return (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => onReact?.(message, r.emoji)}
                  className={`inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[11px] font-bold transition active:translate-y-[1px] ${
                    isMine
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span className="text-sm leading-none">{r.emoji}</span>
                  <span>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className={`relative mt-1 flex items-center gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 ${isOwn ? 'justify-end' : ''}`}>
          {onReact && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowReactPicker(prev => !prev)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-500 transition hover:border-amber-300 hover:text-amber-600 active:translate-y-[1px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-amber-400"
                aria-label="Реакция"
                title="Добавить реакцию"
              >
                <Smile size={12} strokeWidth={2.4} />
              </button>
              {showReactPicker && (
                <div
                  className={`absolute z-30 mb-1 flex gap-0.5 rounded-full border-2 border-slate-900 bg-white p-1 dark:border-white dark:bg-slate-800 ${isOwn ? 'right-0 bottom-full' : 'left-0 bottom-full'}`}
                  style={{ boxShadow: '0 3px 0 #0f172a' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {QUICK_REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { onReact(message, emoji); setShowReactPicker(false); }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-base transition hover:scale-125 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => onReply?.(message)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 active:translate-y-[1px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="Ответить"
            title="Ответить"
          >
            <Reply size={12} strokeWidth={2.4} />
          </button>

          {canPin && (
            <button
              type="button"
              onClick={() => onPin?.(message)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-500 transition hover:border-amber-300 hover:text-amber-600 active:translate-y-[1px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-amber-400"
              aria-label={message.isPinned ? 'Открепить' : 'Закрепить'}
              title={message.isPinned ? 'Открепить' : 'Закрепить'}
            >
              <Pin size={12} strokeWidth={2.4} />
            </button>
          )}

          {(availableDeleteOptions.self || availableDeleteOptions.everyone) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDeleteMenu(prev => !prev)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-500 transition hover:border-red-300 hover:text-red-600 active:translate-y-[1px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-red-400"
                aria-label="Удалить"
                title="Удалить"
              >
                <Trash2 size={12} strokeWidth={2.4} />
              </button>

              {showDeleteMenu && (
                <div
                  className={`absolute z-20 mt-1.5 min-w-[170px] rounded-2xl border-2 border-slate-900 bg-white p-2 dark:border-white dark:bg-slate-800 ${
                    isOwn ? 'right-0' : 'left-0'
                  }`}
                  style={{ boxShadow: '0 4px 0 #0f172a' }}
                >
                  <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Удалить?
                  </p>

                  {availableDeleteOptions.self && (
                    <button
                      type="button"
                      onClick={() => {
                        onDelete?.(message, 'self');
                        setShowDeleteMenu(false);
                      }}
                      className="mb-1 w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Только у себя
                    </button>
                  )}

                  {availableDeleteOptions.everyone && (
                    <button
                      type="button"
                      onClick={() => {
                        onDelete?.(message, 'everyone');
                        setShowDeleteMenu(false);
                      }}
                      className="mb-1 w-full rounded-xl px-3 py-2 text-left text-xs font-black text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      У всех
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowDeleteMenu(false)}
                    className="w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                  >
                    Отмена
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import AudioPlayer from './AudioPlayer';
import { Download, FileText, Pin, Reply, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CHAT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4',
  '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48', '#a855f7',
];

function getUserColor(userId, roleColor) {
  if (roleColor && roleColor !== '#6366f1') return roleColor;
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
}) {
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const navigate = useNavigate();

  const sender = message.sender;
  const nameColor = useMemo(() => getUserColor(sender?._id, roleColor), [sender?._id, roleColor]);

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

  const availableDeleteOptions = deleteOptions || { self: false, everyone: false };

  return (
    <div className={`group relative mb-2 flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
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
              ? 'border-blue-300 text-blue-100'
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
            ? 'rounded-br-md bg-blue-500 text-white'
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
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
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
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
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
            {message.isPinned && <Pin size={10} className={isOwn ? 'text-blue-200' : 'text-amber-500'} />}
            <span className={`text-[10px] ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
              {timeStr(message.createdAt)}
            </span>
          </div>
        </div>

        <div className={`mt-0.5 flex items-center gap-0.5 ${isOwn ? 'justify-end' : ''}`}>
          <button
            type="button"
            onClick={() => onReply?.(message)}
            className="rounded p-1 text-gray-400 opacity-0 transition hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-slate-600 dark:hover:text-gray-300"
            title="Ответить"
          >
            <Reply size={13} />
          </button>

          {canPin && (
            <button
              type="button"
              onClick={() => onPin?.(message)}
              className="rounded p-1 text-gray-400 opacity-0 transition hover:bg-gray-200 hover:text-amber-500 group-hover:opacity-100 dark:hover:bg-slate-600"
              title={message.isPinned ? 'Открепить' : 'Закрепить'}
            >
              <Pin size={13} />
            </button>
          )}

          {(availableDeleteOptions.self || availableDeleteOptions.everyone) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDeleteMenu(prev => !prev)}
                className="rounded p-1 text-gray-400 opacity-0 transition hover:bg-red-100 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20"
                title="Удалить"
              >
                <Trash2 size={13} />
              </button>

              {showDeleteMenu && (
                <div className={`absolute z-20 mt-1 min-w-[160px] rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-slate-600 dark:bg-slate-800 ${
                  isOwn ? 'right-0' : 'left-0'
                }`}>
                  <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                    Подтверждение
                  </p>

                  {availableDeleteOptions.self && (
                    <button
                      type="button"
                      onClick={() => {
                        onDelete?.(message, 'self');
                        setShowDeleteMenu(false);
                      }}
                      className="mb-1 w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-700"
                    >
                      Удалить у себя
                    </button>
                  )}

                  {availableDeleteOptions.everyone && (
                    <button
                      type="button"
                      onClick={() => {
                        onDelete?.(message, 'everyone');
                        setShowDeleteMenu(false);
                      }}
                      className="mb-1 w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Удалить у всех
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowDeleteMenu(false)}
                    className="w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-gray-500 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"
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

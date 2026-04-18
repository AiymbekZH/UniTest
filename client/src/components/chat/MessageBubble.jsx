import AudioPlayer from './AudioPlayer';
import { Reply, Trash2, Pin, FileText, Download } from 'lucide-react';

const CHAT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4',
  '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48', '#a855f7',
];

function getUserColor(userId, roleColor) {
  if (roleColor && roleColor !== '#6366f1') return roleColor;
  const hash = (userId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return CHAT_COLORS[hash % CHAT_COLORS.length];
}

function timeStr(date) {
  return new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isOwn, onReply, onDelete, onPin, canDelete, canPin, roleColor }) {
  if (message.isDeleted) {
    return (
      <div className={`flex mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="px-4 py-2 rounded-2xl bg-gray-100 dark:bg-slate-700/50 max-w-[70%]">
          <p className="text-xs italic text-gray-400">Сообщение удалено</p>
        </div>
      </div>
    );
  }

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] text-gray-400 bg-gray-100 dark:bg-slate-700/50 px-3 py-1 rounded-full">{message.text}</span>
      </div>
    );
  }

  const sender = message.sender;
  const nameColor = getUserColor(sender?._id, roleColor);

  return (
    <div className={`flex mb-2 group ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar (only for others) */}
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-300 flex-shrink-0 mr-2 mt-1 overflow-hidden">
          {sender?.avatar ? (
            <img src={sender.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            (sender?.firstName?.[0] || '?').toUpperCase()
          )}
        </div>
      )}

      <div className={`max-w-[70%] min-w-[120px] ${isOwn ? 'order-1' : ''}`}>
        {/* Reply preview */}
        {message.replyTo && !message.replyTo.isDeleted && (
          <div className={`text-[11px] mb-1 pl-3 border-l-2 ${isOwn ? 'border-blue-300 text-blue-100' : 'border-gray-300 dark:border-slate-500 text-gray-500 dark:text-gray-400'} truncate max-w-full`}>
            <span className="font-medium">{message.replyTo.sender?.firstName}</span>: {message.replyTo.text?.slice(0, 60) || '(вложение)'}
          </div>
        )}

        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-2.5 relative ${
          isOwn
            ? 'bg-blue-500 text-white rounded-br-md'
            : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-100 rounded-bl-md'
        }`}>
          {/* Sender name */}
          {!isOwn && (
            <p className="text-[11px] font-semibold mb-0.5" style={{ color: nameColor }}>
              {sender?.firstName} {sender?.lastName}
            </p>
          )}

          {/* Text */}
          {message.text && (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
          )}

          {/* Attachments */}
          {message.attachments?.map((att, i) => (
            <div key={i} className="mt-2">
              {att.mimetype?.startsWith('image/') ? (
                <img
                  src={att.data?.startsWith('data:') ? att.data : `data:${att.mimetype};base64,${att.data}`}
                  alt={att.filename}
                  className="rounded-xl max-w-full max-h-[300px] object-contain cursor-pointer"
                  onClick={() => {
                    const w = window.open();
                    w.document.write(`<img src="${att.data?.startsWith('data:') ? att.data : `data:${att.mimetype};base64,${att.data}`}" style="max-width:100%;margin:auto;display:block" />`);
                  }}
                />
              ) : att.mimetype?.startsWith('audio/') ? (
                <AudioPlayer data={att.data} mimetype={att.mimetype} filename={att.filename} />
              ) : (
                <a
                  href={att.data?.startsWith('data:') ? att.data : `data:${att.mimetype};base64,${att.data}`}
                  download={att.filename}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition ${
                    isOwn ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <FileText size={14} /> {att.filename} <Download size={12} />
                </a>
              )}
            </div>
          ))}

          {/* Time + pin */}
          <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? 'justify-end' : ''}`}>
            {message.isPinned && <Pin size={10} className={isOwn ? 'text-blue-200' : 'text-amber-500'} />}
            <span className={`text-[10px] ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>{timeStr(message.createdAt)}</span>
          </div>
        </div>

        {/* Action buttons (hover) */}
        <div className={`flex items-center gap-0.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'justify-end' : ''}`}>
          <button onClick={() => onReply?.(message)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition" title="Ответить">
            <Reply size={13} />
          </button>
          {canPin && (
            <button onClick={() => onPin?.(message)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-400 hover:text-amber-500 transition" title={message.isPinned ? 'Открепить' : 'Закрепить'}>
              <Pin size={13} />
            </button>
          )}
          {(isOwn || canDelete) && (
            <button onClick={() => onDelete?.(message)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition" title="Удалить">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

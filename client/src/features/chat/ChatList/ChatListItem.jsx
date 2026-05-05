import { BellOff, Bookmark, Pin, Users } from 'lucide-react';

/**
 * Single row in the chat sidebar. Uniform across DM and group — the
 * differences (avatar source, online dot, member count) are decided
 * upstream and passed in.
 */
function timeAgo(date) {
  if (!date) return '';
  const d = new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'сейчас';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} дн`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function ChatListItem({
  chat,             // unified shape — see normalizeForList in Sidebar
  active,
  onClick,
}) {
  const {
    title,
    subtitle,
    avatar,
    fallback,
    online,
    isGroup,
    memberCount,
    isPinned,
    isMuted,
    unreadCount,
    lastActivity,
    // Phase 4 Saved Messages: when set to 'saved', the avatar slot
    // renders a bookmark icon with amber tint instead of an initials
    // fallback. Used for the single-participant self-DM that anchors
    // the chat list.
    iconType,
  } = chat;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-left transition active:translate-y-[1px] ${
        active
          ? 'border-slate-900 bg-primary-50 dark:border-white dark:bg-primary-900/15'
          : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-700/40'
      }`}
      style={active ? { boxShadow: '0 2px 0 #0f172a' } : undefined}
    >
      <div className="relative flex-shrink-0">
        <div className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-900 text-sm font-black dark:border-white ${
          isGroup ? 'rounded-xl' : ''
        } ${
          iconType === 'saved'
            ? 'bg-amber-400 text-slate-900'
            : 'bg-white text-slate-700 dark:bg-slate-700 dark:text-white'
        }`}>
          {iconType === 'saved'
            ? <Bookmark size={18} strokeWidth={2.6} fill="currentColor" />
            : avatar
              ? <img src={avatar} alt="" className="h-full w-full object-cover" />
              : isGroup
                ? <Users size={18} strokeWidth={2.4} />
                : (fallback || '?').toUpperCase()}
        </div>
        {!isGroup && online && (
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-800"
            aria-label="online"
          />
        )}
        {isGroup && (
          <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-slate-900 bg-amber-400 px-1 text-[9px] font-black text-slate-900 dark:border-white">
            G
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{title}</p>
            {isPinned && <Pin size={11} strokeWidth={2.6} className="flex-shrink-0 text-primary-500" />}
            {isMuted && <BellOff size={11} strokeWidth={2.6} className="flex-shrink-0 text-slate-400" />}
            {isGroup && memberCount > 0 && (
              <span className="text-[10px] font-bold text-slate-400">· {memberCount}</span>
            )}
          </div>
          {lastActivity && (
            <span className="flex-shrink-0 text-[10px] font-bold text-slate-400">{timeAgo(lastActivity)}</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {subtitle || '...'}
          </p>
          {unreadCount > 0 && (
            <span className={`flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full border-2 px-1 text-[10px] font-black ${
              isMuted
                ? 'border-slate-400 bg-slate-300 text-white dark:border-slate-500 dark:bg-slate-600'
                : 'border-slate-900 bg-primary-500 text-white dark:border-white'
            }`}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

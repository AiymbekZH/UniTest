import { ArrowLeft, MoreVertical, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Top bar of the open chat. Click on the title navigates to the
 * appropriate profile (DM other user) or group settings (group).
 *
 * Props:
 *   kind, title, subtitle, avatar, fallback, online, isGroup,
 *   onBack       — pops to list (mobile only)
 *   onOpenInfo   — opens the right-side info drawer (Phase 4)
 */
export default function ChatRoomHeader({
  kind,
  title,
  subtitle,
  avatar,
  fallback,
  online,
  isGroup,
  groupId,
  otherUserId,
  onBack,
  onOpenInfo,
}) {
  const navigate = useNavigate();

  const handleTitleClick = () => {
    if (kind === 'dm' && otherUserId) {
      navigate(`/profile/${otherUserId}`);
    } else if (kind === 'group' && groupId) {
      // Old group settings remain at /groups/:id for now (Phase 5 splits route).
      navigate(`/groups`);
    }
  };

  return (
    <div className="flex flex-shrink-0 items-center gap-2.5 border-b-2 border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-800 sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-slate-900 transition active:translate-y-[2px] dark:border-white dark:bg-slate-900 dark:text-white sm:hidden"
        style={{ boxShadow: '0 3px 0 #0f172a' }}
        aria-label="Назад"
      >
        <ArrowLeft size={15} strokeWidth={2.4} />
      </button>

      <button
        type="button"
        onClick={handleTitleClick}
        className="flex min-w-0 flex-1 items-center gap-3 text-left transition hover:opacity-80"
      >
        <div className="relative flex-shrink-0">
          <div className={`flex h-10 w-10 items-center justify-center overflow-hidden border-2 border-slate-900 bg-white text-sm font-black text-slate-700 dark:border-white dark:bg-slate-700 dark:text-white ${
            isGroup ? 'rounded-xl' : 'rounded-2xl'
          }`}>
            {avatar
              ? <img src={avatar} alt="" className="h-full w-full object-cover" />
              : isGroup
                ? <Users size={16} strokeWidth={2.4} />
                : (fallback || '?').toUpperCase()}
          </div>
          {!isGroup && online && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-800" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-slate-900 dark:text-white">{title}</p>
          {subtitle && (
            <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
      </button>

      {/* Phase 4: search inside chat */}
      <button
        type="button"
        className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 sm:flex"
        aria-label="Поиск в чате"
        title="Поиск (скоро)"
        disabled
      >
        <Search size={15} strokeWidth={2.4} />
      </button>

      <button
        type="button"
        onClick={onOpenInfo}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
        aria-label="Информация о чате"
        title="Информация"
      >
        <MoreVertical size={15} strokeWidth={2.4} />
      </button>
    </div>
  );
}

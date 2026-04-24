import { Link } from 'react-router-dom';

/**
 * Display helper that renders a user's @username as the primary identifier
 * with the optional full name below/beside. Falls back to uniqueId when no
 * username is set. Email must never be passed here.
 */
export function formatFullName(user = {}) {
  const first = user.firstName || '';
  const last = user.lastName || '';
  return `${first} ${last}`.trim();
}

export function formatUsername(user = {}) {
  if (user.username) return `@${user.username}`;
  if (user.uniqueId) return `#${user.uniqueId.slice(0, 6)}`;
  return '@user';
}

export default function UsernameBadge({
  user,
  size = 'md',
  layout = 'row',
  className = '',
  showFullName = true,
  linkToProfile = true,
  accent = 'orange'
}) {
  if (!user) return null;

  const handle = formatUsername(user);
  const name = formatFullName(user);

  const sizeMap = {
    xs: { handle: 'text-[11px]', name: 'text-[10px]' },
    sm: { handle: 'text-xs', name: 'text-[10px]' },
    md: { handle: 'text-sm', name: 'text-xs' },
    lg: { handle: 'text-base', name: 'text-xs' },
    xl: { handle: 'text-lg', name: 'text-sm' }
  };

  const accentColors = {
    orange: 'text-orange-500 dark:text-orange-300',
    white: 'text-white',
    slate: 'text-slate-700 dark:text-slate-200',
    emerald: 'text-emerald-500 dark:text-emerald-300'
  };

  const sizes = sizeMap[size] || sizeMap.md;
  const accentClass = accentColors[accent] || accentColors.orange;

  const handleEl = (
    <span className={`${sizes.handle} ${accentClass} font-black tracking-tight`}>{handle}</span>
  );
  const nameEl = showFullName && name ? (
    <span className={`${sizes.name} text-gray-500 dark:text-white/45 truncate`}>{name}</span>
  ) : null;

  const layoutClass = layout === 'col'
    ? 'flex flex-col leading-tight'
    : 'inline-flex items-center gap-2 leading-tight';

  const content = (
    <span className={`${layoutClass} ${className}`}>
      {handleEl}
      {nameEl}
    </span>
  );

  if (linkToProfile && user.username) {
    return <Link to={`/u/${user.username}`} className="transition hover:opacity-90">{content}</Link>;
  }
  if (linkToProfile && (user._id || user.id)) {
    return <Link to={`/profile/${user._id || user.id}`} className="transition hover:opacity-90">{content}</Link>;
  }
  return content;
}

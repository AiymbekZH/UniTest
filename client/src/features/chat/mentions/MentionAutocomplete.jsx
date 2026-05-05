import { useEffect, useMemo, useRef } from 'react';

/**
 * Mention autocomplete dropdown that floats above the composer when
 * the user is typing an `@…` token.
 *
 * Contract:
 *   `members` is the group's member list. Each entry is the populated
 *   `user` doc (`{ _id, firstName, lastName, avatar, username }`) OR a
 *   wrapper `{ user: {...}, roleId, ... }` — we accept both shapes
 *   because Group.members in the cached activeChat uses the wrapper.
 *
 *   `query` is whatever the user typed AFTER the `@` (excluding the
 *   `@` itself). An empty query shows the first 8 members. As the
 *   user types we filter by case-insensitive substring across
 *   username + firstName + lastName.
 *
 *   `onSelect(user)` is called when the user picks an entry. The
 *   composer is responsible for the actual text mutation (replacing
 *   the partial token with `@username `).
 *
 *   `selectedIndex` and `onIndexChange` keep keyboard navigation in
 *   the composer's hands so ArrowUp/Down/Enter feel native to typing.
 *
 * Why a stateless component (selection lifted up)?
 *   The composer owns the textarea and needs to intercept ArrowUp /
 *   ArrowDown / Enter on the input itself — otherwise the textarea
 *   moves the caret instead of moving the dropdown highlight. This
 *   means the parent must own the cursor index and pass it down.
 */
export const MAX_RESULTS = 8;

export function filterMembers(members, query) {
  if (!Array.isArray(members) || members.length === 0) return [];
  const list = [];
  for (const m of members) {
    const u = m?.user && typeof m.user === 'object' ? m.user : m;
    if (u && u._id) list.push(u);
  }
  // Deduplicate (groups occasionally have duplicated member rows).
  const byId = new Map();
  for (const u of list) {
    const id = String(u._id);
    if (!byId.has(id)) byId.set(id, u);
  }
  const arr = Array.from(byId.values());

  if (!query) return arr.slice(0, MAX_RESULTS);
  const q = query.toLowerCase();
  const matched = arr.filter(u => {
    const fn = (u.firstName || '').toLowerCase();
    const ln = (u.lastName || '').toLowerCase();
    const un = (u.username || '').toLowerCase();
    return fn.includes(q) || ln.includes(q) || un.includes(q);
  });
  return matched.slice(0, MAX_RESULTS);
}

export default function MentionAutocomplete({
  open,
  members,
  query,
  selectedIndex,
  onIndexChange,
  onSelect,
}) {
  const filtered = useMemo(() => filterMembers(members, query), [members, query]);
  const listRef = useRef(null);

  // Whenever the visible result set changes (or the cursor index),
  // make sure the highlighted row stays in view inside the scrolling
  // dropdown body. Otherwise the user types past 5+ matches and the
  // selection visually disappears even though it's tracked in state.
  useEffect(() => {
    if (!open) return;
    const root = listRef.current;
    if (!root) return;
    const el = root.querySelector(`[data-mention-index="${selectedIndex}"]`);
    if (el?.scrollIntoView) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [open, selectedIndex, filtered.length]);

  if (!open || filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-30 mb-1 max-h-64 overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.25)] dark:border-slate-600 dark:bg-slate-800">
      <div className="border-b border-slate-100 px-3 py-1.5 dark:border-slate-700">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Упомянуть
        </p>
      </div>
      <div ref={listRef} className="max-h-56 overflow-y-auto">
        {filtered.map((u, idx) => {
          const isActive = idx === selectedIndex;
          const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Пользователь';
          const handle = u.username ? `@${u.username}` : null;
          return (
            <button
              key={u._id}
              type="button"
              data-mention-index={idx}
              onMouseEnter={() => onIndexChange?.(idx)}
              onMouseDown={(e) => {
                // mousedown (not click) so the textarea doesn't lose
                // focus before we mutate the value. Composer-side
                // handlers expect focus to remain on the textarea.
                e.preventDefault();
                onSelect?.(u);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left transition ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
            >
              {/* Avatar */}
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-500 text-[10px] font-black text-white">
                {u.avatar ? (
                  <img src={u.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>
                    {(u.firstName?.[0] || '?')}{(u.lastName?.[0] || '')}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-slate-900 dark:text-white">
                  {fullName}
                </p>
                {handle && (
                  <p className="truncate text-[10px] font-medium text-slate-400">
                    {handle}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

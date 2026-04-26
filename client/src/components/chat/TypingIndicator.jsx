import { useEffect, useState } from 'react';

export default function TypingIndicator({ typingUsers }) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const names = typingUsers.map(u => u.name).join(', ');
  const label = typingUsers.length === 1 ? 'печатает' : 'печатают';

  return (
    <div className="flex flex-shrink-0 items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-2 dark:border-slate-700/50 dark:bg-slate-900/30">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-500"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
          />
        ))}
      </div>
      <span className="text-[11px] font-bold italic text-slate-500 dark:text-slate-400">
        {names} {label}...
      </span>
    </div>
  );
}

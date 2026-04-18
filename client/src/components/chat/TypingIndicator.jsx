import { useEffect, useState } from 'react';

export default function TypingIndicator({ typingUsers }) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const names = typingUsers.map(u => u.name).join(', ');
  const label = typingUsers.length === 1 ? 'печатает' : 'печатают';

  return (
    <div className="px-4 py-1.5 flex items-center gap-2">
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }} />
        ))}
      </div>
      <span className="text-[11px] text-gray-400 italic">{names} {label}...</span>
    </div>
  );
}

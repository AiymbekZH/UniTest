/**
 * Inline divider that marks where a user's last-read position was when
 * the chat was opened. Gives them an instant "you missed N messages"
 * anchor — Telegram / WhatsApp pattern. The line stays where it was on
 * open and doesn't move as new messages stream in.
 */
export default function UnreadDivider({ count }) {
  return (
    <div className="my-2 flex items-center gap-2 px-1">
      <div className="h-px flex-1 bg-primary-300 dark:bg-primary-700" />
      <span className="rounded-full border-2 border-primary-500 bg-primary-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-200">
        {count > 0 ? `${count} непрочитанных` : 'Непрочитанные'}
      </span>
      <div className="h-px flex-1 bg-primary-300 dark:bg-primary-700" />
    </div>
  );
}

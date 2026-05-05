/**
 * Date separator pill rendered between two messages from different days.
 * "Сегодня", "Вчера", or a localized date — Telegram-style.
 */
const RU_MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function fmt(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  // Same calendar day check (NOT 24h diff — matters across DST/timezones).
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return 'Сегодня';
  if (sameDay(d, yesterday)) return 'Вчера';

  const dayDiff = Math.floor((today - d) / (24 * 60 * 60 * 1000));
  // Within a week — show weekday name.
  if (dayDiff < 7 && d.getFullYear() === today.getFullYear()) {
    return d.toLocaleDateString('ru-RU', { weekday: 'long' }).replace(/^./, c => c.toUpperCase());
  }

  // Older — D MMM (this year) or D MMM YYYY (older).
  const day = d.getDate();
  const month = RU_MONTHS[d.getMonth()];
  if (d.getFullYear() === today.getFullYear()) return `${day} ${month}`;
  return `${day} ${month} ${d.getFullYear()}`;
}

export default function DateSeparator({ date }) {
  return (
    <div className="my-3 flex justify-center">
      <span className="rounded-full border-2 border-slate-300 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {fmt(date)}
      </span>
    </div>
  );
}

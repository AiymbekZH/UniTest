// Locale-aware date formatters.
//
// Why not use `new Date(...).toLocaleDateString()` directly?
// The browser's default locale can diverge from the user's app-level
// language choice (LanguageContext). A user who set the app to KZ on
// an EN-locale OS would see dates like "2/6/2025" instead of "6 ақп.
// 2025 ж.". Centralizing here makes the mapping explicit.
//
// Maps:
//   lang → BCP-47 locale tag
//   'en' → 'en-US'
//   'ru' → 'ru-RU'
//   'kz' → 'kk-KZ'
//   'es' → 'es-ES'

const LOCALE_MAP = {
  en: 'en-US',
  ru: 'ru-RU',
  kz: 'kk-KZ',
  es: 'es-ES',
};

function toLocale(lang) {
  return LOCALE_MAP[lang] || 'en-US';
}

// Short form: "6 Feb 2025" / "6 февр. 2025 г." etc.
export function formatDateShort(date, lang = 'en') {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(toLocale(lang), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleDateString();
  }
}

// Long form with time: used on the "opens at" / "was available until"
// deadline cards where users need hour-level precision to know when
// to come back.
export function formatDateLong(date, lang = 'en') {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(toLocale(lang), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleString();
  }
}

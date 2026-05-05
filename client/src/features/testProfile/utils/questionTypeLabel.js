// Maps the server's question-type enum to an i18n-friendly label.
// Keeps the switch out of TestProfile so the new sections can all
// render the same chips without duplicating the map.
//
// Usage:
//   getQuestionTypeLabel('true-false', t) → 'True / False'
//
// Unknown types fall back to the raw string so data from a future
// question type (e.g. 'ordering') still renders something readable
// instead of rendering nothing.

export function getQuestionTypeLabel(type, t) {
  const map = {
    'single-choice':   t('singleChoice'),
    'multiple-choice': t('multipleChoice'),
    'true-false':      t('trueFalse'),
    'essay':           t('essay'),
    'fill-blank':      t('fillBlank'),
    'matching':        t('matching'),
  };
  return map[type] || type;
}

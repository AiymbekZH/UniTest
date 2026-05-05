// Pure helper: maps a numeric difficulty score (0..5) to a UI bundle
// the DifficultyBar and other components use to tint/label themselves.
// Extracted from the legacy inline function in pages/TestProfile.jsx so
// multiple components can share the same thresholds without drifting.
//
// All strings are i18n keys — call t(result.labelKey) at render time.

export function getDifficultyMeta(score) {
  const value = Number(score || 0);

  if (!value) {
    return {
      labelKey: 'noRatings',
      color: 'text-slate-500 dark:text-slate-400',
      accent: 'bg-slate-200 dark:bg-slate-700',
      // Gradient stops for the progress bar fill. Even the "no ratings"
      // state paints something so the bar never looks broken.
      gradient: 'from-slate-300 to-slate-400',
      level: 0,
    };
  }

  if (value >= 4.5) {
    return {
      labelKey: 'veryHard',
      color: 'text-red-600 dark:text-red-400',
      accent: 'bg-red-500',
      gradient: 'from-orange-400 via-red-500 to-red-600',
      level: 5,
    };
  }
  if (value >= 3.5) {
    return {
      labelKey: 'hard',
      color: 'text-orange-600 dark:text-orange-400',
      accent: 'bg-orange-500',
      gradient: 'from-amber-400 via-orange-500 to-orange-600',
      level: 4,
    };
  }
  if (value >= 2.5) {
    return {
      labelKey: 'medium',
      color: 'text-amber-600 dark:text-amber-500',
      accent: 'bg-amber-400',
      gradient: 'from-lime-400 via-amber-400 to-amber-500',
      level: 3,
    };
  }
  if (value >= 1.5) {
    return {
      labelKey: 'easy',
      color: 'text-lime-600 dark:text-lime-400',
      accent: 'bg-lime-500',
      gradient: 'from-emerald-400 via-lime-400 to-lime-500',
      level: 2,
    };
  }
  return {
    labelKey: 'veryEasy',
    color: 'text-emerald-600 dark:text-emerald-400',
    accent: 'bg-emerald-500',
    gradient: 'from-emerald-400 to-emerald-500',
    level: 1,
  };
}

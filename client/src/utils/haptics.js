/**
 * Haptic feedback helper (mobile progressive enhancement).
 * Falls back silently when Vibration API is not available.
 */

const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const haptic = {
  tap: () => { if (canVibrate()) navigator.vibrate(10); },
  press: () => { if (canVibrate()) navigator.vibrate(18); },
  success: () => { if (canVibrate()) navigator.vibrate([20, 40, 20]); },
  warning: () => { if (canVibrate()) navigator.vibrate([30, 40, 30, 40, 30]); },
  reveal: () => { if (canVibrate()) navigator.vibrate(25); },
  fail: () => { if (canVibrate()) navigator.vibrate([80, 60, 80]); }
};

export default haptic;

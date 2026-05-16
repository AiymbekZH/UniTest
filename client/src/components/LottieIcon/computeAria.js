// Computes accessibility-related DOM attributes for the root element of
// LottieIcon / LottiePlayer.
//
// Decision table (see design.md → "Доступность: вычисление ARIA"):
//
//   1. has-label = typeof ariaLabel === 'string' && ariaLabel.trim() !== ''
//
//   2. If has-label:
//        role        = 'img'
//        aria-label  = ariaLabel.trim()
//      else:
//        aria-hidden = 'true'
//
//   3. If trigger === 'click' AND typeof onClick === 'function':
//        role     = 'button'              (overrides role='img')
//        tabIndex = 0
//        delete aria-hidden               (a focusable button MUST be exposed
//                                          to assistive technologies)
//        onKeyDown: Enter / Space → event.preventDefault() + onClick(event)
//        + DEV-only console.warn when ariaLabel is missing (a11y issue)
//
// The returned object only contains keys that are defined for the given
// inputs (no `undefined` placeholders), so callers can spread it directly:
//   <div {...computeAria(props)} />
//
// Pure function: same inputs produce equivalent outputs. The `onKeyDown`
// closure is freshly allocated per call but behaviorally identical.
//
// Validates: Requirements 6.1, 6.2, 6.3 (see requirements.md).

/**
 * @typedef {Object} ComputeAriaInput
 * @property {string} [ariaLabel]
 * @property {'autoplay' | 'hover' | 'click' | 'inView'} [trigger]
 * @property {(event: any) => void} [onClick]
 */

/**
 * @typedef {Object} ComputeAriaResult
 * @property {'img' | 'button'} [role]
 * @property {string} ['aria-label']
 * @property {'true'} ['aria-hidden']
 * @property {0} [tabIndex]
 * @property {(event: any) => void} [onKeyDown]
 */

/**
 * Compute ARIA attributes for a LottieIcon root element.
 *
 * @param {ComputeAriaInput} [input]
 * @returns {ComputeAriaResult}
 */
export function computeAria(input) {
  const { ariaLabel, trigger, onClick } = input || {};

  const hasLabel =
    typeof ariaLabel === 'string' && ariaLabel.trim() !== '';

  /** @type {ComputeAriaResult} */
  const result = {};

  if (hasLabel) {
    result.role = 'img';
    result['aria-label'] = ariaLabel.trim();
  } else {
    result['aria-hidden'] = 'true';
  }

  if (trigger === 'click' && typeof onClick === 'function') {
    // role="button" wins over role="img": a clickable icon is primarily a
    // control. A button must be exposed to assistive technologies, so drop
    // aria-hidden if it was set above (Property 16: button is focusable).
    result.role = 'button';
    result.tabIndex = 0;
    delete result['aria-hidden'];

    result.onKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick(event);
      }
    };

    if (!hasLabel && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        '[LottieIcon] clickable icon without ariaLabel is an a11y issue'
      );
    }
  }

  return result;
}

export default computeAria;

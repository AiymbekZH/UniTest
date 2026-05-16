// Pure helpers for working with Lottie color overrides.
//
// This module ships three small utilities used by the runtime color
// override pipeline described in the design document:
//
//   - parseColor(input): normalizes a CSS color string into Lottie's
//     [r, g, b] tuple with components in [0, 1].
//   - normalizeMappingKey(input): a non-throwing wrapper around parseColor
//     used when iterating over user-supplied colorOverride keys, so a single
//     bad entry never aborts the whole mapping pass.
//   - applyColorOverride(animationData, mapping): walks a Lottie JSON and
//     replaces matching layer colors according to the mapping, returning a
//     fresh object plus a `meta.unmatchedKeys` report. Pure: the input
//     `animationData` is never mutated.
//
// Validation policy:
//   - parseColor throws in Vite's DEV mode (`import.meta.env.DEV`) on
//     malformed input so mistakes surface loudly during development. In a
//     production build it returns `null` and the caller silently skips the
//     value.
//   - normalizeMappingKey never throws. In DEV it logs the error via
//     `console.error` and still returns `null`, so callers can iterate
//     mapping keys safely.
//   - applyColorOverride never throws on malformed mapping entries (they
//     are dropped) and never throws on unexpected JSON shapes (defensive
//     recursion). It DEV-logs the list of unmatched mapping keys exactly
//     once per call.

const HEX_RE = /^#([0-9a-fA-F]{6})$/;
const RGB_RE = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;

/**
 * Returns whether Vite considers the current build a development build.
 * Wrapped in a function so unit tests that stub `import.meta.env` continue
 * to work, and so environments without `import.meta.env` do not throw a
 * ReferenceError.
 *
 * @returns {boolean}
 */
function isDev() {
  try {
    return Boolean(import.meta.env && import.meta.env.DEV);
  } catch (_e) {
    return false;
  }
}

/**
 * Parse a CSS color string into a tuple of integer 0-255 components.
 * Returns `null` on any malformed input. Internal helper – the public
 * surface (`parseColor`) wraps it with the DEV-throw / prod-skip policy.
 *
 * @param {unknown} input
 * @returns {[number, number, number] | null}
 */
function parseRgb255(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed === '') return null;

  const hexMatch = HEX_RE.exec(trimmed);
  if (hexMatch) {
    const hex = hexMatch[1];
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }

  const rgbMatch = RGB_RE.exec(trimmed);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    if (r > 255 || g > 255 || b > 255) return null;
    return [r, g, b];
  }

  return null;
}

/**
 * Parse a CSS color string into Lottie's normalized RGB representation.
 *
 * Accepted formats:
 *   - `#RRGGBB` (six hex digits, case-insensitive)
 *   - `rgb(R, G, B)` with R, G, B integers in [0, 255]; whitespace around
 *     parentheses and commas is allowed.
 *
 * @param {string} input
 * @returns {[number, number, number] | null} Tuple of three floats in
 *   [0, 1], or `null` when running in production with an invalid string.
 * @throws {Error} In Vite DEV mode when `input` is not a recognized color.
 */
export function parseColor(input) {
  const rgb = parseRgb255(input);
  if (rgb === null) {
    if (isDev()) {
      throw new Error(
        `[LottieIcon] Invalid color string: ${JSON.stringify(input)}. ` +
          'Expected "#RRGGBB" or "rgb(R, G, B)".'
      );
    }
    return null;
  }
  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
}

/**
 * Non-throwing wrapper around {@link parseColor} for iterating over keys of
 * a user-supplied colorOverride mapping. A single malformed key should
 * never abort the whole pass, so this function:
 *
 *   - returns the same `[r/255, g/255, b/255]` tuple on success;
 *   - returns `null` on any malformed input – both in DEV and in production;
 *   - logs the underlying error via `console.error` in DEV so the developer
 *     still notices the typo, while production stays silent.
 *
 * @param {string} input
 * @returns {[number, number, number] | null}
 */
export function normalizeMappingKey(input) {
  if (isDev()) {
    try {
      return parseColor(input);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[LottieIcon] Skipping invalid colorOverride key: ${JSON.stringify(input)}`,
        err
      );
      return null;
    }
  }
  // In production parseColor never throws – it just returns null on
  // malformed input, which is exactly the contract we want here.
  return parseColor(input);
}

/**
 * Per-component tolerance for matching a layer color against a mapping
 * source key. Lottie stores colors as floats in [0, 1]; the smallest
 * meaningful step in 8-bit color space is `1/255`. We add a tiny epsilon
 * to absorb floating-point noise that creeps in through `JSON.parse` /
 * `structuredClone` / arithmetic on already-parsed values.
 */
const COLOR_TOLERANCE = 1 / 255 + 1e-9;

/**
 * Returns true when each component of two normalized RGB tuples differs by
 * no more than {@link COLOR_TOLERANCE}.
 *
 * @param {[number, number, number]} a
 * @param {[number, number, number]} b
 * @returns {boolean}
 */
function rgbApproxEqual(a, b) {
  return (
    Math.abs(a[0] - b[0]) <= COLOR_TOLERANCE &&
    Math.abs(a[1] - b[1]) <= COLOR_TOLERANCE &&
    Math.abs(a[2] - b[2]) <= COLOR_TOLERANCE
  );
}

/**
 * Mutates `target` (a Lottie color tuple of `[r, g, b]` or `[r, g, b, a]`)
 * to match `dstRgb`, preserving the alpha channel if present.
 *
 * @param {number[]} target
 * @param {[number, number, number]} dstRgb
 */
function writeRgbInPlace(target, dstRgb) {
  target[0] = dstRgb[0];
  target[1] = dstRgb[1];
  target[2] = dstRgb[2];
  // Preserve alpha (target[3]) if present; do nothing if absent.
}

/**
 * Tries to match the leading 3 components of `tuple` against any source
 * tuple in `pairs` and rewrite them with the destination tuple. Marks the
 * matched pair so unmatched keys can be reported afterwards.
 *
 * @param {number[]} tuple - mutable color array (modified in place)
 * @param {Array<{srcRgb:[number,number,number], dstRgb:[number,number,number], matched:boolean}>} pairs
 * @returns {void}
 */
function tryReplaceTuple(tuple, pairs) {
  if (!Array.isArray(tuple) || tuple.length < 3) return;
  // Read once: we compare the *original* color, then optionally overwrite.
  // Using a small fixed-size local avoids allocating per call.
  const r = tuple[0];
  const g = tuple[1];
  const b = tuple[2];
  if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
    return;
  }
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const src = pair.srcRgb;
    if (
      Math.abs(r - src[0]) <= COLOR_TOLERANCE &&
      Math.abs(g - src[1]) <= COLOR_TOLERANCE &&
      Math.abs(b - src[2]) <= COLOR_TOLERANCE
    ) {
      writeRgbInPlace(tuple, pair.dstRgb);
      pair.matched = true;
      return;
    }
  }
}

/**
 * Walks a single shape entry, replacing colors on fills/strokes and
 * recursing into nested groups. Defensive: tolerates missing or unexpected
 * fields without throwing.
 *
 * @param {unknown} shape
 * @param {Array<{srcRgb:[number,number,number], dstRgb:[number,number,number], matched:boolean}>} pairs
 */
function walkShape(shape, pairs) {
  if (!shape || typeof shape !== 'object') return;
  const ty = shape.ty;

  // Group shape: recurse into its items.
  if (ty === 'gr' && Array.isArray(shape.it)) {
    for (let i = 0; i < shape.it.length; i++) {
      walkShape(shape.it[i], pairs);
    }
    return;
  }

  // Fill or stroke: try to override the color.
  if ((ty === 'fl' || ty === 'st') && shape.c && typeof shape.c === 'object') {
    const c = shape.c;
    const k = c.k;
    if (c.a === 0) {
      // Static color: k is a single tuple [r, g, b] or [r, g, b, a].
      if (Array.isArray(k)) {
        tryReplaceTuple(k, pairs);
      }
    } else if (c.a === 1 && Array.isArray(k)) {
      // Animated color: k is an array of keyframes { s, e?, ... }.
      for (let i = 0; i < k.length; i++) {
        const kf = k[i];
        if (kf && typeof kf === 'object') {
          if (Array.isArray(kf.s)) tryReplaceTuple(kf.s, pairs);
          if (Array.isArray(kf.e)) tryReplaceTuple(kf.e, pairs);
        }
      }
    }
  }
}

/**
 * Walks a single layer, recursing into all of its shape entries.
 *
 * @param {unknown} layer
 * @param {Array<{srcRgb:[number,number,number], dstRgb:[number,number,number], matched:boolean}>} pairs
 */
function walkLayer(layer, pairs) {
  if (!layer || typeof layer !== 'object') return;
  if (Array.isArray(layer.shapes)) {
    for (let i = 0; i < layer.shapes.length; i++) {
      walkShape(layer.shapes[i], pairs);
    }
  }
}

/**
 * Apply a `colorOverride` mapping to a Lottie animation JSON object.
 *
 * The function is pure: the input `animationData` is never mutated. A
 * `structuredClone` is created up front and all writes happen on the clone.
 *
 * Matching rules:
 *   - Each entry in `mapping` is normalized to a Lottie-style RGB tuple via
 *     {@link normalizeMappingKey}. Entries with an unparseable *source* key
 *     are silently dropped (the key is logged via console.error in DEV by
 *     the normalizer itself). Entries with a parseable source but
 *     unparseable destination are also dropped — there is no meaningful
 *     replacement to apply.
 *   - A layer color matches a source key when each of its R, G, B
 *     components is within `1/255` of the source.
 *   - Both static (`c.a === 0`) and animated (`c.a === 1`) colors on
 *     fills (`ty === 'fl'`) and strokes (`ty === 'st'`) are supported,
 *     including nested groups (`ty === 'gr'`).
 *
 * Reporting:
 *   - The returned `meta.unmatchedKeys` lists original mapping keys whose
 *     source color did not appear anywhere in the animation. In Vite DEV
 *     mode a single `console.warn` is emitted with the list, so designers
 *     notice typos quickly.
 *
 * @param {object} animationData - parsed Lottie JSON
 * @param {Record<string, string> | null | undefined} mapping
 * @returns {{ data: object, meta: { unmatchedKeys: string[] } }}
 */
export function applyColorOverride(animationData, mapping) {
  // Fast-path: nothing to do. Skip the structuredClone to avoid a needless
  // deep copy of large animation JSON for the (very common) case where
  // callers do not pass a colorOverride at all.
  if (mapping === null || mapping === undefined) {
    return { data: animationData, meta: { unmatchedKeys: [] } };
  }
  if (typeof mapping !== 'object') {
    return { data: animationData, meta: { unmatchedKeys: [] } };
  }
  const entries = Object.entries(mapping);
  if (entries.length === 0) {
    return { data: animationData, meta: { unmatchedKeys: [] } };
  }

  // Build the list of (src, dst) RGB pairs. normalizeMappingKey is
  // non-throwing and DEV-logs invalid inputs, so a single bad entry can't
  // abort the whole pass.
  const pairs = [];
  for (let i = 0; i < entries.length; i++) {
    const [originalKey, value] = entries[i];
    const srcRgb = normalizeMappingKey(originalKey);
    if (srcRgb === null) continue; // invalid source — nothing to match against
    const dstRgb = normalizeMappingKey(value);
    if (dstRgb === null) continue; // invalid destination — nothing to write
    pairs.push({ originalKey, srcRgb, dstRgb, matched: false });
  }

  // No usable pairs after validation — return the input unchanged.
  if (pairs.length === 0) {
    return { data: animationData, meta: { unmatchedKeys: [] } };
  }

  // Clone before mutating. structuredClone is the right tool here: Lottie
  // JSON contains only plain objects, arrays, numbers, and strings.
  const data = structuredClone(animationData);

  if (data && typeof data === 'object' && Array.isArray(data.layers)) {
    for (let i = 0; i < data.layers.length; i++) {
      walkLayer(data.layers[i], pairs);
    }
  }

  const unmatchedKeys = pairs.filter((p) => !p.matched).map((p) => p.originalKey);

  if (unmatchedKeys.length > 0 && isDev()) {
    // eslint-disable-next-line no-console
    console.warn(
      '[LottieIcon] colorOverride keys not found in animation:',
      unmatchedKeys
    );
  }

  return { data, meta: { unmatchedKeys } };
}

// `rgbApproxEqual` is currently used only by the inlined hot path inside
// `tryReplaceTuple`, but it is exported-shaped (kept as a named local) so
// future callers (e.g. live-patch on colorOverride change in
// useLottieAnimation, task 3.4) can reuse the same comparison semantics.
void rgbApproxEqual;

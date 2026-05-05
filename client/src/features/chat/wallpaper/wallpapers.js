/**
 * Registry of built-in chat wallpapers.
 *
 * Each entry defines a wallpaper that users can pick from the in-chat
 * WallpaperPicker. The actual image files live under
 * `client/public/wallpapers/<file>` and are served at `/wallpapers/<file>`
 * in both dev and prod (Vite copies `public/` verbatim).
 *
 * Adding a new wallpaper:
 *   1. Save the image into client/public/wallpapers/ (PNG or WebP).
 *   2. Append a new entry below with a stable unique `id`.
 *   3. Bump PRESET_VERSION only if you REMOVE a wallpaper id — the
 *      hook uses this to invalidate stale stored choices pointing at
 *      a wallpaper that no longer exists.
 *
 * Why not load from the server?
 *   The registry is static and the picker has 3-5 options — zero
 *   benefit to a round trip. If we later want user-uploaded
 *   wallpapers that'd be a different endpoint.
 *
 * Mode contract:
 *   - 'tile'  → background-repeat: repeat (default, tileable patterns).
 *   - 'cover' → background-size: cover; background-repeat: no-repeat
 *               (single photo / painting backgrounds).
 *   - 'contain' → similar to cover but preserves aspect ratio.
 *
 * Tone:
 *   Used only to group wallpapers in the picker by "Light" / "Dark"
 *   sections so users can find what fits their current theme. The
 *   wallpaper still applies regardless of the active theme.
 */
export const PRESET_VERSION = 1;

export const WALLPAPERS = [
  {
    id: 'light-pastel',
    name: 'Пастельные формы',
    tone: 'light',
    file: '/wallpapers/light-pastel.png',
    mode: 'cover',
    // Dimming helps orange own-bubbles pop against the cream base.
    // 0 = no overlay, 1 = solid black/white veil. Light wallpapers
    // get a tiny white wash so bubbles aren't fighting the pattern.
    overlayLight: 0.12,
    overlayDark: 0.55,
  },
  {
    id: 'dark-academic',
    name: 'Академия',
    tone: 'dark',
    file: '/wallpapers/dark-academic.png',
    mode: 'cover',
    // Dark wallpaper → lighten via white overlay on light theme so
    // incoming slate-100 bubbles don't vanish into the near-black bg.
    overlayLight: 0.85,
    overlayDark: 0.05,
  },
  {
    id: 'orange-brand',
    name: 'Бренд (логотип)',
    tone: 'light',
    file: '/wallpapers/orange-brand.png',
    mode: 'tile',
    // Fully orange tile — heavy dimming on both themes so that own
    // bubbles (also orange) don't disappear into it. Users who pick
    // this probably want it as a statement; we respect that but
    // keep bubbles legible.
    overlayLight: 0.35,
    overlayDark: 0.55,
  },
];

export const WALLPAPER_BY_ID = WALLPAPERS.reduce((acc, wp) => {
  acc[wp.id] = wp;
  return acc;
}, {});

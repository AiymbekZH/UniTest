import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ImageOff, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { WALLPAPERS } from './wallpapers';
import { useWallpaper } from './useWallpaper';

/**
 * Chat wallpaper picker modal.
 *
 * Layout:
 *   Grid of preview tiles. Each tile shows the actual wallpaper image
 *   (same file used in the chat bg) so users see what they'll get.
 *   The first tile is always "Без фона" — picking it clears the
 *   selection.
 *
 * Selection flow:
 *   1. User clicks a tile → selection state flips to that id.
 *   2. Selection is NOT committed yet — the user can see a visual
 *      check mark and "Применить" becomes enabled.
 *   3. Clicking Применить writes to localStorage via useWallpaper;
 *      the chat bg updates immediately via the hook's state.
 *   4. Clicking Сбросить removes the stored id and closes.
 *
 * Why not commit on click?
 *   A stored-on-click flow would flash the user's chat bg repeatedly
 *   as they scroll the picker. Better UX to preview the tile, then
 *   commit once.
 */
export default function WallpaperPicker({ open, onClose }) {
  const { wallpaperId, setWallpaper } = useWallpaper();
  // Track local selection separately from the committed one so the
  // user can preview-then-apply without mutating the chat bg on each
  // tap. Resets to the committed value whenever the modal opens.
  const [pending, setPending] = useState(wallpaperId);

  useEffect(() => {
    if (open) setPending(wallpaperId);
  }, [open, wallpaperId]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll while the modal is open so mobile users don't
  // accidentally scroll the chat under the backdrop.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  function handleApply() {
    setWallpaper(pending || null);
    toast.success(pending ? 'Фон применён' : 'Фон сброшен');
    onClose?.();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border-2 border-slate-900 bg-white shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.35)] dark:border-white dark:bg-slate-900 sm:rounded-2xl"
            style={{ boxShadow: '0 10px 0 #0f172a' }}
          >
            {/* ── Header ── */}
            <div className="flex items-center gap-3 border-b-2 border-slate-200 px-5 py-4 dark:border-slate-700">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Оформление
                </p>
                <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                  Фон чата
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {/* "No wallpaper" tile always first. */}
                <PickerTile
                  name="Без фона"
                  isNone
                  selected={!pending}
                  onClick={() => setPending(null)}
                />

                {WALLPAPERS.map(wp => (
                  <PickerTile
                    key={wp.id}
                    name={wp.name}
                    file={wp.file}
                    mode={wp.mode}
                    selected={pending === wp.id}
                    onClick={() => setPending(wp.id)}
                  />
                ))}
              </div>

              <p className="mt-4 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                Фон применяется ко всем диалогам и группам. Сохраняется
                только в этом браузере.
              </p>
            </div>

            {/* ── Footer ── */}
            <div className="flex flex-shrink-0 items-center gap-2 border-t-2 border-slate-200 px-5 py-3 dark:border-slate-700">
              <button
                type="button"
                onClick={() => { setWallpaper(null); setPending(null); onClose?.(); }}
                disabled={!wallpaperId}
                className="flex h-9 items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition active:translate-y-[1px] disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                Сбросить
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={handleApply}
                className="flex h-9 items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-primary-500 px-4 text-xs font-black text-white transition active:translate-y-[1px] dark:border-white"
                style={{ boxShadow: '0 3px 0 #0f172a' }}
              >
                <Check size={13} strokeWidth={2.6} /> Применить
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Single tile in the grid. Renders the actual wallpaper file as the
 * background so the user sees a true preview (not a thumbnail that
 * might drift from the real file). The "Без фона" variant shows a
 * slashed image icon instead.
 */
function PickerTile({ name, file, mode = 'tile', selected, isNone, onClick }) {
  const bgStyle = file
    ? {
        backgroundImage: `url(${file})`,
        backgroundSize: mode === 'cover' ? 'cover' : mode === 'contain' ? 'contain' : '200px',
        backgroundRepeat: mode === 'tile' ? 'repeat' : 'no-repeat',
        backgroundPosition: 'center',
      }
    : {};

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-[4/5] overflow-hidden rounded-2xl border-2 text-left transition active:translate-y-[1px] ${
        selected
          ? 'border-primary-500'
          : 'border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
      }`}
      style={selected ? { boxShadow: '0 3px 0 #ea580c' } : { boxShadow: '0 2px 0 #0f172a' }}
    >
      {isNone ? (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <ImageOff size={24} strokeWidth={2.2} />
        </div>
      ) : (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800" style={bgStyle} />
      )}

      {/* Label strip over the bottom of the tile so the wallpaper
          preview is visible above it but the name stays legible. */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/75 via-slate-900/40 to-transparent px-2 py-1.5">
        <p className="truncate text-[11px] font-black text-white">{name}</p>
      </div>

      {selected && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white" style={{ boxShadow: '0 2px 0 #0f172a' }}>
          <Check size={12} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

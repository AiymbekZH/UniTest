import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ImagePlus, Loader2, Sparkles, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { processStickerImage } from './imageResize';

/**
 * Background removal modal. Uses @imgly/background-removal which runs
 * an ONNX model entirely in the browser — no server round-trip. The
 * model is ~7MB on first download, cached in IndexedDB after that.
 *
 * UX:
 *   1. User picks a file (or drops one — Phase 4 hooks drop here).
 *   2. We dynamic-import the library so the 7MB model isn't shipped
 *      with the main bundle for users who never use this feature.
 *   3. Show original + processed side-by-side once done.
 *   4. "Сохранить" → resize through processStickerImage to fit the
 *      512KB cap → calls onSave({image, mimetype}).
 *
 * The dynamic import is the critical bit: bundling @imgly directly
 * into the main chunk would push the gzipped main bundle from ~115KB
 * to ~280KB and the user would be downloading 7MB ONNX bytes the
 * moment they hit the dashboard. Lazy keeps both small.
 */
export default function BackgroundRemovalModal({ open, onClose, onSave }) {
  const [phase, setPhase] = useState('idle'); // 'idle'|'loading-model'|'processing'|'done'|'saving'
  const [originalUrl, setOriginalUrl] = useState('');
  const [processedUrl, setProcessedUrl] = useState('');
  const [processedBlob, setProcessedBlob] = useState(null);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  // Hold the lazy-imported function so subsequent uses skip the import
  // round-trip (the import is also browser-cached, so the cost is one
  // round-trip per session in the worst case).
  const removeBgRef = useRef(null);

  useEffect(() => {
    if (!open) {
      // Reset on close so reopening starts clean. Revoke any blob URLs
      // we minted to avoid the 50–300KB-per-blob memory leak that
      // accumulates with repeated opens.
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (processedUrl) URL.revokeObjectURL(processedUrl);
      setOriginalUrl('');
      setProcessedUrl('');
      setProcessedBlob(null);
      setPhase('idle');
      setProgressMsg('');
      setError('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. ~8 МБ).');
      return;
    }
    setError('');
    setProcessedBlob(null);
    setProcessedUrl('');
    const oUrl = URL.createObjectURL(file);
    setOriginalUrl(oUrl);

    try {
      // Lazy load the lib + model. The first call kicks off the ~7MB
      // ONNX download which takes 5-30s on cold cache; subsequent
      // calls in the same session are instant.
      if (!removeBgRef.current) {
        setPhase('loading-model');
        setProgressMsg('Загружаем модель (≈7 МБ, один раз на сессию)...');
        const mod = await import('@imgly/background-removal');
        removeBgRef.current = mod.removeBackground;
      }

      setPhase('processing');
      setProgressMsg('Удаляем фон...');
      const blob = await removeBgRef.current(file, {
        // Smaller input for speed; the output preserves alpha and we'll
        // resize down to 512×512 anyway via processStickerImage below.
        output: { format: 'image/png', quality: 0.95 },
      });
      const pUrl = URL.createObjectURL(blob);
      setProcessedBlob(blob);
      setProcessedUrl(pUrl);
      setPhase('done');
      setProgressMsg('');
    } catch (err) {
      console.error('[bg-removal] failed:', err);
      setError('Не удалось убрать фон. Попробуйте другую картинку.');
      setPhase('idle');
    }
  };

  const handleSave = async () => {
    if (!processedBlob) return;
    setPhase('saving');
    try {
      const { dataUrl, mimetype } = await processStickerImage(processedBlob);
      const ok = await onSave?.({ image: dataUrl, mimetype });
      if (ok !== false) onClose?.();
    } catch (err) {
      toast.error(err.message || 'Не удалось сохранить');
      setPhase('done');
    }
  };

  const busy = phase === 'loading-model' || phase === 'processing' || phase === 'saving';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:p-6"
          onClick={busy ? undefined : onClose}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="chunky-card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden p-0"
          >
            {/* Header */}
            <div className="flex flex-shrink-0 items-center gap-2 border-b-2 border-slate-200 px-4 py-3 dark:border-slate-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-slate-900 bg-emerald-100 text-emerald-700 dark:border-white dark:bg-emerald-900/40 dark:text-emerald-200">
                <ImagePlus size={14} strokeWidth={2.6} />
              </div>
              <h3 className="flex-1 text-base font-black text-slate-900 dark:text-white">Убрать фон</h3>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {phase === 'idle' && !originalUrl && (
                <div
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-600 dark:bg-slate-800/40"
                  onClick={() => fileRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-white text-slate-700 dark:border-white dark:bg-slate-900 dark:text-slate-200">
                    <Upload size={20} strokeWidth={2.4} />
                  </div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">Выберите картинку</p>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    PNG / JPG / WebP до 8 МБ
                  </p>
                  <p className="mt-3 max-w-md text-[11px] font-medium text-slate-400">
                    Модель ИИ загрузится один раз за сессию (~7 МБ). После этого
                    обработка ~3–10 секунд на телефоне.
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-500 dark:bg-red-900/20 dark:text-red-200">
                  {error}
                </div>
              )}

              {originalUrl && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Slot label="Оригинал" url={originalUrl} />
                    <Slot
                      label="Без фона"
                      url={processedUrl}
                      busy={busy}
                      busyMessage={progressMsg}
                      checkered
                    />
                  </div>

                  {phase === 'done' && (
                    <p className="text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <Sparkles size={10} className="mr-1 inline" strokeWidth={2.6} />
                      Готово. Можно сохранить или загрузить другую.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-shrink-0 items-center gap-2 border-t-2 border-slate-200 px-4 py-3 dark:border-slate-700">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onFile}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 transition active:translate-y-[1px] disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                Выбрать другую
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!processedBlob || busy}
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-primary-500 px-3 py-2 text-xs font-black text-white transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white"
                style={{ boxShadow: '0 3px 0 #9a3412' }}
              >
                {phase === 'saving'
                  ? <><Loader2 size={12} className="animate-spin" strokeWidth={2.6} /> Сохраняем...</>
                  : <><Check size={12} strokeWidth={2.8} /> Сохранить в пак</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ──────────────────────────────────────────────────────────────────────
function Slot({ label, url, busy, busyMessage, checkered }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
      <div
        className={`relative aspect-square overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 ${
          checkered ? 'bg-[length:16px_16px] bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%,transparent_75%,#e2e8f0_75%),linear-gradient(45deg,#e2e8f0_25%,transparent_25%,transparent_75%,#e2e8f0_75%)] bg-[position:0_0,8px_8px] dark:bg-[linear-gradient(45deg,#334155_25%,transparent_25%,transparent_75%,#334155_75%),linear-gradient(45deg,#334155_25%,transparent_25%,transparent_75%,#334155_75%)]' : ''
        }`}
      >
        {url
          ? <img src={url} alt={label} className="h-full w-full object-contain" />
          : busy
            ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center">
                <Loader2 size={20} className="animate-spin text-slate-500" strokeWidth={2.4} />
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-300">{busyMessage}</p>
              </div>
            )
            : <p className="flex h-full items-center justify-center text-[11px] font-medium text-slate-400">—</p>}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Sparkles, X } from 'lucide-react';

/**
 * AI sticker generation modal. Talks to /api/stickers/ai-generate via
 * the `aiGenerate` callback (provided by useStickers). Returns 4
 * variants from Pollinations.ai which the user picks from to save
 * into the active pack.
 *
 * Saving is delegated upward — we don't know which pack the user is
 * editing. Parent passes `onSave(image, mimetype)` to write into pack.
 *
 * Selection model: tap a variant to toggle its "selected" flag, then
 * tap "Сохранить выбранные" to add multiple at once. This is faster
 * for the common case of "I like 2 of the 4 generations".
 */
export default function AIStickerModal({ open, onClose, onGenerate, onSave }) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState([]); // [{ image, mimetype, prompt, source, selected? }]
  const [remaining, setRemaining] = useState(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPrompt('');
    setVariants([]);
    setGenerating(false);
    setSaving(false);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose?.();
  };

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || trimmed.length < 3) return;
    setGenerating(true);
    setVariants([]);
    try {
      const result = await onGenerate({ prompt: trimmed, count: 4 });
      if (result?.images?.length) {
        setVariants(result.images.map(img => ({ ...img, selected: false })));
        if (typeof result.remaining === 'number') setRemaining(result.remaining);
      } else {
        setVariants([]);
      }
    } finally {
      setGenerating(false);
    }
  };

  const toggleSelect = (idx) => {
    setVariants(prev => prev.map((v, i) => i === idx ? { ...v, selected: !v.selected } : v));
  };

  const handleSave = async () => {
    const picks = variants.filter(v => v.selected);
    if (picks.length === 0) return;
    setSaving(true);
    try {
      // Save sequentially so we hit the per-pack count limit cleanly
      // and surface the first failure to the user. Parallel + Promise.all
      // would mask which save failed.
      for (const v of picks) {
        const ok = await onSave({ image: v.image, mimetype: v.mimetype || 'image/png' });
        if (!ok) break;
      }
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:p-6"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="chunky-card flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden p-0"
          >
            {/* Header */}
            <div className="flex flex-shrink-0 items-center gap-2 border-b-2 border-slate-200 px-4 py-3 dark:border-slate-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-slate-900 bg-amber-100 text-amber-700 dark:border-white dark:bg-amber-900/40 dark:text-amber-200">
                <Sparkles size={14} strokeWidth={2.6} />
              </div>
              <h3 className="flex-1 text-base font-black text-slate-900 dark:text-white">AI стикеры</h3>
              {typeof remaining === 'number' && (
                <span className="rounded-full border-2 border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-200">
                  Осталось: {remaining}
                </span>
              )}
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {/* Prompt */}
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Опишите стикер
                </label>
                <textarea
                  rows={2}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Например: счастливый кот с короной"
                  disabled={generating || saving}
                  className="w-full resize-none rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generating || saving}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-primary-500 px-3 py-2 text-xs font-black text-white transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white"
                  style={{ boxShadow: '0 3px 0 #9a3412' }}
                >
                  {generating
                    ? <><Loader2 size={12} className="animate-spin" strokeWidth={2.6} /> Создаём 4 варианта...</>
                    : <><Sparkles size={12} strokeWidth={2.6} /> Сгенерировать 4 варианта</>}
                </button>
                {generating && (
                  <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Генерация занимает ~10–30 сек. Не закрывайте окно.
                  </p>
                )}
              </div>

              {/* Variants */}
              {variants.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Выберите понравившиеся
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {variants.map((v, i) => {
                      const sel = v.selected;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleSelect(i)}
                          disabled={saving}
                          className={`relative aspect-square overflow-hidden rounded-2xl border-2 bg-slate-50 transition active:scale-95 dark:bg-slate-800 ${
                            sel
                              ? 'border-primary-500 ring-2 ring-primary-300 dark:ring-primary-600'
                              : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                          }`}
                        >
                          <img src={v.image} alt={`variant ${i + 1}`} className="h-full w-full object-contain" />
                          {sel && (
                            <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 bg-primary-500 text-white dark:border-white">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {variants.length > 0 && (
              <div className="flex flex-shrink-0 items-center gap-2 border-t-2 border-slate-200 px-4 py-3 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setVariants([])}
                  disabled={saving}
                  className="rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 transition active:translate-y-[1px] disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  Сбросить
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || variants.every(v => !v.selected)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-primary-500 px-3 py-2 text-xs font-black text-white transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white"
                  style={{ boxShadow: '0 3px 0 #9a3412' }}
                >
                  {saving
                    ? <><Loader2 size={12} className="animate-spin" strokeWidth={2.6} /> Сохраняем...</>
                    : <><Check size={12} strokeWidth={2.8} /> Сохранить выбранные ({variants.filter(v => v.selected).length})</>}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

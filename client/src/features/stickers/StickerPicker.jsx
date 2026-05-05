import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Settings, Sparkles, Sticker as StickerIcon, X } from 'lucide-react';
import { useStickers } from './useStickers';

/**
 * Bottom-sheet (mobile) / popover-style sheet (desktop) sticker picker.
 *
 * Behavior:
 *   - Shows packs as horizontal tabs across the top.
 *   - Special tabs: "Discover" (public packs) and "Settings" (→ /stickers).
 *   - Click a sticker → calls `onPick(sticker)` and closes.
 *   - Lazy-loads discover packs only when the tab is opened the first
 *     time so the initial picker open doesn't pay for that round-trip.
 *
 * The picker reuses the same `useStickers` instance the page does, but
 * since both consumers fetch separately the cache miss is cheap (one
 * `/api/stickers/my` call). React Query would help here later — for
 * now we keep deps minimal.
 */
export default function StickerPicker({ open, onClose, onPick }) {
  const navigate = useNavigate();
  const { myPacks, loading, refetch, discover, installPack } = useStickers({ autoLoad: open });

  const [activeTab, setActiveTab] = useState('first'); // packId | 'discover'
  const [discoverPacks, setDiscoverPacks] = useState(null); // null = not loaded
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState('');
  const discoverDebounceRef = useRef(null);

  // Auto-select the first pack when opened — saves a tap.
  useEffect(() => {
    if (open && activeTab === 'first' && myPacks.length > 0) {
      setActiveTab(myPacks[0]._id);
    }
  }, [open, myPacks, activeTab]);

  // Refetch on every open so newly-installed packs appear without
  // forcing the user to close and reopen the chat.
  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  // Lazy load + debounce discover.
  useEffect(() => {
    if (activeTab !== 'discover') return;
    if (discoverDebounceRef.current) clearTimeout(discoverDebounceRef.current);
    setDiscoverLoading(true);
    discoverDebounceRef.current = setTimeout(async () => {
      const data = await discover({ q: discoverQuery, page: 1 });
      setDiscoverPacks(data.packs || []);
      setDiscoverLoading(false);
    }, 250);
    return () => discoverDebounceRef.current && clearTimeout(discoverDebounceRef.current);
  }, [activeTab, discoverQuery, discover]);

  const activePack = useMemo(() => {
    if (activeTab === 'discover' || activeTab === 'first') return null;
    return myPacks.find(p => String(p._id) === String(activeTab)) || null;
  }, [activeTab, myPacks]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-end sm:justify-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex h-[60vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border-2 border-b-0 border-slate-900 bg-white shadow-[0_-4px_0_#0f172a] dark:border-white dark:bg-slate-900 sm:mb-3 sm:mr-3 sm:h-[480px] sm:max-w-md sm:rounded-3xl sm:border-b-2 sm:shadow-[0_4px_0_#0f172a]"
        >
          {/* ── Top bar with pack tabs ── */}
          <div className="flex items-center gap-2 border-b-2 border-slate-200 px-3 py-2 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('discover')}
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 transition active:translate-y-[1px] ${
                activeTab === 'discover'
                  ? 'border-slate-900 bg-amber-100 text-amber-700 dark:border-white dark:bg-amber-900/40 dark:text-amber-200'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
              }`}
              title="Открыть"
              aria-label="Открыть"
            >
              <Search size={14} strokeWidth={2.4} />
            </button>

            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
              {loading && myPacks.length === 0 && (
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-9 w-9 flex-shrink-0 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
                  ))}
                </div>
              )}
              {myPacks.map(pack => {
                const active = activeTab === pack._id;
                const cover = pack.cover || pack.stickers?.[0]?.image;
                return (
                  <button
                    key={pack._id}
                    type="button"
                    onClick={() => setActiveTab(pack._id)}
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 transition active:translate-y-[1px] ${
                      active
                        ? 'border-slate-900 bg-primary-50 dark:border-white dark:bg-primary-900/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800'
                    }`}
                    title={pack.name}
                  >
                    {cover
                      ? <img src={cover} alt="" className="h-full w-full object-contain p-0.5" />
                      : <StickerIcon size={14} className="text-slate-400" strokeWidth={2.4} />}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => { onClose?.(); navigate('/stickers'); }}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 active:translate-y-[1px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              title="Управлять паками"
              aria-label="Управление паками"
            >
              <Settings size={14} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              aria-label="Закрыть"
            >
              <X size={15} />
            </button>
          </div>

          {/* ── Discover search input (only on discover tab) ── */}
          {activeTab === 'discover' && (
            <div className="flex-shrink-0 border-b-2 border-slate-200 px-3 py-2 dark:border-slate-700">
              <div className="relative">
                <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Поиск пака..."
                  value={discoverQuery}
                  onChange={(e) => setDiscoverQuery(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white py-1.5 pl-7 pr-3 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* ── Body ── */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {/* My pack: stickers grid */}
            {activePack && (
              <>
                {(activePack.stickers?.length || 0) === 0 ? (
                  <EmptyPack onAddClick={() => { onClose?.(); navigate('/stickers'); }} />
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {activePack.stickers.map(s => (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => onPick(s)}
                        className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-slate-50 p-1 transition hover:bg-primary-50 active:scale-95 dark:bg-slate-800 dark:hover:bg-primary-900/30"
                        title={s.emoji ? `Стикер ${s.emoji}` : 'Стикер'}
                      >
                        <img
                          src={s.image}
                          alt={s.emoji || 'sticker'}
                          className="max-h-full max-w-full object-contain"
                          draggable={false}
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Discover */}
            {activeTab === 'discover' && (
              <div className="space-y-3">
                {discoverLoading && discoverPacks === null && (
                  <p className="py-8 text-center text-xs font-medium text-slate-400">Поиск паков...</p>
                )}
                {!discoverLoading && (discoverPacks?.length || 0) === 0 && (
                  <p className="py-8 text-center text-xs font-medium text-slate-400">
                    {discoverQuery ? 'Ничего не найдено' : 'Публичных паков пока нет'}
                  </p>
                )}
                {(discoverPacks || []).map(pack => (
                  <DiscoverCard
                    key={pack._id}
                    pack={pack}
                    onInstall={async () => {
                      const installed = await installPack(pack._id);
                      if (installed) {
                        // Mark as installed in local discover list.
                        setDiscoverPacks(prev => (prev || []).map(p =>
                          String(p._id) === String(pack._id) ? { ...p, isInstalled: true } : p
                        ));
                      }
                    }}
                  />
                ))}
              </div>
            )}

            {/* No packs yet — first-time empty state */}
            {!loading && myPacks.length === 0 && activeTab !== 'discover' && (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <div
                  className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-900 bg-amber-50 text-amber-600 dark:border-white dark:bg-amber-900/30 dark:text-amber-200"
                  style={{ boxShadow: '0 3px 0 #0f172a' }}
                >
                  <StickerIcon size={22} strokeWidth={2.2} />
                </div>
                <p className="text-sm font-black text-slate-900 dark:text-white">У вас пока нет паков</p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Создайте свой пак или найдите готовые
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => { onClose?.(); navigate('/stickers'); }}
                    className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-primary-500 px-3 py-1.5 text-xs font-black text-white transition active:translate-y-[1px] dark:border-white"
                    style={{ boxShadow: '0 2px 0 #9a3412' }}
                  >
                    <Plus size={12} strokeWidth={2.6} /> Создать пак
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition active:translate-y-[1px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Search size={12} strokeWidth={2.6} /> Найти
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Subcomponents
// ──────────────────────────────────────────────────────────────────────

function EmptyPack({ onAddClick }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <p className="text-sm font-black text-slate-900 dark:text-white">Пак пока пуст</p>
      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        Добавьте стикеры на странице управления
      </p>
      <button
        type="button"
        onClick={onAddClick}
        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-primary-500 px-3 py-1.5 text-xs font-black text-white transition active:translate-y-[1px] dark:border-white"
        style={{ boxShadow: '0 2px 0 #9a3412' }}
      >
        <Sparkles size={12} strokeWidth={2.6} /> Добавить стикер
      </button>
    </div>
  );
}

function DiscoverCard({ pack, onInstall }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-900 dark:text-white">{pack.name}</p>
          <p className="text-[11px] font-medium text-slate-400">
            {pack.stickerCount || 0} стикеров · {pack.installCount || 0} установок
          </p>
        </div>
        {pack.isInstalled ? (
          <span className="inline-flex flex-shrink-0 items-center rounded-full border-2 border-emerald-400 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
            Установлен
          </span>
        ) : (
          <button
            type="button"
            onClick={onInstall}
            className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border-2 border-slate-900 bg-primary-500 px-2.5 py-0.5 text-[10px] font-black text-white transition active:translate-y-[1px] dark:border-white"
            style={{ boxShadow: '0 2px 0 #9a3412' }}
          >
            <Plus size={10} strokeWidth={2.8} /> Установить
          </button>
        )}
      </div>
      {(pack.previewStickers?.length || 0) > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {pack.previewStickers.slice(0, 4).map(s => (
            <div key={s._id} className="aspect-square overflow-hidden rounded-lg bg-slate-50 p-1 dark:bg-slate-900">
              <img src={s.image} alt="" className="h-full w-full object-contain" loading="lazy" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

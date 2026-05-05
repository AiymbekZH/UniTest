import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Check, Globe, ImagePlus, Loader2, Lock, Plus,
  Sparkles, Sticker as StickerIcon, Trash2, Upload, X,
} from 'lucide-react';
import { useStickers } from '../features/stickers/useStickers';
import AIStickerModal from '../features/stickers/AIStickerModal';
import BackgroundRemovalModal from '../features/stickers/BackgroundRemovalModal';
import { processStickerImage } from '../features/stickers/imageResize';

/**
 * /stickers — manage sticker packs and stickers within them.
 *
 * Layout: master/detail.
 *   - Top: pack list (horizontal scroll on mobile, vertical on desktop).
 *   - Below: details of the selected pack — stickers grid + add buttons.
 *
 * Add buttons:
 *   - Upload file (PNG/JPG/WebP up to ~5MB pre-resize, auto-compressed
 *     client-side to fit the server's 512 KB cap).
 *   - Background removal (Phase 3b — currently shows a "Coming soon" toast).
 *   - Mini-editor (Phase 3b — same).
 *   - AI generation (Phase 1 backend exists, modal lives here).
 */
export default function MyStickersPage() {
  const navigate = useNavigate();
  const {
    myPacks, loading,
    createPack, updatePack, deletePack,
    addSticker, removeSticker,
    aiGenerate,
  } = useStickers();

  const [activePackId, setActivePackId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAi, setShowAi] = useState(false);
  // Phase 3b: background removal flow lives in its own modal because
  // the model load + processing UX is too noisy to inline next to the
  // upload button.
  const [showBgRm, setShowBgRm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Auto-pick first pack when list hydrates.
  useEffect(() => {
    if (!activePackId && myPacks.length > 0) {
      setActivePackId(myPacks[0]._id);
    }
  }, [myPacks, activePackId]);

  const activePack = useMemo(
    () => myPacks.find(p => String(p._id) === String(activePackId)) || null,
    [myPacks, activePackId]
  );

  const isOwnerOfActive = activePack?.isOwner;

  const handleUpload = async (file) => {
    if (!file || !activePack) return;
    if (!isOwnerOfActive) {
      toast.error('Можно добавлять стикеры только в свои паки');
      return;
    }
    setUploading(true);
    try {
      const { dataUrl, mimetype } = await processStickerImage(file);
      const ok = await addSticker(activePack._id, {
        image: dataUrl,
        mimetype,
        source: 'upload',
      });
      if (ok) toast.success('Стикер добавлен');
    } catch (err) {
      toast.error(err.message || 'Не удалось обработать картинку');
    } finally {
      setUploading(false);
    }
  };

  const handleAiSave = async ({ image, mimetype }) => {
    if (!activePack || !isOwnerOfActive) {
      toast.error('Сначала выберите свой пак');
      return false;
    }
    const ok = await addSticker(activePack._id, { image, mimetype, source: 'ai' });
    return Boolean(ok);
  };

  // Phase 3b: same shape as handleAiSave but with `source: 'background_removed'`
  // so we can later filter by sticker creation method.
  const handleBgRmSave = async ({ image, mimetype }) => {
    if (!activePack || !isOwnerOfActive) {
      toast.error('Сначала выберите свой пак');
      return false;
    }
    const ok = await addSticker(activePack._id, {
      image,
      mimetype,
      source: 'background_removed',
    });
    if (ok) toast.success('Стикер добавлен');
    return Boolean(ok);
  };

  const handleDeletePack = async () => {
    if (!activePack || !isOwnerOfActive) return;
    const yes = window.confirm(`Удалить пак "${activePack.name}" со всеми ${activePack.stickerCount || 0} стикерами?`);
    if (!yes) return;
    const ok = await deletePack(activePack._id);
    if (ok) setActivePackId(null);
  };

  const handleTogglePublic = async () => {
    if (!activePack || !isOwnerOfActive) return;
    await updatePack(activePack._id, { isPublic: !activePack.isPublic });
  };

  return (
    <div className="min-h-[100dvh] bg-surface pb-12">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b-2 border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-white text-slate-900 transition active:translate-y-[2px] dark:border-white dark:bg-slate-900 dark:text-white"
            style={{ boxShadow: '0 3px 0 #0f172a' }}
            aria-label="Назад"
          >
            <ArrowLeft size={15} strokeWidth={2.4} />
          </button>
          <div className="flex flex-1 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-900 bg-amber-100 text-amber-700 dark:border-white dark:bg-amber-900/40 dark:text-amber-200">
              <StickerIcon size={15} strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-black text-slate-900 dark:text-white">Мои стикеры</h1>
              <p className="text-[10px] font-bold text-slate-400">{myPacks.length} паков</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-primary-500 px-3 py-2 text-xs font-black text-white transition active:translate-y-[1px] dark:border-white"
            style={{ boxShadow: '0 3px 0 #9a3412' }}
          >
            <Plus size={12} strokeWidth={2.6} /> Новый пак
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-3 pt-4 sm:px-6">
        {loading && myPacks.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[5/4] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700" />
            ))}
          </div>
        ) : myPacks.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          <>
            {/* Pack list — chips */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
              {myPacks.map(p => {
                const active = String(p._id) === String(activePackId);
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => setActivePackId(p._id)}
                    className={`flex flex-shrink-0 items-center gap-2 rounded-2xl border-2 px-3 py-2 transition active:translate-y-[1px] ${
                      active
                        ? 'border-slate-900 bg-primary-50 dark:border-white dark:bg-primary-900/15'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                    }`}
                    style={active ? { boxShadow: '0 2px 0 #0f172a' } : undefined}
                  >
                    <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-900">
                      {p.cover || p.stickers?.[0]?.image
                        ? <img src={p.cover || p.stickers[0].image} alt="" className="h-full w-full object-contain p-0.5" />
                        : <StickerIcon size={12} className="text-slate-400" />}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-900 dark:text-white">{p.name}</p>
                      <p className="text-[9px] font-bold text-slate-400">
                        {p.stickerCount || 0} · {p.isOwner ? (p.isPublic ? 'публичный' : 'личный') : 'установлен'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active pack details */}
            {activePack && (
              <PackDetails
                pack={activePack}
                isOwner={isOwnerOfActive}
                uploading={uploading}
                onUpload={() => fileRef.current?.click()}
                onAiOpen={() => setShowAi(true)}
                onBgRmOpen={() => setShowBgRm(true)}
                onDeleteSticker={(sid) => removeSticker(activePack._id, sid)}
                onDeletePack={handleDeletePack}
                onTogglePublic={handleTogglePublic}
              />
            )}
          </>
        )}
      </div>

      {/* Hidden file input shared by all upload triggers in PackDetails */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
          e.target.value = '';
        }}
      />

      {/* Modals */}
      <CreatePackModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={async (data) => {
          const pack = await createPack(data);
          if (pack) {
            setActivePackId(pack._id);
            setShowCreate(false);
          }
        }}
      />

      <AIStickerModal
        open={showAi}
        onClose={() => setShowAi(false)}
        onGenerate={aiGenerate}
        onSave={handleAiSave}
      />

      <BackgroundRemovalModal
        open={showBgRm}
        onClose={() => setShowBgRm(false)}
        onSave={handleBgRmSave}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Subcomponents
// ──────────────────────────────────────────────────────────────────────

function EmptyState({ onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div
        className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-slate-900 bg-amber-50 text-amber-600 dark:border-white dark:bg-amber-900/30 dark:text-amber-200"
        style={{ boxShadow: '0 4px 0 #0f172a' }}
      >
        <StickerIcon size={32} strokeWidth={2.2} />
      </div>
      <h2 className="text-lg font-black text-slate-900 dark:text-white">Создайте первый пак</h2>
      <p className="mt-2 max-w-xs text-xs font-medium text-slate-500 dark:text-slate-400">
        Добавляйте свои картинки или генерируйте через ИИ. Делайте паки публичными — другие смогут их установить.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-4 inline-flex items-center gap-1.5 rounded-2xl border-2 border-slate-900 bg-primary-500 px-4 py-2.5 text-sm font-black text-white transition active:translate-y-[1px] dark:border-white"
        style={{ boxShadow: '0 4px 0 #9a3412' }}
      >
        <Plus size={14} strokeWidth={2.8} /> Новый пак
      </button>
    </div>
  );
}

function PackDetails({
  pack, isOwner, uploading,
  onUpload, onAiOpen, onBgRmOpen,
  onDeleteSticker, onDeletePack, onTogglePublic,
}) {
  return (
    <div className="space-y-4">
      {/* Header row with metadata + actions */}
      <div className="chunky-card flex items-center gap-3 p-3 sm:p-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-900">
          {pack.cover || pack.stickers?.[0]?.image
            ? <img src={pack.cover || pack.stickers[0].image} alt="" className="h-full w-full object-contain p-1" />
            : <StickerIcon size={20} className="text-slate-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-sm font-black text-slate-900 dark:text-white">{pack.name}</h2>
            {pack.isOwner && (
              <span className={`inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[9px] font-black ${
                pack.isPublic
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                  : 'border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {pack.isPublic ? <Globe size={9} strokeWidth={2.6} /> : <Lock size={9} strokeWidth={2.6} />}
                {pack.isPublic ? 'Публичный' : 'Личный'}
              </span>
            )}
            {!pack.isOwner && (
              <span className="inline-flex items-center rounded-full border-2 border-amber-300 bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-200">
                Установлен
              </span>
            )}
          </div>
          {pack.description && (
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {pack.description}
            </p>
          )}
          <p className="mt-0.5 text-[10px] font-bold text-slate-400">
            {pack.stickerCount || 0} стикеров · {pack.installCount || 0} установок
          </p>
        </div>
        {isOwner && (
          <div className="flex flex-shrink-0 gap-1.5">
            <button
              type="button"
              onClick={onTogglePublic}
              className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-slate-600 transition active:translate-y-[1px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              title={pack.isPublic ? 'Сделать личным' : 'Сделать публичным'}
              aria-label="Видимость"
            >
              {pack.isPublic ? <Lock size={12} strokeWidth={2.4} /> : <Globe size={12} strokeWidth={2.4} />}
            </button>
            <button
              type="button"
              onClick={onDeletePack}
              className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-red-300 bg-white text-red-500 transition active:translate-y-[1px] hover:bg-red-50 dark:border-red-500/60 dark:bg-slate-800 dark:hover:bg-red-900/20"
              title="Удалить пак"
              aria-label="Удалить пак"
            >
              <Trash2 size={12} strokeWidth={2.4} />
            </button>
          </div>
        )}
      </div>

      {/* Add buttons row — owner only */}
      {isOwner && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <AddButton
            label="Загрузить"
            sub="PNG/WebP/JPG"
            icon={Upload}
            onClick={onUpload}
            loading={uploading}
            tone="primary"
          />
          <AddButton
            label="AI стикер"
            sub="Опишите идею"
            icon={Sparkles}
            onClick={onAiOpen}
            tone="amber"
          />
          <AddButton
            label="Убрать фон"
            sub="ИИ в браузере"
            icon={ImagePlus}
            onClick={onBgRmOpen}
            tone="emerald"
          />
          <AddButton
            label="Редактор"
            sub="Скоро"
            icon={ImagePlus}
            disabled
            tone="slate"
          />
        </div>
      )}

      {/* Stickers grid */}
      {(pack.stickers?.length || 0) === 0 ? (
        <div className="chunky-card flex flex-col items-center justify-center px-4 py-10 text-center">
          <p className="text-sm font-black text-slate-900 dark:text-white">Пак пока пуст</p>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {isOwner ? 'Добавьте первый стикер сверху' : 'Хозяин пака ещё не добавил стикеры'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {pack.stickers.map(s => (
            <div
              key={s._id}
              className="group relative aspect-square overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-50 p-1.5 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
            >
              <img
                src={s.image}
                alt=""
                className="h-full w-full object-contain"
                loading="lazy"
                draggable={false}
              />
              {isOwner && (
                <button
                  type="button"
                  onClick={() => onDeleteSticker(s._id)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-lg border-2 border-red-500 bg-white/95 text-red-500 opacity-0 transition group-hover:opacity-100 dark:bg-slate-900/95"
                  title="Удалить"
                  aria-label="Удалить стикер"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              )}
              {s.source === 'ai' && (
                <span
                  className="pointer-events-none absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-md border border-amber-400 bg-amber-50 px-1 text-[8px] font-black uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                  title="Сгенерировано ИИ"
                >
                  <Sparkles size={7} strokeWidth={2.8} /> AI
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddButton({ label, sub, icon: Icon, onClick, disabled, loading, tone = 'primary' }) {
  const tones = {
    primary: 'border-slate-900 bg-primary-50 text-primary-600 dark:border-white dark:bg-primary-900/20 dark:text-primary-200',
    amber: 'border-slate-900 bg-amber-50 text-amber-600 dark:border-white dark:bg-amber-900/30 dark:text-amber-200',
    emerald: 'border-slate-900 bg-emerald-50 text-emerald-600 dark:border-white dark:bg-emerald-900/30 dark:text-emerald-200',
    slate: 'border-slate-300 bg-slate-50 text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left transition active:translate-y-[1px] disabled:cursor-not-allowed ${tones[tone] || tones.primary}`}
      style={!disabled ? { boxShadow: '0 3px 0 #0f172a' } : undefined}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 dark:bg-slate-900/40">
        {loading ? <Loader2 size={14} className="animate-spin" strokeWidth={2.6} /> : <Icon size={14} strokeWidth={2.6} />}
      </div>
      <p className="text-xs font-black">{label}</p>
      <p className="text-[10px] font-medium opacity-70">{sub}</p>
    </button>
  );
}

function CreatePackModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setIsPublic(false);
      setCreating(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    await onCreate({ name: trimmed, description: description.trim(), isPublic });
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="chunky-card w-full max-w-md p-5"
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-900 bg-primary-500 text-white dark:border-white">
            <Plus size={15} strokeWidth={2.6} />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">Новый пак</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Название</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Например: Мемы 2026"
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Описание (опц.)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              placeholder="О чём этот пак?"
              className="w-full resize-none rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/60">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-2 border-slate-400 accent-primary-500"
            />
            <Globe size={12} strokeWidth={2.4} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Публичный — другие могут найти и установить
            </span>
          </label>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="flex-1 rounded-xl border-2 border-slate-300 bg-white px-3 py-2.5 text-xs font-black text-slate-700 transition active:translate-y-[1px] disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={!name.trim() || creating}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-slate-900 bg-primary-500 px-3 py-2.5 text-xs font-black text-white transition active:translate-y-[1px] disabled:opacity-50 dark:border-white"
            style={{ boxShadow: '0 3px 0 #9a3412' }}
          >
            {creating
              ? <><Loader2 size={12} className="animate-spin" strokeWidth={2.6} /> Создаём...</>
              : <><Check size={12} strokeWidth={2.8} /> Создать</>}
          </button>
        </div>
      </form>
    </div>
  );
}

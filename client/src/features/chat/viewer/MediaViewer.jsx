import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, Share2, X, ZoomIn } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import toast from 'react-hot-toast';

/**
 * Phase 3b media viewer for the new chat shell. Replaces the legacy
 * MediaViewerModal — that one is single-image and has no zoom. This
 * one supports:
 *
 *   - Pinch-zoom + double-tap to zoom (via react-zoom-pan-pinch).
 *   - ← / → swipe between media in the same chat (caller passes a list).
 *   - Keyboard arrows + Esc.
 *   - Web Share API on mobile, falls back to Download otherwise.
 *
 * The caller provides:
 *   media          : { kind: 'image'|'video', attachment: { data, mimetype, filename } }
 *   list           : optional [media...]  — for swipe carousel
 *   index          : optional starting index when `list` is given
 *   onClose        : ()=>void
 *
 * If `list` is omitted, swipe nav is hidden — the viewer behaves like
 * a one-shot single-item modal.
 */
export default function MediaViewer({ media, list, index = 0, onClose }) {
  // Internal index when carousel is enabled. Initialized from prop and
  // moves on swipe / arrow / button.
  const [activeIndex, setActiveIndex] = useState(index);
  // Ref to the TransformWrapper so we can reset zoom between slides
  // (otherwise zooming in on slide A and swiping to B carries the zoom).
  const transformRef = useRef(null);

  const carousel = Array.isArray(list) && list.length > 1;
  const current = carousel ? list[activeIndex] : media;

  useEffect(() => {
    setActiveIndex(index);
  }, [index]);

  // Keyboard: Esc closes, ← → cycle.
  useEffect(() => {
    if (!current) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      else if (e.key === 'ArrowLeft' && carousel) prev();
      else if (e.key === 'ArrowRight' && carousel) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, carousel, activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Disable body scroll while the modal is open. Without this iOS Safari
  // happily scrolls the document under the modal during pinch gestures.
  useEffect(() => {
    if (!current) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [current]);

  if (!current) return null;

  const att = current.attachment;
  const src = att?.data?.startsWith('data:') ? att.data : `data:${att?.mimetype};base64,${att?.data}`;

  function next() {
    if (!carousel) return;
    transformRef.current?.resetTransform();
    setActiveIndex(i => (i + 1) % list.length);
  }
  function prev() {
    if (!carousel) return;
    transformRef.current?.resetTransform();
    setActiveIndex(i => (i - 1 + list.length) % list.length);
  }

  async function share() {
    try {
      // Convert data URL → File and try Web Share API. Falls back to
      // download if the runtime doesn't support it (most desktops).
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], att.filename || 'media', { type: att.mimetype });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
      // Fallback: download.
      const a = document.createElement('a');
      a.href = src;
      a.download = att.filename || 'media';
      a.click();
    } catch (err) {
      // AbortError is what we get when the user cancels the share sheet
      // — perfectly normal, don't toast it.
      if (err?.name !== 'AbortError') toast.error('Не удалось поделиться');
    }
  }

  function download() {
    const a = document.createElement('a');
    a.href = src;
    a.download = att.filename || 'media';
    a.click();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex flex-col bg-black/95"
        onClick={onClose}
      >
        {/* ── Top bar ── */}
        <div
          className="flex flex-shrink-0 items-center gap-2 p-3 sm:p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Закрыть"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
          {att?.filename && (
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-white/90">{att.filename}</p>
          )}
          {carousel && (
            <span className="rounded-full border-2 border-white/30 bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white">
              {activeIndex + 1} / {list.length}
            </span>
          )}
          <button
            type="button"
            onClick={share}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Поделиться"
            title="Поделиться"
          >
            <Share2 size={16} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={download}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Скачать"
            title="Скачать"
          >
            <Download size={16} strokeWidth={2.4} />
          </button>
        </div>

        {/* ── Body: zoomable image / video ── */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
          {current.kind === 'image' ? (
            <TransformWrapper
              ref={transformRef}
              initialScale={1}
              minScale={1}
              maxScale={6}
              doubleClick={{ mode: 'toggle', step: 1.5 }}
              wheel={{ step: 0.2 }}
              pinch={{ step: 8 }}
              panning={{ disabled: false }}
              centerOnInit
              limitToBounds
              key={activeIndex /* reset wrapper on slide change */}
            >
              <TransformComponent
                wrapperClass="!w-full !h-full"
                contentClass="!w-full !h-full !flex !items-center !justify-center"
              >
                <img
                  src={src}
                  alt={att?.filename || ''}
                  className="max-h-[calc(100dvh-200px)] max-w-[95vw] select-none object-contain"
                  draggable={false}
                />
              </TransformComponent>
            </TransformWrapper>
          ) : current.kind === 'video' ? (
            <video
              src={src}
              controls
              autoPlay
              className="max-h-[calc(100dvh-200px)] max-w-[95vw] rounded-lg"
            />
          ) : (
            <div className="rounded-2xl bg-white/10 p-6 text-white">
              <p className="text-sm">Неподдерживаемый тип медиа</p>
            </div>
          )}

          {/* Carousel arrows — only on desktop; mobile users swipe */}
          {carousel && (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 sm:flex"
                aria-label="Предыдущее"
              >
                <ChevronLeft size={20} strokeWidth={2.6} />
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 sm:flex"
                aria-label="Следующее"
              >
                <ChevronRight size={20} strokeWidth={2.6} />
              </button>
            </>
          )}
        </div>

        {/* ── Bottom hint ── */}
        <div
          className="flex flex-shrink-0 items-center justify-center gap-2 p-3 text-[11px] text-white/60 sm:p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <ZoomIn size={11} strokeWidth={2.4} />
          <span>Двойное касание — увеличить · Pinch — масштаб</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

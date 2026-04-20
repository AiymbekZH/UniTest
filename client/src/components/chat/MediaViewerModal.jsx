import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function MediaViewerModal({ media, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragOrigin, setDragOrigin] = useState(null);

  useEffect(() => {
    if (!media) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [media, onClose]);

  useEffect(() => {
    if (!media) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDragOrigin(null);
  }, [media]);

  const src = useMemo(() => {
    if (!media?.attachment) return '';
    const { attachment } = media;
    return attachment.data?.startsWith('data:')
      ? attachment.data
      : `data:${attachment.mimetype};base64,${attachment.data}`;
  }, [media]);

  const changeZoom = (nextZoom) => {
    const clamped = clamp(nextZoom, 1, 4);
    setZoom(clamped);
    if (clamped === 1) setOffset({ x: 0, y: 0 });
  };

  if (!media) return null;

  const downloadName = media.attachment?.filename || 'attachment';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/88 p-3 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: 'spring', damping: 24, stiffness: 260 }}
          onClick={(event) => event.stopPropagation()}
          className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{downloadName}</p>
              <p className="text-xs text-slate-400">{media.label}</p>
            </div>

            <div className="flex items-center gap-2">
              {media.kind === 'image' && (
                <>
                  <button
                    type="button"
                    onClick={() => changeZoom(zoom - 0.25)}
                    className="rounded-xl bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
                    title="Уменьшить"
                  >
                    <ZoomOut size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => changeZoom(zoom + 0.25)}
                    className="rounded-xl bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
                    title="Увеличить"
                  >
                    <ZoomIn size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      changeZoom(1);
                      setOffset({ x: 0, y: 0 });
                    }}
                    className="rounded-xl bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
                    title="Сбросить"
                  >
                    <RotateCcw size={18} />
                  </button>
                </>
              )}

              <a
                href={src}
                download={downloadName}
                className="rounded-xl bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
                title="Скачать"
              >
                <Download size={18} />
              </a>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
                title="Закрыть"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_42%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))]">
            {media.kind === 'image' && (
              <div
                className="flex h-full w-full items-center justify-center overflow-hidden"
                onWheel={(event) => {
                  event.preventDefault();
                  changeZoom(zoom + (event.deltaY < 0 ? 0.2 : -0.2));
                }}
                onMouseMove={(event) => {
                  if (!dragOrigin || zoom <= 1) return;
                  setOffset({
                    x: dragOrigin.baseX + event.clientX - dragOrigin.startX,
                    y: dragOrigin.baseY + event.clientY - dragOrigin.startY,
                  });
                }}
                onMouseUp={() => setDragOrigin(null)}
                onMouseLeave={() => setDragOrigin(null)}
              >
                <img
                  src={src}
                  alt={downloadName}
                  className={`max-h-full max-w-full select-none object-contain ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  draggable={false}
                  style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transition: dragOrigin ? 'none' : 'transform 160ms ease' }}
                  onMouseDown={(event) => {
                    if (zoom <= 1) return;
                    setDragOrigin({
                      startX: event.clientX,
                      startY: event.clientY,
                      baseX: offset.x,
                      baseY: offset.y,
                    });
                  }}
                />
              </div>
            )}

            {media.kind === 'video' && (
              <div className="flex h-full items-center justify-center p-4">
                <video
                  src={src}
                  controls
                  className="max-h-full w-full max-w-5xl rounded-2xl bg-black object-contain"
                />
              </div>
            )}

            {media.kind === 'pdf' && (
              <iframe
                title={downloadName}
                src={src}
                className="h-full w-full"
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

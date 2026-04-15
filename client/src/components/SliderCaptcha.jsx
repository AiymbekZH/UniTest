import { useEffect, useId, useRef, useState } from 'react';

const BOARD_W = 320;
const BOARD_H = 180;
const PIECE = 52;
const MAX_X = BOARD_W - PIECE - 10;
const MIN_X = 100;
const MAX_Y = BOARD_H - PIECE - 20;
const TOL = 8;
const CLIP = 'M10 4h28a8 8 0 018 8v3a8 8 0 008 8 8 8 0 00-8 8v3a8 8 0 01-8 8H10a8 8 0 01-8-8v-5a8 8 0 000-8 8 8 0 000-8V12a8 8 0 018-8z';

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function newScene() {
  const hue = 210 + Math.floor(Math.random() * 30);
  const tx = clamp(Math.floor(Math.random() * (MAX_X - MIN_X)) + MIN_X, MIN_X, MAX_X);
  const ty = clamp(Math.floor(Math.random() * (MAX_Y - 16)) + 16, 16, MAX_Y);

  const bars = Array.from({ length: 6 }, (_, i) => {
    const h = 16 + Math.floor(Math.random() * 36);
    return `<rect x="${200 + i * 14}" y="${150 - h}" width="8" height="${h}" rx="4" fill="rgba(255,255,255,0.3)"/>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BOARD_W}" height="${BOARD_H}" viewBox="0 0 ${BOARD_W} ${BOARD_H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="${BOARD_W}" y2="${BOARD_H}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="hsl(${hue} 80% 55%)"/>
        <stop offset="1" stop-color="hsl(${hue + 40} 70% 50%)"/>
      </linearGradient>
    </defs>
    <rect width="${BOARD_W}" height="${BOARD_H}" rx="16" fill="url(#bg)"/>
    <circle cx="80" cy="90" r="50" fill="rgba(255,255,255,0.12)"/>
    <circle cx="260" cy="40" r="35" fill="rgba(255,255,255,0.08)"/>
    <rect x="24" y="24" width="90" height="10" rx="5" fill="rgba(255,255,255,0.5)"/>
    <rect x="24" y="42" width="70" height="8" rx="4" fill="rgba(255,255,255,0.25)"/>
    <rect x="24" y="58" width="80" height="8" rx="4" fill="rgba(255,255,255,0.2)"/>
    ${bars}
    <path d="M20 160Q80 120,140 140T260 110T${BOARD_W} 130" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  </svg>`;

  return { image: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, tx, ty };
}

export default function SliderCaptcha({ onVerify, resetKey }) {
  const id = useId().replace(/:/g, '');
  const trackRef = useRef(null);
  const posRef = useRef(0);
  const sceneRef = useRef(null);
  const [scene, setScene] = useState(() => { const s = newScene(); sceneRef.current = s; return s; });
  const [pos, setPos] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | active | ok | fail

  const moveTo = v => { const b = clamp(v, 0, MAX_X); posRef.current = b; setPos(b); };

  const reset = () => {
    const s = newScene();
    sceneRef.current = s;
    setScene(s);
    moveTo(0);
    setDragging(false);
    setStatus('idle');
    onVerify?.(false);
  };

  const finish = () => {
    const t = sceneRef.current?.tx ?? scene.tx;
    if (Math.abs(posRef.current - t) <= TOL) {
      moveTo(t);
      setStatus('ok');
      onVerify?.(true);
    } else {
      setStatus('fail');
      onVerify?.(false);
    }
  };

  const fromX = cx => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    moveTo(cx - r.left - 20);
    if (status !== 'ok') { setStatus('active'); onVerify?.(false); }
  };

  useEffect(() => { reset(); }, [resetKey]);

  useEffect(() => {
    if (!dragging) return;
    const move = e => fromX(e.clientX);
    const up = () => { setDragging(false); finish(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [dragging, status]);

  const dist = Math.abs(pos - scene.tx);
  const prox = status === 'ok' ? 1 : clamp(1 - dist / 50, 0, 1);
  const pct = `${clamp(((pos + 20) / (MAX_X + 20)) * 100, 0, 100)}%`;

  const msg = status === 'ok' ? 'Проверка пройдена'
    : status === 'fail' ? (pos < scene.tx ? 'Чуть правее' : 'Чуть левее')
    : status === 'active' ? (prox > 0.7 ? 'Почти...' : 'Совместите с контуром')
    : 'Сдвиньте ползунок';

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Проверка</p>
        <button type="button" onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
          Обновить
        </button>
      </div>

      {/* Board */}
      <div className="relative mx-auto w-full max-w-[320px] overflow-hidden rounded-xl" style={{ aspectRatio: `${BOARD_W}/${BOARD_H}` }}>
        <img src={scene.image} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" />

        {/* Target outline */}
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}>
          <path d={CLIP} transform={`translate(${scene.tx} ${scene.ty})`}
            fill={`rgba(0,0,0,${0.35 - prox * 0.15})`}
            stroke={status === 'ok' ? '#34d399' : `rgba(255,255,255,${0.4 + prox * 0.5})`}
            strokeWidth="2" strokeDasharray={status === 'ok' ? '0' : '4 5'} />
        </svg>

        {/* Draggable piece */}
        <div className={`absolute top-0 select-none ${dragging ? '' : 'transition-[left] duration-150'}`}
          style={{ left: pos, top: scene.ty, width: PIECE, height: PIECE }}>
          <svg viewBox="0 0 52 52" className="h-full w-full drop-shadow-lg">
            <defs><clipPath id={id}><path d={CLIP} /></clipPath></defs>
            <image href={scene.image} x={-scene.tx} y={-scene.ty} width={BOARD_W} height={BOARD_H}
              preserveAspectRatio="none" clipPath={`url(#${id})`} />
            <path d={CLIP} fill="rgba(255,255,255,0.06)"
              stroke={status === 'ok' ? '#34d399' : 'rgba(255,255,255,0.7)'} strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* Slider track */}
      <div ref={trackRef} className="relative mt-3 h-10 touch-none rounded-full border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-700">
        <div className="absolute inset-x-5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gray-100 dark:bg-slate-600" />
        <div className={`absolute left-5 top-1/2 h-1.5 -translate-y-1/2 rounded-full ${status === 'ok' ? 'bg-emerald-400' : 'bg-blue-400'}`} style={{ width: pct }} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-medium uppercase tracking-widest text-gray-300 dark:text-slate-500">
          {status === 'ok' ? 'Verified' : 'Slide'}
        </div>
        <button type="button"
          onPointerDown={e => { if (status === 'ok') return; e.preventDefault(); setDragging(true); fromX(e.clientX); }}
          className={`absolute top-0.5 flex h-9 w-9 items-center justify-center rounded-full border shadow transition
            ${status === 'ok' ? 'border-emerald-300 bg-emerald-500 text-white' : 'border-gray-200 bg-blue-500 text-white dark:border-slate-500'}
            ${dragging ? 'cursor-grabbing scale-105' : 'cursor-grab'}`}
          style={{ left: pos }}>
          {status === 'ok'
            ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          }
        </button>
      </div>

      <p className={`mt-2 text-center text-[11px] ${status === 'ok' ? 'text-emerald-500' : status === 'fail' ? 'text-amber-500' : 'text-gray-400'}`}>
        {msg}
      </p>
    </div>
  );
}

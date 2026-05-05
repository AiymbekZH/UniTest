import { useEffect, useRef } from 'react';

/**
 * Tiny waveform renderer for voice messages. Decodes a Blob with the
 * page's AudioContext, downsamples the PCM into N bars, and paints
 * them on a canvas. Progress (0..1) overlays the played portion in
 * the primary colour.
 *
 * Why not wavesurfer.js?
 *   wavesurfer.js is great but ~30KB gzipped + provides way more than
 *   we need (audio control, regions, plugins). For a 60-bar static
 *   waveform inside a 280×40 canvas, native AudioContext + canvas
 *   draw is ~80 lines, no dependency, no init cost on chats without
 *   audio messages.
 *
 * Failure modes (silent fallback):
 *   - Browser without AudioContext → render flat dashes; the parent's
 *     progress bar is a fine fallback.
 *   - Blob decode throws (corrupt or unsupported codec) → flat dashes.
 *   - Both branches are non-crashing because we never throw out of
 *     this component.
 */
const BAR_COUNT = 60;

export default function WaveformCanvas({
  blob,
  progress = 0,        // 0..1 played fraction (drives the orange overlay)
  height = 36,
  primary = '#f97316', // orange-500 to match primary palette
  base = '#cbd5e1',    // slate-300
  className = '',
}) {
  const canvasRef = useRef(null);
  const peaksRef = useRef(null); // Float32Array of 60 normalized peaks

  // ── Decode the blob once and downsample into BAR_COUNT peaks ──
  useEffect(() => {
    let cancelled = false;
    peaksRef.current = null;

    if (!blob) {
      drawBars(canvasRef.current, null, 0, height, primary, base);
      return;
    }

    (async () => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const arrayBuffer = await blob.arrayBuffer();
        const audio = await ctx.decodeAudioData(arrayBuffer.slice(0));
        // Mono mixdown — for stereo we'd average channels, but the
        // recorder is single-channel and most browsers honour that.
        const channel = audio.getChannelData(0);
        const samplesPerBar = Math.floor(channel.length / BAR_COUNT);
        const peaks = new Float32Array(BAR_COUNT);
        let maxPeak = 0;
        for (let b = 0; b < BAR_COUNT; b++) {
          const start = b * samplesPerBar;
          const end = start + samplesPerBar;
          let peak = 0;
          // Walk in steps of ~16 to keep this O(N/16) per bar — at 48k
          // samples that's still fine but visibly faster on long blobs.
          for (let i = start; i < end; i += 16) {
            const v = Math.abs(channel[i] || 0);
            if (v > peak) peak = v;
          }
          peaks[b] = peak;
          if (peak > maxPeak) maxPeak = peak;
        }
        // Normalize so the loudest bar fills the canvas. Without this
        // quiet recordings render as a row of nearly-flat marks.
        if (maxPeak > 0) {
          for (let b = 0; b < BAR_COUNT; b++) peaks[b] /= maxPeak;
        }
        if (cancelled) return;
        peaksRef.current = peaks;
        // Free the AudioContext immediately — we don't need it again
        // for this blob. Older Safari leaks if we forget.
        ctx.close?.();
        drawBars(canvasRef.current, peaks, progress, height, primary, base);
      } catch (_) {
        if (cancelled) return;
        peaksRef.current = null;
        drawBars(canvasRef.current, null, progress, height, primary, base);
      }
    })();

    return () => { cancelled = true; };
  }, [blob, height, primary, base]); // progress NOT in deps; redrawn separately

  // ── Repaint when progress moves ──
  useEffect(() => {
    drawBars(canvasRef.current, peaksRef.current, progress, height, primary, base);
  }, [progress, height, primary, base]);

  return (
    <canvas
      ref={canvasRef}
      // CSS height matches the prop; CSS width follows parent flexbox.
      style={{ height, width: '100%', display: 'block' }}
      className={className}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────
// Standalone draw fn so the same logic services initial render, peak
// arrival, and progress-only redraw paths.
// ──────────────────────────────────────────────────────────────────────
function drawBars(canvas, peaks, progress, height, primary, base) {
  if (!canvas) return;
  // Snap canvas pixel dimensions to the CSS box so bars stay sharp on
  // HiDPI screens. Without dpr handling the bars look fuzzy on iPhones.
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || 240;
  const cssH = height;
  if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
  }

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const barCount = peaks?.length || BAR_COUNT;
  const gap = 2;
  const barW = Math.max(1, (cssW - (barCount - 1) * gap) / barCount);
  const minH = 3; // visual floor so silent regions still show as a tick

  for (let i = 0; i < barCount; i++) {
    const peak = peaks ? peaks[i] : 0.15; // flat fallback
    const h = Math.max(minH, peak * cssH);
    const x = i * (barW + gap);
    const y = (cssH - h) / 2;

    const filled = i / barCount < progress;
    ctx.fillStyle = filled ? primary : base;
    ctx.beginPath();
    // Rounded caps make the bars match the rest of the chunky design
    // language without paying for full Path2D rectangles.
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, barW, h, Math.min(barW / 2, 2));
    } else {
      ctx.rect(x, y, barW, h);
    }
    ctx.fill();
  }
}

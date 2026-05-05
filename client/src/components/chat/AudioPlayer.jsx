import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import WaveformCanvas from '../../features/chat/components/WaveformCanvas';

/**
 * Voice / audio attachment renderer used by both the legacy and Phase-2
 * chat bubbles.
 *
 * Color contract:
 *   The default waveform palette uses primary-orange for the played
 *   portion. Inside an OWN bubble (which is also primary-orange) the
 *   played overlay would be invisible against the background — a long
 *   voice message looked like a flat colored bar with no progress
 *   indicator at all. The `tone` prop lets the caller flip the palette
 *   to a high-contrast white-on-translucent set when the bubble's bg
 *   is the brand color.
 *
 *   tone='own'   → bubble bg is primary-orange. Use white played /
 *                  white-30 unplayed / white play button.
 *   tone='other' → default. Orange progress on slate-300 baseline.
 */
export default function AudioPlayer({ data, mimetype, filename, tone = 'other' }) {
  const isOwn = tone === 'own';
  const [playing, setPlaying] = useState(false);
  // Position is the played fraction (0..1) so it can drive both the
  // waveform overlay and the seek-on-click handler in one place.
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  // Decoded blob is held alongside the <audio> src so WaveformCanvas
  // can decode it via AudioContext. Fetched once per data prop change.
  const [blob, setBlob] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const mt = mimetype || 'audio/webm';
    const src = data.startsWith('data:') ? data : `data:${mt};base64,${data}`;
    const audio = new Audio(src);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration || 0));
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) setPosition(audio.currentTime / audio.duration);
    });
    audio.addEventListener('ended', () => { setPlaying(false); setPosition(0); });

    // Pull the bytes into a Blob too, so the waveform can decode them.
    // We avoid the network round-trip for data:URLs by decoding inline.
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(src);
        const b = await resp.blob();
        if (!cancelled) setBlob(b);
      } catch (_) {
        if (!cancelled) setBlob(null);
      }
    })();

    return () => {
      cancelled = true;
      audio.pause();
      audio.src = '';
    };
  }, [data, mimetype]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
    setPlaying(!playing);
  };

  // Click anywhere on the waveform to seek.
  const seekFromClick = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
    setPosition(pct);
  };

  const fmt = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  // Fixed width (not max-width) so the parent bubble shrinks to fit
  // the player exactly. With max-w-[280px] some browsers reported the
  // bubble growing toward its 70-75% column cap when the audio data
  // hadn't decoded yet — the WaveformCanvas's width:100% canvas was
  // sizing itself to the available width before decode completed.
  // 240px is wide enough for ~60 bars + the 36px play button + label.
  return (
    <div className="flex w-[240px] items-center gap-2.5">
      <button
        onClick={toggle}
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition ${
          isOwn
            ? 'bg-white text-primary-600 hover:bg-orange-50'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
        aria-label={playing ? 'Пауза' : 'Воспроизвести'}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div onClick={seekFromClick} className="cursor-pointer">
          <WaveformCanvas
            blob={blob}
            progress={position}
            height={26}
            primary={isOwn ? '#ffffff' : '#f97316'}
            base={isOwn ? 'rgba(255, 255, 255, 0.45)' : '#cbd5e1'}
          />
        </div>
        <span className={`mt-0.5 block text-[10px] ${isOwn ? 'text-white/85' : 'text-gray-400'}`}>
          {fmt((audioRef.current?.currentTime) || 0)} / {fmt(duration)}
        </span>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import WaveformCanvas from '../../features/chat/components/WaveformCanvas';

export default function AudioPlayer({ data, mimetype, filename }) {
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

  return (
    <div className="flex min-w-[180px] max-w-[280px] items-center gap-2.5">
      <button
        onClick={toggle}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-600"
        aria-label={playing ? 'Пауза' : 'Воспроизвести'}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div onClick={seekFromClick} className="cursor-pointer">
          <WaveformCanvas blob={blob} progress={position} height={26} />
        </div>
        <span className="mt-0.5 block text-[10px] text-gray-400">
          {fmt((audioRef.current?.currentTime) || 0)} / {fmt(duration)}
        </span>
      </div>
    </div>
  );
}

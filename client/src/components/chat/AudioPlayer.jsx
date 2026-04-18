import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

export default function AudioPlayer({ data, mimetype, filename }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const src = data.startsWith('data:') ? data : `data:${mimetype || 'audio/webm'};base64,${data}`;
    const audio = new Audio(src);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    });
    audio.addEventListener('ended', () => { setPlaying(false); setProgress(0); });

    return () => { audio.pause(); audio.src = ''; };
  }, [data, mimetype]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); }
    else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const seek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
  };

  const fmt = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2.5 min-w-[180px] max-w-[260px]">
      <button onClick={toggle} className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 hover:bg-blue-600 transition">
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full cursor-pointer overflow-hidden" onClick={seek}>
          <div className="h-full bg-blue-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] text-gray-400 mt-0.5 block">{fmt(audioRef.current?.currentTime || 0)} / {fmt(duration)}</span>
      </div>
    </div>
  );
}

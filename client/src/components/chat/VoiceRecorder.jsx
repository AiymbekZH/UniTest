import { useEffect, useRef, useState } from 'react';
import { Check, Mic, Pause, Play, RotateCw, Square, Trash2, X } from 'lucide-react';

const MAX_DURATION = 120; // 2 minutes

// Pick the first MIME the runtime supports. Order matters: WebM/Opus is the
// modern preferred container, OGG is the desktop Firefox fallback, and MP4
// is the Safari/iOS only path. Without the MP4 entry iPhones silently fail
// to record at all (the `MediaRecorder` ctor throws NotSupportedError).
function pickMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  const tries = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'];
  for (const m of tries) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

function extFor(mime) {
  if (!mime) return 'bin';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4')) return 'm4a';
  return 'bin';
}

function fmt(s) {
  const total = Math.max(0, Math.floor(s));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// Three-state component: idle (mic button), recording (timer + stop/cancel),
// preview (playback + send/discard/re-record). The old version posted the
// blob the moment the user clicked Stop \u2014 there was no way back. Now the
// blob lives in component state until Send is explicitly clicked.
export default function VoiceRecorder({ onRecorded, onCancel }) {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'recording' | 'preview'
  const [duration, setDuration] = useState(0); // recording timer (sec)
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedMime, setRecordedMime] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  const [playbackPos, setPlaybackPos] = useState(0);
  const [playbackDur, setPlaybackDur] = useState(0);

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  // Free the object URL when we move off preview \u2014 long-lived URLs leak
  // memory (each blob URL pins ~50-300KB until tab close).
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const cleanupRecorder = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    if (mediaRef.current) {
      try {
        mediaRef.current.stream?.getTracks().forEach(t => t.stop());
      } catch (_) {}
      mediaRef.current = null;
    }
  };

  const resetAll = () => {
    cleanupRecorder();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setRecordedBlob(null);
    setRecordedMime('');
    setPlaying(false);
    setPlaybackPos(0);
    setPlaybackDur(0);
    setDuration(0);
    setPhase('idle');
  };

  const startRecording = async () => {
    const mime = pickMime();
    if (!mime) {
      alert('\u0412\u0430\u0448 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u0437\u0430\u043f\u0438\u0441\u044c \u0433\u043e\u043b\u043e\u0441\u043e\u0432\u044b\u0445 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0439');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.error('Microphone access denied:', e);
      alert('\u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u043a \u043c\u0438\u043a\u0440\u043e\u0444\u043e\u043d\u0443. \u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0432 \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430\u0445 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430.');
      return;
    }

    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: mime });
    } catch (e) {
      console.error('MediaRecorder ctor failed:', e);
      stream.getTracks().forEach(t => t.stop());
      return;
    }

    mediaRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      // Don't stop tracks here \u2014 cleanupRecorder() handles it. We just
      // assemble the blob and switch into preview mode, leaving the user
      // in control of whether to actually send.
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      setRecordedBlob(blob);
      setRecordedMime(recorder.mimeType);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      cleanupRecorder();
      setPhase('preview');
    };

    recorder.start(200);
    setDuration(0);
    setPhase('recording');
    timerRef.current = setInterval(() => {
      setDuration(d => {
        if (d + 1 >= MAX_DURATION) {
          // Hit cap \u2014 stop and let onstop fire to switch to preview.
          try { mediaRef.current?.stop(); } catch (_) {}
          return MAX_DURATION;
        }
        return d + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRef.current?.state === 'recording') {
      try { mediaRef.current.stop(); } catch (_) {}
    }
  };

  const cancelRecording = () => {
    if (mediaRef.current?.state === 'recording') {
      // Drop the chunks before onstop runs so we don't leak into preview.
      mediaRef.current.onstop = null;
      try { mediaRef.current.stop(); } catch (_) {}
    }
    cleanupRecorder();
    setDuration(0);
    setPhase('idle');
    onCancel?.();
  };

  // Convert blob -> base64 (no data: prefix) lazily, only once the user
  // confirms send. Keeps the optimistic UX fast since we don't pay the
  // base64 cost on every preview.
  const sendRecording = () => {
    if (!recordedBlob) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(',')[1] || '';
      onRecorded({
        data: base64,
        mimetype: recordedMime,
        filename: `voice_${Date.now()}.${extFor(recordedMime)}`,
        size: recordedBlob.size,
      });
      resetAll();
    };
    reader.readAsDataURL(recordedBlob);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  };

  // ── Render ──

  if (phase === 'recording') {
    return (
      <div className="flex flex-1 items-center gap-3 rounded-xl bg-red-50 px-4 py-2.5 dark:bg-red-900/20">
        <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
        <span className="min-w-[3rem] font-mono text-sm font-medium text-red-600 dark:text-red-400">{fmt(duration)}</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-red-200 dark:bg-red-800">
          <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${(duration / MAX_DURATION) * 100}%` }} />
        </div>
        <button onClick={cancelRecording} className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-100 dark:hover:bg-red-800/40" aria-label="Отменить запись">
          <X size={16} />
        </button>
        <button onClick={stopRecording} className="rounded-xl bg-red-500 p-2 text-white transition hover:bg-red-600" aria-label="Закончить запись">
          <Square size={14} />
        </button>
      </div>
    );
  }

  if (phase === 'preview') {
    return (
      <div className="flex flex-1 items-center gap-2 rounded-xl border-2 border-primary-200 bg-primary-50/60 px-3 py-2 dark:border-primary-800/50 dark:bg-primary-900/20">
        {/* Hidden audio element drives playback state */}
        <audio
          ref={audioRef}
          src={previewUrl}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            // Some browsers report Infinity for blob URLs from MediaRecorder
            // until the user seeks. Fall back to the recording timer.
            setPlaybackDur(Number.isFinite(d) && d > 0 ? d : duration);
          }}
          onTimeUpdate={(e) => setPlaybackPos(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setPlaybackPos(0); }}
        />

        <button
          onClick={togglePlay}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-500 text-white transition hover:bg-primary-600"
          aria-label={playing ? 'Пауза' : 'Воспроизвести'}
        >
          {playing ? <Pause size={14} strokeWidth={2.6} /> : <Play size={14} strokeWidth={2.6} />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="h-1 overflow-hidden rounded-full bg-primary-200/60 dark:bg-primary-700/40">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{
                width: `${playbackDur > 0 ? Math.min(100, (playbackPos / playbackDur) * 100) : 0}%`,
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-medium text-primary-700 dark:text-primary-200">
            <span>{fmt(playbackPos)}</span>
            <span>{fmt(playbackDur || duration)}</span>
          </div>
        </div>

        <button
          onClick={resetAll}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-700"
          aria-label="Удалить и записать заново"
          title="Удалить и записать заново"
        >
          <Trash2 size={14} strokeWidth={2.4} />
        </button>

        <button
          onClick={() => { resetAll(); setTimeout(startRecording, 0); }}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-amber-600 dark:text-slate-400 dark:hover:bg-slate-700"
          aria-label="Перезаписать"
          title="Перезаписать"
        >
          <RotateCw size={14} strokeWidth={2.4} />
        </button>

        <button
          onClick={sendRecording}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary-500 text-white transition active:translate-y-[2px] dark:border-white"
          style={{ boxShadow: '0 3px 0 #9a3412' }}
          aria-label="Отправить голосовое"
          title="Отправить"
        >
          <Check size={15} strokeWidth={2.8} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700 active:translate-y-[2px] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white"
      style={{ boxShadow: '0 2px 0 #cbd5e1' }}
      aria-label="Голосовое сообщение"
      title="Голосовое сообщение"
    >
      <Mic size={16} strokeWidth={2.4} />
    </button>
  );
}

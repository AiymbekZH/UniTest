import { useState, useRef } from 'react';
import { Mic, Square, X } from 'lucide-react';

export default function VoiceRecorder({ onRecorded, onCancel }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const MAX_DURATION = 120; // 2 minutes

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      });
      mediaRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        const reader = new FileReader();
        reader.onload = () => {
          onRecorded({
            data: reader.result.split(',')[1], // base64 without prefix
            mimetype: mediaRecorder.mimeType,
            filename: `voice_${Date.now()}.webm`,
            size: blob.size,
          });
        };
        reader.readAsDataURL(blob);
        setRecording(false);
        setDuration(0);
      };

      mediaRecorder.start(200);
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d >= MAX_DURATION - 1) {
            mediaRef.current?.stop();
            return 0;
          }
          return d + 1;
        });
      }, 1000);
    } catch (e) {
      console.error('Microphone access denied:', e);
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
  };

  const cancelRecording = () => {
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.onstop = () => {
        mediaRef.current.stream?.getTracks().forEach(t => t.stop());
      };
      mediaRef.current.stop();
    }
    clearInterval(timerRef.current);
    setRecording(false);
    setDuration(0);
    onCancel?.();
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (recording) {
    return (
      <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5 animate-pulse-slow">
        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm font-mono font-medium text-red-600 dark:text-red-400 min-w-[3rem]">{fmt(duration)}</span>
        <div className="flex-1 h-1 bg-red-200 dark:bg-red-800 rounded-full overflow-hidden">
          <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(duration / MAX_DURATION) * 100}%` }} />
        </div>
        <button onClick={cancelRecording} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-800/40 text-red-500 transition">
          <X size={16} />
        </button>
        <button onClick={stopRecording} className="p-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition">
          <Square size={14} />
        </button>
      </div>
    );
  }

  return (
    <button onClick={startRecording} className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition" title="Голосовое сообщение">
      <Mic size={18} />
    </button>
  );
}

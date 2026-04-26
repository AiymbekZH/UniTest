import { useState, useRef } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';

export default function ChatInput({ onSend, replyTo, onCancelReply, disabled }) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const fileRef = useRef(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    if (attachments.length > 0) {
      const att = attachments[0];
      const type = att.mimetype.startsWith('image/') ? 'image'
        : att.mimetype.startsWith('video/') ? 'video'
        : att.mimetype.startsWith('audio/') ? 'audio' : 'file';
      onSend({ text: trimmed, type, attachments, replyTo: replyTo?._id });
    } else {
      onSend({ text: trimmed, type: 'text', replyTo: replyTo?._id });
    }

    setText('');
    setAttachments([]);
    onCancelReply?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Максимум 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachments([{
        data: reader.result.split(',')[1],
        mimetype: file.type,
        filename: file.name,
        size: file.size,
        preview: file.type.startsWith('image/') || file.type.startsWith('video/') ? reader.result : null,
      }]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleVoice = (voiceData) => {
    onSend({
      text: '',
      type: 'audio',
      attachments: [voiceData],
      replyTo: replyTo?._id,
    });
    onCancelReply?.();
  };

  const canSend = !disabled && (text.trim() || attachments.length > 0);

  return (
    <div className="flex-shrink-0 border-t-2 border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800 sm:px-4 sm:py-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border-2 border-primary-400 bg-primary-50/50 px-3 py-2 text-xs dark:border-primary-500 dark:bg-primary-900/15">
          <div className="min-w-0 flex-1 truncate">
            <span className="font-black text-primary-600 dark:text-primary-300">{replyTo.sender?.firstName}</span>
            <span className="ml-1.5 font-medium text-slate-500 dark:text-slate-400">
              {replyTo.text?.slice(0, 80) || '(вложение)'}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
            aria-label="Отменить ответ"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Attachment preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex items-center gap-2">
          {attachments[0].preview && attachments[0].mimetype.startsWith('image/') ? (
            <img src={attachments[0].preview} alt="" className="h-16 w-16 rounded-xl border-2 border-slate-200 object-cover dark:border-slate-700" />
          ) : attachments[0].preview && attachments[0].mimetype.startsWith('video/') ? (
            <video src={attachments[0].preview} className="h-16 w-16 rounded-xl border-2 border-slate-200 bg-black object-cover dark:border-slate-700" muted playsInline />
          ) : (
            <div className="flex h-10 items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200">
              <Paperclip size={13} /> {attachments[0].filename}
            </div>
          )}
          <button
            onClick={() => setAttachments([])}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
            aria-label="Убрать вложение"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-1.5 sm:gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700 active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white"
          style={{ boxShadow: '0 2px 0 #cbd5e1' }}
          aria-label="Прикрепить файл"
          title="Прикрепить файл"
        >
          <Paperclip size={16} strokeWidth={2.4} />
        </button>
        <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar" onChange={handleFile} />

        <div className="min-w-0 flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Отправка отключена' : 'Сообщение...'}
            disabled={disabled}
            rows={1}
            className="block max-h-32 w-full resize-none overflow-y-auto rounded-xl border-2 border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-primary-900/30"
            style={{ minHeight: '40px' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
          />
        </div>

        <VoiceRecorder onRecorded={handleVoice} onCancel={() => {}} />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-primary-500 text-white transition active:translate-y-[2px] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:border-white dark:disabled:border-slate-600 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
          style={{ boxShadow: canSend ? '0 3px 0 #9a3412' : 'none' }}
          aria-label="Отправить"
        >
          <Send size={16} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import { Send, Paperclip, X, Image as ImageIcon } from 'lucide-react';
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
        preview: file.type.startsWith('image/') ? reader.result : null,
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

  return (
    <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 pl-3 border-l-2 border-blue-400 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex-1 min-w-0 truncate">
            <span className="font-medium text-blue-500">{replyTo.sender?.firstName}</span>:{' '}
            <span className="text-gray-400">{replyTo.text?.slice(0, 80) || '(вложение)'}</span>
          </div>
          <button onClick={onCancelReply} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-400">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Attachment preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex items-center gap-2">
          {attachments[0].preview ? (
            <img src={attachments[0].preview} alt="" className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="h-10 px-3 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <Paperclip size={14} /> {attachments[0].filename}
            </div>
          )}
          <button onClick={() => setAttachments([])} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-400">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <button onClick={() => fileRef.current?.click()} className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition" title="Прикрепить файл">
          <Paperclip size={18} />
        </button>
        <input ref={fileRef} type="file" className="hidden" accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar" onChange={handleFile} />

        <div className="flex-1 min-w-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition max-h-32 overflow-y-auto"
            style={{ minHeight: '42px' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
          />
        </div>

        <VoiceRecorder onRecorded={handleVoice} onCancel={() => {}} />

        <button onClick={handleSend} disabled={disabled || (!text.trim() && attachments.length === 0)}
          className="p-2.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Reply, Trash2, MessageSquareOff, Edit3, Flag, Check, X, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

function timeAgo(date) {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo`;
  return `${Math.floor(diff / 31536000)}y`;
}

export default function CommentsSection({ testId }) {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [creatorId, setCreatorId] = useState(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [reportModal, setReportModal] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!testId) return;
    api.get(`/comments/${testId}`)
      .then(res => {
        if (res.data.disabled) {
          setDisabled(true);
        } else {
          setComments(res.data.comments || []);
          setCreatorId(res.data.creatorId || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [testId]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/comments/${testId}`, { 
        text: text.trim(), 
        replyTo: replyTo ? (replyTo.replyTo || replyTo._id) : null 
      });
      setComments(prev => [res.data.comment, ...prev]);
      setText('');
      setReplyTo(null);
      setInputFocused(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setSending(false);
    }
  };

  const handleEdit = async (commentId) => {
    if (!editText.trim()) return;
    try {
      const res = await api.put(`/comments/${commentId}`, { text: editText.trim() });
      setComments(prev => prev.map(c => c._id === commentId ? res.data.comment : c));
      setEditingComment(null);
      setEditText('');
      toast.success('OK');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments(prev => prev.filter(c => c._id !== commentId));
      toast.success(t('deleteComment'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    try {
      await api.post('/reports', { targetType: 'comment', targetId: reportModal, reason: reportReason.trim() });
      toast.success(t('reportSent'));
      setReportModal(null);
      setReportReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleCancel = () => {
    setText('');
    setReplyTo(null);
    setInputFocused(false);
  };

  const isCreator = (userId) => creatorId && userId === creatorId;

  if (loading) return null;

  if (disabled) {
    return (
      <div className="py-6 mt-6">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <MessageSquareOff size={16} />
          {t('commentsDisabled')}
        </div>
      </div>
    );
  }

  const rootComments = comments.filter(c => !c.replyTo);
  const replies = comments.filter(c => c.replyTo);
  const rootIds = new Set(rootComments.map(c => c._id));
  const getReplies = (commentId) => replies.filter(r => {
    const rt = r.replyTo?._id || r.replyTo;
    if (rt === commentId) return true;
    if (!rootIds.has(rt)) {
      const parent = comments.find(c => c._id === rt);
      if (parent) {
        const parentRoot = parent.replyTo?._id || parent.replyTo;
        return parentRoot === commentId;
      }
    }
    return false;
  });

  const Avatar = ({ u, size = 36 }) => (
    <button
      onClick={() => u?._id && navigate(`/user/${u._id}`)}
      className="flex-shrink-0"
    >
      <div
        className="rounded-full bg-primary-600 flex items-center justify-center font-medium text-white overflow-hidden"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        {u?.avatar ? (
          <img src={u.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <span>{u?.firstName?.[0]}{u?.lastName?.[0]}</span>
        )}
      </div>
    </button>
  );

  const CommentItem = ({ comment, isReply = false }) => {
    const isEditing = editingComment === comment._id;
    const avatarSize = isReply ? 28 : 36;

    return (
      <div className="flex gap-3 group">
        <Avatar u={comment.user} size={avatarSize} />
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => comment.user?._id && navigate(`/user/${comment.user._id}`)}
              className={`${isReply ? 'text-xs' : 'text-[13px]'} font-semibold text-dark hover:text-primary-600 transition`}
            >
              @{comment.user?.firstName}{comment.user?.lastName ? ` ${comment.user.lastName}` : ''}
            </button>
            {isCreator(comment.user?._id) && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded text-[10px] font-medium">
                <Crown size={9} className="text-amber-500" /> {t('testCreator')}
              </span>
            )}
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {timeAgo(comment.createdAt)}
              {comment.isEdited && <span className="ml-1 italic">({t('edited')})</span>}
            </span>
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="mt-2">
              <textarea
                className="w-full bg-transparent border-b border-gray-300 dark:border-slate-600 focus:border-primary-500 outline-none text-sm text-dark resize-none py-1 transition-colors"
                rows={2}
                value={editText}
                onChange={e => setEditText(e.target.value)}
                maxLength={1000}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setEditingComment(null)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() => handleEdit(comment._id)}
                  disabled={!editText.trim()}
                  className="px-3 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-full hover:bg-primary-700 transition disabled:opacity-40"
                >
                  {t('editComment')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className={`${isReply ? 'text-xs' : 'text-sm'} text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap leading-relaxed`}>
                {comment.text}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-1 mt-1 -ml-2">
                {isAuthenticated && (
                  <button
                    onClick={() => { setReplyTo(comment); setInputFocused(true); setTimeout(() => inputRef.current?.focus(), 100); }}
                    className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 px-2 py-1 rounded-full transition"
                  >
                    {t('reply')}
                  </button>
                )}
                {user?.id === comment.user?._id && (
                  <button
                    onClick={() => { setEditingComment(comment._id); setEditText(comment.text); }}
                    className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 px-2 py-1 rounded-full transition opacity-0 group-hover:opacity-100"
                  >
                    {t('editComment')}
                  </button>
                )}
                {(user?.id === comment.user?._id || user?.role === 'admin') && (
                  <button
                    onClick={() => handleDelete(comment._id)}
                    className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 px-2 py-1 rounded-full transition opacity-0 group-hover:opacity-100"
                  >
                    {t('deleteComment')}
                  </button>
                )}
                {isAuthenticated && user?.id !== comment.user?._id && (
                  <button
                    onClick={() => setReportModal(comment._id)}
                    className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-orange-500 transition opacity-0 group-hover:opacity-100"
                  >
                    <Flag size={12} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8">
      {/* Header */}
      <h3 className="text-base font-semibold text-dark mb-6">
        {comments.length} {t('comments').toLowerCase()}
      </h3>

      {/* YouTube-style comment input */}
      {isAuthenticated && (
        <div className="mb-8">
          {replyTo && (
            <div className="flex items-center gap-2 mb-3 ml-12">
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('reply')}</span>
              <span className="text-xs font-medium text-dark">@{replyTo.user?.firstName} {replyTo.user?.lastName}</span>
              <button onClick={() => setReplyTo(null)} className="ml-auto text-gray-400 hover:text-gray-600 transition">
                <X size={14} />
              </button>
            </div>
          )}
          <div className="flex gap-3 items-start">
            <Avatar u={user} size={36} />
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-transparent border-b border-gray-200 dark:border-slate-700 focus:border-primary-500 outline-none text-sm text-dark placeholder-gray-400 dark:placeholder-gray-500 pb-1.5 transition-colors"
                placeholder={t('writeComment')}
                value={text}
                onChange={e => setText(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                maxLength={1000}
              />
              {(inputFocused || text.trim()) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex justify-end gap-2 mt-2"
                >
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    className="px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-full hover:bg-primary-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {t('addComment')}
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-5">
        <AnimatePresence>
          {rootComments.map(comment => (
            <motion.div key={comment._id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              <CommentItem comment={comment} />

              {/* Replies */}
              {getReplies(comment._id).length > 0 && (
                <div className="ml-12 mt-3 space-y-4">
                  {getReplies(comment._id).map(reply => (
                    <CommentItem key={reply._id} comment={reply} isReply />
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {comments.length === 0 && (
          <p className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
            {t('noOneCompleted').includes('test') ? t('writeComment') : t('comments')}: 0
          </p>
        )}
      </div>

      {/* Report modal */}
      <AnimatePresence>
        {reportModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setReportModal(null)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-5"
            >
              <h3 className="text-sm font-semibold text-dark mb-3">{t('reportComment')}</h3>
              <textarea
                className="w-full bg-transparent border border-gray-200 dark:border-slate-600 focus:border-primary-500 rounded-lg outline-none text-sm text-dark p-3 resize-none transition-colors"
                rows={3}
                placeholder={t('reportReason')}
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                maxLength={500}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => { setReportModal(null); setReportReason(''); }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition">
                  {t('cancel')}
                </button>
                <button onClick={handleReport} disabled={!reportReason.trim()}
                  className="px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-full hover:bg-primary-700 transition disabled:opacity-40">
                  {t('report')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

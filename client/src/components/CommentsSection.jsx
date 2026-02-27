import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Reply, Trash2, MessageSquareOff, Edit3, Flag, Check, X, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

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
  const [reportModal, setReportModal] = useState(null);
  const [reportReason, setReportReason] = useState('');

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

  const isCreator = (userId) => creatorId && userId === creatorId;

  if (loading) return null;

  if (disabled) {
    return (
      <div className="glass-card-solid p-4 mt-6">
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
    // Direct reply to this root comment
    if (rt === commentId) return true;
    // Reply to a reply (nested) - find the root parent
    if (!rootIds.has(rt)) {
      const parent = comments.find(c => c._id === rt);
      if (parent) {
        const parentRoot = parent.replyTo?._id || parent.replyTo;
        return parentRoot === commentId;
      }
    }
    return false;
  });

  const UserAvatar = ({ u, size = 'w-8 h-8', textSize = 'text-xs' }) => (
    <div className={`${size} rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center ${textSize} font-bold text-primary-600 flex-shrink-0 overflow-hidden`}>
      {u?.avatar ? (
        <img src={u.avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{u?.firstName?.[0]}{u?.lastName?.[0]}</span>
      )}
    </div>
  );

  const CreatorBadge = () => (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md text-[9px] font-semibold">
      <Crown size={8} /> {t('testCreator')}
    </span>
  );

  const CommentActions = ({ comment, isReply = false }) => (
    <div className="flex items-center gap-2 mt-2">
      {isAuthenticated && (
        <button onClick={() => setReplyTo(comment)}
          className="text-[11px] text-primary-500 hover:text-primary-600 flex items-center gap-1 transition">
          <Reply size={10} /> {t('reply')}
        </button>
      )}
      {user?.id === comment.user?._id && (
        <button onClick={() => { setEditingComment(comment._id); setEditText(comment.text); }}
          className="text-[11px] text-blue-500 hover:text-blue-600 flex items-center gap-1 transition">
          <Edit3 size={10} /> {t('editComment')}
        </button>
      )}
      {(user?.id === comment.user?._id || user?.role === 'admin') && (
        <button onClick={() => handleDelete(comment._id)}
          className="text-[11px] text-red-400 hover:text-red-500 flex items-center gap-1 transition">
          <Trash2 size={10} /> {t('deleteComment')}
        </button>
      )}
      {isAuthenticated && user?.id !== comment.user?._id && (
        <button onClick={() => setReportModal(comment._id)}
          className="text-[11px] text-gray-400 hover:text-orange-500 flex items-center gap-1 transition">
          <Flag size={10} />
        </button>
      )}
    </div>
  );

  const CommentContent = ({ comment, isReply = false }) => {
    const isEditing = editingComment === comment._id;
    return (
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => comment.user?._id && navigate(`/user/${comment.user._id}`)}
            className="text-sm font-medium text-dark hover:text-primary-600 transition"
          >
            {comment.user?.firstName} {comment.user?.lastName}
          </button>
          {isCreator(comment.user?._id) && <CreatorBadge />}
          {comment.isEdited && (
            <span className="text-[9px] text-gray-400 italic">({t('edited')})</span>
          )}
          <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
        </div>
        {isEditing ? (
          <div className="mt-2 flex gap-2">
            <textarea
              className="input-field text-sm flex-1 resize-none"
              rows={2}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              maxLength={1000}
            />
            <div className="flex flex-col gap-1">
              <button onClick={() => handleEdit(comment._id)} className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition">
                <Check size={12} />
              </button>
              <button onClick={() => setEditingComment(null)} className="p-1.5 rounded-lg bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 transition">
                <X size={12} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className={`${isReply ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap`}>{comment.text}</p>
            <CommentActions comment={comment} isReply={isReply} />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="mt-6">
      <h3 className="font-semibold text-dark mb-4 flex items-center gap-2">
        <MessageCircle size={18} />
        {t('comments')} ({comments.length})
      </h3>

      {/* Comment input */}
      {isAuthenticated && (
        <div className="glass-card-solid p-4 mb-4">
          {replyTo && (
            <div className="flex items-center gap-2 mb-2 text-xs text-primary-600 bg-primary-50 dark:bg-primary-900/20 p-2 rounded-lg">
              <Reply size={12} />
              <span className="flex-1">{t('reply')}: <strong>{replyTo.user?.firstName} {replyTo.user?.lastName}</strong></span>
              <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-red-500 transition">
                <X size={14} />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <UserAvatar u={user} />
            <textarea
              className="input-field text-sm flex-1 resize-none min-h-[40px]"
              rows={2}
              placeholder={t('writeComment')}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              maxLength={1000}
            />
            <button onClick={handleSend} disabled={!text.trim() || sending}
              className="btn-primary py-2 px-3 text-sm disabled:opacity-50 self-end">
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-3">
        <AnimatePresence>
          {rootComments.map(comment => (
            <motion.div key={comment._id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`glass-card-solid p-4 ${isCreator(comment.user?._id) ? 'border-l-3 border-amber-400' : ''}`}
            >
              <div className="flex items-start gap-3">
                <button onClick={() => comment.user?._id && navigate(`/user/${comment.user._id}`)}>
                  <UserAvatar u={comment.user} />
                </button>
                <CommentContent comment={comment} />
              </div>

              {/* Replies */}
              {getReplies(comment._id).length > 0 && (
                <div className="ml-11 mt-3 space-y-3 border-l-2 border-gray-100 dark:border-slate-700 pl-3">
                  {getReplies(comment._id).map(reply => (
                    <div key={reply._id} className={`flex items-start gap-2 ${isCreator(reply.user?._id) ? 'bg-amber-50/50 dark:bg-amber-900/10 -ml-3 pl-3 py-2 rounded-r-lg border-l-2 border-amber-400' : ''}`}>
                      <button onClick={() => reply.user?._id && navigate(`/user/${reply.user._id}`)}>
                        <UserAvatar u={reply.user} size="w-6 h-6" textSize="text-[10px]" />
                      </button>
                      <CommentContent comment={reply} isReply />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {comments.length === 0 && (
          <p className="text-center py-6 text-sm text-gray-400">
            {t('comments')}: 0
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                <Flag size={18} className="text-orange-500" />
                {t('reportComment')}
              </h3>
              <textarea
                className="input-field text-sm w-full resize-none"
                rows={3}
                placeholder={t('reportReason')}
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                maxLength={500}
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setReportModal(null); setReportReason(''); }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                  {t('cancel')}
                </button>
                <button onClick={handleReport} disabled={!reportReason.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition disabled:opacity-50">
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

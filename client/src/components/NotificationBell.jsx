import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, MessageCircle, AlertTriangle, Flag, Info, Trophy, Sparkles, Flame, Swords } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const typeIcons = {
  comment_reply: { icon: MessageCircle, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/30' },
  test_completed: { icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  report_status: { icon: Flag, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/30' },
  challenge_available: { icon: Trophy, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/30' },
  streak_risk: { icon: Flame, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  creator_new_test: { icon: Sparkles, color: 'text-fuchsia-500', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/30' },
  arena_invite: { icon: Swords, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/30' },
  arena_result: { icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  system: { icon: Info, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/30' },
};

export default function NotificationBell() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnread = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch {}
  };

  const fetchAll = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {}
  };

  const handleOpen = () => {
    setOpen(!open);
    if (!open) fetchAll();
  };

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleClick = (n) => {
    if (!n.isRead) markRead(n._id);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  const deleteNotif = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch {}
  };

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return 'сейчас';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч`;
    return `${Math.floor(diff / 86400)} д`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="icon-btn relative"
        title={t('notifications')}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[min(92vw,22rem)] bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-dark">{t('notifications')}</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="text-[11px] text-primary-500 hover:text-primary-600 flex items-center gap-1 transition">
                  <CheckCheck size={11} /> {t('markAllRead')}
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-slate-700">
                    <Bell size={18} className="text-gray-300 dark:text-gray-500" />
                  </div>
                  <p className="text-xs text-gray-400">{t('noNotifications')}</p>
                </div>
              ) : (
                notifications.map(n => {
                  const typeInfo = typeIcons[n.type] || typeIcons.system;
                  const Icon = typeInfo.icon;
                  return (
                    <div
                      key={n._id}
                      onClick={() => handleClick(n)}
                      className={`group flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer border-b border-gray-50 last:border-b-0 dark:border-slate-700/50 ${
                        !n.isRead ? 'bg-primary-50/40 dark:bg-primary-900/10' : ''
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={13} className={typeInfo.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-dark truncate">{n.title}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-gray-300 mt-0.5 block">{timeAgo(n.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5" />}
                        <button onClick={(e) => deleteNotif(e, n._id)}
                          className="p-1 rounded text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

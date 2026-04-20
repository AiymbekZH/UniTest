import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, MessageCircle, AlertTriangle, Flag, Info, Trophy, Sparkles, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const typeIcons = {
  comment_reply: { icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30' },
  test_completed: { icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  report_status: { icon: Flag, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/30' },
  challenge_available: { icon: Trophy, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/30' },
  streak_risk: { icon: Flame, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  creator_new_test: { icon: Sparkles, color: 'text-fuchsia-500', bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/30' },
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
        className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-all"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-dark">{t('notifications')}</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="text-[11px] text-primary-500 hover:text-primary-600 flex items-center gap-1 transition">
                  <CheckCheck size={12} /> {t('markAllRead')}
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-400">{t('noNotifications')}</p>
                </div>
              ) : (
                notifications.map(n => {
                  const typeInfo = typeIcons[n.type] || typeIcons.system;
                  const Icon = typeInfo.icon;
                  return (
                    <div
                      key={n._id}
                      onClick={() => handleClick(n)}
                      className={`flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer border-b border-gray-50 dark:border-slate-700/50 ${
                        !n.isRead ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={14} className={typeInfo.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-dark">{n.title}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-gray-400 mt-1 block">{timeAgo(n.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                        <button onClick={(e) => deleteNotif(e, n._id)}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-300 hover:text-red-500 transition">
                          <Trash2 size={12} />
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

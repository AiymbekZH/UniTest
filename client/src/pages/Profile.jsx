import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Camera, Save, Lock, Globe, AlertTriangle, Calendar, Copy, Check, MessageSquare, Trash2,
  ChevronRight, FileText, BarChart3, Target
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { t, lang, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [middleName, setMiddleName] = useState(user?.middleName || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [warnings, setWarnings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [myComments, setMyComments] = useState([]);
  const [profileTab, setProfileTab] = useState('info');
  const [stats, setStats] = useState({ testsCreated: 0, testsTaken: 0, totalScore: 0 });

  useEffect(() => {
    api.get('/profile/me/warnings')
      .then(res => setWarnings(res.data.warnings || []))
      .catch(() => {});
    api.get('/profile/me/comments')
      .then(res => setMyComments(res.data.comments || []))
      .catch(() => {});
    // Load stats
    api.get('/results/my')
      .then(res => {
        const results = res.data || [];
        setStats(prev => ({ ...prev, testsTaken: results.length, totalScore: results.length > 0 ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length) : 0 }));
      })
      .catch(() => {});
    api.get('/tests/my')
      .then(res => setStats(prev => ({ ...prev, testsCreated: (res.data || []).length })))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/profile/me', { firstName, lastName, middleName, language: lang });
      updateUser(res.data.user);
      toast.success(t('save'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max 5MB');
      return;
    }
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAvatar(res.data.avatar);
      updateUser({ ...user, avatar: res.data.avatar });
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      toast.error(t('currentPassword') + ' & ' + t('newPassword'));
      return;
    }
    try {
      await api.put('/profile/password', { currentPassword, newPassword });
      toast.success(t('changePassword'));
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    api.put('/profile/me', { language: newLang }).catch(() => {});
  };

  const copyIdToClipboard = () => {
    navigator.clipboard.writeText(user?.uniqueId || '');
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast.success('Скопировано!');
  };

  const roleLabel = user?.role === 'admin' ? t('adminRole') : user?.role === 'teacher' ? t('teacher') : t('student');

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setMyComments(prev => prev.filter(c => c._id !== commentId));
      toast.success('Комментарий удалён');
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Toaster position="top-right" />
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

          {/* Profile Hero — gradient banner with overlapping avatar */}
          <div className="glass-card-solid overflow-hidden mb-6">
            {/* Gradient banner */}
            <div className="profile-hero-gradient h-28 relative">
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }} />
            </div>
            {/* Content below banner */}
            <div className="px-6 pb-6">
              <div className="flex items-end gap-5 -mt-10">
                {/* Avatar — overlapping banner */}
                <div className="relative group flex-shrink-0">
                  <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-800 flex items-center justify-center text-2xl font-bold text-primary-600 dark:text-primary-400 overflow-hidden shadow-card">
                    {avatar ? (
                      <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition cursor-pointer">
                    <Camera size={20} className="text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>
                {/* Name + role + email */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{user?.firstName} {user?.lastName}</h2>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${user?.role === 'admin' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : user?.role === 'teacher' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {roleLabel}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Calendar size={11} /> {t('memberSince')} {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              {/* ID badge row below avatar */}
              <div className="mt-4 flex items-center">
                <button onClick={copyIdToClipboard} className="inline-flex items-center gap-1.5 text-[11px] font-mono text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 transition bg-gray-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mr-1">ID</span>
                  {user?.uniqueId || 'N/A'}
                  {copiedId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </div>

          {/* Stats — 3 mini-cards with icons */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => navigate('/my-tests')}
              className="stat-mini-card"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-2">
                <FileText size={18} className="text-indigo-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{stats.testsCreated}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('testsCreated')}</p>
            </motion.div>
            <motion.div
              whileHover={{ y: -2 }}
              onClick={() => navigate('/my-results')}
              className="stat-mini-card"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
                <BarChart3 size={18} className="text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{stats.testsTaken}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('testsTaken')}</p>
            </motion.div>
            <motion.div
              whileHover={{ y: -2 }}
              className="stat-mini-card"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mb-2">
                <Target size={18} className="text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{stats.totalScore}<span className="text-base text-gray-400 ml-0.5">%</span></p>
              <p className="text-xs text-gray-500 mt-0.5">Средний балл</p>
            </motion.div>
          </div>

          {/* Underline Tabs */}
          <div className="flex gap-6 mb-6 border-b border-gray-200 dark:border-slate-700">
            {[
              { key: 'info', label: t('editProfile'), icon: User },
              { key: 'security', label: t('changePassword'), icon: Lock },
              { key: 'comments', label: t('comments'), icon: MessageSquare },
            ].map(tb => (
              <button key={tb.key} onClick={() => setProfileTab(tb.key)}
                className={`tab-underline flex items-center gap-1.5 ${profileTab === tb.key ? 'active' : ''}`}>
                <tb.icon size={14} /> {tb.label}
              </button>
            ))}
          </div>

          {/* Tab: Edit Profile */}
          <AnimatePresence mode="wait">
            {profileTab === 'info' && (
              <motion.div key="info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="glass-card-solid p-6 mb-5">
                  <p className="section-title mb-4">{t('editProfile')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">{t('firstName')}</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" className="input-field text-sm pl-10" value={firstName} onChange={e => setFirstName(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">{t('lastName')}</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" className="input-field text-sm pl-10" value={lastName} onChange={e => setLastName(e.target.value)} />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">{t('middleName')}</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" className="input-field text-sm pl-10" value={middleName} onChange={e => setMiddleName(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-5">
                    <button onClick={handleSave} disabled={saving}
                      className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2">
                      <Save size={14} /> {saving ? '...' : t('save')}
                    </button>
                  </div>
                </div>

                {/* Language — pill radio buttons */}
                <div className="glass-card-solid p-6 mb-5">
                  <p className="section-title mb-3">{t('language')}</p>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { code: 'en', label: 'English', flag: '🇬🇧' },
                      { code: 'ru', label: 'Русский', flag: '🇷🇺' },
                      { code: 'kz', label: 'Қазақша', flag: '🇰🇿' }
                    ].map(l => (
                      <button key={l.code} onClick={() => handleLanguageChange(l.code)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                          ${lang === l.code
                            ? 'bg-primary-600 text-white shadow-btn-glow'
                            : 'bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'}`}
                      >
                        <span className="text-base leading-none">{l.flag}</span> {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Warnings — timeline style */}
                {warnings.length > 0 && (
                  <div className="glass-card-solid p-6 mb-5">
                    <p className="section-title mb-4 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-500" /> {t('warnings')} ({warnings.length})
                    </p>
                    <div className="relative pl-6">
                      {/* Vertical timeline line */}
                      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-amber-200 dark:bg-amber-800" />
                      <div className="space-y-4">
                        {warnings.map((w, i) => (
                          <div key={i} className="relative">
                            {/* Timeline dot */}
                            <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-400 dark:border-amber-600" />
                            <div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{w.message}</p>
                              <p className="text-[11px] text-gray-400 mt-1">{new Date(w.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Tab: Security */}
            {profileTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="glass-card-solid p-6">
                  <p className="section-title mb-5">{t('changePassword')}</p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">{t('currentPassword')}</label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="password" className="input-field text-sm pl-10" placeholder="••••••••"
                          value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">{t('newPassword')}</label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="password" className="input-field text-sm pl-10" placeholder="••••••••"
                          value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button onClick={handlePasswordChange} className="btn-primary py-2.5 px-6 text-sm">
                        {t('save')}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab: Comments */}
            {profileTab === 'comments' && (
              <motion.div key="comments" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="glass-card-solid p-6">
                  <p className="section-title mb-4">{t('comments')} ({myComments.length})</p>
                  {myComments.length === 0 ? (
                    <div className="text-center py-10">
                      <MessageSquare size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">Комментариев пока нет</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {myComments.map(c => (
                        <div key={c._id} className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-slate-600 hover:border-gray-200 dark:hover:border-slate-500 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700 dark:text-gray-200">{c.text}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-[11px] text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                                {c.test && (
                                  <button onClick={() => navigate(`/test-profile/${c.test.shareLink}`)}
                                    className="text-[11px] text-primary-500 hover:text-primary-600 truncate max-w-[200px] flex items-center gap-0.5 transition-colors">
                                    <ChevronRight size={10} /> {c.test.title}
                                  </button>
                                )}
                              </div>
                            </div>
                            <button onClick={() => handleDeleteComment(c._id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition flex-shrink-0">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}

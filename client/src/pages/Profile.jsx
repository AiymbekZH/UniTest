import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Camera, Save, Lock, Globe, AlertTriangle, Calendar, Copy, Check, MessageSquare, Trash2,
  FileText, BarChart3, Shield, ChevronRight
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

          {/* Profile Hero */}
          <div className="glass-card-solid overflow-hidden mb-6">
            <div className="h-24 bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-500" />
            <div className="px-6 pb-6 -mt-12">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
                <div className="relative group flex-shrink-0">
                  <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-800 flex items-center justify-center text-2xl font-bold text-primary-600 overflow-hidden shadow-lg">
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
                <div className="flex-1 text-center sm:text-left pb-1">
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                    <h2 className="text-xl font-bold text-dark">{user?.firstName} {user?.lastName}</h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${user?.role === 'admin' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : user?.role === 'teacher' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {roleLabel}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1 justify-center sm:justify-start">
                    <Calendar size={11} /> {t('memberSince')} {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="glass-card-solid p-4 text-center cursor-pointer hover:border-primary-400 transition" onClick={() => navigate('/my-tests')}>
              <FileText size={18} className="text-primary-600 mx-auto mb-1.5" />
              <p className="text-xl font-bold text-dark">{stats.testsCreated}</p>
              <p className="text-[10px] text-gray-500">{t('testsCreated')}</p>
            </div>
            <div className="glass-card-solid p-4 text-center cursor-pointer hover:border-primary-400 transition" onClick={() => navigate('/my-results')}>
              <BarChart3 size={18} className="text-emerald-600 mx-auto mb-1.5" />
              <p className="text-xl font-bold text-dark">{stats.testsTaken}</p>
              <p className="text-[10px] text-gray-500">{t('testsTaken')}</p>
            </div>
            <div className="glass-card-solid p-4 text-center">
              <Shield size={18} className="text-amber-600 mx-auto mb-1.5" />
              <p className="text-xl font-bold text-dark">{stats.totalScore}%</p>
              <p className="text-[10px] text-gray-500">Средний балл</p>
            </div>
          </div>

          {/* Unique ID */}
          <div className="glass-card-solid p-4 mb-6 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">ID</p>
              <code className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400">
                {user?.uniqueId || 'N/A'}
              </code>
            </div>
            <button onClick={copyIdToClipboard} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition" title="Скопировать">
              {copiedId ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-gray-400" />}
            </button>
          </div>

          {/* Profile Tabs */}
          <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
            {[
              { key: 'info', label: t('editProfile'), icon: User },
              { key: 'security', label: t('changePassword'), icon: Lock },
              { key: 'comments', label: t('comments'), icon: MessageSquare },
            ].map(tb => (
              <button key={tb.key} onClick={() => setProfileTab(tb.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${profileTab === tb.key ? 'bg-white dark:bg-slate-700 text-dark shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <tb.icon size={14} /> {tb.label}
              </button>
            ))}
          </div>

          {/* Tab: Edit Profile */}
          <AnimatePresence mode="wait">
            {profileTab === 'info' && (
              <motion.div key="info" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="glass-card-solid p-6 mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">{t('firstName')}</label>
                      <input type="text" className="input-field text-sm" value={firstName} onChange={e => setFirstName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">{t('lastName')}</label>
                      <input type="text" className="input-field text-sm" value={lastName} onChange={e => setLastName(e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">{t('middleName')}</label>
                      <input type="text" className="input-field text-sm" value={middleName} onChange={e => setMiddleName(e.target.value)} />
                    </div>
                  </div>
                  <button onClick={handleSave} disabled={saving}
                    className="btn-primary mt-4 py-2.5 px-5 text-sm flex items-center gap-2">
                    <Save size={14} /> {saving ? '...' : t('save')}
                  </button>
                </div>

                {/* Language */}
                <div className="glass-card-solid p-6 mb-4">
                  <h3 className="font-semibold text-dark mb-3 flex items-center gap-2 text-sm">
                    <Globe size={16} /> {t('language')}
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { code: 'en', label: 'EN English' },
                      { code: 'ru', label: '🇷🇺 Русский' },
                      { code: 'kz', label: '🇰🇿 Қазақша' }
                    ].map(l => (
                      <button key={l.code} onClick={() => handleLanguageChange(l.code)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                          ${lang === l.code ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25' : 'bg-white dark:bg-slate-800 text-gray-500 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="glass-card-solid p-6 mb-4">
                    <h3 className="font-semibold text-dark mb-3 flex items-center gap-2 text-sm">
                      <AlertTriangle size={16} className="text-amber-500" /> {t('warnings')} ({warnings.length})
                    </h3>
                    <div className="space-y-2">
                      {warnings.map((w, i) => (
                        <div key={i} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                          <p className="text-sm text-dark">{w.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{new Date(w.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Tab: Security */}
            {profileTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="glass-card-solid p-6">
                  <h3 className="font-semibold text-dark mb-4 flex items-center gap-2 text-sm">
                    <Lock size={16} /> {t('changePassword')}
                  </h3>
                  <div className="space-y-3">
                    <input type="password" className="input-field text-sm" placeholder={t('currentPassword')}
                      value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                    <input type="password" className="input-field text-sm" placeholder={t('newPassword')}
                      value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    <button onClick={handlePasswordChange} className="btn-primary py-2.5 px-5 text-sm">
                      {t('save')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab: Comments */}
            {profileTab === 'comments' && (
              <motion.div key="comments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="glass-card-solid p-6">
                  <h3 className="font-semibold text-dark mb-4 flex items-center gap-2 text-sm">
                    <MessageSquare size={16} /> {t('comments')} ({myComments.length})
                  </h3>
                  {myComments.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Комментариев пока нет</p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {myComments.map(c => (
                        <div key={c._id} className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-slate-600">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-dark">{c.text}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
                                {c.test && (
                                  <button onClick={() => navigate(`/test-profile/${c.test.shareLink}`)}
                                    className="text-[10px] text-primary-500 hover:text-primary-600 truncate max-w-[200px] flex items-center gap-0.5">
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

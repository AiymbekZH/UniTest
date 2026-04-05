import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Camera, Save, Lock, Globe, AlertTriangle, Calendar, Copy, Check, MessageSquare, Trash2,
  ChevronRight
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [myComments, setMyComments] = useState([]);
  const [profileTab, setProfileTab] = useState('info');
  const [stats, setStats] = useState({ testsCreated: 0, testsTaken: 0, totalScore: 0 });

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [warn, comm, stat] = await Promise.all([
          api.get('/profile/me/warnings'),
          api.get('/profile/me/comments'),
          api.get('/profile/me/stats')
        ]);
        setWarnings(warn.data.warnings || []);
        setMyComments(comm.data.comments || []);
        setStats({
          testsCreated: stat.data.testsCreated || 0,
          testsTaken: stat.data.testsTaken || 0,
          totalScore: stat.data.totalScore || 0
        });
      } catch (err) {
        toast.error(t('profileLoadError'));
      }
    };
    fetchProfileData();
  }, []);

  const handleSave = async () => {
    if (!firstName?.trim() || !lastName?.trim()) {
      toast.error(t('profileNameRequired'));
      return;
    }
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
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('passwordFieldsRequired'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordsMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('passwordMinLength'));
      return;
    }
    try {
      await api.put('/profile/password', { currentPassword, newPassword });
      toast.success(t('changePassword') || 'Пароль успешно изменен');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка при изменении пароля');
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
    toast.success(t('copied'));
  };

  const roleLabel = user?.role === 'admin' ? t('adminRole') : user?.role === 'teacher' ? t('teacher') : t('student');

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setMyComments(prev => prev.filter(c => c._id !== commentId));
      toast.success(t('commentDeleted'));
    } catch {
      toast.error(t('deleteError'));
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Toaster position="top-right" />
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

          {/* Profile Hero — clean white card, no gradient */}
          <div className="glass-card-solid p-6 mb-6">
            <div className="flex items-center gap-5">
              {/* Avatar — circle 80px */}
              <div className="relative group flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-primary-50 dark:bg-primary-900/30 border-2 border-white dark:border-slate-700 flex items-center justify-center text-xl font-bold text-primary-600 dark:text-primary-400 overflow-hidden shadow-card">
                  {avatar ? (
                    <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer">
                  <Camera size={18} className="text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>
              {/* Name + role + email */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{user?.firstName} {user?.lastName}</h2>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${user?.role === 'admin' ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : user?.role === 'teacher' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {roleLabel}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Calendar size={11} /> {t('memberSince')} {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                  {/* Inline ID badge */}
                  <button onClick={copyIdToClipboard} className="inline-flex items-center gap-1 text-[11px] font-mono text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 transition">
                    <span className="bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-md">
                      {user?.uniqueId || 'N/A'}
                    </span>
                    {copiedId ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats — single card with 3 columns separated by vertical dividers */}
          <div className="glass-card-solid p-5 mb-8">
            <div className="flex items-center">
              <div className="flex-1 text-center cursor-pointer group" onClick={() => navigate('/my-tests')}>
                <p className="stat-value group-hover:text-primary-600 transition-colors">{stats.testsCreated}</p>
                <p className="stat-label mt-1">{t('testsCreated')}</p>
              </div>
              <div className="divider-vertical h-10" />
              <div className="flex-1 text-center cursor-pointer group" onClick={() => navigate('/my-results')}>
                <p className="stat-value group-hover:text-primary-600 transition-colors">{stats.testsTaken}</p>
                <p className="stat-label mt-1">{t('testsTaken')}</p>
              </div>
              <div className="divider-vertical h-10" />
              <div className="flex-1 text-center">
                <p className="stat-value">{stats.totalScore}<span className="text-lg text-gray-400 ml-0.5">%</span></p>
                <p className="stat-label mt-1">{t('avgScore')}</p>
              </div>
            </div>
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
                      { code: 'kz', label: 'Қазақша', flag: '🇰🇿' },
                      { code: 'es', label: 'Español', flag: '🇪🇸' }
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

                <div className="glass-card-solid p-6 mb-5 overflow-hidden relative">
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-amber-100/70 via-transparent to-orange-100/70 dark:from-amber-900/20 dark:to-orange-900/10 pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div>
                        <p className="section-title mb-1 flex items-center gap-2">
                          <AlertTriangle size={14} className="text-amber-500" /> {t('warnings')}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {warnings.length > 0
                            ? `${warnings.length} ${t('warnings').toLowerCase()}`
                            : (t('warningsEmptyDesc') || 'Administrator messages will appear here.')}
                        </p>
                      </div>
                      <span className={`inline-flex min-w-[52px] justify-center rounded-2xl px-3 py-2 text-sm font-semibold ${
                        warnings.length > 0
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-300'
                      }`}>
                        {warnings.length}
                      </span>
                    </div>

                    {warnings.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/40 p-5 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-300">
                          <AlertTriangle size={18} />
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          {t('warningsEmptyTitle') || 'No warnings'}
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {t('warningsEmptyDesc') || 'Administrator messages will appear here.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {warnings.map((w, i) => (
                          <div
                            key={i}
                            className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white px-4 py-4 shadow-sm dark:border-amber-900/30 dark:from-amber-950/20 dark:to-slate-900"
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                                <AlertTriangle size={18} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                    Admin
                                  </span>
                                  <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                    {new Date(w.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm leading-6 text-gray-700 dark:text-gray-200">{w.message}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
                    <div>
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">{t('repeatNewPassword')}</label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="password" className="input-field text-sm pl-10" placeholder="••••••••"
                          value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
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
                      <p className="text-sm text-gray-400">{t('noCommentsYet')}</p>
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

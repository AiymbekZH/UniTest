import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Camera, Save, Lock, Globe, AlertTriangle, Calendar, Copy, Check, MessageSquare, Trash2,
  ChevronRight, FileText, CheckCircle, TrendingUp
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
        toast.error('Не удалось загрузить данные профиля');
      }
    };
    fetchProfileData();
  }, []);

  const handleSave = async () => {
    if (!firstName?.trim() || !lastName?.trim()) {
      toast.error('Имя и Фамилия обязательны к заполнению');
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
      toast.error('Пожалуйста, заполните все поля пароля');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Новые пароли не совпадают');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Новый пароль должен быть минимум 6 символов');
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

  const inputClass = "w-full bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 block pl-10 py-2.5 transition-all outline-none shadow-sm dark:shadow-none placeholder-gray-400";

  return (
    <div className="min-h-screen bg-surface">
      <Toaster position="top-right" />
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

          {/* Profile Hero — with Premium Banner */}
          <div className="glass-card-solid overflow-hidden mb-6 border-0 shadow-sm relative">
            <div className="h-32 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 blur-3xl rounded-full"></div>
              <div className="absolute top-10 -left-10 w-32 h-32 bg-white/10 blur-2xl rounded-full"></div>
            </div>
            
            <div className="px-6 pb-6 relative">
              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-end -mt-12 sm:-mt-14 mb-4">
                <div className="relative group flex-shrink-0 z-10 antialiased">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white dark:bg-gray-900 p-1.5 shadow-xl transition-transform duration-300 group-hover:scale-105">
                    <div className="w-full h-full rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-3xl font-bold text-indigo-500 overflow-hidden relative">
                      {avatar ? (
                        <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                      )}
                      <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera size={20} className="text-white" />
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 pb-1 sm:pb-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">{user?.firstName} {user?.lastName}</h2>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${user?.role === 'admin' ? 'bg-red-50 text-red-600 border border-red-100 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400' : user?.role === 'teacher' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 dark:border-indigo-900/30 dark:bg-indigo-900/20 dark:text-indigo-400' : 'bg-gray-50 text-gray-500 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {roleLabel}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 font-medium">{user?.email}</p>
                </div>

                <div className="flex flex-col sm:items-end gap-2 pb-1 sm:pb-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 font-medium px-1">
                    <Calendar size={13} /> {t('memberSince')} {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                  <button onClick={copyIdToClipboard} className="inline-flex items-center gap-1.5 text-xs font-mono text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors group">
                    <span className="bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1.5 flex items-center h-8 rounded-lg border border-indigo-100 dark:border-indigo-800/50 group-hover:border-indigo-200 dark:group-hover:border-indigo-700 transition-colors shadow-sm">
                      ID: {user?.uniqueId || 'N/A'}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center border border-indigo-100 dark:border-indigo-800/50 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800 transition-colors shadow-sm">
                      {copiedId ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="glass-card-solid p-5 flex items-center gap-4 cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md transition-all duration-300 group" onClick={() => navigate('/my-tests')}>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 group-hover:-translate-y-1 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 shadow-sm">
                <FileText size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{stats.testsCreated}</p>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1.5">{t('testsCreated')}</p>
              </div>
            </div>
            
            <div className="glass-card-solid p-5 flex items-center gap-4 cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-md transition-all duration-300 group" onClick={() => navigate('/my-results')}>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500 group-hover:-translate-y-1 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-sm">
                <CheckCircle size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{stats.testsTaken}</p>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1.5">{t('testsTaken')}</p>
              </div>
            </div>
            
            <div className="glass-card-solid p-5 flex items-center gap-4 hover:border-amber-200 dark:hover:border-amber-800 hover:shadow-md transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-500 group-hover:-translate-y-1 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-sm">
                <TrendingUp size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none flex items-baseline gap-0.5">
                  {stats.totalScore.toFixed(1)} <span className="text-sm font-medium text-gray-400">%</span>
                </p>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1.5">Средний балл</p>
              </div>
            </div>
          </div>

          {/* Modern Segmented Control Tabs */}
          <div className="flex bg-gray-100/80 dark:bg-gray-800/80 p-1.5 rounded-2xl mb-6 shadow-inner border border-gray-200/50 dark:border-gray-700 w-full sm:w-auto overflow-x-auto ring-1 ring-white/50 dark:ring-0">
            {[
              { key: 'info', label: t('editProfile'), icon: User },
              { key: 'security', label: t('changePassword'), icon: Lock },
              { key: 'comments', label: t('comments'), icon: MessageSquare },
            ].map(tb => (
              <button key={tb.key} onClick={() => setProfileTab(tb.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap
                  ${profileTab === tb.key 
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-600' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/40 dark:hover:bg-gray-700/50'}`}>
                <tb.icon size={16} className={profileTab === tb.key ? "text-indigo-500" : "opacity-70"} /> {tb.label}
              </button>
            ))}
          </div>

          {/* Tab: Edit Profile */}
          <AnimatePresence mode="wait">
            {profileTab === 'info' && (
              <motion.div key="info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="glass-card-solid p-6 pb-7 mb-6">
                  <p className="text-base font-bold text-gray-900 dark:text-white mb-5">{t('editProfile')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 ml-1 block uppercase tracking-wider">{t('firstName')}</label>
                      <div className="relative group">
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input type="text" className={inputClass} value={firstName} onChange={e => setFirstName(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 ml-1 block uppercase tracking-wider">{t('lastName')}</label>
                      <div className="relative group">
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input type="text" className={inputClass} value={lastName} onChange={e => setLastName(e.target.value)} />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 ml-1 block uppercase tracking-wider">{t('middleName')}</label>
                      <div className="relative group">
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input type="text" className={inputClass} value={middleName} onChange={e => setMiddleName(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-6">
                    <button onClick={handleSave} disabled={saving}
                      className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-btn-glow disabled:opacity-50 disabled:cursor-not-allowed">
                      <Save size={16} /> {saving ? '...' : t('save')}
                    </button>
                  </div>
                </div>

                {/* Language — pill radio buttons */}
                <div className="glass-card-solid p-6 mb-6">
                  <p className="text-base font-bold text-gray-900 dark:text-white mb-4">{t('language')}</p>
                  <div className="flex gap-2.5 flex-wrap">
                    {[
                      { code: 'en', label: 'English', flag: '🇬🇧' },
                      { code: 'ru', label: 'Русский', flag: '🇷🇺' },
                      { code: 'kz', label: 'Қазақша', flag: '🇰🇿' }
                    ].map(l => (
                      <button key={l.code} onClick={() => handleLanguageChange(l.code)}
                        className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                          ${lang === l.code
                            ? 'bg-indigo-500 text-white shadow-btn-glow ring-2 ring-indigo-500/20'
                            : 'bg-gray-50/80 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-white dark:hover:bg-gray-800 shadow-sm dark:shadow-none'}`}
                      >
                        <span className="text-lg leading-none drop-shadow-sm">{l.flag}</span> {l.label}
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
                  <p className="text-base font-bold text-gray-900 dark:text-white mb-5">{t('changePassword')}</p>
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 ml-1 block uppercase tracking-wider">{t('currentPassword')}</label>
                      <div className="relative group">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input type="password" className={inputClass} placeholder="••••••••"
                          value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 ml-1 block uppercase tracking-wider">{t('newPassword')}</label>
                      <div className="relative group">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input type="password" className={inputClass} placeholder="••••••••"
                          value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 ml-1 block uppercase tracking-wider">Повторите новый пароль</label>
                      <div className="relative group">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input type="password" className={inputClass} placeholder="••••••••"
                          value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <button onClick={handlePasswordChange} className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition-all shadow-btn-glow">
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

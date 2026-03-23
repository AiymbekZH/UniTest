import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Copy, ExternalLink, ArrowLeft, X, Trash2,
  BookOpen, UserPlus, LogOut, RefreshCw, Link2
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Groups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAssignTest, setShowAssignTest] = useState(false);
  const [myTests, setMyTests] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups/my');
      setGroups(res.data);
    } catch (err) {
      toast.error('Ошибка загрузки групп');
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!createForm.name.trim()) return toast.error('Введите название');
    setSubmitting(true);
    try {
      const res = await api.post('/groups', createForm);
      setGroups(prev => [res.data, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: '', description: '' });
      toast.success('Группа создана!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка создания');
    } finally {
      setSubmitting(false);
    }
  };

  const joinGroup = async () => {
    if (!joinCode.trim()) return toast.error('Введите код приглашения');
    setSubmitting(true);
    try {
      const res = await api.post(`/groups/join/${joinCode.trim()}`);
      setGroups(prev => [res.data, ...prev.filter(g => g._id !== res.data._id)]);
      setShowJoin(false);
      setJoinCode('');
      toast.success('Вы присоединились к группе!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteGroup = async (groupId) => {
    try {
      await api.delete(`/groups/${groupId}`);
      setGroups(prev => prev.filter(g => g._id !== groupId));
      if (selectedGroup?._id === groupId) setSelectedGroup(null);
      toast.success('Группа удалена');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    }
    setConfirmDelete(null);
  };

  const leaveGroup = async (groupId) => {
    try {
      await api.post(`/groups/${groupId}/leave`);
      setGroups(prev => prev.filter(g => g._id !== groupId));
      if (selectedGroup?._id === groupId) setSelectedGroup(null);
      toast.success('Вы вышли из группы');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const removeMember = async (groupId, userId) => {
    try {
      await api.delete(`/groups/${groupId}/members/${userId}`);
      // Refresh selected group
      const res = await api.get(`/groups/${groupId}`);
      setSelectedGroup(res.data);
      setGroups(prev => prev.map(g => g._id === groupId ? res.data : g));
      toast.success('Участник удалён');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Код скопирован!');
  };

  const copyInviteLink = (code) => {
    navigator.clipboard.writeText(`${window.location.origin}/groups?join=${code}`);
    toast.success('Ссылка скопирована!');
  };

  const regenerateCode = async (groupId) => {
    try {
      const res = await api.post(`/groups/${groupId}/regenerate-code`);
      setGroups(prev => prev.map(g => g._id === groupId ? { ...g, inviteCode: res.data.inviteCode } : g));
      if (selectedGroup?._id === groupId) {
        setSelectedGroup(prev => ({ ...prev, inviteCode: res.data.inviteCode }));
      }
      toast.success('Код обновлён');
    } catch (err) {
      toast.error('Ошибка');
    }
  };

  const openAssignTest = async () => {
    try {
      const res = await api.get('/tests/my');
      setMyTests(res.data.filter(t => !t.isDeleted));
      setShowAssignTest(true);
    } catch (err) {
      toast.error('Ошибка загрузки тестов');
    }
  };

  const assignTest = async (testId) => {
    if (!selectedGroup) return;
    try {
      const res = await api.post(`/groups/${selectedGroup._id}/assign-test`, { testId });
      setSelectedGroup(res.data);
      setGroups(prev => prev.map(g => g._id === selectedGroup._id ? res.data : g));
      setShowAssignTest(false);
      toast.success('Тест назначен!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const removeAssignedTest = async (testId) => {
    if (!selectedGroup) return;
    try {
      await api.delete(`/groups/${selectedGroup._id}/assigned-tests/${testId}`);
      const res = await api.get(`/groups/${selectedGroup._id}`);
      setSelectedGroup(res.data);
      setGroups(prev => prev.map(g => g._id === selectedGroup._id ? res.data : g));
      toast.success('Тест убран');
    } catch (err) {
      toast.error('Ошибка');
    }
  };

  // Join by URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code) {
      setJoinCode(code);
      setShowJoin(true);
      // Clean URL
      window.history.replaceState({}, '', '/groups');
    }
  }, []);

  const isCreator = (group) => group.creator?._id === user?._id;

  // Generate a consistent gradient color for group avatar based on name
  const groupGradients = [
    'from-indigo-500 to-purple-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-cyan-500 to-blue-500',
    'from-violet-500 to-fuchsia-500',
  ];
  const getGroupGradient = (name) => {
    const idx = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % groupGradients.length;
    return groupGradients[idx];
  };

  return (
    <div className="min-h-screen bg-surface">
      <Toaster position="top-right" />
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">Группы</h1>
              <p className="text-xs text-gray-400 mt-0.5">{groups.length} групп</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowJoin(true)} className="btn-secondary flex items-center gap-1.5 py-2 px-4 text-xs">
              <UserPlus size={14} /> Присоединиться
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5 py-2 px-4 text-xs">
              <Plus size={14} /> Создать
            </button>
          </div>
        </motion.div>

        {/* Content */}
        {selectedGroup ? (
          /* Group detail view */
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Group header card with Banner */}
            <div className="glass-card-solid overflow-hidden relative border-0 shadow-sm">
              <div className={`h-24 bg-gradient-to-r ${getGroupGradient(selectedGroup.name)} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                <button onClick={() => setSelectedGroup(null)} className="absolute top-4 left-4 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-white transition-all shadow-sm z-10 border border-white/20">
                  <ArrowLeft size={18} />
                </button>
              </div>
              <div className="px-6 pb-6 relative">
                <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-end -mt-8 sm:-mt-10 mb-2">
                  <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br ${getGroupGradient(selectedGroup.name)} p-1.5 shadow-xl transition-transform hover:scale-105 z-10`}>
                    <div className="w-full h-full bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center">
                      <div className={`text-transparent bg-clip-text bg-gradient-to-br ${getGroupGradient(selectedGroup.name)} font-bold text-3xl sm:text-4xl`}>
                        {(selectedGroup.name?.[0] || 'G').toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">{selectedGroup.name}</h2>
                      {isCreator(selectedGroup) && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 dark:border-indigo-900/30 dark:bg-indigo-900/20 dark:text-indigo-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shadow-sm">admin</span>
                      )}
                    </div>
                    {selectedGroup.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium bg-gray-50/50 dark:bg-gray-800/30 px-3.5 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50 inline-block shadow-inner">{selectedGroup.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Invite section (admin only) */}
            {isCreator(selectedGroup) && (
              <div className="glass-card-solid p-6">
                <p className="text-base font-bold text-gray-900 dark:text-white mb-4">{t('invite') || 'Приглашение'}</p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex-1 w-full bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between group shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-500 border border-indigo-200/50 dark:border-indigo-800/50">
                        <Link2 size={16} />
                      </div>
                      <code className="text-sm font-mono font-bold text-gray-900 dark:text-gray-100 tracking-wide">{selectedGroup.inviteCode}</code>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => copyInviteCode(selectedGroup.inviteCode)} className="p-2 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition shadow-sm border border-gray-100 dark:border-gray-600" title="Копировать код">
                        <Copy size={14} />
                      </button>
                      <button onClick={() => regenerateCode(selectedGroup._id)} className="p-2 bg-white dark:bg-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/40 rounded-lg text-amber-500 transition shadow-sm border border-gray-100 dark:border-gray-600" title="Обновить код">
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>
                  <button onClick={() => copyInviteLink(selectedGroup.inviteCode)} className="btn-primary w-full sm:w-auto py-3 px-6 text-sm font-semibold flex items-center justify-center gap-2 shadow-btn-glow">
                    <ExternalLink size={16} /> Ссылка
                  </button>
                </div>
              </div>
            )}

            {/* Members */}
            <div className="glass-card-solid p-6">
              <p className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center justify-between">
                <span>Участники <span className="text-gray-400 font-medium text-sm ml-1">({selectedGroup.members?.length || 0})</span></span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {selectedGroup.members?.map(m => (
                  <div key={m.user._id} className="flex items-center gap-3.5 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 bg-white/50 dark:bg-gray-800/30 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm group">
                    <div className="w-11 h-11 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100/50 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm flex-shrink-0 overflow-hidden shadow-inner">
                      {m.user.avatar ? (
                        <img src={m.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        (m.user.firstName?.[0] || '?').toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                          {m.user.lastName} {m.user.firstName}
                        </p>
                        {m.role === 'admin' && (
                          <span className="text-[9px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest border border-indigo-200/50 dark:border-indigo-800/50">admin</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{m.user.email}</p>
                    </div>
                    {isCreator(selectedGroup) && m.user._id !== user._id && (
                      <button onClick={() => removeMember(selectedGroup._id, m.user._id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0 border border-red-100 dark:border-red-800/30 shadow-sm" title="Удалить">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned tests */}
            <div className="glass-card-solid p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Назначенные тесты <span className="text-gray-400 font-medium text-sm ml-1">({selectedGroup.assignedTests?.length || 0})</span></span>
                </p>
                {isCreator(selectedGroup) && (
                  <button onClick={openAssignTest} className="btn-primary py-2 px-4 text-sm font-semibold flex items-center gap-1.5 shadow-btn-glow">
                    <Plus size={16} /> Назначить
                  </button>
                )}
              </div>
              
              {selectedGroup.assignedTests?.length === 0 ? (
                <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl p-10 flex flex-col items-center justify-center">
                  <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <BookOpen size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Нет назначенных тестов</h3>
                  <p className="text-xs text-gray-400 font-medium text-center">Студенты не пропустят проверку знаний</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {selectedGroup.assignedTests?.map(at => (
                    <div key={at.test?._id || at._id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/30 hover:border-amber-200 dark:hover:border-amber-800/60 hover:shadow-md transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-amber-100/50 dark:border-amber-800/30 shadow-inner">
                        <BookOpen size={20} className="text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate pr-2">{at.test?.title || 'Удалённый тест'}</p>
                        <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-wide">{at.test?.questions?.length || 0} вопросов &middot; {at.test?.totalPoints || 0} баллов</p>
                      </div>
                      
                      <div className="flex sm:flex-col gap-2 mt-2 sm:mt-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => at.test?.shareLink && navigate(`/test-profile/${at.test.shareLink}`)} className="flex-1 sm:flex-none py-1.5 px-3 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-500 transition-colors flex items-center justify-center gap-1.5 text-xs font-bold border border-indigo-100 dark:border-indigo-800/50" title="Открыть тест">
                          <ExternalLink size={14} /> Открыть
                        </button>
                        {isCreator(selectedGroup) && (
                          <button onClick={() => removeAssignedTest(at.test?._id)} className="p-1.5 px-3 rounded-lg bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 transition-colors flex items-center justify-center border border-red-100 dark:border-red-800/30" title="Убрать тест">
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leave / Delete — proper buttons with borders */}
            <div className="flex gap-3 pt-2">
              {!isCreator(selectedGroup) && (
                <button onClick={() => leaveGroup(selectedGroup._id)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-red-500 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl px-4 py-2.5 transition-colors">
                  <LogOut size={15} /> Покинуть группу
                </button>
              )}
              {isCreator(selectedGroup) && (
                <button onClick={() => setConfirmDelete(selectedGroup._id)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-red-500 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl px-4 py-2.5 transition-colors">
                  <Trash2 size={15} /> Удалить группу
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          /* Groups list */
          loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card-solid p-5 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-slate-700" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Нет групп</h3>
              <p className="text-gray-400 text-sm mb-6">Создайте группу или присоединитесь по коду</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setShowJoin(true)} className="btn-secondary py-2.5 px-5 text-sm flex items-center gap-2">
                  <UserPlus size={15} /> Присоединиться
                </button>
                <button onClick={() => setShowCreate(true)} className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2">
                  <Plus size={15} /> Создать
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {groups.map((group, i) => (
                <motion.div
                  key={group._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedGroup(group)}
                  className="glass-card-solid p-5 flex items-center gap-4 cursor-pointer group"
                >
                  {/* Gradient circle avatar with first letter */}
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getGroupGradient(group.name)} flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm`}>
                    {(group.name?.[0] || 'G').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{group.name}</h3>
                      {isCreator(group) && (
                        <span className="text-[10px] bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full font-medium flex-shrink-0">admin</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Users size={12} /> {group.members?.length || 0} участников</span>
                      <span className="flex items-center gap-1"><BookOpen size={12} /> {group.assignedTests?.length || 0} тестов</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )
        )}

        {/* Create modal */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setShowCreate(false)}
            >
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="glass-card-solid p-6 w-full max-w-md"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                    <Plus size={20} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Создать группу</h3>
                    <p className="text-xs text-gray-400">Объедините участников вместе</p>
                  </div>
                </div>
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Название</label>
                    <input
                      type="text"
                      className="input-field text-sm"
                      placeholder="Например: Математика 101"
                      value={createForm.name}
                      onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Описание</label>
                    <textarea
                      className="input-field resize-none text-sm"
                      rows="2"
                      placeholder="Необязательно"
                      value={createForm.description}
                      onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowCreate(false)} className="btn-secondary py-2 px-4 text-sm">Отмена</button>
                  <button onClick={createGroup} disabled={submitting} className="btn-primary py-2 px-5 text-sm">
                    {submitting ? 'Создание...' : 'Создать'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Join modal */}
        <AnimatePresence>
          {showJoin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setShowJoin(false)}
            >
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="glass-card-solid p-6 w-full max-w-md"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <UserPlus size={20} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Присоединиться</h3>
                    <p className="text-xs text-gray-400">Введите код приглашения группы</p>
                  </div>
                </div>
                <div className="mb-5">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Код приглашения</label>
                  <input
                    type="text"
                    className="input-field text-sm font-mono"
                    placeholder="Например: abc123"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowJoin(false)} className="btn-secondary py-2 px-4 text-sm">Отмена</button>
                  <button onClick={joinGroup} disabled={submitting} className="btn-primary py-2 px-5 text-sm">
                    {submitting ? 'Вход...' : 'Присоединиться'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Assign test modal */}
        <AnimatePresence>
          {showAssignTest && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setShowAssignTest(false)}
            >
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="glass-card-solid p-6 w-full max-w-md max-h-[70vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <BookOpen size={20} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Назначить тест</h3>
                    <p className="text-xs text-gray-400">Выберите тест для группы</p>
                  </div>
                </div>
                {myTests.length === 0 ? (
                  <div className="text-center py-10">
                    <BookOpen size={28} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">У вас нет тестов</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myTests.map(test => {
                      const alreadyAssigned = selectedGroup?.assignedTests?.some(at => at.test?._id === test._id);
                      return (
                        <button
                          key={test._id}
                          onClick={() => !alreadyAssigned && assignTest(test._id)}
                          disabled={alreadyAssigned}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            alreadyAssigned
                              ? 'border-gray-100 dark:border-slate-700 opacity-40 cursor-default'
                              : 'border-gray-200 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 cursor-pointer'
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{test.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {test.questions?.length || 0} вопросов &middot; {test.totalPoints} баллов
                            {alreadyAssigned && <span className="text-primary-500 ml-1">&middot; Назначен</span>}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
                <button onClick={() => setShowAssignTest(false)} className="btn-secondary w-full py-2 text-sm mt-4">Закрыть</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete confirmation */}
        <ConfirmDialog
          isOpen={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => deleteGroup(confirmDelete)}
          title="Удалить группу?"
          message="Группа будет удалена со всеми данными. Это действие нельзя отменить."
          confirmText="Удалить"
          type="danger"
        />
      </main>
    </div>
  );
}

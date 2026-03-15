import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Copy, ExternalLink, ArrowLeft, X, Trash2,
  BookOpen, UserPlus, LogOut, RefreshCw, Link2, Clock
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

  return (
    <div className="min-h-screen bg-surface">
      <Toaster position="top-right" />
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition">
              <ArrowLeft size={20} className="text-gray-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-dark">Группы</h1>
              <p className="text-sm text-gray-500">{groups.length} групп</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowJoin(true)} className="btn-secondary flex items-center gap-1.5 py-2 px-3 text-xs">
              <UserPlus size={14} /> Присоединиться
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5 py-2 px-3 text-xs">
              <Plus size={14} /> Создать
            </button>
          </div>
        </motion.div>

        {/* Content */}
        {selectedGroup ? (
          /* Group detail view */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedGroup(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition">
                <ArrowLeft size={16} className="text-gray-500" />
              </button>
              <h2 className="text-xl font-bold text-dark">{selectedGroup.name}</h2>
              {isCreator(selectedGroup) && (
                <span className="text-[10px] bg-primary-100 dark:bg-primary-900/30 text-primary-600 px-2 py-0.5 rounded-md font-medium ml-2">admin</span>
              )}
            </div>

            {selectedGroup.description && (
              <p className="text-sm text-gray-500">{selectedGroup.description}</p>
            )}

            {/* Invite section (admin only) */}
            {isCreator(selectedGroup) && (
              <div className="glass-card-solid p-4">
                <h3 className="text-sm font-semibold text-dark mb-3 flex items-center gap-2">
                  <Link2 size={16} className="text-primary-500" /> Приглашение
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="bg-gray-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg text-sm font-mono text-dark">
                    {selectedGroup.inviteCode}
                  </code>
                  <button onClick={() => copyInviteCode(selectedGroup.inviteCode)}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
                    <Copy size={12} /> Код
                  </button>
                  <button onClick={() => copyInviteLink(selectedGroup.inviteCode)}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
                    <ExternalLink size={12} /> Ссылка
                  </button>
                  <button onClick={() => regenerateCode(selectedGroup._id)}
                    className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 text-amber-600">
                    <RefreshCw size={12} /> Обновить код
                  </button>
                </div>
              </div>
            )}

            {/* Members */}
            <div className="glass-card-solid p-4">
              <h3 className="text-sm font-semibold text-dark mb-3 flex items-center gap-2">
                <Users size={16} className="text-emerald-500" /> Участники ({selectedGroup.members?.length || 0})
              </h3>
              <div className="space-y-2">
                {selectedGroup.members?.map(m => (
                  <div key={m.user._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold text-xs flex-shrink-0">
                      {m.user.avatar ? (
                        <img src={m.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        (m.user.firstName?.[0] || '?').toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark truncate">
                        {m.user.lastName} {m.user.firstName}
                        {m.role === 'admin' && <span className="text-[10px] text-primary-500 ml-1">(admin)</span>}
                      </p>
                      <p className="text-[11px] text-gray-400">{m.user.email}</p>
                    </div>
                    {isCreator(selectedGroup) && m.user._id !== user._id && (
                      <button onClick={() => removeMember(selectedGroup._id, m.user._id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned tests */}
            <div className="glass-card-solid p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-dark flex items-center gap-2">
                  <BookOpen size={16} className="text-amber-500" /> Назначенные тесты ({selectedGroup.assignedTests?.length || 0})
                </h3>
                {isCreator(selectedGroup) && (
                  <button onClick={openAssignTest} className="btn-primary py-1 px-3 text-xs flex items-center gap-1">
                    <Plus size={12} /> Назначить
                  </button>
                )}
              </div>
              {selectedGroup.assignedTests?.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Нет назначенных тестов</p>
              ) : (
                <div className="space-y-2">
                  {selectedGroup.assignedTests?.map(at => (
                    <div key={at.test?._id || at._id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark truncate">{at.test?.title || 'Удалённый тест'}</p>
                        <p className="text-[11px] text-gray-400">{at.test?.totalPoints || 0} баллов</p>
                      </div>
                      <button
                        onClick={() => at.test?.shareLink && navigate(`/test-profile/${at.test.shareLink}`)}
                        className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
                      >
                        <ExternalLink size={12} /> Открыть
                      </button>
                      {isCreator(selectedGroup) && (
                        <button onClick={() => removeAssignedTest(at.test?._id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leave / Delete */}
            <div className="flex gap-2">
              {!isCreator(selectedGroup) && (
                <button onClick={() => leaveGroup(selectedGroup._id)}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition px-3 py-2">
                  <LogOut size={14} /> Покинуть группу
                </button>
              )}
              {isCreator(selectedGroup) && (
                <button onClick={() => setConfirmDelete(selectedGroup._id)}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition px-3 py-2">
                  <Trash2 size={14} /> Удалить группу
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
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-dark mb-2">Нет групп</h3>
              <p className="text-gray-500 text-sm mb-6">Создайте группу или присоединитесь по коду</p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setShowJoin(true)} className="btn-secondary py-2 px-4 text-sm">
                  <UserPlus size={14} className="inline mr-1" /> Присоединиться
                </button>
                <button onClick={() => setShowCreate(true)} className="btn-primary py-2 px-4 text-sm">
                  <Plus size={14} className="inline mr-1" /> Создать
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
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedGroup(group)}
                  className="glass-card-solid p-5 flex items-center gap-4 cursor-pointer hover:shadow-glass transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                    <Users size={22} className="text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-dark truncate">{group.name}</h3>
                      {isCreator(group) && (
                        <span className="text-[10px] bg-primary-100 dark:bg-primary-900/30 text-primary-600 px-1.5 py-0.5 rounded font-medium flex-shrink-0">admin</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Users size={11} /> {group.members?.length || 0}</span>
                      <span className="flex items-center gap-1"><BookOpen size={11} /> {group.assignedTests?.length || 0} тестов</span>
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setShowCreate(false)}
            >
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="glass-card-solid p-6 w-full max-w-md"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold text-dark mb-4">Создать группу</h3>
                <input
                  type="text"
                  className="input-field mb-3"
                  placeholder="Название группы"
                  value={createForm.name}
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  autoFocus
                />
                <textarea
                  className="input-field resize-none mb-4"
                  rows="2"
                  placeholder="Описание (необязательно)"
                  value={createForm.description}
                  onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowCreate(false)} className="btn-secondary py-2 px-4 text-sm">Отмена</button>
                  <button onClick={createGroup} disabled={submitting} className="btn-primary py-2 px-4 text-sm">
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setShowJoin(false)}
            >
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="glass-card-solid p-6 w-full max-w-md"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold text-dark mb-4">Присоединиться к группе</h3>
                <input
                  type="text"
                  className="input-field mb-4"
                  placeholder="Код приглашения"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowJoin(false)} className="btn-secondary py-2 px-4 text-sm">Отмена</button>
                  <button onClick={joinGroup} disabled={submitting} className="btn-primary py-2 px-4 text-sm">
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setShowAssignTest(false)}
            >
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="glass-card-solid p-6 w-full max-w-md max-h-[70vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold text-dark mb-4">Назначить тест группе</h3>
                {myTests.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">У вас нет тестов</p>
                ) : (
                  <div className="space-y-2">
                    {myTests.map(test => {
                      const alreadyAssigned = selectedGroup?.assignedTests?.some(at => at.test?._id === test._id);
                      return (
                        <button
                          key={test._id}
                          onClick={() => !alreadyAssigned && assignTest(test._id)}
                          disabled={alreadyAssigned}
                          className={`w-full text-left p-3 rounded-xl border transition ${
                            alreadyAssigned
                              ? 'border-gray-200 dark:border-slate-600 opacity-50 cursor-default'
                              : 'border-gray-200 dark:border-slate-600 hover:border-primary-300 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 cursor-pointer'
                          }`}
                        >
                          <p className="text-sm font-medium text-dark truncate">{test.title}</p>
                          <p className="text-[11px] text-gray-400">
                            {test.questions?.length || 0} вопросов | {test.totalPoints} баллов
                            {alreadyAssigned && ' | Уже назначен'}
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

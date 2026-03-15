import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Copy, ExternalLink, ArrowLeft, X, Trash2,
  BookOpen, UserPlus, LogOut, RefreshCw, Link2, MessageCircle,
  Send, Crown, Settings2, MoreHorizontal, ChevronRight
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
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'tests' | 'chat'
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const chatPollRef = useRef(null);

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

  // Chat functions
  const fetchMessages = async (groupId) => {
    try {
      const res = await api.get(`/groups/${groupId}/messages`);
      setMessages(res.data || []);
    } catch {
      // silently fail — feature may not be available yet
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !selectedGroup) return;
    try {
      await api.post(`/groups/${selectedGroup._id}/messages`, { text: chatInput.trim() });
      setChatInput('');
      fetchMessages(selectedGroup._id);
    } catch {
      toast.error('Ошибка отправки');
    }
  };

  // Start / stop chat polling
  useEffect(() => {
    if (selectedGroup && activeTab === 'chat') {
      fetchMessages(selectedGroup._id);
      chatPollRef.current = setInterval(() => fetchMessages(selectedGroup._id), 5000);
    }
    return () => { if (chatPollRef.current) clearInterval(chatPollRef.current); };
  }, [selectedGroup, activeTab]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Join by URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code) {
      setJoinCode(code);
      setShowJoin(true);
      window.history.replaceState({}, '', '/groups');
    }
  }, []);

  const isCreator = (group) => group.creator?._id === user?._id;

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

  const tabs = [
    { key: 'members', label: 'Участники', icon: Users, count: selectedGroup?.members?.length },
    { key: 'tests', label: 'Тесты', icon: BookOpen, count: selectedGroup?.assignedTests?.length },
    { key: 'chat', label: 'Чат', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <Toaster position="top-right" />
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => selectedGroup ? setSelectedGroup(null) : navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition">
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                {selectedGroup ? selectedGroup.name : 'Группы'}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedGroup
                  ? `${selectedGroup.members?.length || 0} участников`
                  : `${groups.length} групп`
                }
              </p>
            </div>
          </div>
          {!selectedGroup && (
            <div className="flex gap-2">
              <button onClick={() => setShowJoin(true)} className="btn-secondary flex items-center gap-1.5 py-2 px-4 text-xs">
                <UserPlus size={14} /> Присоединиться
              </button>
              <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5 py-2 px-4 text-xs">
                <Plus size={14} /> Создать
              </button>
            </div>
          )}
          {selectedGroup && isCreator(selectedGroup) && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => copyInviteCode(selectedGroup.inviteCode)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition" title="Копировать код">
                <Copy size={16} />
              </button>
              <button onClick={() => copyInviteLink(selectedGroup.inviteCode)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition" title="Копировать ссылку">
                <ExternalLink size={16} />
              </button>
            </div>
          )}
        </motion.div>

        {/* Content */}
        {selectedGroup ? (
          /* ─── GROUP DETAIL ─── */
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-0">
            {/* Invite code banner (admin) */}
            {isCreator(selectedGroup) && (
              <div className="flex items-center gap-3 mb-5 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                  <Link2 size={16} className="text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Код приглашения</p>
                  <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">{selectedGroup.inviteCode}</p>
                </div>
                <button onClick={() => regenerateCode(selectedGroup._id)}
                  className="p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-400 hover:text-indigo-600 transition" title="Обновить код">
                  <RefreshCw size={15} />
                </button>
              </div>
            )}

            {/* Tab bar */}
            <div className="flex items-center gap-1 mb-5 border-b border-gray-100 dark:border-slate-800">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon size={15} />
                  <span>{tab.label}</span>
                  {tab.count != null && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      activeTab === tab.key
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-500'
                    }`}>{tab.count}</span>
                  )}
                  {activeTab === tab.key && (
                    <motion.div layoutId="activeGroupTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {activeTab === 'members' && (
                <motion.div key="members" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                  <div className="glass-card-solid overflow-hidden">
                    <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                      {selectedGroup.members?.map(m => (
                        <div key={m.user._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60 dark:hover:bg-slate-700/30 transition-colors">
                          <div className="w-9 h-9 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm flex-shrink-0 overflow-hidden">
                            {m.user.avatar ? (
                              <img src={m.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              (m.user.firstName?.[0] || '?').toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                              {m.user.lastName} {m.user.firstName}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
                          </div>
                          {m.role === 'admin' && (
                            <span className="flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                              <Crown size={10} /> admin
                            </span>
                          )}
                          {isCreator(selectedGroup) && m.user._id !== user._id && (
                            <button onClick={() => removeMember(selectedGroup._id, m.user._id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition flex-shrink-0 opacity-0 group-hover:opacity-100">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Group actions */}
                  <div className="flex gap-3 mt-5">
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
              )}

              {activeTab === 'tests' && (
                <motion.div key="tests" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                  {isCreator(selectedGroup) && (
                    <div className="flex justify-end mb-4">
                      <button onClick={openAssignTest} className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5">
                        <Plus size={13} /> Назначить тест
                      </button>
                    </div>
                  )}
                  {selectedGroup.assignedTests?.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-14 h-14 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <BookOpen size={24} className="text-gray-300 dark:text-gray-600" />
                      </div>
                      <p className="text-sm text-gray-400 mb-1">Нет назначенных тестов</p>
                      {isCreator(selectedGroup) && (
                        <p className="text-xs text-gray-300 dark:text-gray-500">Назначьте тест из вашей библиотеки</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedGroup.assignedTests?.map(at => (
                        <div key={at.test?._id || at._id} className="glass-card-solid p-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                            <BookOpen size={18} className="text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{at.test?.title || 'Удалённый тест'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{at.test?.questions?.length || 0} вопросов &middot; {at.test?.totalPoints || 0} баллов</p>
                          </div>
                          <button
                            onClick={() => at.test?.shareLink && navigate(`/test-profile/${at.test.shareLink}`)}
                            className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                          >
                            Открыть <ChevronRight size={13} />
                          </button>
                          {isCreator(selectedGroup) && (
                            <button onClick={() => removeAssignedTest(at.test?._id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition flex-shrink-0">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'chat' && (
                <motion.div key="chat" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
                  <div className="glass-card-solid overflow-hidden flex flex-col" style={{ height: '420px' }}>
                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                      {messages.length === 0 ? (
                        <div className="text-center py-16">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <MessageCircle size={20} className="text-gray-300 dark:text-gray-600" />
                          </div>
                          <p className="text-sm text-gray-400">Начните обсуждение</p>
                          <p className="text-xs text-gray-300 dark:text-gray-500 mt-1">Сообщения видны всем участникам группы</p>
                        </div>
                      ) : (
                        messages.map((msg, i) => {
                          const isMe = msg.user?._id === user?._id;
                          return (
                            <div key={msg._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%] ${isMe ? 'order-2' : ''}`}>
                                {!isMe && (
                                  <p className="text-[10px] text-gray-400 mb-0.5 ml-1 font-medium">
                                    {msg.user?.firstName} {msg.user?.lastName}
                                  </p>
                                )}
                                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                  isMe
                                    ? 'bg-indigo-500 text-white rounded-br-md'
                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
                                }`}>
                                  {msg.text}
                                </div>
                                <p className={`text-[10px] text-gray-300 dark:text-gray-600 mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                                  {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-gray-100 dark:border-slate-700 px-4 py-3 flex items-center gap-2">
                      <input
                        type="text"
                        className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-600 transition-colors"
                        placeholder="Написать сообщение..."
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!chatInput.trim()}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* ─── GROUPS LIST ─── */
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {groups.map((group, i) => (
                <motion.div
                  key={group._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => { setSelectedGroup(group); setActiveTab('members'); }}
                  className="glass-card-solid px-5 py-4 flex items-center gap-4 cursor-pointer group"
                >
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getGroupGradient(group.name)} flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm`}>
                    {(group.name?.[0] || 'G').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors text-sm">{group.name}</h3>
                      {isCreator(group) && (
                        <span className="flex items-center gap-0.5 text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                          <Crown size={9} /> admin
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Users size={12} /> {group.members?.length || 0}</span>
                      <span className="flex items-center gap-1"><BookOpen size={12} /> {group.assignedTests?.length || 0} тестов</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" />
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
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-gray-200/60 dark:border-gray-700/60 p-6 w-full max-w-md"
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
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">Название</label>
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
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">Описание</label>
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
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium">Отмена</button>
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
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-gray-200/60 dark:border-gray-700/60 p-6 w-full max-w-md"
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
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wide">Код приглашения</label>
                  <input
                    type="text"
                    className="input-field text-sm font-mono tracking-wider"
                    placeholder="Например: abc123"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowJoin(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium">Отмена</button>
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
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-card border border-gray-200/60 dark:border-gray-700/60 p-6 w-full max-w-md max-h-[70vh] overflow-y-auto"
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
                  <div className="space-y-1.5">
                    {myTests.map(test => {
                      const alreadyAssigned = selectedGroup?.assignedTests?.some(at => at.test?._id === test._id);
                      return (
                        <button
                          key={test._id}
                          onClick={() => !alreadyAssigned && assignTest(test._id)}
                          disabled={alreadyAssigned}
                          className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                            alreadyAssigned
                              ? 'opacity-40 cursor-default bg-gray-50 dark:bg-slate-800/50'
                              : 'hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 cursor-pointer'
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{test.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {test.questions?.length || 0} вопросов &middot; {test.totalPoints} баллов
                            {alreadyAssigned && <span className="text-indigo-500 ml-1">&middot; Назначен</span>}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
                <button onClick={() => setShowAssignTest(false)} className="w-full mt-4 px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium">Закрыть</button>
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

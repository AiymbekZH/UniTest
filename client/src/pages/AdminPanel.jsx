import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, FileText, BarChart3, Search, Ban, ShieldCheck,
  AlertTriangle, Trash2, ChevronDown, ArrowLeft, UserCog, MessageSquare,
  ShieldOff, Trophy, Eye, X, Flag, CheckCircle, XCircle, Clock, Sparkles
} from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';

export default function AdminPanel() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [tests, setTests] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null); // { type: 'ban'|'warn'|'role'|'message', userId, userName }
  const [actionInput, setActionInput] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  const [testDetail, setTestDetail] = useState(null); // for editing questions
  const [leaderboardData, setLeaderboardData] = useState(null); // { testId, testTitle, results }
  const [reports, setReports] = useState([]);
  const [reportFilter, setReportFilter] = useState('pending');
  const [reportSubTab, setReportSubTab] = useState('all');

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      toast.error('Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users', { params: { search, limit: 50 } });
      setUsers(res.data.users);
    } catch (err) {
      toast.error('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const loadTests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/tests', { params: { search, limit: 50 } });
      setTests(res.data.tests);
    } catch (err) {
      toast.error('Ошибка загрузки тестов');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports', { params: { status: reportFilter } });
      setReports(res.data.reports || []);
    } catch (err) {
      toast.error('Ошибка загрузки жалоб');
    } finally {
      setLoading(false);
    }
  };

  const handleReportAction = async (reportId, status, adminNote = '') => {
    try {
      await api.put(`/reports/${reportId}`, { status, adminNote });
      toast.success(status === 'resolved' ? 'Жалоба решена' : status === 'rejected' ? 'Жалоба отклонена' : 'Обновлено');
      loadReports();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    }
  };

  useEffect(() => {
    if (tab === 'users') loadUsers();
    else if (tab === 'tests') loadTests();
    else if (tab === 'stats') loadStats();
    else if (tab === 'reports') loadReports();
  }, [tab, reportFilter]);

  const handleBan = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/ban`, { reason: actionInput || 'Нарушение правил' });
      toast.success('Пользователь заблокирован');
      setActionModal(null);
      setActionInput('');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const handleUnban = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/unban`);
      toast.success('Пользователь разблокирован');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const handleWarn = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/warn`, { message: actionInput });
      toast.success('Предупреждение отправлено');
      setActionModal(null);
      setActionInput('');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const handleRoleChange = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: selectedRole });
      toast.success('Роль обновлена');
      setActionModal(null);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const handleToggleAIAccess = async (userId) => {
    try {
      const res = await api.put(`/admin/users/${userId}/ai-access`);
      toast.success(res.data.message || 'Доступ к AI обновлен');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка изменения доступа');
    }
  };

  const handleDeleteTest = async (testId) => {
    try {
      await api.delete(`/admin/tests/${testId}`, { data: { reason: 'Удалён администратором' } });
      toast.success('Тест удалён');
      loadTests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const handleRemoveWarnings = async (userId) => {
    try {
      await api.delete(`/admin/users/${userId}/warnings`);
      toast.success('Предупреждения сняты');
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const handleSendMessage = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/message`, { message: actionInput });
      toast.success('Сообщение отправлено');
      setActionModal(null);
      setActionInput('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const handleViewLeaderboard = async (testId, testTitle) => {
    try {
      const res = await api.get(`/admin/leaderboard/${testId}`);
      setLeaderboardData({ testId, testTitle, results: res.data.results });
    } catch (err) {
      toast.error('Ошибка загрузки рейтинга');
    }
  };

  const handleDeleteResult = async (resultId) => {
    try {
      await api.delete(`/admin/results/${resultId}`);
      toast.success('Результат удалён');
      if (leaderboardData) {
        setLeaderboardData({
          ...leaderboardData,
          results: leaderboardData.results.filter(r => r._id !== resultId)
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const handleViewTestQuestions = async (testId) => {
    try {
      const res = await api.get(`/admin/tests/${testId}/details`);
      setTestDetail(res.data);
    } catch (err) {
      toast.error('Ошибка загрузки теста');
    }
  };

  const handleDeleteQuestion = async (testId, questionId) => {
    try {
      await api.delete(`/admin/tests/${testId}/questions/${questionId}`);
      toast.success('Вопрос удалён');
      // Refresh test detail
      handleViewTestQuestions(testId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка');
    }
  };

  const tabs = [
    { key: 'stats', label: t('statistics'), icon: BarChart3 },
    { key: 'users', label: t('users'), icon: Users },
    { key: 'tests', label: t('tests'), icon: FileText },
    { key: 'reports', label: 'Жалобы', icon: Flag },
  ];

  const StatCard = ({ icon: Icon, label, value, color, onClick }) => (
    <motion.div whileHover={{ y: -2 }} className={`glass-card-solid p-5 ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-dark">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-surface">
      <Toaster position="top-right" />
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate('/dashboard')} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition">
              <ArrowLeft size={20} className="text-gray-500" />
            </button>
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-dark">{t('adminPanel')}</h1>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                ${tab === tb.key ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25' : 'bg-white dark:bg-slate-800 text-gray-500 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
            >
              <tb.icon size={16} /> {tb.label}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {tab === 'stats' && stats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={Users} label={t('totalUsers')} value={stats.userCount} color="bg-blue-500" onClick={() => setTab('users')} />
              <StatCard icon={FileText} label={t('totalTests')} value={stats.testCount} color="bg-emerald-500" onClick={() => setTab('tests')} />
              <StatCard icon={BarChart3} label={t('totalResults')} value={stats.resultCount} color="bg-purple-500" />
              <StatCard icon={Ban} label={t('bannedUsers')} value={stats.bannedCount} color="bg-red-500" onClick={() => setTab('users')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card-solid p-5">
                <h3 className="font-semibold text-dark mb-3">{t('recentUsers')}</h3>
                <div className="space-y-2">
                  {stats.recentUsers?.map(u => (
                    <div key={u._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/50 text-primary-600 rounded-lg flex items-center justify-center text-xs font-bold">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-[10px] text-gray-400">{u.email}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-600' : u.role === 'teacher' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card-solid p-5">
                <h3 className="font-semibold text-dark mb-3">{t('recentTests')}</h3>
                <div className="space-y-2">
                  {stats.recentTests?.map(test => (
                    <div key={test._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 rounded-lg flex items-center justify-center text-xs font-bold">
                        <FileText size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark truncate">{test.title}</p>
                        <p className="text-[10px] text-gray-400">{test.creator?.firstName} {test.creator?.lastName}</p>
                      </div>
                      <span className="text-[10px] text-gray-400">{test.questions?.length || 0} q</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text" className="input-field pl-10 text-sm" placeholder={t('search') + '...'}
                  value={search} onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadUsers()}
                />
              </div>
              <button onClick={loadUsers} className="btn-primary py-2 px-4 text-sm">{t('search')}</button>
            </div>

            <div className="space-y-2">
              {users.map(u => (
                <motion.div key={u._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="glass-card-solid p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 text-primary-600 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {u.firstName?.[0]}{u.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-dark">{u.firstName} {u.lastName}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : u.role === 'teacher' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'}`}>
                        {u.role}
                      </span>
                      {u.isBanned && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">{t('banned')}</span>}
                      {u.aiAccess && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 flex items-center gap-1"><Sparkles size={10} /> AI Access</span>}
                    </div>
                    <p className="text-xs text-gray-400">{u.email}</p>
                    {u.warnings?.length > 0 && (
                      <p className="text-[10px] text-amber-500 mt-0.5 flex items-center gap-1"><AlertTriangle size={10} /> {u.warnings.length} {t('warnings').toLowerCase()}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => { setActionModal({ type: 'role', userId: u._id, userName: `${u.firstName} ${u.lastName}` }); setSelectedRole(u.role); }}
                      className="p-2 text-xs rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition"
                      title={t('changeRole')}
                    >
                      <UserCog size={14} />
                    </button>
                    <button
                      onClick={() => { setActionModal({ type: 'warn', userId: u._id, userName: `${u.firstName} ${u.lastName}` }); setActionInput(''); }}
                      className="p-2 text-xs rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 transition"
                      title={t('warn')}
                    >
                      <AlertTriangle size={14} />
                    </button>
                    <button
                      onClick={() => { setActionModal({ type: 'message', userId: u._id, userName: `${u.firstName} ${u.lastName}` }); setActionInput(''); }}
                      className="p-2 text-xs rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 transition"
                      title="Отправить сообщение"
                    >
                      <MessageSquare size={14} />
                    </button>
                    <button
                      onClick={() => handleToggleAIAccess(u._id)}
                      className={`p-2 text-xs rounded-lg transition ${u.aiAccess ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40' : 'bg-indigo-50 text-indigo-300 hover:bg-indigo-100 dark:bg-indigo-900/10'}`}
                      title={u.aiAccess ? 'Забрать доступ к AI' : 'Дать доступ к AI'}
                    >
                      <Sparkles size={14} />
                    </button>
                    {u.warnings?.length > 0 && (
                      <button onClick={() => handleRemoveWarnings(u._id)}
                        className="p-2 text-xs rounded-lg bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition"
                        title="Снять предупреждения"
                      >
                        <ShieldOff size={14} />
                      </button>
                    )}
                    {u.isBanned ? (
                      <button onClick={() => handleUnban(u._id)}
                        className="p-2 text-xs rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 transition"
                        title={t('unban')}
                      >
                        <ShieldCheck size={14} />
                      </button>
                    ) : (
                      <button onClick={() => { setActionModal({ type: 'ban', userId: u._id, userName: `${u.firstName} ${u.lastName}` }); setActionInput(''); }}
                        className="p-2 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition"
                        title={t('ban')}
                      >
                        <Ban size={14} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              {!loading && users.length === 0 && (
                <p className="text-center py-8 text-sm text-gray-400">Пользователи не найдены</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Tests Tab */}
        {tab === 'tests' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text" className="input-field pl-10 text-sm" placeholder={t('search') + '...'}
                  value={search} onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadTests()}
                />
              </div>
              <button onClick={loadTests} className="btn-primary py-2 px-4 text-sm">{t('search')}</button>
            </div>

            <div className="space-y-2">
              {tests.map(test => (
                <motion.div key={test._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="glass-card-solid p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-dark">{test.title}</p>
                      {test.isDeleted && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600">{t('delete')}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {test.creator?.firstName} {test.creator?.lastName} · {test.questions?.length || 0} {t('questions')} · {test.attemptCount || 0} attempts
                    </p>
                  </div>
                  {!test.isDeleted && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => handleViewLeaderboard(test._id, test.title)}
                        className="p-2 text-xs rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 transition"
                        title="Рейтинг"
                      >
                        <Trophy size={14} />
                      </button>
                      <button onClick={() => handleViewTestQuestions(test._id)}
                        className="p-2 text-xs rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition"
                        title="Вопросы"
                      >
                        <Eye size={14} />
                      </button>
                      <button onClick={() => handleDeleteTest(test._id)}
                        className="p-2 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition"
                        title={t('delete')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
              {!loading && tests.length === 0 && (
                <p className="text-center py-8 text-sm text-gray-400">Тесты не найдены</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Reports Tab */}
        {tab === 'reports' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Sub-tabs */}
            <div className="flex gap-2 mb-4">
              {[
                { key: 'all', label: 'Все' },
                { key: 'user', label: 'Пользователи' },
                { key: 'test', label: 'Тесты' },
                { key: 'comment', label: 'Комментарии' }
              ].map(st => (
                <button key={st.key} onClick={() => setReportSubTab(st.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${reportSubTab === st.key ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                  {st.label}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex gap-2 mb-4">
              {[
                { key: 'pending', label: 'Ожидает', icon: Clock, color: 'text-amber-600' },
                { key: 'resolved', label: 'Решено', icon: CheckCircle, color: 'text-emerald-600' },
                { key: 'rejected', label: 'Отклонено', icon: XCircle, color: 'text-red-600' }
              ].map(f => (
                <button key={f.key} onClick={() => setReportFilter(f.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition
                    ${reportFilter === f.key ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25' : 'bg-white dark:bg-slate-800 text-gray-500 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                  <f.icon size={14} /> {f.label}
                </button>
              ))}
            </div>

            {/* Reports list */}
            <div className="space-y-3">
              {reports
                .filter(r => reportSubTab === 'all' || r.targetType === reportSubTab)
                .map(report => (
                <motion.div key={report._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="glass-card-solid p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      report.targetType === 'user' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      report.targetType === 'test' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                      'bg-purple-100 dark:bg-purple-900/30'
                    }`}>
                      {report.targetType === 'user' ? <Users size={18} className="text-blue-600" /> :
                       report.targetType === 'test' ? <FileText size={18} className="text-emerald-600" /> :
                       <MessageSquare size={18} className="text-purple-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          report.targetType === 'user' ? 'bg-blue-100 text-blue-700' :
                          report.targetType === 'test' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {report.targetType === 'user' ? 'Пользователь' : report.targetType === 'test' ? 'Тест' : 'Комментарий'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          report.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          report.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      <p className="text-sm text-dark mt-1">{report.reason}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        От: {report.reporter?.firstName} {report.reporter?.lastName} ({report.reporter?.email})
                        · {new Date(report.createdAt).toLocaleString('ru-RU')}
                      </p>
                      {report.adminNote && (
                        <p className="text-xs text-gray-500 mt-1 italic">Заметка: {report.adminNote}</p>
                      )}
                    </div>
                    {report.status === 'pending' && (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => handleReportAction(report._id, 'resolved')}
                          className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 transition" title="Решено">
                          <CheckCircle size={14} />
                        </button>
                        <button onClick={() => handleReportAction(report._id, 'rejected')}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition" title="Отклонить">
                          <XCircle size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {!loading && reports.filter(r => reportSubTab === 'all' || r.targetType === reportSubTab).length === 0 && (
                <p className="text-center py-8 text-sm text-gray-400">Жалоб не найдено</p>
              )}
            </div>
          </motion.div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        )}
      </main>

      {/* Action Modal */}
      <AnimatePresence>
        {actionModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setActionModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-dark mb-1">
                {actionModal.type === 'ban' ? t('banUser') : actionModal.type === 'warn' ? t('warn') : actionModal.type === 'message' ? 'Отправить сообщение' : t('changeRole')}
              </h3>
              <p className="text-sm text-gray-500 mb-4">{actionModal.userName}</p>

              {actionModal.type === 'role' ? (
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="input-field text-sm mb-4"
                >
                  <option value="student">{t('student')}</option>
                  <option value="teacher">{t('teacher')}</option>
                  <option value="admin">{t('adminRole')}</option>
                </select>
              ) : (
                <textarea
                  className="input-field text-sm mb-4 min-h-[80px] resize-none"
                  placeholder={actionModal.type === 'ban' ? t('banReason') : actionModal.type === 'message' ? 'Текст сообщения...' : t('warnMessage')}
                  value={actionInput}
                  onChange={e => setActionInput(e.target.value)}
                  rows={3}
                />
              )}

              <div className="flex gap-2 justify-end">
                <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 transition">
                  {t('cancel')}
                </button>
                <button
                  onClick={() => {
                    if (actionModal.type === 'ban') handleBan(actionModal.userId);
                    else if (actionModal.type === 'warn') handleWarn(actionModal.userId);
                    else if (actionModal.type === 'message') handleSendMessage(actionModal.userId);
                    else handleRoleChange(actionModal.userId);
                  }}
                  className="btn-primary py-2 px-4 text-sm"
                >
                  {actionModal.type === 'message' ? 'Отправить' : t('save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {leaderboardData && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setLeaderboardData(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-dark flex items-center gap-2">
                    <Trophy size={18} className="text-purple-500" /> Рейтинг
                  </h3>
                  <p className="text-xs text-gray-500">{leaderboardData.testTitle}</p>
                </div>
                <button onClick={() => setLeaderboardData(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              {leaderboardData.results.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Нет результатов</p>
              ) : (
                <div className="space-y-2">
                  {leaderboardData.results.map((r, i) => (
                    <div key={r._id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600">
                      <span className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark truncate">
                          {r.user ? `${r.user.lastName} ${r.user.firstName}` : r.guestName || 'Гость'}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {r.percentage}% · {r.score}/{r.totalPoints} · {new Date(r.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteResult(r._id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                        title="Удалить из рейтинга"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test Questions Modal */}
      <AnimatePresence>
        {testDetail && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setTestDetail(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-dark flex items-center gap-2">
                    <FileText size={18} className="text-blue-500" /> Вопросы теста
                  </h3>
                  <p className="text-xs text-gray-500">{testDetail.title} · {testDetail.questions?.length || 0} вопросов</p>
                </div>
                <button onClick={() => setTestDetail(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              {testDetail.questions?.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Нет вопросов</p>
              ) : (
                <div className="space-y-3">
                  {testDetail.questions?.map((q, i) => (
                    <div key={q.id || i} className="p-4 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-6 h-6 rounded-md bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 font-medium">
                              {q.type}
                            </span>
                            <span className="text-[10px] text-gray-400">{q.points || 1} б.</span>
                          </div>
                          <p className="text-sm text-dark mb-2">{q.questionText || 'Без текста'}</p>
                          {q.options?.length > 0 && (
                            <div className="space-y-1">
                              {q.options.map((opt, oi) => (
                                <div key={oi} className={`text-xs px-2 py-1 rounded-md ${opt.isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium' : 'text-gray-500'}`}>
                                  {opt.text} {opt.matchPair ? `→ ${opt.matchPair}` : ''} {opt.isCorrect && <CheckCircle size={10} className="inline text-emerald-500" />}
                                </div>
                              ))}
                            </div>
                          )}
                          {q.correctAnswer && (
                            <p className="text-xs text-emerald-600 mt-1">Ответ: {q.correctAnswer}</p>
                          )}
                        </div>
                        {testDetail.questions.length > 1 && (
                          <button
                            onClick={() => handleDeleteQuestion(testDetail._id, q.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition flex-shrink-0"
                            title="Удалить вопрос"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

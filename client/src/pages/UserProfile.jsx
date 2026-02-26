import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Calendar, FileText, BarChart3,
  Star, Users, Tag, Flag
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({});
  const [publicTests, setPublicTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    if (currentUser && id === currentUser.id) {
      navigate('/profile');
      return;
    }
    api.get(`/profile/${id}`)
      .then(res => {
        setProfile(res.data.user);
        setStats(res.data.stats || {});
        setPublicTests(res.data.publicTests || []);
      })
      .catch(() => {
        toast.error('Пользователь не найден');
        navigate('/dashboard');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    try {
      await api.post('/reports', { targetType: 'user', targetId: id, reason: reportReason.trim() });
      toast.success(t('reportSent'));
      setShowReport(false);
      setReportReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const roleLabel = profile?.role === 'admin' ? t('adminRole') : profile?.role === 'teacher' ? t('teacher') : t('student');

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-surface">
      <Toaster position="top-right" />
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-dark transition mb-6"
        >
          <ArrowLeft size={16} /> {t('back')}
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Profile card */}
          <div className="glass-card-solid p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-24 h-24 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-3xl font-bold text-primary-600 overflow-hidden flex-shrink-0">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{profile.firstName?.[0]}{profile.lastName?.[0]}</span>
                )}
              </div>
              <div className="text-center sm:text-left flex-1">
                <h1 className="text-2xl font-bold text-dark">
                  {profile.firstName} {profile.lastName}
                  {profile.middleName && <span className="text-gray-400 font-normal"> {profile.middleName}</span>}
                </h1>
                <span className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  profile.role === 'admin' ? 'bg-red-100 text-red-600' :
                  profile.role === 'teacher' ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {roleLabel}
                </span>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1 justify-center sm:justify-start">
                  <Calendar size={12} /> {t('memberSince')} {new Date(profile.createdAt).toLocaleDateString()}
                </p>
              </div>
              {currentUser && currentUser.id !== id && (
                <button onClick={() => setShowReport(true)}
                  className="p-2.5 rounded-xl text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
                  title={t('report')}>
                  <Flag size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="glass-card-solid p-5 text-center">
              <FileText size={22} className="text-primary-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-dark">{stats.testsCreated || 0}</p>
              <p className="text-xs text-gray-500">{t('testsCreated')}</p>
            </div>
            <div className="glass-card-solid p-5 text-center">
              <BarChart3 size={22} className="text-emerald-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-dark">{stats.testsTaken || 0}</p>
              <p className="text-xs text-gray-500">{t('testsTaken')}</p>
            </div>
          </div>

          {/* Public tests */}
          {publicTests.length > 0 && (
            <div className="glass-card-solid p-6">
              <h3 className="font-semibold text-dark mb-4 flex items-center gap-2">
                <FileText size={16} className="text-primary-600" />
                {t('publicTest')} ({publicTests.length})
              </h3>
              <div className="space-y-3">
                {publicTests.map(test => (
                  <Link key={test._id} to={`/test-profile/${test.shareLink}`}
                    className="block p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-100 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-600 transition group">
                    <h4 className="text-sm font-medium text-dark group-hover:text-primary-600 transition">{test.title}</h4>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <BarChart3 size={10} /> {test.questions?.length || 0} {t('questions')}
                      </span>
                      {test.rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star size={10} className="fill-amber-400 text-amber-400" /> {test.rating.toFixed(1)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users size={10} /> {test.attemptCount || 0}
                      </span>
                    </div>
                    {test.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {test.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gray-100 dark:bg-slate-600 rounded text-[10px] text-gray-500 dark:text-gray-300">
                            <Tag size={8} /> {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Report modal */}
        {showReport && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowReport(false)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
                <Flag size={18} className="text-orange-500" />
                {t('reportUser')}
              </h3>
              <textarea
                className="input-field text-sm w-full resize-none"
                rows={3}
                placeholder={t('reportReason')}
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                maxLength={500}
              />
              <div className="flex gap-3 mt-4">
                <button onClick={() => { setShowReport(false); setReportReason(''); }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                  {t('cancel')}
                </button>
                <button onClick={handleReport} disabled={!reportReason.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition disabled:opacity-50">
                  {t('report')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

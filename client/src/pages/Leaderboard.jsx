import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, ArrowLeft, Clock, Star, User, Award } from 'lucide-react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { useLanguage } from '../context/LanguageContext';

export default function Leaderboard() {
  const { testId } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/results/leaderboard/${testId}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.message || 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [testId]);

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown size={20} className="text-yellow-500" />;
    if (rank === 2) return <Medal size={20} className="text-gray-400" />;
    if (rank === 3) return <Medal size={20} className="text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-400">{rank}</span>;
  };

  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/30 dark:to-slate-800/30 border-gray-200 dark:border-gray-700';
    if (rank === 3) return 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800';
    return 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700';
  };

  const formatTime = (seconds) => {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <Trophy size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-dark mb-1">{t('error')}</h3>
            <p className="text-sm text-gray-500">{error}</p>
            <Link to="/" className="btn-primary inline-flex items-center gap-2 mt-4 py-2 px-4 text-sm">
              <ArrowLeft size={14} /> {t('toHome')}
            </Link>
          </div>
        ) : data && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 dark:bg-primary-900/30 rounded-2xl mb-4">
                <Trophy size={32} className="text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-dark mb-1">{t('leaderboard')}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{data.testTitle}</p>
              <p className="text-xs text-gray-400 mt-1">{t('totalParticipants')}: {data.leaderboard?.length || 0}</p>
            </div>

            {/* Top 3 Podium */}
            {data.leaderboard?.length >= 3 && (
              <div className="flex items-end justify-center gap-4 mb-8">
                {/* 2nd place */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-lg font-bold text-white mb-2 overflow-hidden">
                    {data.leaderboard[1].avatar ? (
                      <img src={data.leaderboard[1].avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      data.leaderboard[1].userName?.charAt(0) || '?'
                    )}
                  </div>
                  <p className="text-xs font-medium text-dark truncate max-w-[80px]">{data.leaderboard[1].userName}</p>
                  <p className="text-xs text-gray-500">{data.leaderboard[1].percentage}%</p>
                  <div className="w-20 h-16 bg-gray-200 dark:bg-gray-700 rounded-t-lg mt-2 flex items-center justify-center">
                    <Medal size={20} className="text-gray-500" />
                  </div>
                </motion.div>

                {/* 1st place */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-xl font-bold text-white mb-2 ring-3 ring-yellow-300/50 overflow-hidden">
                    {data.leaderboard[0].avatar ? (
                      <img src={data.leaderboard[0].avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      data.leaderboard[0].userName?.charAt(0) || '?'
                    )}
                  </div>
                  <p className="text-sm font-semibold text-dark truncate max-w-[100px]">{data.leaderboard[0].userName}</p>
                  <p className="text-xs text-primary-600 font-medium">{data.leaderboard[0].percentage}%</p>
                  <div className="w-24 h-24 bg-yellow-200 dark:bg-yellow-800/30 rounded-t-lg mt-2 flex items-center justify-center">
                    <Crown size={28} className="text-yellow-600" />
                  </div>
                </motion.div>

                {/* 3rd place */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center text-lg font-bold text-white mb-2 overflow-hidden">
                    {data.leaderboard[2].avatar ? (
                      <img src={data.leaderboard[2].avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      data.leaderboard[2].userName?.charAt(0) || '?'
                    )}
                  </div>
                  <p className="text-xs font-medium text-dark truncate max-w-[80px]">{data.leaderboard[2].userName}</p>
                  <p className="text-xs text-gray-500">{data.leaderboard[2].percentage}%</p>
                  <div className="w-20 h-12 bg-amber-200 dark:bg-amber-800/30 rounded-t-lg mt-2 flex items-center justify-center">
                    <Medal size={18} className="text-amber-600" />
                  </div>
                </motion.div>
              </div>
            )}

            {/* Full list */}
            <div className="space-y-2">
              {data.leaderboard?.map((entry, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${getRankBg(entry.rank)}`}>
                  <div className="flex-shrink-0 w-8 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>

                  <button
                    onClick={() => entry.userId && navigate(`/user/${entry.userId}`)}
                    className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-600 flex-shrink-0 overflow-hidden"
                  >
                    {entry.avatar ? (
                      <img src={entry.avatar} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      entry.userName?.charAt(0)?.toUpperCase() || '?'
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => entry.userId && navigate(`/user/${entry.userId}`)}
                      className="text-sm font-medium text-dark truncate block hover:text-primary-600 transition"
                    >
                      {entry.userName}
                    </button>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-0.5"><Star size={10} /> {entry.score}/{entry.maxScore}</span>
                      {entry.timeSpent && <span className="flex items-center gap-0.5"><Clock size={10} /> {formatTime(entry.timeSpent)}</span>}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold ${entry.percentage >= 80 ? 'text-emerald-600' : entry.percentage >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                      {entry.percentage}%
                    </p>
                  </div>
                </motion.div>
              ))}

              {(!data.leaderboard || data.leaderboard.length === 0) && (
                <div className="text-center py-12">
                  <Award size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-semibold text-dark mb-1">{t('emptyLeaderboard')}</h3>
                  <p className="text-sm text-gray-500">{t('noOneCompleted')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, ArrowLeft, Clock, Star, Award, Users } from 'lucide-react';
import api from '../services/api';
import Navbar from '../components/Navbar';
import AnimatedHero from '../components/AnimatedHero';
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
    if (rank === 1) return <Crown size={16} className="text-amber-500" />;
    if (rank === 2) return <Medal size={16} className="text-slate-400" />;
    if (rank === 3) return <Medal size={16} className="text-amber-700" />;
    return <span className="w-5 text-center text-[11px] font-bold text-gray-400">{rank}</span>;
  };

  const formatTime = (seconds) => {
    if (!seconds) return '-';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const podium = data?.leaderboard?.slice(0, 3) || [];
  const restOfList = data?.leaderboard?.slice(3) || [];

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
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
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Hero */}
            <AnimatedHero
              preset="gold"
              height="md"
              eyebrow={t('leaderboard')}
              icon={<Trophy size={22} />}
              title={data.testTitle}
              subtitle={data.leaderboard?.length ? `Топ-исполнители теста — рейтинг обновляется в реальном времени.` : 'Пока никто не завершил тест.'}
              stats={[
                { icon: <Users size={14} />, label: t('totalParticipants'), value: data.leaderboard?.length || 0 },
                data.leaderboard?.[0] ? { icon: <Crown size={14} />, label: 'Top score', value: `${data.leaderboard[0].percentage}%` } : null
              ].filter(Boolean)}
            />

            {/* Premium 3D Podium */}
            {podium.length >= 3 && (
              <div className="glass-card-solid p-6 sm:p-8">
                <div className="flex items-end justify-center gap-3 sm:gap-6">
                  {/* 2nd place */}
                  <PodiumColumn rank={2} entry={podium[1]} onClick={() => podium[1].userId && navigate(`/profile/${podium[1].userId}`)} />
                  {/* 1st place (center, tallest) */}
                  <PodiumColumn rank={1} entry={podium[0]} onClick={() => podium[0].userId && navigate(`/profile/${podium[0].userId}`)} />
                  {/* 3rd place */}
                  <PodiumColumn rank={3} entry={podium[2]} onClick={() => podium[2].userId && navigate(`/profile/${podium[2].userId}`)} />
                </div>
              </div>
            )}

            {/* Full list (ranks 4+) or podium fallback if < 3 entries */}
            {(restOfList.length > 0 || podium.length < 3) && (
              <div className="glass-card-solid p-3 sm:p-4">
                <div className="space-y-1">
                  {(podium.length < 3 ? data.leaderboard : restOfList)?.map((entry, i) => (
                    <motion.div
                      key={entry.userId || entry.userName + i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-gray-50 dark:hover:bg-slate-700/40"
                    >
                      <div className="flex w-8 flex-shrink-0 justify-center">
                        {getRankIcon(entry.rank)}
                      </div>
                      <button
                        onClick={() => entry.userId && navigate(`/profile/${entry.userId}`)}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-xs font-bold text-primary-600 dark:bg-primary-900/30"
                      >
                        {entry.avatar ? (
                          <img src={entry.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          entry.userName?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => entry.userId && navigate(`/profile/${entry.userId}`)}
                          className="block truncate text-left text-sm font-medium text-dark transition hover:text-primary-600"
                        >
                          {entry.userName}
                        </button>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400">
                          <span className="flex items-center gap-0.5"><Star size={9} /> {entry.score}/{entry.maxScore}</span>
                          {entry.timeSpent ? (
                            <span className="flex items-center gap-0.5"><Clock size={9} /> {formatTime(entry.timeSpent)}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className={`text-base font-bold tracking-tight ${entry.percentage >= 80 ? 'text-emerald-600' : entry.percentage >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                          {entry.percentage}%
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {(!data.leaderboard || data.leaderboard.length === 0) && (
              <div className="glass-card-solid p-12 text-center">
                <Award size={44} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-semibold text-dark mb-1">{t('emptyLeaderboard')}</h3>
                <p className="text-sm text-gray-500">{t('noOneCompleted')}</p>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}

/* ───────────────── Premium podium column ───────────────── */
function PodiumColumn({ rank, entry, onClick }) {
  const config = {
    1: {
      height: 'h-32 sm:h-40',
      avatarSize: 'h-20 w-20 sm:h-24 sm:w-24',
      avatarText: 'text-2xl sm:text-3xl',
      platformBg: 'bg-[linear-gradient(180deg,#fcd34d_0%,#f59e0b_100%)]',
      platformShadow: 'shadow-[0_20px_50px_-10px_rgba(245,158,11,0.55)]',
      icon: <Crown size={22} className="text-white drop-shadow" />,
      ringColor: 'ring-amber-300',
      percentColor: 'text-amber-600',
      delay: 0.15
    },
    2: {
      height: 'h-24 sm:h-28',
      avatarSize: 'h-16 w-16 sm:h-20 sm:w-20',
      avatarText: 'text-xl sm:text-2xl',
      platformBg: 'bg-[linear-gradient(180deg,#e2e8f0_0%,#94a3b8_100%)]',
      platformShadow: 'shadow-[0_14px_34px_-10px_rgba(100,116,139,0.5)]',
      icon: <Medal size={18} className="text-white drop-shadow" />,
      ringColor: 'ring-slate-300',
      percentColor: 'text-slate-600',
      delay: 0.25
    },
    3: {
      height: 'h-20 sm:h-24',
      avatarSize: 'h-16 w-16 sm:h-20 sm:w-20',
      avatarText: 'text-xl sm:text-2xl',
      platformBg: 'bg-[linear-gradient(180deg,#fbbf24_0%,#b45309_100%)]',
      platformShadow: 'shadow-[0_14px_34px_-10px_rgba(180,83,9,0.5)]',
      icon: <Medal size={18} className="text-white drop-shadow" />,
      ringColor: 'ring-amber-400',
      percentColor: 'text-amber-700',
      delay: 0.35
    }
  }[rank];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: config.delay, duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col items-center"
    >
      <button
        onClick={onClick}
        className={`${config.avatarSize} flex items-center justify-center overflow-hidden rounded-full ring-4 ${config.ringColor} ring-offset-2 ring-offset-white dark:ring-offset-slate-800 bg-primary-100 ${config.avatarText} font-bold text-primary-600 dark:bg-primary-900/30`}
      >
        {entry.avatar ? (
          <img src={entry.avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          entry.userName?.charAt(0)?.toUpperCase() || '?'
        )}
      </button>
      <p className="mt-3 max-w-[110px] truncate text-sm font-semibold text-dark" title={entry.userName}>
        {entry.userName}
      </p>
      <p className={`text-sm font-bold ${config.percentColor}`}>{entry.percentage}%</p>
      <div
        className={`mt-3 flex w-20 sm:w-24 ${config.height} items-start justify-center rounded-t-2xl pt-3 ${config.platformBg} ${config.platformShadow}`}
      >
        <div className="flex flex-col items-center gap-1">
          {config.icon}
          <span className="text-xs font-black text-white/90">#{rank}</span>
        </div>
      </div>
    </motion.div>
  );
}

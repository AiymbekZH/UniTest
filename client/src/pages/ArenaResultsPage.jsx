import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, Repeat, Sparkles, Trophy } from 'lucide-react';
import api from '../services/api';
import ChunkyButton from '../components/ui/ChunkyButton';
import ChunkyCard from '../components/ui/ChunkyCard';
import ArenaStandings from '../components/arena/ArenaStandings';
import Confetti from '../components/ui/Confetti';
import { haptic } from '../utils/haptics';

export default function ArenaResultsPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [breakdowns, setBreakdowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const { data: payload } = await api.get(`/arena/rooms/${encodeURIComponent(roomId)}/results`);
        if (!mounted) return;
        setData(payload.room || null);
        setBreakdowns(payload.questionBreakdowns || []);
        setShowConfetti(true);
        haptic.success();
        setTimeout(() => mounted && setShowConfetti(false), 3500);
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || 'Не удалось загрузить результаты');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (roomId) load();
    return () => { mounted = false; };
  }, [roomId]);

  const participants = useMemo(() => {
    const list = data?.participants || [];
    return [...list].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [data]);

  const analytics = useMemo(() => {
    if (!breakdowns?.length) return null;
    return breakdowns.map(b => ({
      idx: b.questionIndex,
      text: b.questionText || `Вопрос ${b.questionNumber}`,
      pct: b.accuracy ?? 0,
      correct: b.correctAnswered ?? 0,
      total: b.totalAnswered ?? 0,
      avgMs: b.avgResponseTimeMs ?? 0,
      fastest: b.fastest || null
    }));
  }, [breakdowns]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF4E3] px-4 py-10">
        <div className="mx-auto max-w-3xl animate-pulse space-y-3">
          <div className="h-10 w-40 rounded-2xl bg-amber-200" />
          <div className="h-64 rounded-3xl bg-white/70" />
          <div className="h-80 rounded-3xl bg-white/70" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FFF4E3] px-4 py-16 text-slate-900">
        <div className="mx-auto max-w-xl text-center">
          <ChunkyCard className="p-8">
            <h2 className="text-2xl font-black text-slate-900">Ошибка</h2>
            <p className="mt-3 text-sm font-semibold text-slate-600">{error}</p>
            <ChunkyButton onClick={() => navigate('/arena')} className="mx-auto mt-6">
              <Home size={16} /> В Соревнователь
            </ChunkyButton>
          </ChunkyCard>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FFF4E3] px-4 py-6 pb-24 sm:py-10">
      <Confetti active={showConfetti} />

      {/* Header */}
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-3 py-2 text-xs font-black text-slate-900"
          style={{ boxShadow: '0 3px 0 #0f172a' }}
        >
          <ArrowLeft size={14} /> Назад
        </button>
        <span className="chunky-pill bg-primary-500 text-white" style={{ boxShadow: '0 3px 0 #9a3412' }}>
          <Trophy size={12} /> Результаты
        </span>
      </div>

      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mx-auto mt-4 max-w-3xl"
      >
        <ChunkyCard className="overflow-hidden">
          <div className="relative bg-primary-500 px-5 py-6 text-white sm:px-8 sm:py-8">
            <div className="absolute -right-8 -top-8 text-9xl font-black opacity-10">#{data?.joinCode}</div>
            <div className="relative">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary-100">{data?.title || 'Соревнователь'}</p>
              <h1 className="mt-1 text-2xl font-black sm:text-4xl">Финал!</h1>
              <p className="mt-1 text-sm font-bold text-primary-50">Код комнаты · {data?.joinCode}</p>
            </div>
          </div>
        </ChunkyCard>
      </motion.header>

      {/* Podium */}
      <div className="mx-auto mt-5 max-w-3xl">
        <ArenaStandings title="Пьедестал" participants={participants} variant="podium" />
      </div>

      {/* Full standings */}
      <div className="mx-auto mt-5 max-w-3xl">
        <ArenaStandings title="Все игроки" participants={participants} limit={40} />
      </div>

      {/* Per-question analytics */}
      {analytics?.length ? (
        <div className="mx-auto mt-5 max-w-3xl">
          <ChunkyCard className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="chunky-pill bg-amber-300 text-slate-900" style={{ boxShadow: '0 3px 0 #b45309' }}>
                <Sparkles size={12} /> Аналитика
              </span>
              <h3 className="text-lg font-black text-slate-900">По вопросам</h3>
            </div>

            <div className="space-y-3">
              {analytics.map(a => (
                <div key={a.idx} className="rounded-2xl border-2 border-slate-900 bg-white p-3" style={{ boxShadow: '0 3px 0 #0f172a' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Вопрос {a.idx + 1}</p>
                      <p className="prose prose-sm mt-0.5 line-clamp-2 max-w-none text-sm font-black text-slate-800" dangerouslySetInnerHTML={{ __html: a.text }} />
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-2xl font-black text-slate-900">{a.pct}%</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{a.correct}/{a.total} · ~{Math.round(a.avgMs / 1000)}s</p>
                    </div>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full border-2 border-slate-900 bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${a.pct}%`,
                        background: a.pct >= 70 ? '#10b981' : a.pct >= 40 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </ChunkyCard>
        </div>
      ) : null}

      {/* Actions */}
      <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-3">
        <ChunkyButton onClick={() => navigate('/arena')}>
          <Repeat size={16} /> Новая игра
        </ChunkyButton>
        <ChunkyButton variant="secondary" onClick={() => navigate('/')}>
          <Home size={16} /> Домой
        </ChunkyButton>
      </div>
    </div>
  );
}

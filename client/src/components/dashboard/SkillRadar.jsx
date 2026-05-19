import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Sparkles } from 'lucide-react';
import api from '../../services/api';

/**
 * SkillRadar — per-tag spider chart of the player's average % vs the platform
 * average. Sized large by default so polygons breathe. Below the chart we
 * show two highlight cards: the player's strongest tag and the one that
 * lags the platform the most (if any), each with a 1-line nudge.
 *
 * Tag labels are pre-canonicalized on the server (Kazakhstan/Қазақстан/...
 * collapse to a single bucket).
 *
 * Visual: chunky-card surface, primary fill for the user, neutral outline
 * for the platform average, custom polar grid in slate.
 */
export default function SkillRadar({ copy }) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/progress/me/skills')
      .then((res) => {
        if (cancelled) return;
        setSkills(res.data?.skills || []);
        setError(false);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const data = useMemo(
    () =>
      skills.map((s) => ({
        tag: s.tag || copy.radarUntagged,
        me: s.myAvg,
        avg: s.globalAvg,
        runs: s.myCount,
        delta: (s.myAvg ?? 0) - (s.globalAvg ?? 0)
      })),
    [skills, copy.radarUntagged]
  );

  // Strongest = max myAvg. Weakest = min delta (most below average) but only
  // when we have a meaningful platform comparison; otherwise pick min myAvg.
  const { best, worst } = useMemo(() => {
    if (data.length < 2) return { best: null, worst: null };
    let bestRow = data[0];
    let worstRow = data[0];
    for (const row of data) {
      if (row.me > bestRow.me) bestRow = row;
      const rowKey = row.delta;
      const worstKey = worstRow.delta;
      if (rowKey < worstKey) worstRow = row;
    }
    if (bestRow.tag === worstRow.tag) return { best: bestRow, worst: null };
    return { best: bestRow, worst: worstRow };
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-3xl border-[3px] border-slate-900 bg-white p-4 sm:p-6 dark:bg-slate-900"
      style={{ boxShadow: '0 6px 0 #0f172a' }}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border-[3px] border-violet-900 bg-violet-200 text-violet-900"
          style={{ boxShadow: '0 3px 0 #4c1d95' }}
        >
          <Target size={16} strokeWidth={2.6} />
        </span>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-900/85">
          {copy.radarEyebrow}
        </p>
      </div>

      <h3 className="mt-3 text-lg font-black tracking-tight text-slate-900 sm:text-xl dark:text-white">
        {copy.radarTitle}
      </h3>
      <p className="mt-1 text-sm text-slate-600/85 dark:text-slate-400">{copy.radarDesc}</p>

      <div className="mt-5 h-[300px] w-full sm:h-[340px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-violet-500" />
          </div>
        ) : error ? (
          <p className="flex h-full items-center justify-center text-sm text-slate-400">
            {copy.radarError}
          </p>
        ) : data.length < 3 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-400">
            <TrendingUp size={32} className="mb-2 text-violet-300" />
            <p>{copy.radarEmptyTitle}</p>
            <p className="mt-1 text-xs">{copy.radarEmptyDesc}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              data={data}
              outerRadius="74%"
              margin={{ top: 24, right: 48, bottom: 24, left: 48 }}
            >
              <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="tag"
                tick={{ fill: '#0f172a', fontSize: 12, fontWeight: 700 }}
                tickLine={false}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={false}
                axisLine={false}
              />
              <Radar
                name={copy.radarLegendGlobal}
                dataKey="avg"
                stroke="#94a3b8"
                strokeWidth={2}
                fill="#94a3b8"
                fillOpacity={0.16}
              />
              <Radar
                name={copy.radarLegendMe}
                dataKey="me"
                stroke="#7c3aed"
                strokeWidth={2.5}
                fill="#7c3aed"
                fillOpacity={0.42}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '2px solid #0f172a',
                  boxShadow: '0 3px 0 #0f172a',
                  fontSize: 12,
                  fontWeight: 700
                }}
                formatter={(value, name, item) => {
                  if (name === copy.radarLegendMe) {
                    return [`${value}% · ${item.payload.runs} ${copy.radarRuns}`, name];
                  }
                  return [`${value}%`, name];
                }}
              />
              <Legend
                iconType="rect"
                wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 12 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Highlight cards */}
      {!loading && !error && data.length >= 3 && (best || worst) ? (
        <div className="mt-5 grid gap-3 [&>*]:min-w-0 sm:grid-cols-2">
          {best ? (
            <div
              className="flex items-start gap-3 rounded-2xl border-[3px] border-emerald-800 bg-emerald-50 p-4 dark:bg-emerald-900/20"
              style={{ boxShadow: '0 4px 0 #064e3b' }}
            >
              <span
                className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-[3px] border-emerald-900 bg-emerald-200 text-emerald-900"
                style={{ boxShadow: '0 3px 0 #064e3b' }}
              >
                <Sparkles size={18} strokeWidth={2.6} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800/80">
                  {copy.radarBestEyebrow}
                </p>
                <p className="mt-0.5 truncate text-base font-black text-slate-900 dark:text-white">
                  {best.tag}
                </p>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {best.me}% · {best.runs} {copy.radarRuns}
                </p>
              </div>
            </div>
          ) : null}
          {worst ? (
            <div
              className="flex items-start gap-3 rounded-2xl border-[3px] border-rose-900 bg-rose-50 p-4 dark:bg-rose-900/20"
              style={{ boxShadow: '0 4px 0 #881337' }}
            >
              <span
                className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-[3px] border-rose-900 bg-rose-200 text-rose-900"
                style={{ boxShadow: '0 3px 0 #881337' }}
              >
                <TrendingDown size={18} strokeWidth={2.6} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-800/80">
                  {copy.radarWorstEyebrow}
                </p>
                <p className="mt-0.5 truncate text-base font-black text-slate-900 dark:text-white">
                  {worst.tag}
                </p>
                <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  {worst.me}% · {copy.radarVsAvg.replace('{{n}}', String(worst.delta))}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
}

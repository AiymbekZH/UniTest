import { useEffect, useState } from 'react';
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
import { TrendingUp, Target } from 'lucide-react';
import api from '../../services/api';

/**
 * SkillRadar — fetches the user's per-tag skill breakdown and renders a
 * spider chart comparing the player's average % to the platform average %.
 *
 * Visual: chunky-card surface, primary fill for "my" polygon, neutral
 * outline for "global average", custom polar grid in slate. Empty state
 * when the user has no completed runs yet.
 *
 * Props:
 *   - copy   localized strings from dashboardCopy[lang]
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

  const data = skills.map((s) => ({
    tag: s.tag || copy.radarUntagged,
    me: s.myAvg,
    avg: s.globalAvg,
    runs: s.myCount
  }));

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

      <div className="mt-4 h-72 w-full">
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
            <RadarChart data={data} outerRadius="78%">
              <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="tag"
                tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 700 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false}
              />
              <Radar
                name={copy.radarLegendGlobal}
                dataKey="avg"
                stroke="#94a3b8"
                strokeWidth={2}
                fill="#94a3b8"
                fillOpacity={0.18}
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
                wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 8 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}

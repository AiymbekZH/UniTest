import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Users,
  FileText,
  Trophy,
  Ban,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import api from '../../../services/api';
import StatTile from '../components/StatTile';

const RANGE_OPTIONS = [
  { key: '7d', days: 7 },
  { key: '30d', days: 30 },
  { key: '90d', days: 90 }
];

export default function AdminDashboardSection({ copy }) {
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/stats/charts', { params: { range } })
    ])
      .then(([statsRes, chartsRes]) => {
        if (cancelled) return;
        setStats(statsRes.data);
        setSeries(chartsRes.data?.series || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [range]);

  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <div className="grid gap-3 [&>*]:min-w-0 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile icon={Users}     tone="slate"   label={copy.kpiUsers}     value={stats?.userCount ?? 0} />
        <StatTile icon={FileText}  tone="amber"   label={copy.kpiTests}     value={stats?.testCount ?? 0} />
        <StatTile icon={Trophy}    tone="emerald" label={copy.kpiResults}   value={stats?.resultCount ?? 0} />
        <StatTile icon={Ban}       tone="rose"    label={copy.kpiBanned}    value={stats?.bannedCount ?? 0} />
        <StatTile icon={Sparkles}  tone="violet"  label={copy.kpiAI}        value={stats?.aiAccessCount ?? 0} />
      </div>

      {/* Range switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
          <TrendingUp size={14} strokeWidth={2.6} />
          {copy.activityHeader}
        </div>
        <div className="flex gap-0.5 rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRange(opt.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                range === opt.key
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {opt.key}
            </button>
          ))}
        </div>
      </div>

      {/* Activity chart */}
      <div
        className="rounded-3xl border-[3px] border-slate-900 bg-white p-4 dark:border-white dark:bg-slate-900 sm:p-5"
        style={{ boxShadow: '0 6px 0 #0f172a' }}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
          {copy.chartTitle}
        </p>
        <div className="mt-3 h-72">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
                <defs>
                  <linearGradient id="adm-signups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="adm-tests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b45309" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#b45309" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="adm-results" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#047857" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#047857" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="adm-reports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#be123c" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#be123c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '2px solid #0f172a',
                    boxShadow: '0 3px 0 #0f172a',
                    fontSize: 12,
                    fontWeight: 700
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Area type="monotone" dataKey="signups" name={copy.legSignups} stroke="#0f172a" fill="url(#adm-signups)" strokeWidth={2} />
                <Area type="monotone" dataKey="tests"   name={copy.legTests}   stroke="#b45309" fill="url(#adm-tests)"   strokeWidth={2} />
                <Area type="monotone" dataKey="results" name={copy.legResults} stroke="#047857" fill="url(#adm-results)" strokeWidth={2} />
                <Area type="monotone" dataKey="reports" name={copy.legReports} stroke="#be123c" fill="url(#adm-reports)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent users + tests */}
      <div className="grid gap-4 [&>*]:min-w-0 lg:grid-cols-2">
        <div
          className="rounded-3xl border-[3px] border-slate-900 bg-white p-4 dark:border-white dark:bg-slate-900 sm:p-5"
          style={{ boxShadow: '0 6px 0 #0f172a' }}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            {copy.recentUsers}
          </p>
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-700">
            {(stats?.recentUsers || []).slice(0, 5).map((u) => (
              <li key={u._id} className="flex items-center gap-3 py-2.5">
                <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xs font-black text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  {(u.firstName?.[0] || '?').toUpperCase()}{(u.lastName?.[0] || '').toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{u.firstName} {u.lastName}</p>
                  <p className="truncate text-[11px] text-slate-400">{u.email}</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {u.role}
                </span>
              </li>
            ))}
            {!loading && (!stats?.recentUsers || stats.recentUsers.length === 0) ? (
              <li className="py-6 text-center text-xs text-slate-400">{copy.empty}</li>
            ) : null}
          </ul>
        </div>

        <div
          className="rounded-3xl border-[3px] border-slate-900 bg-white p-4 dark:border-white dark:bg-slate-900 sm:p-5"
          style={{ boxShadow: '0 6px 0 #0f172a' }}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            {copy.recentTests}
          </p>
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-700">
            {(stats?.recentTests || []).slice(0, 5).map((t) => (
              <li key={t._id} className="flex items-center gap-3 py-2.5">
                <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <FileText size={15} strokeWidth={2.6} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{t.title}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {t.creator?.firstName} {t.creator?.lastName}
                  </p>
                </div>
              </li>
            ))}
            {!loading && (!stats?.recentTests || stats.recentTests.length === 0) ? (
              <li className="py-6 text-center text-xs text-slate-400">{copy.empty}</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import ReportDetailDrawer from '../components/ReportDetailDrawer';

const COLUMNS = [
  { key: 'pending',   accent: '#92400e', bg: '#fef3c7' },
  { key: 'in_review', accent: '#075985', bg: '#e0f2fe' },
  { key: 'resolved',  accent: '#065f46', bg: '#d1fae5' },
  { key: 'rejected',  accent: '#374151', bg: '#f3f4f6' }
];

const SEVERITY_DOT = {
  low: '#94a3b8', medium: '#f59e0b', high: '#dc2626', critical: '#7f1d1d'
};

export default function AdminReportsSection({ copy }) {
  const [data, setData] = useState({ reports: [], clusters: [], counts: {}, reasonStats: [] });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ severity: '', reasonCategory: '', targetType: '', search: '' });
  const [activeReport, setActiveReport] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filter).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/reports', { params });
      setData(res.data || { reports: [], clusters: [], counts: {}, reasonStats: [] });
    } catch (_) {
      toast.error(copy.errLoad);
    } finally {
      setLoading(false);
    }
  }, [filter, copy.errLoad]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const grouped = useMemo(() => {
    const out = { pending: [], in_review: [], resolved: [], rejected: [] };
    for (const r of data.reports || []) {
      if (out[r.status]) out[r.status].push(r);
    }
    return out;
  }, [data.reports]);

  const resolveCluster = async (cluster) => {
    try {
      await api.post(`/reports/cluster/${cluster.key}/resolve`, { resolution: 'no_action' });
      toast.success(copy.clusterResolved);
      fetchReports();
    } catch (e) {
      toast.error(e.response?.data?.message || copy.errAction);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={filter.search}
            onChange={(e) => setFilter((p) => ({ ...p, search: e.target.value }))}
            placeholder={copy.searchPlaceholder}
            className="w-full rounded-xl border-[2px] border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <select
          value={filter.severity}
          onChange={(e) => setFilter((p) => ({ ...p, severity: e.target.value }))}
          className="rounded-xl border-[2px] border-slate-200 bg-white px-3 py-2.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">{copy.allSeverity}</option>
          {Object.keys(SEVERITY_DOT).map((s) => (
            <option key={s} value={s}>{copy['sev_' + s]}</option>
          ))}
        </select>
        <select
          value={filter.reasonCategory}
          onChange={(e) => setFilter((p) => ({ ...p, reasonCategory: e.target.value }))}
          className="rounded-xl border-[2px] border-slate-200 bg-white px-3 py-2.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">{copy.allCategories}</option>
          {['spam','harassment','hate_speech','sexual','violence','self_harm','misinformation','cheating','copyright','underage','illegal','other'].map((c) => (
            <option key={c} value={c}>{copy['cat_' + c] || c}</option>
          ))}
        </select>
        <select
          value={filter.targetType}
          onChange={(e) => setFilter((p) => ({ ...p, targetType: e.target.value }))}
          className="rounded-xl border-[2px] border-slate-200 bg-white px-3 py-2.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">{copy.allTargets}</option>
          <option value="test">{copy.targetTest}</option>
          <option value="comment">{copy.targetComment}</option>
          <option value="user">{copy.targetUser}</option>
        </select>
      </div>

      {/* Reason histogram */}
      {data.reasonStats?.length > 0 ? (
        <div
          className="rounded-2xl border-[3px] border-slate-900 bg-white p-3 dark:border-white dark:bg-slate-900"
          style={{ boxShadow: '0 4px 0 #0f172a' }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            {copy.reasonsLast30}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.reasonStats.slice(0, 8).map((rs) => (
              <span
                key={rs._id}
                className="inline-flex items-center gap-1.5 rounded-full border-[2px] border-slate-900 bg-amber-50 px-2.5 py-1 text-[11px] font-black"
              >
                <span className="font-mono">{rs.count}</span>
                <span className="text-slate-700">{copy['cat_' + rs._id] || rs._id}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Clusters strip */}
      {data.clusters?.filter((c) => c.count >= 2).length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">
            <Layers size={12} className="inline mr-1 -mt-0.5" /> {copy.clusters}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {data.clusters.filter((c) => c.count >= 2).map((c) => (
              <div
                key={c.key}
                className="min-w-[260px] rounded-2xl border-[3px] border-rose-900 bg-rose-50 p-3 dark:bg-rose-900/20"
                style={{ boxShadow: '0 4px 0 #881337' }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border-[2px] border-rose-900 bg-white px-2 py-0.5 text-[10px] font-black text-rose-700"
                  >
                    {c.count} {copy.reportsLabel}
                  </span>
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_DOT[c.severity] }} />
                </div>
                <p className="mt-2 truncate text-sm font-black text-slate-900 dark:text-white">
                  {c.targetSnapshot?.title || copy.unknownTarget}
                </p>
                <p className="text-[10px] text-slate-500">{c.targetType}</p>
                <button
                  type="button"
                  onClick={() => resolveCluster(c)}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border-[2px] border-rose-900 bg-white px-2.5 py-1 text-[11px] font-black text-rose-700"
                >
                  {copy.resolveCluster}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Kanban */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = grouped[col.key] || [];
          return (
            <div
              key={col.key}
              className="flex flex-col rounded-3xl border-[3px] border-slate-900 p-3 dark:border-white"
              style={{ backgroundColor: col.bg, boxShadow: '0 6px 0 #0f172a' }}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: col.accent }}>
                  {copy['col_' + col.key]}
                </p>
                <span
                  className="inline-flex items-center justify-center rounded-full border-[2px] bg-white px-2 py-0.5 text-[10px] font-black"
                  style={{ borderColor: col.accent, color: col.accent }}
                >
                  {data.counts?.[col.key] ?? items.length}
                </span>
              </div>
              <div className="space-y-2">
                {loading ? (
                  <div className="rounded-xl bg-white/60 p-3 text-center text-xs text-slate-400">…</div>
                ) : items.length === 0 ? (
                  <div className="rounded-xl bg-white/40 p-4 text-center text-xs text-slate-400">{copy.empty}</div>
                ) : items.slice(0, 30).map((r, i) => (
                  <motion.button
                    key={r._id}
                    type="button"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: i * 0.015 }}
                    onClick={() => setActiveReport(r)}
                    className="block w-full rounded-xl border-[2px] border-slate-900 bg-white p-3 text-left transition-transform active:translate-y-[1px] dark:bg-slate-800"
                    style={{ boxShadow: '0 3px 0 #0f172a' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: SEVERITY_DOT[r.severity] }} />
                        {copy['cat_' + r.reasonCategory] || r.reasonCategory}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm font-black text-slate-900 dark:text-white">
                      {r.targetSnapshot?.title || copy.unknownTarget}
                    </p>
                    <p className="line-clamp-2 text-[11px] text-slate-600 dark:text-slate-300">
                      {r.reason}
                    </p>
                    <p className="mt-1.5 text-[10px] text-slate-500">
                      {r.reporter?.firstName} {r.reporter?.lastName}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {activeReport ? (
        <ReportDetailDrawer
          report={activeReport}
          copy={copy}
          onClose={() => setActiveReport(null)}
          onChanged={fetchReports}
        />
      ) : null}
    </div>
  );
}

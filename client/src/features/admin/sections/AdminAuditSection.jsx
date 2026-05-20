import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import Pagination from '../../../components/Pagination';

const ACTION_OPTIONS = [
  '', 'ban_user', 'unban_user', 'temp_ban_user', 'mute_user', 'suspend_user',
  'change_role', 'warn_user', 'clear_warnings', 'send_message',
  'delete_test', 'delete_comment', 'delete_result', 'delete_question',
  'edit_user_notes', 'grant_ai_access', 'revoke_ai_access',
  'mass_action', 'admin_login',
  'report_status_change', 'report_action',
  'other'
];

export default function AdminAuditSection({ copy }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState({ action: '', targetType: '' });
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (filter.action) params.action = filter.action;
      if (filter.targetType) params.targetType = filter.targetType;
      const res = await api.get('/admin/audit', { params });
      setItems(res.data.items || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (_) { toast.error(copy.errLoad); } finally { setLoading(false); }
  }, [page, filter, copy.errLoad]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filter.action}
          onChange={(e) => { setFilter((p) => ({ ...p, action: e.target.value })); setPage(1); }}
          className="rounded-xl border-[2px] border-slate-200 bg-white px-3 py-2.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
        >
          {ACTION_OPTIONS.map((a) => (
            <option key={a || '_'} value={a}>{a || copy.allActions}</option>
          ))}
        </select>
        <select
          value={filter.targetType}
          onChange={(e) => { setFilter((p) => ({ ...p, targetType: e.target.value })); setPage(1); }}
          className="rounded-xl border-[2px] border-slate-200 bg-white px-3 py-2.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">{copy.allTargets}</option>
          {['user','test','comment','group','message','report','result','question','other'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div
        className="overflow-hidden rounded-3xl border-[3px] border-slate-900 bg-white dark:border-white dark:bg-slate-900"
        style={{ boxShadow: '0 6px 0 #0f172a' }}
      >
        <table className="w-full">
          <thead className="bg-violet-50 text-[10px] font-black uppercase tracking-[0.14em] text-violet-700 dark:bg-violet-900/30">
            <tr>
              <th className="px-3 py-3 text-left">{copy.colWhen}</th>
              <th className="px-3 py-3 text-left">{copy.colActor}</th>
              <th className="px-3 py-3 text-left">{copy.colAction}</th>
              <th className="hidden px-3 py-3 text-left md:table-cell">{copy.colTarget}</th>
              <th className="hidden px-3 py-3 text-left lg:table-cell">{copy.colDetails}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-sm text-slate-400">{copy.empty}</td></tr>
            ) : items.map((it, i) => (
              <motion.tr
                key={it._id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.14, delay: i * 0.008 }}
                className="border-t border-slate-100 dark:border-slate-700"
              >
                <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-slate-500">
                  {new Date(it.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {it.actor?.firstName} {it.actor?.lastName}
                  </span>
                  <span className="block text-[10px] text-slate-400">{it.actorEmail}</span>
                </td>
                <td className="px-3 py-2.5 text-xs">
                  <code className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] font-black text-violet-700 dark:bg-violet-900/30">
                    {it.action}
                  </code>
                </td>
                <td className="hidden px-3 py-2.5 text-xs md:table-cell">
                  <span className="font-bold">{it.targetType}</span>
                  {it.targetLabel ? <span className="text-slate-500"> · {it.targetLabel}</span> : null}
                </td>
                <td className="hidden px-3 py-2.5 text-xs text-slate-600 lg:table-cell">{it.details}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex justify-center"><Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div>
      ) : null}
    </div>
  );
}

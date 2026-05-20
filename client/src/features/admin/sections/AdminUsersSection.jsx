import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Shield,
  Ban,
  CheckCircle2,
  Sparkles,
  Mail,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import Pagination from '../../../components/Pagination';
import UserDetailDrawer from '../components/UserDetailDrawer';

const ROLE_FILTERS = [
  { key: '',        labelKey: 'allRoles' },
  { key: 'student', labelKey: 'studentRole' },
  { key: 'teacher', labelKey: 'teacherRole' },
  { key: 'admin',   labelKey: 'adminRole' }
];

export default function AdminUsersSection({ copy }) {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [aiAccess, setAiAccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [drawerUserId, setDrawerUserId] = useState(null);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkPayload, setBulkPayload] = useState({ reason: '', message: '', role: 'student' });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (role) params.role = role;
      if (aiAccess) params.aiAccess = aiAccess;
      const res = await api.get('/admin/users', { params });
      setUsers(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (_) {
      toast.error(copy.errLoad);
    } finally {
      setLoading(false);
    }
  }, [page, search, role, aiAccess, copy.errLoad]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleAll = () => {
    if (selected.size === users.length) setSelected(new Set());
    else setSelected(new Set(users.map((u) => u._id)));
  };
  const toggleOne = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const runBulk = async () => {
    if (!bulkAction || selected.size === 0) return;
    try {
      const payload = {};
      if (bulkAction === 'ban') payload.reason = bulkPayload.reason || copy.defaultBanReason;
      if (bulkAction === 'role') payload.role = bulkPayload.role;
      if (bulkAction === 'warn' || bulkAction === 'message') payload.message = bulkPayload.message;
      const res = await api.post('/admin/users/bulk', {
        action: bulkAction,
        userIds: Array.from(selected),
        payload
      });
      toast.success(copy.bulkDone.replace('{{n}}', String(res.data?.updated || 0)));
      setSelected(new Set());
      setBulkAction('');
      setBulkPayload({ reason: '', message: '', role: 'student' });
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || copy.errBulk);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          onSubmit={(e) => { e.preventDefault(); setPage(1); fetchUsers(); }}
          className="relative min-w-[200px] flex-1 sm:max-w-md"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className="w-full rounded-xl border-[2px] border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </form>
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="rounded-xl border-[2px] border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          {ROLE_FILTERS.map((r) => (
            <option key={r.key} value={r.key}>{copy[r.labelKey] || r.labelKey}</option>
          ))}
        </select>
        <select
          value={aiAccess}
          onChange={(e) => { setAiAccess(e.target.value); setPage(1); }}
          className="rounded-xl border-[2px] border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="">{copy.aiAll}</option>
          <option value="true">{copy.aiHas}</option>
          <option value="false">{copy.aiNone}</option>
        </select>
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-2 rounded-2xl border-[3px] border-slate-900 bg-amber-50 p-3 dark:bg-amber-900/20"
          style={{ boxShadow: '0 4px 0 #0f172a' }}
        >
          <span className="text-sm font-black text-slate-900 dark:text-white">
            {copy.selected.replace('{{n}}', String(selected.size))}
          </span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="rounded-lg border-[2px] border-slate-900 bg-white px-2.5 py-1.5 text-xs font-black text-slate-900"
          >
            <option value="">{copy.chooseAction}</option>
            <option value="ban">{copy.actionBan}</option>
            <option value="unban">{copy.actionUnban}</option>
            <option value="role">{copy.actionRole}</option>
            <option value="warn">{copy.actionWarn}</option>
            <option value="message">{copy.actionMessage}</option>
          </select>
          {bulkAction === 'ban' ? (
            <input
              value={bulkPayload.reason}
              onChange={(e) => setBulkPayload((p) => ({ ...p, reason: e.target.value }))}
              placeholder={copy.banReasonPh}
              className="min-w-[160px] rounded-lg border-[2px] border-slate-900 bg-white px-2.5 py-1.5 text-xs"
            />
          ) : null}
          {bulkAction === 'role' ? (
            <select
              value={bulkPayload.role}
              onChange={(e) => setBulkPayload((p) => ({ ...p, role: e.target.value }))}
              className="rounded-lg border-[2px] border-slate-900 bg-white px-2.5 py-1.5 text-xs font-black"
            >
              <option value="student">student</option>
              <option value="teacher">teacher</option>
            </select>
          ) : null}
          {(bulkAction === 'warn' || bulkAction === 'message') ? (
            <input
              value={bulkPayload.message}
              onChange={(e) => setBulkPayload((p) => ({ ...p, message: e.target.value }))}
              placeholder={copy.messagePh}
              className="min-w-[200px] flex-1 rounded-lg border-[2px] border-slate-900 bg-white px-2.5 py-1.5 text-xs"
            />
          ) : null}
          <button
            type="button"
            onClick={runBulk}
            disabled={!bulkAction}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border-[2px] border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50"
            style={{ boxShadow: '0 3px 0 #0f172a' }}
          >
            {copy.apply}
          </button>
          <button
            type="button"
            onClick={() => { setSelected(new Set()); setBulkAction(''); }}
            className="rounded-lg border-[2px] border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600"
          >
            {copy.cancel}
          </button>
        </motion.div>
      ) : null}

      {/* Users list */}
      <div
        className="overflow-hidden rounded-3xl border-[3px] border-slate-900 bg-white dark:border-white dark:bg-slate-900"
        style={{ boxShadow: '0 6px 0 #0f172a' }}
      >
        <table className="w-full">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={users.length > 0 && selected.size === users.length}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-2 border-slate-900"
                />
              </th>
              <th className="px-3 py-3 text-left">{copy.colUser}</th>
              <th className="hidden px-3 py-3 text-left sm:table-cell">{copy.colRole}</th>
              <th className="hidden px-3 py-3 text-left md:table-cell">{copy.colStatus}</th>
              <th className="hidden px-3 py-3 text-left lg:table-cell">{copy.colAI}</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-slate-400">{copy.empty}</td></tr>
            ) : users.map((u, i) => {
              const isSelected = selected.has(u._id);
              const banned = u.isBanned || (u.bannedUntil && new Date(u.bannedUntil) > new Date());
              return (
                <motion.tr
                  key={u._id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: i * 0.015 }}
                  onClick={() => setDrawerUserId(u._id)}
                  className={`cursor-pointer border-t border-slate-100 transition hover:bg-amber-50/40 dark:border-slate-700 dark:hover:bg-amber-900/10 ${
                    isSelected ? 'bg-amber-50/70 dark:bg-amber-900/20' : ''
                  }`}
                >
                  <td className="px-3 py-3" onClick={(e) => { e.stopPropagation(); toggleOne(u._id); }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="h-4 w-4 rounded border-2 border-slate-900"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-sky-50 text-xs font-black text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                        {(u.firstName?.[0] || '?').toUpperCase()}{(u.lastName?.[0] || '').toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 text-xs font-black uppercase tracking-wider text-slate-500 sm:table-cell">
                    {u.role}
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    {banned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                        <Ban size={11} strokeWidth={2.8} /> {copy.banned}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        <CheckCircle2 size={11} strokeWidth={2.8} /> {copy.active}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-3 py-3 lg:table-cell">
                    {u.aiAccess || u.role === 'admin' ? (
                      <Sparkles size={14} strokeWidth={2.6} className="text-violet-500" />
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <ChevronRight size={16} className="ml-auto text-slate-300" />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex justify-center">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      ) : null}

      {drawerUserId ? (
        <UserDetailDrawer
          userId={drawerUserId}
          copy={copy}
          onClose={() => setDrawerUserId(null)}
          onChanged={fetchUsers}
        />
      ) : null}
    </div>
  );
}

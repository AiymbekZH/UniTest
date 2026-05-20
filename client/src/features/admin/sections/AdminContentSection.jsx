import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Trash2, FileText, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import Pagination from '../../../components/Pagination';
import ConfirmDialog from '../../../components/ConfirmDialog';

export default function AdminContentSection({ copy }) {
  const [tab, setTab] = useState('tests');
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('tests')}
          className={`inline-flex items-center gap-2 rounded-xl border-[2px] px-3 py-2 text-sm font-black transition ${
            tab === 'tests'
              ? 'border-emerald-900 bg-emerald-500 text-white'
              : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800'
          }`}
          style={tab === 'tests' ? { boxShadow: '0 3px 0 #064e3b' } : undefined}
        >
          <FileText size={14} strokeWidth={2.6} /> {copy.tests}
        </button>
        <button
          type="button"
          onClick={() => setTab('comments')}
          className={`inline-flex items-center gap-2 rounded-xl border-[2px] px-3 py-2 text-sm font-black transition ${
            tab === 'comments'
              ? 'border-emerald-900 bg-emerald-500 text-white'
              : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800'
          }`}
          style={tab === 'comments' ? { boxShadow: '0 3px 0 #064e3b' } : undefined}
        >
          <MessageSquare size={14} strokeWidth={2.6} /> {copy.comments}
        </button>
      </div>

      {tab === 'tests' ? <TestsTab copy={copy} /> : <CommentsTab copy={copy} />}
    </div>
  );
}

function TestsTab({ copy }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const res = await api.get('/admin/tests', { params });
      setItems(res.data.tests || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (_) { toast.error(copy.errLoad); } finally { setLoading(false); }
  }, [page, search, copy.errLoad]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const removeTest = async (id) => {
    try {
      await api.delete(`/admin/tests/${id}`);
      toast.success(copy.deleted);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.message || copy.errAction); }
    setConfirm(null);
  };

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchData(); }} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={copy.searchTestsPh}
          className="w-full rounded-xl border-[2px] border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
      </form>

      <div
        className="overflow-hidden rounded-3xl border-[3px] border-slate-900 bg-white dark:border-white dark:bg-slate-900"
        style={{ boxShadow: '0 6px 0 #0f172a' }}
      >
        <table className="w-full">
          <thead className="bg-emerald-50 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 dark:bg-emerald-900/30">
            <tr>
              <th className="px-3 py-3 text-left">{copy.colTitle}</th>
              <th className="hidden px-3 py-3 text-left sm:table-cell">{copy.colCreator}</th>
              <th className="hidden px-3 py-3 text-left md:table-cell">{copy.colQ}</th>
              <th className="hidden px-3 py-3 text-left md:table-cell">{copy.colRating}</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-sm text-slate-400">{copy.empty}</td></tr>
            ) : items.map((t, i) => (
              <motion.tr
                key={t._id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, delay: i * 0.012 }}
                className={`border-t border-slate-100 dark:border-slate-700 ${t.isDeleted ? 'opacity-60' : ''}`}
              >
                <td className="px-3 py-3">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{t.title}</p>
                  <p className="text-[10px] text-slate-400">{t.shareLink}</p>
                </td>
                <td className="hidden px-3 py-3 text-xs sm:table-cell">
                  {t.creator?.firstName} {t.creator?.lastName}
                </td>
                <td className="hidden px-3 py-3 text-xs md:table-cell">{t.questions?.length || 0}</td>
                <td className="hidden px-3 py-3 text-xs md:table-cell">{(t.rating || 0).toFixed(1)} ({t.ratingCount || 0})</td>
                <td className="px-3 py-3 text-right">
                  {!t.isDeleted ? (
                    <button
                      type="button"
                      onClick={() => setConfirm({ id: t._id, title: t.title })}
                      className="inline-flex items-center gap-1 rounded-lg border-[2px] border-rose-900 bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700"
                    >
                      <Trash2 size={11} /> {copy.delete}
                    </button>
                  ) : (
                    <span className="text-[10px] font-black uppercase text-rose-500">{copy.deletedTag}</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex justify-center"><Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div>
      ) : null}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && removeTest(confirm.id)}
        title={copy.confirmDeleteTitle}
        message={confirm?.title || ''}
        confirmText={copy.delete}
        variant="danger"
      />
    </>
  );
}

function CommentsTab({ copy }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (showDeleted) params.deleted = 'true';
      const res = await api.get('/admin/comments', { params });
      setItems(res.data.items || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (_) { toast.error(copy.errLoad); } finally { setLoading(false); }
  }, [page, search, showDeleted, copy.errLoad]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const removeComment = async (id) => {
    try {
      await api.delete(`/admin/comments/${id}`);
      toast.success(copy.deleted);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.message || copy.errAction); }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchData(); }} className="relative min-w-[200px] flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={copy.searchCommentsPh}
            className="w-full rounded-xl border-[2px] border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </form>
        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} className="h-4 w-4" />
          {copy.showDeleted}
        </label>
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">…</p>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">{copy.empty}</p>
        ) : items.map((c, i) => (
          <motion.div
            key={c._id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, delay: i * 0.01 }}
            className={`rounded-2xl border-[3px] border-slate-900 bg-white p-3 dark:border-white dark:bg-slate-900 ${c.isDeleted ? 'opacity-60' : ''}`}
            style={{ boxShadow: '0 4px 0 #0f172a' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-slate-500">
                  <span className="font-bold">{c.author?.firstName} {c.author?.lastName}</span>
                  {c.test?.title ? <span> · {copy.onTest}: <span className="font-bold">{c.test.title}</span></span> : null}
                  <span> · {new Date(c.createdAt).toLocaleString()}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{c.text}</p>
              </div>
              {!c.isDeleted ? (
                <button
                  type="button"
                  onClick={() => removeComment(c._id)}
                  className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border-[2px] border-rose-900 bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700"
                >
                  <Trash2 size={11} /> {copy.delete}
                </button>
              ) : (
                <span className="text-[10px] font-black uppercase text-rose-500">{copy.deletedTag}</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="flex justify-center"><Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div>
      ) : null}
    </>
  );
}

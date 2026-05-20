import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle, Ban, Clock3, Save, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const SEVERITY = {
  low: { dot: '#94a3b8' }, medium: { dot: '#f59e0b' },
  high: { dot: '#dc2626' }, critical: { dot: '#7f1d1d' }
};

export default function ReportDetailDrawer({ report, copy, onClose, onChanged }) {
  const [adminNote, setAdminNote] = useState(report?.adminNote || '');
  const [busy, setBusy] = useState(false);
  if (!report) return null;

  const target = report.targetSnapshot || {};
  const sev = SEVERITY[report.severity] || SEVERITY.medium;

  const wrap = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      onChanged?.();
      onClose?.();
    } catch (e) {
      toast.error(e.response?.data?.message || copy.errAction);
    } finally {
      setBusy(false);
    }
  };

  const takeAction = (action) => wrap(
    () => api.post(`/reports/${report._id}/take-action`, { action, note: adminNote }),
    copy.actionDone
  );
  const setStatus = (status, resolution = '') => wrap(
    () => api.put(`/reports/${report._id}`, { status, adminNote, resolution }),
    copy.statusUpdated
  );

  return (
    <AnimatePresence>
      <motion.div
        key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.aside
        key="panel"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed right-0 top-0 z-[81] flex h-full w-full max-w-xl flex-col border-l-[3px] border-slate-900 bg-white shadow-2xl dark:border-white dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b-[3px] border-slate-900 bg-rose-50 p-4 dark:border-white dark:bg-rose-900/20">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: sev.dot }} />
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-700">
                {copy['cat_' + report.reasonCategory] || report.reasonCategory}
              </p>
              <p className="truncate text-base font-black text-slate-900 dark:text-white">
                {target.title || copy.unknownTarget}
              </p>
            </div>
          </div>
          <button
            type="button" onClick={onClose}
            className="rounded-xl border-[2px] border-slate-900 bg-white p-2 dark:border-white dark:bg-slate-800"
          >
            <X size={16} strokeWidth={2.6} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="space-y-5">
            {/* Target snapshot */}
            <div className="rounded-2xl border-[3px] border-slate-900 bg-white p-3 dark:border-white dark:bg-slate-800" style={{ boxShadow: '0 4px 0 #0f172a' }}>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                {copy.targetSnapshot} · {report.targetType}
              </p>
              {target.title ? (
                <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{target.title}</p>
              ) : null}
              {target.excerpt ? (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{target.excerpt}</p>
              ) : null}
              {target.ownerLabel ? (
                <p className="mt-2 text-[11px] text-slate-500">
                  {copy.targetOwner}: <span className="font-bold text-slate-700 dark:text-slate-200">{target.ownerLabel}</span>
                </p>
              ) : null}
            </div>

            {/* Reason */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                {copy.reasonText}
              </p>
              <p className="mt-1 rounded-xl bg-slate-50 p-3 text-sm whitespace-pre-wrap dark:bg-slate-800 dark:text-slate-200">
                {report.reason}
              </p>
            </div>

            {/* Reporter */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>{copy.reporter}:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {report.reporter?.firstName} {report.reporter?.lastName}
              </span>
              <span>·</span>
              <span>{new Date(report.createdAt).toLocaleString()}</span>
            </div>

            {/* Admin note */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                {copy.adminNote}
              </p>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                placeholder={copy.notesPh}
                className="mt-1 w-full rounded-xl border-[2px] border-slate-900 bg-white p-2 text-sm dark:bg-slate-900"
              />
            </div>

            {/* Quick actions */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                {copy.quickActions}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {report.targetType === 'test' || report.targetType === 'comment' ? (
                  <button
                    type="button" disabled={busy}
                    onClick={() => takeAction('delete_content')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border-[2px] border-rose-900 bg-rose-500 px-3 py-2 text-xs font-black text-white"
                    style={{ boxShadow: '0 3px 0 #881337' }}
                  >
                    <Trash2 size={13} strokeWidth={2.8} /> {copy.btnDelete}
                  </button>
                ) : null}

                <button
                  type="button" disabled={busy}
                  onClick={() => takeAction('warn_target')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border-[2px] border-amber-900 bg-amber-500 px-3 py-2 text-xs font-black text-white"
                  style={{ boxShadow: '0 3px 0 #92400e' }}
                >
                  <AlertTriangle size={13} strokeWidth={2.8} /> {copy.btnWarnTarget}
                </button>

                <button
                  type="button" disabled={busy}
                  onClick={() => takeAction('mute_target_24h')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border-[2px] border-amber-900 bg-amber-100 px-3 py-2 text-xs font-black text-amber-800"
                >
                  🔇 {copy.btnMute24}
                </button>

                <button
                  type="button" disabled={busy}
                  onClick={() => takeAction('mute_target_7d')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border-[2px] border-amber-900 bg-amber-100 px-3 py-2 text-xs font-black text-amber-800"
                >
                  🔇 {copy.btnMute7d}
                </button>

                <button
                  type="button" disabled={busy}
                  onClick={() => takeAction('suspend_target_7d')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border-[2px] border-violet-900 bg-violet-100 px-3 py-2 text-xs font-black text-violet-800"
                >
                  ⏸ {copy.btnSuspend7d}
                </button>

                <button
                  type="button" disabled={busy}
                  onClick={() => takeAction('ban_target')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border-[2px] border-rose-900 bg-rose-700 px-3 py-2 text-xs font-black text-white"
                  style={{ boxShadow: '0 3px 0 #4c0519' }}
                >
                  <Ban size={13} strokeWidth={2.8} /> {copy.btnBanTarget}
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button" disabled={busy}
                onClick={() => setStatus('in_review')}
                className="inline-flex items-center gap-1.5 rounded-lg border-[2px] border-sky-900 bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-800"
              >
                <Clock3 size={12} /> {copy.markInReview}
              </button>
              <button
                type="button" disabled={busy}
                onClick={() => setStatus('resolved', 'no_action')}
                className="inline-flex items-center gap-1.5 rounded-lg border-[2px] border-emerald-900 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800"
              >
                <CheckCircle2 size={12} /> {copy.markResolved}
              </button>
              <button
                type="button" disabled={busy}
                onClick={() => setStatus('rejected', 'no_action')}
                className="inline-flex items-center gap-1.5 rounded-lg border-[2px] border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-700"
              >
                <XCircle size={12} /> {copy.markRejected}
              </button>
              <button
                type="button" disabled={busy}
                onClick={() => wrap(
                  () => api.put(`/reports/${report._id}`, { adminNote }),
                  copy.noteSaved
                )}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border-[2px] border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-black text-white"
              >
                <Save size={12} /> {copy.saveNote}
              </button>
            </div>

            {/* History */}
            {Array.isArray(report.actionsTaken) && report.actionsTaken.length > 0 ? (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  {copy.history}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {report.actionsTaken.map((a, i) => (
                    <li key={i} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] dark:bg-slate-800">
                      <span className="font-bold">{a.byLabel || copy.system}</span>
                      <span className="text-slate-500"> · {a.action}</span>
                      {a.note ? <span className="ml-2 italic text-slate-600">{a.note}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

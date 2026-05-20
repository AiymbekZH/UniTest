import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Ban, CheckCircle2, Shield, AlertTriangle, Mail,
  Sparkles, Trash2, Save, Crown, FileText, Trophy, Flag, Clock3
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import ConfirmDialog from '../../../components/ConfirmDialog';

/**
 * UserDetailDrawer — slide-in drawer with full admin context for one user.
 *
 * Pulls /api/admin/users/:id (deep) and /api/admin/users/:id/timeline.
 * Action buttons map to existing admin endpoints. Each destructive action
 * goes through ConfirmDialog.
 */
export default function UserDetailDrawer({ userId, copy, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [confirm, setConfirm] = useState(null); // { action, payload, message }

  // Hours pickers for temp moderation actions
  const [muteHours, setMuteHours] = useState(24);
  const [suspendHours, setSuspendHours] = useState(168);
  const [tempBanHours, setTempBanHours] = useState(72);
  const [warnText, setWarnText] = useState('');
  const [messageText, setMessageText] = useState('');
  const [banReason, setBanReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [u, tl] = await Promise.all([
        api.get(`/admin/users/${userId}`),
        api.get(`/admin/users/${userId}/timeline`)
      ]);
      setData(u.data);
      setTimeline(tl.data);
      setNotes(u.data?.user?.adminNotes || '');
    } catch (_) {
      toast.error(copy.errLoad);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);

  const refresh = async () => {
    await load();
    onChanged?.();
  };

  const wrap = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.message || copy.errAction);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const u = data?.user;
  const stats = data?.stats;
  const banned = u && (u.isBanned || (u.bannedUntil && new Date(u.bannedUntil) > new Date()));
  const muted = u && u.mutedUntil && new Date(u.mutedUntil) > new Date();
  const suspended = u && u.suspendedUntil && new Date(u.suspendedUntil) > new Date();

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.aside
        key="panel"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed right-0 top-0 z-[81] flex h-full w-full max-w-xl flex-col border-l-[3px] border-slate-900 bg-white shadow-2xl dark:border-white dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-[3px] border-slate-900 bg-sky-50 p-4 dark:border-white dark:bg-sky-900/20">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border-[3px] border-slate-900 bg-white text-sm font-black text-sky-700 dark:border-white dark:bg-slate-800">
              {u ? `${(u.firstName?.[0] || '?').toUpperCase()}${(u.lastName?.[0] || '').toUpperCase()}` : '…'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-slate-900 dark:text-white">
                {u ? `${u.firstName || ''} ${u.lastName || ''}` : copy.loading}
              </p>
              <p className="truncate text-[11px] text-slate-500">{u?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-[2px] border-slate-900 bg-white p-2 dark:border-white dark:bg-slate-800"
          >
            <X size={16} strokeWidth={2.6} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <p className="text-center text-sm text-slate-400">…</p>
          ) : !u ? (
            <p className="text-center text-sm text-rose-500">{copy.errLoad}</p>
          ) : (
            <div className="space-y-5">
              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full border-[2px] px-2 py-0.5 text-[10px] font-black uppercase ${
                  banned ? 'border-rose-700 bg-rose-50 text-rose-700' : 'border-emerald-700 bg-emerald-50 text-emerald-700'
                }`}>
                  {banned ? <><Ban size={11} /> {copy.banned}</> : <><CheckCircle2 size={11} /> {copy.active}</>}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border-[2px] border-slate-900 bg-white px-2 py-0.5 text-[10px] font-black uppercase">
                  <Shield size={11} /> {u.role}
                </span>
                {muted ? (
                  <span className="inline-flex items-center gap-1 rounded-full border-[2px] border-amber-700 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">
                    🔇 {copy.muted}
                  </span>
                ) : null}
                {suspended ? (
                  <span className="inline-flex items-center gap-1 rounded-full border-[2px] border-violet-700 bg-violet-50 px-2 py-0.5 text-[10px] font-black uppercase text-violet-700">
                    ⏸ {copy.suspended}
                  </span>
                ) : null}
                {(u.aiAccess || u.role === 'admin') ? (
                  <span className="inline-flex items-center gap-1 rounded-full border-[2px] border-violet-500 bg-violet-50 px-2 py-0.5 text-[10px] font-black uppercase text-violet-700">
                    <Sparkles size={11} /> AI
                  </span>
                ) : null}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { Icon: FileText, label: copy.statTests, value: stats?.testsCreated ?? 0 },
                  { Icon: Trophy,   label: copy.statResults, value: stats?.resultsCount ?? 0 },
                  { Icon: Flag,     label: copy.statRepAgainst, value: stats?.reportsAgainst ?? 0 },
                  { Icon: Flag,     label: copy.statRepFiled,   value: stats?.reportsFiled ?? 0 }
                ].map((s, i) => (
                  <div key={i} className="rounded-xl border-[2px] border-slate-200 bg-white p-2.5 text-center dark:border-slate-700 dark:bg-slate-800">
                    <s.Icon size={13} className="mx-auto text-slate-400" />
                    <p className="mt-1 font-mono text-base font-black text-slate-900 dark:text-white">{s.value}</p>
                    <p className="text-[9px] font-black uppercase text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Moderation panel */}
              <details open className="rounded-2xl border-[3px] border-slate-900 bg-white p-3 dark:border-white dark:bg-slate-800" style={{ boxShadow: '0 4px 0 #0f172a' }}>
                <summary className="cursor-pointer text-[11px] font-black uppercase tracking-[0.16em] text-slate-700 dark:text-slate-200">
                  {copy.modActions}
                </summary>
                <div className="mt-3 space-y-3">
                  {/* Permanent ban */}
                  {!banned ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder={copy.banReasonPh}
                        className="min-w-[160px] flex-1 rounded-lg border-[2px] border-slate-900 px-2.5 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirm({
                          action: 'ban',
                          message: copy.confirmBan,
                          fn: () => api.put(`/admin/users/${u._id}/ban`, { reason: banReason || copy.defaultBanReason })
                        })}
                        className="inline-flex items-center gap-1.5 rounded-lg border-[2px] border-rose-900 bg-rose-500 px-3 py-1.5 text-xs font-black text-white"
                        style={{ boxShadow: '0 3px 0 #881337' }}
                      >
                        <Ban size={13} strokeWidth={2.8} /> {copy.actionBan}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => wrap(() => api.put(`/admin/users/${u._id}/unban`), copy.unbanned)}
                      className="inline-flex items-center gap-1.5 rounded-lg border-[2px] border-emerald-900 bg-emerald-500 px-3 py-1.5 text-xs font-black text-white"
                      style={{ boxShadow: '0 3px 0 #064e3b' }}
                    >
                      <CheckCircle2 size={13} strokeWidth={2.8} /> {copy.actionUnban}
                    </button>
                  )}

                  {/* Temp ban */}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={tempBanHours}
                      onChange={(e) => setTempBanHours(Number(e.target.value) || 0)}
                      className="w-20 rounded-lg border-[2px] border-slate-900 px-2.5 py-1.5 text-xs"
                    />
                    <span className="text-[11px] text-slate-500">{copy.hours}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => wrap(
                        () => api.put(`/admin/users/${u._id}/temp-ban`, { hours: tempBanHours, reason: banReason }),
                        tempBanHours > 0 ? copy.tempBanned : copy.tempBanCleared
                      )}
                      className="inline-flex items-center gap-1.5 rounded-lg border-[2px] border-rose-900 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700"
                    >
                      <Clock3 size={13} strokeWidth={2.8} /> {copy.actionTempBan}
                    </button>
                  </div>

                  {/* Mute */}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={muteHours}
                      onChange={(e) => setMuteHours(Number(e.target.value) || 0)}
                      className="w-20 rounded-lg border-[2px] border-slate-900 px-2.5 py-1.5 text-xs"
                    />
                    <span className="text-[11px] text-slate-500">{copy.hours}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => wrap(
                        () => api.put(`/admin/users/${u._id}/mute`, { hours: muteHours }),
                        muteHours > 0 ? copy.muted : copy.muteCleared
                      )}
                      className="inline-flex items-center gap-1.5 rounded-lg border-[2px] border-amber-900 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700"
                    >
                      🔇 {copy.actionMute}
                    </button>
                  </div>

                  {/* Suspend */}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={suspendHours}
                      onChange={(e) => setSuspendHours(Number(e.target.value) || 0)}
                      className="w-20 rounded-lg border-[2px] border-slate-900 px-2.5 py-1.5 text-xs"
                    />
                    <span className="text-[11px] text-slate-500">{copy.hours}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => wrap(
                        () => api.put(`/admin/users/${u._id}/suspend`, { hours: suspendHours }),
                        suspendHours > 0 ? copy.suspended : copy.suspendCleared
                      )}
                      className="inline-flex items-center gap-1.5 rounded-lg border-[2px] border-violet-900 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700"
                    >
                      ⏸ {copy.actionSuspend}
                    </button>
                  </div>

                  {/* Warn */}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={warnText}
                      onChange={(e) => setWarnText(e.target.value)}
                      placeholder={copy.warnPh}
                      className="min-w-[160px] flex-1 rounded-lg border-[2px] border-slate-900 px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      disabled={busy || !warnText.trim()}
                      onClick={() => wrap(
                        () => api.post(`/admin/users/${u._id}/warn`, { message: warnText.trim() }).then(() => setWarnText('')),
                        copy.warned
                      )}
                      className="inline-flex items-center gap-1.5 rounded-lg border-[2px] border-amber-900 bg-amber-500 px-3 py-1.5 text-xs font-black text-white"
                      style={{ boxShadow: '0 3px 0 #92400e' }}
                    >
                      <AlertTriangle size={13} strokeWidth={2.8} /> {copy.actionWarn}
                    </button>
                  </div>

                  {/* Send message */}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={copy.messagePh}
                      className="min-w-[160px] flex-1 rounded-lg border-[2px] border-slate-900 px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      disabled={busy || !messageText.trim()}
                      onClick={() => wrap(
                        () => api.post(`/admin/users/${u._id}/message`, { message: messageText.trim() }).then(() => setMessageText('')),
                        copy.messaged
                      )}
                      className="inline-flex items-center gap-1.5 rounded-lg border-[2px] border-sky-900 bg-sky-500 px-3 py-1.5 text-xs font-black text-white"
                      style={{ boxShadow: '0 3px 0 #075985' }}
                    >
                      <Mail size={13} strokeWidth={2.8} /> {copy.actionMessage}
                    </button>
                  </div>

                  {/* Role */}
                  {u.role !== 'admin' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={u.role}
                        onChange={(e) => wrap(
                          () => api.put(`/admin/users/${u._id}/role`, { role: e.target.value }),
                          copy.roleChanged
                        )}
                        className="rounded-lg border-[2px] border-slate-900 bg-white px-2.5 py-1.5 text-xs font-black"
                      >
                        <option value="student">student</option>
                        <option value="teacher">teacher</option>
                        <option value="admin">admin</option>
                      </select>
                      <span className="text-[11px] text-slate-500">{copy.role}</span>
                    </div>
                  ) : null}

                  {/* AI access */}
                  {u.role !== 'admin' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => wrap(
                          () => api.put(`/admin/users/${u._id}/ai-access`, { aiAccess: !u.aiAccess }),
                          u.aiAccess ? copy.aiRevoked : copy.aiGranted
                        )}
                        className={`inline-flex items-center gap-1.5 rounded-lg border-[2px] px-3 py-1.5 text-xs font-black ${
                          u.aiAccess
                            ? 'border-slate-300 bg-white text-slate-600'
                            : 'border-violet-900 bg-violet-500 text-white'
                        }`}
                        style={u.aiAccess ? undefined : { boxShadow: '0 3px 0 #4c1d95' }}
                      >
                        <Sparkles size={13} strokeWidth={2.8} /> {u.aiAccess ? copy.aiRevoke : copy.aiGrant}
                      </button>
                    </div>
                  ) : null}

                  {/* Clear warnings */}
                  {Array.isArray(u.warnings) && u.warnings.length > 0 ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => wrap(
                        () => api.delete(`/admin/users/${u._id}/warnings`),
                        copy.warningsCleared
                      )}
                      className="inline-flex items-center gap-1.5 rounded-lg border-[2px] border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600"
                    >
                      <Trash2 size={13} /> {copy.clearWarnings} ({u.warnings.length})
                    </button>
                  ) : null}
                </div>
              </details>

              {/* Admin notes */}
              <div
                className="rounded-2xl border-[3px] border-slate-900 bg-amber-50 p-3 dark:border-white dark:bg-amber-900/20"
                style={{ boxShadow: '0 4px 0 #0f172a' }}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-800">
                  {copy.adminNotes}
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border-[2px] border-slate-900 bg-white p-2 text-sm dark:bg-slate-900"
                  placeholder={copy.notesPh}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => wrap(
                    () => api.put(`/admin/users/${u._id}/notes`, { notes }),
                    copy.notesSaved
                  )}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border-[2px] border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-black text-white"
                  style={{ boxShadow: '0 3px 0 #0f172a' }}
                >
                  <Save size={13} strokeWidth={2.8} /> {copy.save}
                </button>
              </div>

              {/* Recent results */}
              {timeline?.results?.length > 0 ? (
                <div>
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    {copy.recentResults}
                  </p>
                  <ul className="space-y-1.5">
                    {timeline.results.slice(0, 8).map((r) => (
                      <li key={r._id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs dark:bg-slate-800">
                        <Trophy size={12} className="text-emerald-500" />
                        <span className="truncate flex-1">{r.test?.title || '—'}</span>
                        <span className="font-mono font-black text-slate-700 dark:text-slate-200">{r.percentage}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Reports against */}
              {timeline?.reportsAgainst?.length > 0 ? (
                <div>
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-rose-700">
                    {copy.reportsAgainst}
                  </p>
                  <ul className="space-y-1.5">
                    {timeline.reportsAgainst.slice(0, 5).map((r) => (
                      <li key={r._id} className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs dark:bg-rose-900/20">
                        <p className="truncate">{r.reason}</p>
                        <p className="text-[10px] text-slate-500">
                          {r.reporter?.firstName} {r.reporter?.lastName} · {r.status}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <ConfirmDialog
          open={!!confirm}
          onClose={() => setConfirm(null)}
          onConfirm={() => confirm && wrap(confirm.fn, copy.actionDone)}
          title={copy.confirmTitle}
          message={confirm?.message || ''}
          confirmText={copy.confirm}
          variant="danger"
        />
      </motion.aside>
    </AnimatePresence>
  );
}

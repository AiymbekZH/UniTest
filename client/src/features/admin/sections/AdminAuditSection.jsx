import { useCallback, useEffect, useMemo, useState } from 'react';
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

const TARGET_OPTIONS = [
  '', 'user', 'test', 'comment', 'group', 'message',
  'report', 'result', 'question', 'other'
];

// Human-readable labels per language. Falls back to ru, then to the raw key.
const ACTION_LABELS = {
  ru: {
    ban_user: 'Бан пользователя', unban_user: 'Снять бан',
    temp_ban_user: 'Временный бан', mute_user: 'Заглушить', suspend_user: 'Приостановить',
    change_role: 'Сменить роль', warn_user: 'Предупреждение', clear_warnings: 'Очистить предупреждения',
    send_message: 'Сообщение от админа',
    delete_test: 'Удаление теста', delete_comment: 'Удаление комментария',
    delete_result: 'Удаление результата', delete_question: 'Удаление вопроса',
    edit_user_notes: 'Заметка о пользователе',
    grant_ai_access: 'Выдан AI-доступ', revoke_ai_access: 'Снят AI-доступ',
    mass_action: 'Массовое действие', admin_login: 'Вход админа',
    report_status_change: 'Смена статуса жалобы', report_action: 'Действие по жалобе',
    other: 'Другое'
  },
  en: {
    ban_user: 'Ban user', unban_user: 'Unban user',
    temp_ban_user: 'Temp ban', mute_user: 'Mute user', suspend_user: 'Suspend user',
    change_role: 'Change role', warn_user: 'Warn user', clear_warnings: 'Clear warnings',
    send_message: 'Message from admin',
    delete_test: 'Delete test', delete_comment: 'Delete comment',
    delete_result: 'Delete result', delete_question: 'Delete question',
    edit_user_notes: 'Edit user notes',
    grant_ai_access: 'Grant AI access', revoke_ai_access: 'Revoke AI access',
    mass_action: 'Bulk action', admin_login: 'Admin login',
    report_status_change: 'Report status change', report_action: 'Report action',
    other: 'Other'
  },
  kz: {
    ban_user: 'Бұғаттау', unban_user: 'Бұғаттан алу',
    temp_ban_user: 'Уақытша бұғаттау', mute_user: 'Үнсіздендіру', suspend_user: 'Тоқтату',
    change_role: 'Рөлді өзгерту', warn_user: 'Ескерту', clear_warnings: 'Ескертулерді тазалау',
    send_message: 'Әкімші хабарламасы',
    delete_test: 'Тестті жою', delete_comment: 'Пікірді жою',
    delete_result: 'Нәтижені жою', delete_question: 'Сұрақты жою',
    edit_user_notes: 'Жазбаны өзгерту',
    grant_ai_access: 'AI рұқсаты берілді', revoke_ai_access: 'AI рұқсаты алынды',
    mass_action: 'Жаппай әрекет', admin_login: 'Әкімші кірді',
    report_status_change: 'Шағым күйі өзгерді', report_action: 'Шағым әрекеті',
    other: 'Басқа'
  },
  es: {
    ban_user: 'Bloquear usuario', unban_user: 'Desbloquear',
    temp_ban_user: 'Bloqueo temporal', mute_user: 'Silenciar', suspend_user: 'Suspender',
    change_role: 'Cambiar rol', warn_user: 'Advertir', clear_warnings: 'Borrar advertencias',
    send_message: 'Mensaje del admin',
    delete_test: 'Eliminar test', delete_comment: 'Eliminar comentario',
    delete_result: 'Eliminar resultado', delete_question: 'Eliminar pregunta',
    edit_user_notes: 'Editar notas',
    grant_ai_access: 'Conceder IA', revoke_ai_access: 'Revocar IA',
    mass_action: 'Acción masiva', admin_login: 'Inicio admin',
    report_status_change: 'Cambio de estado del reporte', report_action: 'Acción de reporte',
    other: 'Otro'
  }
};

const TARGET_LABELS = {
  ru: { user: 'Пользователь', test: 'Тест', comment: 'Комментарий', group: 'Группа', message: 'Сообщение', report: 'Жалоба', result: 'Результат', question: 'Вопрос', other: 'Другое' },
  en: { user: 'User', test: 'Test', comment: 'Comment', group: 'Group', message: 'Message', report: 'Report', result: 'Result', question: 'Question', other: 'Other' },
  kz: { user: 'Пайдаланушы', test: 'Тест', comment: 'Пікір', group: 'Топ', message: 'Хабарлама', report: 'Шағым', result: 'Нәтиже', question: 'Сұрақ', other: 'Басқа' },
  es: { user: 'Usuario', test: 'Test', comment: 'Comentario', group: 'Grupo', message: 'Mensaje', report: 'Reporte', result: 'Resultado', question: 'Pregunta', other: 'Otro' }
};

// Pick a per-action color for the chip; falls back to violet.
function actionTone(action) {
  if (!action) return 'violet';
  if (action.startsWith('ban_') || action === 'temp_ban_user' || action === 'suspend_user' || action.startsWith('delete_')) return 'rose';
  if (action.startsWith('warn_') || action === 'mute_user') return 'amber';
  if (action.startsWith('grant_') || action === 'unban_user' || action === 'clear_warnings') return 'emerald';
  if (action.startsWith('report_')) return 'sky';
  if (action === 'mass_action') return 'fuchsia';
  return 'violet';
}

const TONE_BG = {
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200',
  fuchsia: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-200'
};

export default function AdminAuditSection({ copy, lang = 'ru' }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState({ action: '', targetType: '' });
  const [loading, setLoading] = useState(false);

  // Resolve the active translation table once per render. ru is always the
  // safety net so a missing locale never leaves the dropdown showing snake_case.
  const actionLabels = ACTION_LABELS[lang] || ACTION_LABELS.ru;
  const targetLabels = TARGET_LABELS[lang] || TARGET_LABELS.ru;
  const labelOf = (key) => actionLabels[key] || ACTION_LABELS.ru[key] || key;
  const targetOf = (key) => targetLabels[key] || TARGET_LABELS.ru[key] || key;

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

  // Mobile-friendly select. On narrow screens these were too wide and clipped
  // — moved to flexbox with min-w-0 + 100% width on phones.
  const selectCls =
    'w-full sm:w-auto min-w-0 rounded-xl border-[2px] border-slate-200 bg-white px-3 py-2.5 text-sm font-bold dark:border-slate-700 dark:bg-slate-800';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filter.action}
          onChange={(e) => { setFilter((p) => ({ ...p, action: e.target.value })); setPage(1); }}
          className={selectCls}
        >
          {ACTION_OPTIONS.map((a) => (
            <option key={a || '_'} value={a}>{a ? labelOf(a) : copy.allActions}</option>
          ))}
        </select>
        <select
          value={filter.targetType}
          onChange={(e) => { setFilter((p) => ({ ...p, targetType: e.target.value })); setPage(1); }}
          className={selectCls}
        >
          {TARGET_OPTIONS.map((t) => (
            <option key={t || '_'} value={t}>{t ? targetOf(t) : copy.allTargets}</option>
          ))}
        </select>
      </div>

      {/* Mobile: stacked card list. Desktop: classic table. */}
      <div className="space-y-2 sm:hidden">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">…</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">{copy.empty}</div>
        ) : items.map((it, i) => {
          const tone = actionTone(it.action);
          return (
            <motion.div
              key={it._id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.14, delay: i * 0.008 }}
              className="rounded-2xl border-2 border-slate-900 bg-white p-3 dark:border-white/70 dark:bg-slate-900"
              style={{ boxShadow: '0 4px 0 #0f172a' }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${TONE_BG[tone]}`}>
                  {labelOf(it.action)}
                </span>
                <span className="whitespace-nowrap text-[10px] font-bold text-slate-400">
                  {new Date(it.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                {it.actor?.firstName} {it.actor?.lastName}
                <span className="ml-1 text-[10px] font-normal text-slate-400">{it.actorEmail}</span>
              </p>
              {it.targetType ? (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-black">{targetOf(it.targetType)}</span>
                  {it.targetLabel ? <span> · {it.targetLabel}</span> : null}
                </p>
              ) : null}
              {it.details ? (
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {it.details}
                </p>
              ) : null}
            </motion.div>
          );
        })}
      </div>

      <div
        className="hidden overflow-hidden rounded-3xl border-[3px] border-slate-900 bg-white dark:border-white dark:bg-slate-900 sm:block"
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
            ) : items.map((it, i) => {
              const tone = actionTone(it.action);
              return (
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
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${TONE_BG[tone]}`}>
                      {labelOf(it.action)}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2.5 text-xs md:table-cell">
                    <span className="font-bold">{targetOf(it.targetType)}</span>
                    {it.targetLabel ? <span className="text-slate-500"> · {it.targetLabel}</span> : null}
                  </td>
                  <td className="hidden px-3 py-2.5 text-xs text-slate-600 lg:table-cell">{it.details}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex justify-center"><Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div>
      ) : null}
    </div>
  );
}

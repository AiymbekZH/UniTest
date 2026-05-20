import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Navbar';
import AnimatedHero from '../components/AnimatedHero';
import api from '../services/api';
import AdminSidebar from '../features/admin/components/AdminSidebar';
import AdminDashboardSection from '../features/admin/sections/AdminDashboardSection';
import AdminUsersSection from '../features/admin/sections/AdminUsersSection';
import AdminContentSection from '../features/admin/sections/AdminContentSection';
import AdminReportsSection from '../features/admin/sections/AdminReportsSection';
import AdminAuditSection from '../features/admin/sections/AdminAuditSection';

const SECTION_KEY = 'unitest_admin_section';

const ADMIN_COPY = {
  ru: {
    eyebrow: 'Админ-консоль',
    title: 'Управление платформой',
    subtitle: 'Пользователи, контент, жалобы и журнал действий — в одном месте.',
    notAdmin: 'У вас нет прав администратора',
    sec_dashboard: 'Обзор',
    sec_users: 'Пользователи',
    sec_content: 'Контент',
    sec_reports: 'Жалобы',
    sec_audit: 'Журнал',

    // dashboard
    kpiUsers: 'Пользователи', kpiTests: 'Тесты', kpiResults: 'Прохождения',
    kpiBanned: 'Забанены', kpiAI: 'AI-доступ',
    activityHeader: 'Активность', chartTitle: 'Графики за период',
    legSignups: 'Регистрации', legTests: 'Новые тесты', legResults: 'Прохождения', legReports: 'Жалобы',
    recentUsers: 'Недавние пользователи', recentTests: 'Недавние тесты',

    // users
    searchPlaceholder: 'Поиск по имени или email…',
    allRoles: 'Все роли', studentRole: 'student', teacherRole: 'teacher', adminRole: 'admin',
    aiAll: 'AI: все', aiHas: 'AI: есть', aiNone: 'AI: нет',
    selected: 'Выбрано: {{n}}',
    chooseAction: 'Действие…',
    actionBan: 'Забанить', actionUnban: 'Разбанить', actionRole: 'Сменить роль',
    actionWarn: 'Предупредить', actionMessage: 'Отправить сообщение',
    apply: 'Применить', cancel: 'Отмена',
    banReasonPh: 'Причина бана…', messagePh: 'Текст сообщения…',
    bulkDone: 'Обновлено пользователей: {{n}}',
    colUser: 'Пользователь', colRole: 'Роль', colStatus: 'Статус', colAI: 'AI',
    banned: 'Забанен', active: 'Активен',
    empty: 'Ничего нет',
    errLoad: 'Не удалось загрузить',
    errBulk: 'Не удалось выполнить массовое действие',

    // user drawer
    loading: 'Загрузка…',
    statTests: 'Тесты', statResults: 'Прохождения',
    statRepAgainst: 'На него', statRepFiled: 'Подал',
    muted: 'Заглушён', suspended: 'Приостановлен',
    role: 'Роль',
    modActions: 'Действия модерации',
    hours: 'часов',
    actionTempBan: 'Временный бан', actionMute: 'Заглушить', actionSuspend: 'Приостановить',
    confirmBan: 'Забанить пользователя?',
    confirmTitle: 'Подтвердить', confirm: 'Подтвердить',
    defaultBanReason: 'Нарушение правил',
    unbanned: 'Разбанен',
    tempBanned: 'Временный бан установлен', tempBanCleared: 'Временный бан снят',
    muteCleared: 'Заглушка снята',
    suspendCleared: 'Приостановка снята',
    warnPh: 'Текст предупреждения…',
    warned: 'Предупреждение отправлено',
    messaged: 'Сообщение отправлено',
    roleChanged: 'Роль изменена',
    aiGrant: 'Выдать AI', aiRevoke: 'Снять AI',
    aiGranted: 'AI-доступ выдан', aiRevoked: 'AI-доступ снят',
    clearWarnings: 'Очистить предупреждения',
    warningsCleared: 'Предупреждения очищены',
    adminNotes: 'Заметки админа (приватно)',
    notesPh: 'Заметка…',
    notesSaved: 'Заметка сохранена',
    save: 'Сохранить',
    recentResults: 'Недавние результаты',
    reportsAgainst: 'Жалобы на пользователя',
    actionDone: 'Готово',
    errAction: 'Не удалось выполнить действие',

    // content
    tests: 'Тесты', comments: 'Комментарии',
    searchTestsPh: 'Поиск тестов…', searchCommentsPh: 'Поиск по комментариям…',
    showDeleted: 'Показать удалённые',
    colTitle: 'Название', colCreator: 'Автор', colQ: 'Вопросы', colRating: 'Рейтинг',
    delete: 'Удалить', deleted: 'Удалено', deletedTag: 'удалён',
    confirmDeleteTitle: 'Удалить?',
    onTest: 'к тесту',

    // reports
    allSeverity: 'Все уровни',
    sev_low: 'низкий', sev_medium: 'средний', sev_high: 'высокий', sev_critical: 'критический',
    allCategories: 'Все категории',
    cat_spam: 'спам', cat_harassment: 'преследование', cat_hate_speech: 'разжигание',
    cat_sexual: 'сексуальный', cat_violence: 'насилие', cat_self_harm: 'самоповреждение',
    cat_misinformation: 'дезинформация', cat_cheating: 'жульничество', cat_copyright: 'копирайт',
    cat_underage: 'несовершеннолетние', cat_illegal: 'нелегальное', cat_other: 'другое',
    allTargets: 'Все цели',
    targetTest: 'тесты', targetComment: 'комментарии', targetUser: 'пользователи',
    reasonsLast30: 'Категории за 30 дней',
    clusters: 'Связанные жалобы (≥2)',
    reportsLabel: 'жалоб',
    resolveCluster: 'Закрыть кластер',
    clusterResolved: 'Кластер закрыт',
    col_pending: 'Ожидают', col_in_review: 'На рассмотрении',
    col_resolved: 'Решены', col_rejected: 'Отклонены',
    unknownTarget: 'Цель не найдена',
    targetSnapshot: 'Снимок цели',
    targetOwner: 'Владелец',
    reasonText: 'Причина жалобы',
    reporter: 'Автор',
    adminNote: 'Заметка модератора',
    quickActions: 'Быстрые действия',
    btnDelete: 'Удалить контент',
    btnWarnTarget: 'Предупредить',
    btnMute24: 'Mute 24ч', btnMute7d: 'Mute 7д',
    btnSuspend7d: 'Suspend 7д', btnBanTarget: 'Забанить',
    markInReview: 'В работу', markResolved: 'Решено', markRejected: 'Отклонить',
    saveNote: 'Сохранить', noteSaved: 'Сохранено',
    statusUpdated: 'Статус обновлён',
    history: 'История',
    system: 'Система',

    // audit
    allActions: 'Все действия',
    colWhen: 'Когда', colActor: 'Кто', colAction: 'Действие',
    colTarget: 'Цель', colDetails: 'Детали'
  }
};

// English fallback (ru is canonical, en for UI consistency).
ADMIN_COPY.en = { ...ADMIN_COPY.ru };

export default function AdminPanel() {
  const { user, isAuthenticated, loading } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [section, setSection] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(SECTION_KEY) || 'dashboard' : 'dashboard'
  );
  const [pendingCount, setPendingCount] = useState(0);

  const copy = useMemo(() => ADMIN_COPY[lang] || ADMIN_COPY.ru, [lang]);

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'admin')) {
      navigate('/dashboard');
    }
  }, [loading, isAuthenticated, user, navigate]);

  useEffect(() => {
    localStorage.setItem(SECTION_KEY, section);
  }, [section]);

  // Light pulse on the Reports tab — pull pending count every 60 s.
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return undefined;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await api.get('/reports', { params: { status: 'pending' } });
        if (!cancelled) setPendingCount(res.data?.counts?.pending || 0);
      } catch (_) {}
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [isAuthenticated, user]);

  if (loading) return null;
  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <main className="mx-auto max-w-md p-6 text-center text-sm text-slate-500">
          {copy.notAdmin}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-slate-950">
      <Navbar />
      <Toaster position="top-right" />

      <main className="mx-auto max-w-7xl px-3 pb-12 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <AnimatedHero
          preset="paperSlate"
          height="md"
          eyebrow={copy.eyebrow}
          icon={<Shield size={22} />}
          title={copy.title}
          subtitle={copy.subtitle}
        />

        {/* Layout: sidebar + content */}
        <div className="mt-6 grid gap-4 lg:grid-cols-[240px_1fr]">
          <aside>
            <AdminSidebar
              active={section}
              onChange={setSection}
              labels={{
                dashboard: copy.sec_dashboard,
                users: copy.sec_users,
                content: copy.sec_content,
                reports: copy.sec_reports,
                audit: copy.sec_audit
              }}
              badges={{ reports: pendingCount }}
            />
          </aside>

          <section className="min-w-0">
            {section === 'dashboard' && <AdminDashboardSection copy={copy} />}
            {section === 'users' && <AdminUsersSection copy={copy} />}
            {section === 'content' && <AdminContentSection copy={copy} />}
            {section === 'reports' && <AdminReportsSection copy={copy} />}
            {section === 'audit' && <AdminAuditSection copy={copy} />}
          </section>
        </div>
      </main>
    </div>
  );
}

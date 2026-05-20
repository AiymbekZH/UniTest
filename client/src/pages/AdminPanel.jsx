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

// English (full translation, not fallback).
ADMIN_COPY.en = {
  eyebrow: 'Admin console',
  title: 'Platform management',
  subtitle: 'Users, content, reports and audit log — in one place.',
  notAdmin: 'You do not have administrator rights',
  sec_dashboard: 'Overview',
  sec_users: 'Users',
  sec_content: 'Content',
  sec_reports: 'Reports',
  sec_audit: 'Audit log',

  kpiUsers: 'Users', kpiTests: 'Tests', kpiResults: 'Attempts',
  kpiBanned: 'Banned', kpiAI: 'AI access',
  activityHeader: 'Activity', chartTitle: 'Charts for the period',
  legSignups: 'Sign-ups', legTests: 'New tests', legResults: 'Attempts', legReports: 'Reports',
  recentUsers: 'Recent users', recentTests: 'Recent tests',

  searchPlaceholder: 'Search by name or email…',
  allRoles: 'All roles', studentRole: 'student', teacherRole: 'teacher', adminRole: 'admin',
  aiAll: 'AI: all', aiHas: 'AI: yes', aiNone: 'AI: no',
  selected: 'Selected: {{n}}',
  chooseAction: 'Action…',
  actionBan: 'Ban', actionUnban: 'Unban', actionRole: 'Change role',
  actionWarn: 'Warn', actionMessage: 'Send message',
  apply: 'Apply', cancel: 'Cancel',
  banReasonPh: 'Ban reason…', messagePh: 'Message text…',
  bulkDone: '{{n}} users updated',
  colUser: 'User', colRole: 'Role', colStatus: 'Status', colAI: 'AI',
  banned: 'Banned', active: 'Active',
  empty: 'Nothing here',
  errLoad: 'Failed to load',
  errBulk: 'Failed to perform bulk action',

  loading: 'Loading…',
  statTests: 'Tests', statResults: 'Attempts',
  statRepAgainst: 'Against', statRepFiled: 'Filed',
  muted: 'Muted', suspended: 'Suspended',
  role: 'Role',
  modActions: 'Moderation actions',
  hours: 'hours',
  actionTempBan: 'Temp ban', actionMute: 'Mute', actionSuspend: 'Suspend',
  confirmBan: 'Ban this user?',
  confirmTitle: 'Confirm', confirm: 'Confirm',
  defaultBanReason: 'Rule violation',
  unbanned: 'Unbanned',
  tempBanned: 'Temporary ban set', tempBanCleared: 'Temporary ban cleared',
  muteCleared: 'Mute cleared',
  suspendCleared: 'Suspension cleared',
  warnPh: 'Warning text…',
  warned: 'Warning sent',
  messaged: 'Message sent',
  roleChanged: 'Role changed',
  aiGrant: 'Grant AI', aiRevoke: 'Revoke AI',
  aiGranted: 'AI access granted', aiRevoked: 'AI access revoked',
  clearWarnings: 'Clear warnings',
  warningsCleared: 'Warnings cleared',
  adminNotes: 'Admin notes (private)',
  notesPh: 'Note…',
  notesSaved: 'Note saved',
  save: 'Save',
  recentResults: 'Recent results',
  reportsAgainst: 'Reports against this user',
  actionDone: 'Done',
  errAction: 'Failed to perform action',

  tests: 'Tests', comments: 'Comments',
  searchTestsPh: 'Search tests…', searchCommentsPh: 'Search comments…',
  showDeleted: 'Show deleted',
  colTitle: 'Title', colCreator: 'Author', colQ: 'Questions', colRating: 'Rating',
  delete: 'Delete', deleted: 'Deleted', deletedTag: 'deleted',
  confirmDeleteTitle: 'Delete?',
  onTest: 'on test',

  allSeverity: 'All levels',
  sev_low: 'low', sev_medium: 'medium', sev_high: 'high', sev_critical: 'critical',
  allCategories: 'All categories',
  cat_spam: 'spam', cat_harassment: 'harassment', cat_hate_speech: 'hate speech',
  cat_sexual: 'sexual', cat_violence: 'violence', cat_self_harm: 'self-harm',
  cat_misinformation: 'misinformation', cat_cheating: 'cheating', cat_copyright: 'copyright',
  cat_underage: 'underage', cat_illegal: 'illegal', cat_other: 'other',
  allTargets: 'All targets',
  targetTest: 'tests', targetComment: 'comments', targetUser: 'users',
  reasonsLast30: 'Categories last 30 days',
  clusters: 'Related reports (≥2)',
  reportsLabel: 'reports',
  resolveCluster: 'Close cluster',
  clusterResolved: 'Cluster closed',
  col_pending: 'Pending', col_in_review: 'In review',
  col_resolved: 'Resolved', col_rejected: 'Rejected',
  unknownTarget: 'Target not found',
  targetSnapshot: 'Target snapshot',
  targetOwner: 'Owner',
  reasonText: 'Report reason',
  reporter: 'Reporter',
  adminNote: 'Moderator note',
  quickActions: 'Quick actions',
  btnDelete: 'Delete content',
  btnWarnTarget: 'Warn',
  btnMute24: 'Mute 24h', btnMute7d: 'Mute 7d',
  btnSuspend7d: 'Suspend 7d', btnBanTarget: 'Ban',
  markInReview: 'In review', markResolved: 'Resolved', markRejected: 'Reject',
  saveNote: 'Save', noteSaved: 'Saved',
  statusUpdated: 'Status updated',
  history: 'History',
  system: 'System',

  allActions: 'All actions',
  colWhen: 'When', colActor: 'Who', colAction: 'Action',
  colTarget: 'Target', colDetails: 'Details'
};

// Қазақша
ADMIN_COPY.kz = {
  eyebrow: 'Әкімші консолі',
  title: 'Платформаны басқару',
  subtitle: 'Пайдаланушылар, контент, шағымдар және әрекеттер журналы — бір жерде.',
  notAdmin: 'Сізде әкімшілік құқықтар жоқ',
  sec_dashboard: 'Шолу',
  sec_users: 'Пайдаланушылар',
  sec_content: 'Контент',
  sec_reports: 'Шағымдар',
  sec_audit: 'Журнал',

  kpiUsers: 'Пайдаланушылар', kpiTests: 'Тесттер', kpiResults: 'Тапсырылған',
  kpiBanned: 'Бұғатталған', kpiAI: 'AI рұқсаты',
  activityHeader: 'Белсенділік', chartTitle: 'Кезең диаграммалары',
  legSignups: 'Тіркелгендер', legTests: 'Жаңа тесттер', legResults: 'Тапсырылған', legReports: 'Шағымдар',
  recentUsers: 'Жаңа пайдаланушылар', recentTests: 'Жаңа тесттер',

  searchPlaceholder: 'Аты немесе email бойынша іздеу…',
  allRoles: 'Барлық рөлдер', studentRole: 'студент', teacherRole: 'оқытушы', adminRole: 'әкімші',
  aiAll: 'AI: барлығы', aiHas: 'AI: бар', aiNone: 'AI: жоқ',
  selected: 'Таңдалды: {{n}}',
  chooseAction: 'Әрекет…',
  actionBan: 'Бұғаттау', actionUnban: 'Қайта ашу', actionRole: 'Рөлді өзгерту',
  actionWarn: 'Ескерту', actionMessage: 'Хабарлама жіберу',
  apply: 'Қолдану', cancel: 'Бас тарту',
  banReasonPh: 'Бұғаттау себебі…', messagePh: 'Хабарлама мәтіні…',
  bulkDone: '{{n}} пайдаланушы жаңартылды',
  colUser: 'Пайдаланушы', colRole: 'Рөл', colStatus: 'Күй', colAI: 'AI',
  banned: 'Бұғатталған', active: 'Белсенді',
  empty: 'Ештеңе жоқ',
  errLoad: 'Жүктелмеді',
  errBulk: 'Жаппай әрекет орындалмады',

  loading: 'Жүктелуде…',
  statTests: 'Тесттер', statResults: 'Тапсырылған',
  statRepAgainst: 'Оған', statRepFiled: 'Жіберген',
  muted: 'Үнсіз', suspended: 'Тоқтатылған',
  role: 'Рөл',
  modActions: 'Модерация әрекеттері',
  hours: 'сағат',
  actionTempBan: 'Уақытша бұғаттау', actionMute: 'Үнсіздендіру', actionSuspend: 'Тоқтату',
  confirmBan: 'Пайдаланушыны бұғаттау керек пе?',
  confirmTitle: 'Растау', confirm: 'Растау',
  defaultBanReason: 'Ережені бұзу',
  unbanned: 'Бұғаттан босатылды',
  tempBanned: 'Уақытша бұғаттау орнатылды', tempBanCleared: 'Уақытша бұғаттау алынды',
  muteCleared: 'Үнсіздік алынды',
  suspendCleared: 'Тоқтату алынды',
  warnPh: 'Ескерту мәтіні…',
  warned: 'Ескерту жіберілді',
  messaged: 'Хабарлама жіберілді',
  roleChanged: 'Рөл өзгертілді',
  aiGrant: 'AI беру', aiRevoke: 'AI алып тастау',
  aiGranted: 'AI рұқсаты берілді', aiRevoked: 'AI рұқсаты алынды',
  clearWarnings: 'Ескертулерді тазалау',
  warningsCleared: 'Ескертулер тазаланды',
  adminNotes: 'Әкімші жазбалары (құпия)',
  notesPh: 'Жазба…',
  notesSaved: 'Жазба сақталды',
  save: 'Сақтау',
  recentResults: 'Соңғы нәтижелер',
  reportsAgainst: 'Бұл пайдаланушыға шағымдар',
  actionDone: 'Дайын',
  errAction: 'Әрекет орындалмады',

  tests: 'Тесттер', comments: 'Пікірлер',
  searchTestsPh: 'Тесттерді іздеу…', searchCommentsPh: 'Пікірлерден іздеу…',
  showDeleted: 'Жойылғандарды көрсету',
  colTitle: 'Атауы', colCreator: 'Автор', colQ: 'Сұрақтар', colRating: 'Рейтинг',
  delete: 'Жою', deleted: 'Жойылды', deletedTag: 'жойылған',
  confirmDeleteTitle: 'Жою керек пе?',
  onTest: 'тестке',

  allSeverity: 'Барлық деңгейлер',
  sev_low: 'төмен', sev_medium: 'орташа', sev_high: 'жоғары', sev_critical: 'сыни',
  allCategories: 'Барлық санаттар',
  cat_spam: 'спам', cat_harassment: 'қудалау', cat_hate_speech: 'жек көру',
  cat_sexual: 'сексуалдық', cat_violence: 'зорлық', cat_self_harm: 'өзін-өзі зақымдау',
  cat_misinformation: 'жалған ақпарат', cat_cheating: 'алдау', cat_copyright: 'авторлық құқық',
  cat_underage: 'кәмелетке толмаған', cat_illegal: 'заңсыз', cat_other: 'басқа',
  allTargets: 'Барлық мақсаттар',
  targetTest: 'тесттер', targetComment: 'пікірлер', targetUser: 'пайдаланушылар',
  reasonsLast30: '30 күндегі санаттар',
  clusters: 'Байланысты шағымдар (≥2)',
  reportsLabel: 'шағым',
  resolveCluster: 'Кластерді жабу',
  clusterResolved: 'Кластер жабылды',
  col_pending: 'Күтуде', col_in_review: 'Қаралуда',
  col_resolved: 'Шешілді', col_rejected: 'Қабылданбады',
  unknownTarget: 'Мақсат табылмады',
  targetSnapshot: 'Мақсат суреті',
  targetOwner: 'Иесі',
  reasonText: 'Шағым себебі',
  reporter: 'Шағымданушы',
  adminNote: 'Модератор жазбасы',
  quickActions: 'Жылдам әрекеттер',
  btnDelete: 'Контентті жою',
  btnWarnTarget: 'Ескерту',
  btnMute24: 'Mute 24с', btnMute7d: 'Mute 7к',
  btnSuspend7d: 'Suspend 7к', btnBanTarget: 'Бұғаттау',
  markInReview: 'Жұмысқа', markResolved: 'Шешілді', markRejected: 'Қабылдамау',
  saveNote: 'Сақтау', noteSaved: 'Сақталды',
  statusUpdated: 'Күй жаңартылды',
  history: 'Тарих',
  system: 'Жүйе',

  allActions: 'Барлық әрекеттер',
  colWhen: 'Қашан', colActor: 'Кім', colAction: 'Әрекет',
  colTarget: 'Мақсат', colDetails: 'Толығырақ'
};

// Español
ADMIN_COPY.es = {
  eyebrow: 'Consola de administrador',
  title: 'Gestión de la plataforma',
  subtitle: 'Usuarios, contenido, reportes y registro de acciones — en un solo lugar.',
  notAdmin: 'No tienes permisos de administrador',
  sec_dashboard: 'Resumen',
  sec_users: 'Usuarios',
  sec_content: 'Contenido',
  sec_reports: 'Reportes',
  sec_audit: 'Auditoría',

  kpiUsers: 'Usuarios', kpiTests: 'Tests', kpiResults: 'Intentos',
  kpiBanned: 'Bloqueados', kpiAI: 'Acceso IA',
  activityHeader: 'Actividad', chartTitle: 'Gráficos del periodo',
  legSignups: 'Registros', legTests: 'Tests nuevos', legResults: 'Intentos', legReports: 'Reportes',
  recentUsers: 'Usuarios recientes', recentTests: 'Tests recientes',

  searchPlaceholder: 'Buscar por nombre o email…',
  allRoles: 'Todos los roles', studentRole: 'estudiante', teacherRole: 'profesor', adminRole: 'admin',
  aiAll: 'IA: todos', aiHas: 'IA: sí', aiNone: 'IA: no',
  selected: 'Seleccionados: {{n}}',
  chooseAction: 'Acción…',
  actionBan: 'Bloquear', actionUnban: 'Desbloquear', actionRole: 'Cambiar rol',
  actionWarn: 'Advertir', actionMessage: 'Enviar mensaje',
  apply: 'Aplicar', cancel: 'Cancelar',
  banReasonPh: 'Motivo del bloqueo…', messagePh: 'Texto del mensaje…',
  bulkDone: '{{n}} usuarios actualizados',
  colUser: 'Usuario', colRole: 'Rol', colStatus: 'Estado', colAI: 'IA',
  banned: 'Bloqueado', active: 'Activo',
  empty: 'Sin resultados',
  errLoad: 'No se pudo cargar',
  errBulk: 'No se pudo realizar la acción masiva',

  loading: 'Cargando…',
  statTests: 'Tests', statResults: 'Intentos',
  statRepAgainst: 'Contra', statRepFiled: 'Enviados',
  muted: 'Silenciado', suspended: 'Suspendido',
  role: 'Rol',
  modActions: 'Acciones de moderación',
  hours: 'horas',
  actionTempBan: 'Bloqueo temporal', actionMute: 'Silenciar', actionSuspend: 'Suspender',
  confirmBan: '¿Bloquear este usuario?',
  confirmTitle: 'Confirmar', confirm: 'Confirmar',
  defaultBanReason: 'Violación de las reglas',
  unbanned: 'Desbloqueado',
  tempBanned: 'Bloqueo temporal aplicado', tempBanCleared: 'Bloqueo temporal eliminado',
  muteCleared: 'Silencio eliminado',
  suspendCleared: 'Suspensión eliminada',
  warnPh: 'Texto de la advertencia…',
  warned: 'Advertencia enviada',
  messaged: 'Mensaje enviado',
  roleChanged: 'Rol cambiado',
  aiGrant: 'Conceder IA', aiRevoke: 'Revocar IA',
  aiGranted: 'Acceso IA concedido', aiRevoked: 'Acceso IA revocado',
  clearWarnings: 'Borrar advertencias',
  warningsCleared: 'Advertencias borradas',
  adminNotes: 'Notas de admin (privadas)',
  notesPh: 'Nota…',
  notesSaved: 'Nota guardada',
  save: 'Guardar',
  recentResults: 'Resultados recientes',
  reportsAgainst: 'Reportes contra este usuario',
  actionDone: 'Listo',
  errAction: 'No se pudo realizar la acción',

  tests: 'Tests', comments: 'Comentarios',
  searchTestsPh: 'Buscar tests…', searchCommentsPh: 'Buscar comentarios…',
  showDeleted: 'Mostrar eliminados',
  colTitle: 'Título', colCreator: 'Autor', colQ: 'Preguntas', colRating: 'Valoración',
  delete: 'Eliminar', deleted: 'Eliminado', deletedTag: 'eliminado',
  confirmDeleteTitle: '¿Eliminar?',
  onTest: 'en test',

  allSeverity: 'Todos los niveles',
  sev_low: 'bajo', sev_medium: 'medio', sev_high: 'alto', sev_critical: 'crítico',
  allCategories: 'Todas las categorías',
  cat_spam: 'spam', cat_harassment: 'acoso', cat_hate_speech: 'odio',
  cat_sexual: 'sexual', cat_violence: 'violencia', cat_self_harm: 'autolesión',
  cat_misinformation: 'desinformación', cat_cheating: 'trampa', cat_copyright: 'derechos',
  cat_underage: 'menor de edad', cat_illegal: 'ilegal', cat_other: 'otro',
  allTargets: 'Todos los destinos',
  targetTest: 'tests', targetComment: 'comentarios', targetUser: 'usuarios',
  reasonsLast30: 'Categorías últimos 30 días',
  clusters: 'Reportes relacionados (≥2)',
  reportsLabel: 'reportes',
  resolveCluster: 'Cerrar grupo',
  clusterResolved: 'Grupo cerrado',
  col_pending: 'Pendientes', col_in_review: 'En revisión',
  col_resolved: 'Resueltos', col_rejected: 'Rechazados',
  unknownTarget: 'Destino no encontrado',
  targetSnapshot: 'Captura del destino',
  targetOwner: 'Propietario',
  reasonText: 'Motivo del reporte',
  reporter: 'Autor del reporte',
  adminNote: 'Nota del moderador',
  quickActions: 'Acciones rápidas',
  btnDelete: 'Eliminar contenido',
  btnWarnTarget: 'Advertir',
  btnMute24: 'Mute 24h', btnMute7d: 'Mute 7d',
  btnSuspend7d: 'Suspend 7d', btnBanTarget: 'Bloquear',
  markInReview: 'En revisión', markResolved: 'Resuelto', markRejected: 'Rechazar',
  saveNote: 'Guardar', noteSaved: 'Guardado',
  statusUpdated: 'Estado actualizado',
  history: 'Historial',
  system: 'Sistema',

  allActions: 'Todas las acciones',
  colWhen: 'Cuándo', colActor: 'Quién', colAction: 'Acción',
  colTarget: 'Destino', colDetails: 'Detalles'
};

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

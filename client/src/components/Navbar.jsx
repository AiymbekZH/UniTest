import { useState, memo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, LogOut, Menu, X,
  LayoutDashboard, FileText, BarChart3, Database, Sun, Moon, Sunset,
  User, Shield, Globe, Users, RefreshCw, Trash2, UserPlus, MessageSquare, Swords
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChatInbox } from '../context/ChatInboxContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import BrandLogo from './BrandLogo';
import NotificationBell from './NotificationBell';
import ConfirmDialog from './ConfirmDialog';
import toast from 'react-hot-toast';

export default memo(function Navbar() {
  const { user, logout, savedSessions, switchAccount, removeSavedSession, isAuthenticated } = useAuth();
  const { hasUnreadMessages, hasUnreadGroups, hasAnyChatUnread } = useChatInbox();
  const { dark, mode, cycleTheme } = useTheme();
  const { t, lang, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const currentSessionId = user?.id || user?._id || user?.email;

  useEffect(() => {
    if (!isAuthenticated) {
      document.body.classList.remove('has-mobile-nav');
      return undefined;
    }
    document.body.classList.add('has-mobile-nav');
    return () => document.body.classList.remove('has-mobile-nav');
  }, [isAuthenticated]);
  const quickSwitchSessions = (savedSessions || []).filter(session => session.id !== currentSessionId);

  const handleLogout = () => {
    setShowMenu(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/');
  };

  const handleSwitchAccount = async (sessionId) => {
    try {
      await switchAccount(sessionId);
      setShowMenu(false);
      window.location.assign('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Не удалось переключить аккаунт');
    }
  };

  const handleRemoveSavedSession = (event, sessionId) => {
    event.stopPropagation();
    removeSavedSession(sessionId);
    toast.success('Аккаунт удалён из быстрого доступа');
  };

  const navLinks = [
    { to: '/dashboard', label: t('home'), icon: LayoutDashboard },
    { to: '/arena', label: 'Соревнователь', icon: Swords, accent: 'orange' },
    { to: '/my-tests', label: t('myTests'), icon: FileText },
    { to: '/my-results', label: t('results'), icon: BarChart3 },
    { to: '/groups', label: t('groups'), icon: Users },
    { to: '/messages', label: t('messages') || 'Сообщения', icon: MessageSquare },
    { to: '/question-bank', label: t('questionBank'), icon: Database },
  ];

  const isActive = (path) => location.pathname === path;

  const langLabels = { en: 'EN', ru: 'RU', kz: 'KZ', es: 'ES' };
  const hasUnreadForPath = (path) => (
    (path === '/messages' && hasUnreadMessages) ||
    (path === '/groups' && hasUnreadGroups)
  );

  return (
    <>
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Выйти из аккаунта?"
        message="Текущая сессия закроется, но сохранённые аккаунты останутся доступны для быстрого входа."
        confirmText={t('logout')}
        variant="warning"
      />

      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2 min-w-0">
              {isAuthenticated && (
                <button
                  className="icon-btn relative"
                  onClick={() => setShowMobile(true)}
                  aria-label="Open navigation menu"
                >
                  {hasAnyChatUnread && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                  )}
                  <Menu size={17} />
                </button>
              )}

              <Link to="/dashboard" className="flex min-w-0 items-center gap-2 group">
                <BrandLogo
                  size={32}
                  showWordmark
                  className="transition-transform duration-300 group-hover:scale-[1.03]"
                  wordmarkClassName="text-base text-dark tracking-tight"
                />
              </Link>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              {/* Language switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowLang(!showLang)}
                  className="icon-btn"
                  title="Language"
                >
                  <Globe size={16} />
                </button>
                <AnimatePresence>
                  {showLang && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      className="absolute right-0 mt-1 w-36 rounded-xl border border-gray-100 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800 z-50"
                    >
                      {[
                        { code: 'en', label: '🇬🇧 English' },
                        { code: 'ru', label: '🇷🇺 Русский' },
                        { code: 'kz', label: '🇰🇿 Қазақша' },
                        { code: 'es', label: '🇪🇸 Español' }
                      ].map(l => (
                        <button key={l.code}
                          onClick={() => { setLanguage(l.code); setShowLang(false); }}
                          className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors
                            ${lang === l.code ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-300 font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme mode toggle: light → dark → auto */}
              <button
                onClick={cycleTheme}
                className="icon-btn"
                title={mode === 'light' ? t('darkTheme') : mode === 'dark' ? (t('autoTheme') || 'Auto (Night)') : t('lightTheme')}
              >
                {mode === 'light' ? <Moon size={16} /> : mode === 'dark' ? <Sunset size={16} /> : <Sun size={16} />}
              </button>

              {isAuthenticated ? (
                <>
                  <NotificationBell />

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/create-test')}
                    className="btn-primary hidden sm:inline-flex items-center gap-1.5 py-1.5 px-3 text-[13px] whitespace-nowrap"
                  >
                    <Plus size={14} />
                    <span className="hidden xl:inline">{t('createTest')}</span>
                  </motion.button>

                  {/* User menu */}
                  <div className="relative ml-0.5">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="flex items-center gap-2 rounded-full p-0.5 transition-all hover:ring-2 hover:ring-gray-100 dark:hover:ring-slate-700"
                    >
                      <div className="w-8 h-8 min-w-[32px] bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 rounded-full flex items-center justify-center font-semibold text-xs overflow-hidden flex-shrink-0 ring-1 ring-gray-100 dark:ring-slate-700">
                        {user?.avatar ? (
                          <img src={user.avatar} alt="" className="w-8 h-8 object-cover rounded-full" />
                        ) : (
                          <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
                        )}
                      </div>
                    </button>

                    <AnimatePresence>
                      {showMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-60 rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-800 z-50"
                        >
                          <div className="px-2.5 py-2 mb-1">
                            <p className="text-sm font-semibold text-dark truncate">{user?.firstName} {user?.lastName}</p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
                            <span className="badge-info mt-1.5 text-[10px]">
                              {user?.role === 'admin' ? t('adminRole') : user?.role === 'teacher' ? t('teacher') : t('student')}
                            </span>
                          </div>
                          <div className="divider mb-1" />
                          <Link
                            to="/profile"
                            onClick={() => setShowMenu(false)}
                            className="menu-item"
                          >
                            <User size={15} />
                            {t('profile')}
                          </Link>
                          {user?.role === 'admin' && (
                            <Link
                              to="/admin"
                              onClick={() => setShowMenu(false)}
                              className="menu-item"
                            >
                              <Shield size={15} />
                              {t('admin')}
                            </Link>
                          )}
                          <div className="divider my-1" />
                          <div className="px-2.5 pb-1 pt-1">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300 dark:text-gray-500">
                              Быстрый доступ
                            </p>
                          </div>

                          {quickSwitchSessions.length > 0 ? (
                            <div className="space-y-0.5">
                              {quickSwitchSessions.map(session => (
                                <div
                                  key={session.id}
                                  className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                                >
                                  <button
                                    onClick={() => handleSwitchAccount(session.id)}
                                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                  >
                                    <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-primary-50 text-[10px] font-semibold text-primary-600 dark:bg-primary-900/40 dark:text-primary-300 ring-1 ring-gray-100 dark:ring-slate-700">
                                      {session.user?.avatar ? (
                                        <img src={session.user.avatar} alt="" className="h-full w-full object-cover" />
                                      ) : (
                                        <>{session.user?.firstName?.[0]}{session.user?.lastName?.[0]}</>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-[12px] font-medium text-gray-700 dark:text-gray-200">
                                        {session.user?.firstName} {session.user?.lastName}
                                      </p>
                                      <p className="truncate text-[10px] text-gray-400">
                                        {session.user?.email}
                                      </p>
                                    </div>
                                    <RefreshCw size={12} className="flex-shrink-0 text-gray-300 group-hover:text-primary-500" />
                                  </button>
                                  <button
                                    onClick={(event) => handleRemoveSavedSession(event, session.id)}
                                    className="rounded p-1 text-gray-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                                    title="Убрать из быстрого доступа"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="px-2.5 pb-1.5 text-[10px] text-gray-400">
                              Войдите во второй аккаунт — он появится здесь.
                            </div>
                          )}

                          <Link
                            to="/login"
                            onClick={() => setShowMenu(false)}
                            className="menu-item"
                          >
                            <UserPlus size={15} />
                            Добавить аккаунт
                          </Link>
                          <div className="divider my-1" />
                          <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <LogOut size={15} />
                            {t('logout')}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5 ml-1">
                  <Link to="/login" className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-dark transition dark:text-gray-300">
                    {t('login')}
                  </Link>
                  <Link to="/register" className="btn-primary py-1.5 px-4 text-sm">
                    {t('register')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {showMobile && isAuthenticated && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobile(false)}
              className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm"
              aria-label="Close navigation menu"
            />
            <motion.aside
              initial={{ x: -360, opacity: 0.7 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -360, opacity: 0.7 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="fixed left-0 top-0 z-[60] flex h-full w-[min(88vw,340px)] flex-col overflow-y-auto border-r border-gray-100 bg-white px-3 pb-5 pt-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-2 pb-3">
                <Link
                  to="/dashboard"
                  onClick={() => setShowMobile(false)}
                  className="flex min-w-0 items-center gap-2"
                >
                  <BrandLogo
                    size={30}
                    showWordmark
                    wordmarkClassName="text-base text-dark tracking-tight"
                  />
                </Link>
                <button
                  onClick={() => setShowMobile(false)}
                  className="icon-btn"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="divider" />

              <div className="mt-3 flex flex-col gap-0.5">
                {navLinks.map(link => {
                  const active = isActive(link.to);
                  const isOrange = link.accent === 'orange';
                  const base = 'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors';
                  const state = active
                    ? (isOrange
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                        : 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300')
                    : (isOrange
                        ? 'text-orange-600 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-500/10'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800');
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setShowMobile(false)}
                      className={`${base} ${state}`}
                    >
                      <link.icon size={16} />
                      <span>{link.label}</span>
                      {isOrange && !active && (
                        <span className="ml-auto rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">live</span>
                      )}
                      {hasUnreadForPath(link.to) && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
                      )}
                    </Link>
                  );
                })}

                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setShowMobile(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                      ${isActive('/admin')
                        ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800'}`}
                  >
                    <Shield size={16} />
                    <span>{t('admin')}</span>
                  </Link>
                )}
              </div>

              <div className="mt-4 divider" />

              <div className="mt-3 flex items-center gap-3 px-1">
                <div className="h-10 w-10 overflow-hidden rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300 ring-1 ring-gray-100 dark:ring-slate-700">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-dark">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate text-[11px] text-gray-400">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setShowMobile(false);
                  }}
                  className="btn-secondary flex items-center justify-center gap-1.5 py-1.5 px-3 text-sm"
                >
                  <User size={14} />
                  {t('profile')}
                </button>
                <button
                  onClick={() => {
                    navigate('/create-test');
                    setShowMobile(false);
                  }}
                  className="btn-primary flex items-center justify-center gap-1.5 py-1.5 px-3 text-sm"
                >
                  <Plus size={14} />
                  {t('createTest')}
                </button>
              </div>

              <div className="mt-4 divider" />

              <div className="mt-3 px-1">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-300 dark:text-gray-500">Language</p>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { code: 'en', label: 'EN' },
                    { code: 'ru', label: 'RU' },
                    { code: 'kz', label: 'KZ' },
                    { code: 'es', label: 'ES' }
                  ].map(l => (
                    <button
                      key={l.code}
                      onClick={() => setLanguage(l.code)}
                      className={`rounded-lg px-2 py-1.5 text-xs font-medium transition
                        ${lang === l.code
                          ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300'
                          : 'text-gray-400 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-slate-800'}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 px-1">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-300 dark:text-gray-500">Theme</p>
                <button
                  onClick={cycleTheme}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
                >
                  <span className="flex items-center gap-2">
                    {mode === 'light' ? <Moon size={13} /> : mode === 'dark' ? <Sunset size={13} /> : <Sun size={13} />}
                    {mode === 'light'
                      ? t('darkTheme')
                      : mode === 'dark'
                        ? (t('autoTheme') || 'Auto')
                        : t('lightTheme')}
                  </span>
                  <RefreshCw size={13} className="text-gray-300" />
                </button>
              </div>

              <div className="mt-4 divider" />

              <div className="mt-3 px-1">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-300 dark:text-gray-500">
                  Быстрый доступ
                </p>

                {quickSwitchSessions.length > 0 ? (
                  <div className="space-y-0.5">
                    {quickSwitchSessions.map(session => (
                      <div
                        key={session.id}
                        className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-800"
                      >
                        <button
                          onClick={() => handleSwitchAccount(session.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary-50 text-[11px] font-semibold text-primary-600 dark:bg-primary-900/30 dark:text-primary-300 ring-1 ring-gray-100 dark:ring-slate-700">
                            {session.user?.avatar ? (
                              <img src={session.user.avatar} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <>{session.user?.firstName?.[0]}{session.user?.lastName?.[0]}</>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-200">
                              {session.user?.firstName} {session.user?.lastName}
                            </p>
                            <p className="truncate text-[10px] text-gray-400">
                              {session.user?.email}
                            </p>
                          </div>
                          <RefreshCw size={12} className="flex-shrink-0 text-gray-300 group-hover:text-primary-500" />
                        </button>
                        <button
                          onClick={(event) => handleRemoveSavedSession(event, session.id)}
                          className="rounded p-1 text-gray-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                          title="Убрать из быстрого доступа"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-2 py-1 text-[10px] text-gray-400">
                    Войдите во второй аккаунт — он появится здесь.
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowMobile(false);
                    navigate('/login');
                  }}
                  className="mt-2 menu-item"
                >
                  <UserPlus size={14} />
                  Добавить аккаунт
                </button>
                <button
                  onClick={() => {
                    setShowMobile(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut size={14} />
                  {t('logout')}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile bottom nav - chunky */}
      {isAuthenticated && (
        <nav
          className="mobile-nav-shell"
          style={{ boxShadow: '0 -4px 0 rgba(15, 23, 42, 0.04)' }}
          aria-label="Нижняя навигация"
        >
          <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 py-1.5">
            {[
              { to: '/dashboard', label: t('home'), Icon: LayoutDashboard },
              { to: '/my-tests', label: t('myTests'), Icon: FileText },
              { to: '/arena', label: 'Арена', Icon: Swords, accent: 'orange' },
              { to: '/messages', label: t('messages') || 'Чат', Icon: MessageSquare, dot: hasUnreadMessages },
              { to: user?.username ? `/u/${user.username}` : '/profile', label: t('profile') || 'Профиль', Icon: User }
            ].map(({ to, label, Icon, accent, dot }) => {
              const active = location.pathname === to || (to === '/arena' && location.pathname.startsWith('/arena'));
              const isArena = accent === 'orange';
              return (
                <li key={to} className="flex-1">
                  <Link
                    to={to}
                    className={`touch-target relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-black leading-none transition-transform active:translate-y-[2px] ${
                      active
                        ? isArena
                          ? 'bg-primary-500 text-white'
                          : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                    style={active ? { boxShadow: `0 3px 0 ${isArena ? '#9a3412' : '#0f172a'}` } : undefined}
                  >
                    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                    <span className="mt-0.5 tracking-tight">{label}</span>
                    {dot ? (
                      <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
})

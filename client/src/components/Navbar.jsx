import { useState, memo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Plus, LogOut, Menu, X,
  LayoutDashboard, FileText, BarChart3, Database, Sun, Moon,
  User, Shield, Globe, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import NotificationBell from './NotificationBell';

export default memo(function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const { t, lang, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const [showLang, setShowLang] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: t('home'), icon: LayoutDashboard },
    { to: '/my-tests', label: t('myTests'), icon: FileText },
    { to: '/my-results', label: t('results'), icon: BarChart3 },
    { to: '/groups', label: t('groups'), icon: Users },
    { to: '/question-bank', label: t('questionBank'), icon: Database },
  ];

  const isActive = (path) => location.pathname === path;

  const langLabels = { en: 'EN', ru: 'RU', kz: 'KZ' };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-100/50 dark:border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center
                          group-hover:shadow-lg group-hover:shadow-primary-600/25 transition-all duration-300">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-dark hidden sm:block">UniTest</span>
          </Link>

          {/* Desktop Nav */}
          {isAuthenticated && (
            <div className="hidden lg:flex items-center gap-0.5">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all duration-200
                    ${isActive(link.to)
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600'
                      : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                >
                  <link.icon size={15} />
                  {link.label}
                </Link>
              ))}
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all duration-200
                    ${isActive('/admin')
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-600'
                      : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                >
                  <Shield size={15} />
                  {t('admin')}
                </Link>
              )}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLang(!showLang)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-all flex items-center gap-1 text-xs font-medium"
              >
                <Globe size={16} />
                <span className="hidden sm:inline">{langLabels[lang]}</span>
              </button>
              <AnimatePresence>
                {showLang && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    className="absolute right-0 mt-1 w-32 glass-card-solid p-1 shadow-glass z-50"
                  >
                    {[
                      { code: 'en', label: 'EN English' },
                      { code: 'ru', label: '???? –усский' },
                      { code: 'kz', label: '???? ?аза?ша' }
                    ].map(l => (
                      <button key={l.code}
                        onClick={() => { setLanguage(l.code); setShowLang(false); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors
                          ${lang === l.code ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-all"
              title={dark ? t('lightTheme') : t('darkTheme')}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {isAuthenticated ? (
              <>
                <NotificationBell />

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/create-test')}
                  className="btn-primary hidden sm:flex items-center gap-2 py-2 px-4 text-sm whitespace-nowrap"
                >
                  <Plus size={16} />
                  {t('createTest')}
                </motion.button>

                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                  >
                    <div className="w-8 h-8 min-w-[32px] bg-primary-100 dark:bg-primary-900/50 text-primary-600 rounded-lg flex items-center justify-center font-semibold text-xs overflow-hidden flex-shrink-0">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="" className="w-8 h-8 object-cover rounded-lg" />
                      ) : (
                        <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
                      )}
                    </div>
                    <span className="text-sm font-medium text-dark hidden xl:block">
                      {user?.firstName} {user?.lastName}
                    </span>
                  </button>

                  <AnimatePresence>
                    {showMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-56 glass-card-solid p-2 shadow-glass z-50"
                      >
                        <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700 mb-1">
                          <p className="text-sm font-medium text-dark">{user?.firstName} {user?.lastName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                          <span className="badge-info mt-1 text-[10px]">
                            {user?.role === 'admin' ? t('adminRole') : user?.role === 'teacher' ? t('teacher') : t('student')}
                          </span>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setShowMenu(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <User size={16} />
                          {t('profile')}
                        </Link>
                        {user?.role === 'admin' && (
                          <Link
                            to="/admin"
                            onClick={() => setShowMenu(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Shield size={16} />
                            {t('admin')}
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <LogOut size={16} />
                          {t('logout')}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-dark transition">
                  {t('login')}
                </Link>
                <Link to="/register" className="btn-primary py-2 px-4 text-sm">
                  {t('register')}
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            {isAuthenticated && (
              <button
                className="lg:hidden p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                onClick={() => setShowMobile(!showMobile)}
              >
                {showMobile ? <X size={20} className="text-dark" /> : <Menu size={20} className="text-dark" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {showMobile && isAuthenticated && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden pb-4"
            >
              <div className="flex flex-col gap-1 pt-2">
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setShowMobile(false)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all
                      ${isActive(link.to) ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                  >
                    <link.icon size={16} />
                    {link.label}
                  </Link>
                ))}
                {user?.role === 'admin' && (
                  <Link to="/admin" onClick={() => setShowMobile(false)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all
                      ${isActive('/admin') ? 'bg-red-50 dark:bg-red-900/30 text-red-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                  >
                    <Shield size={16} /> {t('admin')}
                  </Link>
                )}
                <button
                  onClick={() => { navigate('/create-test'); setShowMobile(false); }}
                  className="btn-primary flex items-center justify-center gap-2 mt-2"
                >
                  <Plus size={16} />
                  {t('createTest')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
})

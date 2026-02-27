import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Plus, LogOut, Menu, X,
  User, Shield, Globe, Sun, Moon, ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const { t, lang, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const menuRef = useRef(null);
  const langRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
      if (langRef.current && !langRef.current.contains(e.target)) setShowLang(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: t('home') },
    { to: '/my-tests', label: t('myTests') },
    { to: '/my-results', label: t('results') },
    { to: '/question-bank', label: t('questionBank') },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: t('admin') }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  const langLabels = { en: 'EN', ru: 'RU', kz: 'KZ' };
  const langIcons = { en: 'EN', ru: '🇷🇺', kz: '🇰🇿' };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-200/60 dark:border-slate-700/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center
                          group-hover:shadow-md group-hover:shadow-primary-600/20 transition-all duration-200">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-dark tracking-tight hidden sm:block">UniTest</span>
          </Link>

          {/* Desktop Nav — clean text links */}
          {isAuthenticated && (
            <div className="hidden lg:flex items-center gap-0.5 ml-8">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200
                    ${isActive(link.to)
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-slate-800/70'}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-1.5">
            {/* Language */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setShowLang(!showLang)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
              >
                <Globe size={14} />
                <span>{langLabels[lang]}</span>
              </button>
              <AnimatePresence>
                {showLang && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-black/8 dark:shadow-black/30 border border-gray-200/80 dark:border-slate-700 p-1 z-50"
                  >
                    {[
                      { code: 'en', label: 'English', flag: 'EN' },
                      { code: 'ru', label: 'Русский', flag: '🇷🇺' },
                      { code: 'kz', label: 'Қазақша', flag: '🇰🇿' }
                    ].map(l => (
                      <button key={l.code}
                        onClick={() => { setLanguage(l.code); setShowLang(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors
                          ${lang === l.code 
                            ? 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white font-medium' 
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                      >
                        <span className="text-sm">{l.flag}</span>
                        {l.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 dark:text-gray-500 transition-all"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {isAuthenticated ? (
              <>
                <NotificationBell />

                {/* Create — capsule button */}
                <button
                  onClick={() => navigate('/create-test')}
                  className="hidden sm:flex items-center gap-1.5 h-8 px-3.5 bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-medium rounded-full transition-all duration-200 hover:shadow-md hover:shadow-primary-600/20"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>{t('createTest')}</span>
                </button>

                {/* Avatar + dropdown */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-1.5 ml-0.5 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-[11px] font-semibold text-white overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {showMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-black/8 dark:shadow-black/30 border border-gray-200/80 dark:border-slate-700 p-1.5 z-50"
                      >
                        <div className="px-3 py-2.5 mb-1">
                          <p className="text-sm font-medium text-dark">{user?.firstName} {user?.lastName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
                        </div>
                        <div className="h-px bg-gray-100 dark:bg-slate-700 mx-1 mb-1" />
                        <Link
                          to="/profile"
                          onClick={() => setShowMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                        >
                          <User size={15} />
                          {t('profile')}
                        </Link>
                        {user?.role === 'admin' && (
                          <Link
                            to="/admin"
                            onClick={() => setShowMenu(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                          >
                            <Shield size={15} />
                            {t('admin')}
                          </Link>
                        )}
                        <div className="h-px bg-gray-100 dark:bg-slate-700 mx-1 my-1" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-3 py-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition rounded-full">
                  {t('login')}
                </Link>
                <Link to="/register" className="h-8 px-4 bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-medium rounded-full flex items-center transition-all">
                  {t('register')}
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            {isAuthenticated && (
              <button
                className="lg:hidden p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-all ml-0.5"
                onClick={() => setShowMobile(!showMobile)}
              >
                {showMobile ? <X size={18} className="text-dark" /> : <Menu size={18} className="text-dark" />}
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
              transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden pb-3"
            >
              <div className="flex flex-col gap-0.5 pt-1">
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setShowMobile(false)}
                    className={`px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all
                      ${isActive(link.to) 
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' 
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  onClick={() => { navigate('/create-test'); setShowMobile(false); }}
                  className="flex items-center justify-center gap-2 mt-2 h-10 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-full transition-all"
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
}

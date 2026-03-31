import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, GraduationCap, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState('');
  const { login, savedSessions, switchAccount } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Заполните все поля');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Вход выполнен!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (sessionId) => {
    setSwitchingId(sessionId);
    try {
      await switchAccount(sessionId);
      window.location.assign('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Быстрый вход не удался');
    } finally {
      setSwitchingId('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <Toaster position="top-right" />
      
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-100/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md relative"
      >
        <div className="glass-card p-8 md:p-10">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg shadow-primary-600/30">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-dark">UniTest</h1>
            <p className="text-gray-500 mt-1 text-sm">Войдите в свою учётную запись</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Пароль</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </motion.div>

            <motion.button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  Войти
                </>
              )}
            </motion.button>
          </form>

          {savedSessions?.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.58 }}
              className="mt-6 rounded-2xl border border-gray-200/70 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-900/30"
            >
              <div className="mb-3">
                <p className="text-sm font-semibold text-dark">Быстрый вход</p>
                <p className="text-xs text-gray-500">Сохранённые аккаунты можно открыть без повторного ввода пароля</p>
              </div>
              <div className="space-y-2">
                {savedSessions.map(session => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => handleQuickLogin(session.id)}
                    disabled={switchingId === session.id}
                    className="flex w-full items-center gap-3 rounded-xl border border-gray-200/70 bg-white px-3 py-2.5 text-left transition hover:border-primary-300 hover:bg-primary-50/40 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-700"
                  >
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-primary-100 text-xs font-semibold text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                      {session.user?.avatar ? (
                        <img src={session.user.avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <>{session.user?.firstName?.[0]}{session.user?.lastName?.[0]}</>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-dark">
                        {session.user?.firstName} {session.user?.lastName}
                      </p>
                      <p className="truncate text-xs text-gray-500">{session.user?.email}</p>
                    </div>
                    {switchingId === session.id ? (
                      <div className="h-4 w-4 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
                    ) : (
                      <RefreshCw size={16} className="text-primary-500" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-6 text-sm text-gray-500"
          >
            Нет аккаунта?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
              Зарегистрироваться
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}

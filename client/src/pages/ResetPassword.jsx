import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useParams();
  const location = useLocation();
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const resetToken = useMemo(() => {
    const queryToken = new URLSearchParams(location.search).get('token');
    const pathToken = location.pathname
      .split('/')
      .filter(Boolean)
      .slice(1)
      .join('/');

    return queryToken || token || pathToken || '';
  }, [location.pathname, location.search, token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!password || password.length < 6) {
      toast.error('Пароль должен быть минимум 6 символов');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(resetToken, password);
      toast.success(res.message || 'Пароль изменен');
      setTimeout(() => navigate('/login', { replace: true }), 800);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка смены пароля');
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
        <Toaster position="top-right" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass-card p-8">
            <h1 className="text-2xl font-bold text-dark mb-2">Ссылка для сброса недействительна</h1>
            <p className="text-sm text-gray-500 mb-6">Откройте письмо заново или запросите новую ссылку для восстановления пароля.</p>
            <Link to="/forgot-password" className="btn-primary inline-flex w-full items-center justify-center gap-2">
              <ArrowLeft size={16} />
              Запросить новую ссылку
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <Toaster position="top-right" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold text-dark mb-2">Новый пароль</h1>
          <p className="text-sm text-gray-500 mb-6">Введите новый пароль для вашего аккаунта.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Новый пароль</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  className="input-field pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Повторите пароль</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  className="input-field pl-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Сохраняем...' : 'Сменить пароль'}
            </button>
          </form>

          <Link to="/login" className="mt-5 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700">
            <ArrowLeft size={16} />
            Назад ко входу
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

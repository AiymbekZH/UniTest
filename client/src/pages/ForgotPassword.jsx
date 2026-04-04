import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email) {
      toast.error('Введите email');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(email);
      toast.success(res.message || 'Проверьте почту для восстановления пароля');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка отправки письма');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <Toaster position="top-right" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold text-dark mb-2">Восстановление пароля</h1>
          <p className="text-sm text-gray-500 mb-6">Введите email. Если аккаунт существует, мы отправим ссылку для сброса.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  className="input-field pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Отправка...' : 'Отправить ссылку'}
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

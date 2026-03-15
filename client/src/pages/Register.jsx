import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, UserPlus, GraduationCap, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', middleName: '',
    email: '', password: '', confirmPassword: '', role: 'student'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error('Заполните обязательные поля');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Пароль минимум 6 символов');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...data } = form;
      await register(data);
      toast.success('Аккаунт создан!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const inputAnim = (delay) => ({
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { delay }
  });

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 sm:p-6">
      <Toaster position="top-right" />

      {/* Background atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-20 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="absolute top-1/3 -left-28 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '26px 26px'
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="glass-card border border-white/10 bg-white/90 p-6 shadow-glass-lg backdrop-blur-2xl dark:border-slate-700/60 dark:bg-slate-900/75 sm:p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mb-6 text-center"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-500 shadow-lg shadow-primary-700/30">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-dark dark:text-slate-100">Создать аккаунт</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">Присоединяйтесь к UniTest и начните работать уже сегодня</p>
          </motion.div>

          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/60 bg-cyan-100/70 px-3 py-1 text-xs font-medium text-cyan-700 dark:border-cyan-700/50 dark:bg-cyan-950/40 dark:text-cyan-300">
              <Sparkles size={14} />
              Для студентов и преподавателей
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role switch */}
            <motion.div {...inputAnim(0.2)} className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-700 rounded-xl">
              {[
                { value: 'student', label: 'Студент' },
                { value: 'teacher', label: 'Преподаватель' }
              ].map(r => (
                <button
                  key={r.value}
                  type="button"
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300
                    ${form.role === r.value 
                      ? 'bg-white dark:bg-slate-600 text-primary-600 shadow-soft' 
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  onClick={() => update('role', r.value)}
                >
                  {r.label}
                </button>
              ))}
            </motion.div>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div {...inputAnim(0.25)}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Фамилия *</label>
                <input className="input-field" placeholder="Иванов" value={form.lastName}
                  onChange={e => update('lastName', e.target.value)} />
              </motion.div>
              <motion.div {...inputAnim(0.3)}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Имя *</label>
                <input className="input-field" placeholder="Иван" value={form.firstName}
                  onChange={e => update('firstName', e.target.value)} />
              </motion.div>
            </div>

            <motion.div {...inputAnim(0.35)}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Отчество</label>
              <input className="input-field" placeholder="Иванович" value={form.middleName}
                onChange={e => update('middleName', e.target.value)} />
            </motion.div>

            <motion.div {...inputAnim(0.4)}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
              <input type="email" className="input-field" placeholder="your@email.com" value={form.email}
                onChange={e => update('email', e.target.value)} />
            </motion.div>

            <motion.div {...inputAnim(0.45)}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Пароль *</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className="input-field pr-12"
                  placeholder="Минимум 6 символов" value={form.password}
                  onChange={e => update('password', e.target.value)} />
                <button type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </motion.div>

            <motion.div {...inputAnim(0.5)}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Подтвердите пароль *</label>
              <input type="password" className="input-field" placeholder="••••••••"
                value={form.confirmPassword}
                onChange={e => update('confirmPassword', e.target.value)} />
            </motion.div>

            <motion.button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 !py-3 mt-2"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={18} />
                  Зарегистрироваться
                </>
              )}
            </motion.button>
          </form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-6 text-sm text-gray-500"
          >
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
              Войти
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, UserPlus, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import SimpleCaptcha from '../components/SimpleCaptcha';

const createCaptcha = () => {
  const left = Math.floor(Math.random() * 8) + 2;
  const right = Math.floor(Math.random() * 8) + 1;
  return {
    question: `${left} + ${right} = ?`,
    answer: left + right
  };
};

export default function Register() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', middleName: '',
    email: '', password: '', confirmPassword: '', role: 'student'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captcha, setCaptcha] = useState(() => createCaptcha());
  const [captchaValue, setCaptchaValue] = useState('');
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
    if (Number(captchaValue.trim()) !== captcha.answer) {
      toast.error('Неверная капча');
      setCaptcha(createCaptcha());
      setCaptchaValue('');
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
      setCaptcha(createCaptcha());
      setCaptchaValue('');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-lg relative"
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
            <h1 className="text-2xl font-bold text-dark">Создать аккаунт</h1>
            <p className="text-gray-500 mt-1 text-sm">Присоединяйтесь к UniTest</p>
          </motion.div>

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

            <motion.div {...inputAnim(0.52)}>
              <SimpleCaptcha
                challenge={captcha}
                value={captchaValue}
                onChange={setCaptchaValue}
                onRefresh={() => {
                  setCaptcha(createCaptcha());
                  setCaptchaValue('');
                }}
                label="Проверка перед регистрацией"
              />
            </motion.div>

            <motion.button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
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

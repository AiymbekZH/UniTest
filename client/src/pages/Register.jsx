import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, UserPlus, UserRound, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import SliderCaptcha from '../components/SliderCaptcha';

/* ─── Google "G" SVG ─── */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0">
      <path fill="#4285F4" d="M21.805 10.023H12v3.955h5.608c-.242 1.271-.967 2.348-2.062 3.071v2.548h3.332c1.951-1.795 3.077-4.438 3.077-7.574 0-.673-.06-1.319-.15-2Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.963-.894 6.617-2.403l-3.332-2.548c-.924.621-2.104.993-3.285.993-2.53 0-4.674-1.708-5.44-4.001H3.115v2.628A9.996 9.996 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.56 14.041a5.992 5.992 0 0 1-.304-1.89c0-.655.11-1.292.304-1.89V7.633H3.115A10 10 0 0 0 2 12.151c0 1.61.386 3.135 1.115 4.518l3.445-2.628Z" />
      <path fill="#EA4335" d="M12 6.26c1.47 0 2.79.506 3.828 1.498l2.87-2.87C16.957 3.268 14.695 2.303 12 2.303A9.996 9.996 0 0 0 3.115 7.633L6.56 10.26C7.326 7.968 9.47 6.26 12 6.26Z" />
    </svg>
  );
}

/* ─── Left panel ─── */
function LeftPanel() {
  return (
    <div className="relative hidden overflow-hidden rounded-l-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-10 lg:flex lg:w-[46%] lg:flex-col lg:justify-between">
      <motion.div animate={{ y: [0, -14, 0], x: [0, 6, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-blue-400/40" />
      <motion.div animate={{ y: [0, 12, 0], x: [0, -8, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-blue-300/30" />
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute left-1/3 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-blue-400/25" />
      <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute right-8 bottom-12 h-24 w-24 rounded-full bg-white/10" />

      <svg className="absolute inset-0 h-full w-full opacity-10" viewBox="0 0 400 500">
        <motion.path d="M0 250 Q100 200 200 300 T400 250" fill="none" stroke="white" strokeWidth="1.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
      </svg>

      <div className="relative z-10">
        <div className="mb-12 flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 72 72" fill="none">
            <rect x="6" y="6" width="60" height="60" rx="16" fill="rgba(255,255,255,0.2)" />
            <path d="M22 24L34 46L41 35L50 49" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-lg font-bold text-white/90">UniTest</span>
        </div>
      </div>

      <div className="relative z-10">
        <h2 className="text-3xl font-bold italic text-white">WELCOME</h2>
        <p className="mt-1 text-lg font-semibold text-white/80">Создайте аккаунт</p>
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
          Присоединяйтесь к UniTest. Выберите роль, заполните данные и начните работу с платформой.
        </p>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function Register() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', middleName: '',
    email: '', password: '', confirmPassword: '', role: 'student'
  });
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaOk, setCaptchaOk] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);
  const { register, loginWithGoogleRedirect } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const resetCaptcha = () => { setCaptchaOk(false); setCaptchaKey(n => n + 1); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password) return toast.error('Заполните обязательные поля');
    if (form.password.length < 6) return toast.error('Пароль минимум 6 символов');
    if (form.password !== form.confirmPassword) return toast.error('Пароли не совпадают');
    if (!captchaOk) return toast.error('Пройдите проверку');
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      await register(payload);
      toast.success('Аккаунт создан');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка регистрации');
      resetCaptcha();
    } finally { setLoading(false); }
  };

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pl-11 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-500 dark:focus:ring-blue-900/30';
  const inputNoPad = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-500 dark:focus:ring-blue-900/30';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1623] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex w-full max-w-[920px] overflow-hidden rounded-3xl shadow-2xl shadow-black/40"
      >
        <LeftPanel />

        <div className="flex flex-1 flex-col justify-center bg-white px-8 py-8 dark:bg-slate-800 sm:px-12 lg:rounded-r-3xl lg:rounded-l-none rounded-3xl lg:rounded-none">
          {/* Mobile logo */}
          <div className="mb-5 flex items-center gap-2 lg:hidden">
            <svg width="28" height="28" viewBox="0 0 72 72" fill="none">
              <rect x="6" y="6" width="60" height="60" rx="16" fill="#3b82f6" />
              <path d="M22 24L34 46L41 35L50 49" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-lg font-bold text-gray-800 dark:text-white">UniTest</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Создать аккаунт</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Присоединяйтесь к UniTest</p>

          {/* Role selector */}
          <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-600 dark:bg-slate-700">
            {[
              { value: 'student', label: 'Студент', icon: UserRound },
              { value: 'teacher', label: 'Преподаватель', icon: Users },
            ].map(r => (
              <button key={r.value} type="button" onClick={() => set('role', r.value)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  form.role === r.value
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-600 dark:text-blue-300'
                    : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}>
                <r.icon size={15} />
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            {/* Names */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Фамилия *</label>
                <input className={inputNoPad} placeholder="Иванов" value={form.lastName} onChange={e => set('lastName', e.target.value)} autoComplete="family-name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Имя *</label>
                <input className={inputNoPad} placeholder="Иван" value={form.firstName} onChange={e => set('firstName', e.target.value)} autoComplete="given-name" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Отчество</label>
              <input className={inputNoPad} placeholder="Иванович" value={form.middleName} onChange={e => set('middleName', e.target.value)} autoComplete="additional-name" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Email *</label>
              <input type="email" className={inputNoPad} placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
            </div>

            {/* Passwords */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Пароль *</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className={`${inputNoPad} pr-10`} placeholder="Минимум 6 символов" value={form.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition dark:hover:text-slate-200">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Подтвердите пароль *</label>
                <div className="relative">
                  <input type={showCpw ? 'text' : 'password'} className={`${inputNoPad} pr-10`} placeholder="Повторите" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowCpw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition dark:hover:text-slate-200">
                    {showCpw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Captcha */}
            <SliderCaptcha onVerify={setCaptchaOk} resetKey={captchaKey} />

            {/* Submit */}
            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><UserPlus size={16} /> Создать аккаунт</>}
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200 dark:bg-slate-600" />
              <span className="text-xs text-gray-400">Или</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-slate-600" />
            </div>

            {/* Google */}
            <button type="button" onClick={loginWithGoogleRedirect}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
              <GoogleIcon />
              Продолжить с Google
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500 dark:text-slate-400">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="font-semibold text-blue-500 hover:text-blue-600 transition">Войти</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, LogIn, UserPlus, UserRound, Users, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import SliderCaptcha from '../components/SliderCaptcha';

/* ─── Google SVG ─── */
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

/* ─── Blue panel with spheres ─── */
function AccentPanel({ isRegister }) {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-500 via-orange-500 to-neutral-950 p-8 lg:p-10">
      {/* Animated spheres */}
      <motion.div animate={{ y: [0, -14, 0], x: [0, 6, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-orange-300/35" />
      <motion.div animate={{ y: [0, 12, 0], x: [0, -8, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-amber-200/25" />
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute left-1/3 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-orange-400/20" />
      <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.25, 0.15] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute right-8 bottom-12 h-24 w-24 rounded-full bg-white/10" />

      {/* SVG wave lines */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.07]" viewBox="0 0 400 500" preserveAspectRatio="none">
        <motion.path d="M0 200 Q100 150 200 250 T400 200" fill="none" stroke="white" strokeWidth="1.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.path d="M0 350 Q150 280 250 380 T400 320" fill="none" stroke="white" strokeWidth="1"
          initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }} />
      </svg>

      {/* Top: Logo + Welcome */}
      <div className="relative z-10">
        <div className="mb-6 flex items-center gap-2.5">
          <BrandLogo size={34} showWordmark wordmarkClassName="text-lg text-white/90" />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={isRegister ? 'reg' : 'log'} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <h2 className="text-3xl font-bold italic text-white leading-tight">
              {isRegister ? 'WELCOME' : 'WELCOME'}
            </h2>
            <p className="mt-1 text-lg font-semibold text-white/80">
              {isRegister ? 'Создайте аккаунт' : 'Платформа тестирования'}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom: Description */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.p key={isRegister ? 'reg' : 'log'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            className="max-w-xs text-sm leading-relaxed text-white/60">
            {isRegister
              ? 'Присоединяйтесь к UniTest. Выберите роль, заполните данные и начните работу.'
              : 'Создавайте тесты с AI, проходите и анализируйте результаты. Быстрый вход через Google или email.'}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Input styles ─── */
const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-primary-500 dark:focus:ring-primary-900/30';
const inputWithIcon = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pl-11 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-primary-500 dark:focus:ring-primary-900/30';

/* ─── LOGIN FORM ─── */
function LoginForm({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState('');
  const [captchaOk, setCaptchaOk] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);
  const { login, loginWithGoogleRedirect, savedSessions, switchAccount } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'google-auth-failed')
      toast.error('Google вход не удался. Попробуйте снова.');
  }, []);

  const resetCaptcha = () => { setCaptchaOk(false); setCaptchaKey(k => k + 1); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!email || !password) return toast.error('Заполните все поля');
    if (!captchaOk) return toast.error('Пройдите проверку');
    setLoading(true);
    try { await login(email, password); toast.success('Вход выполнен'); navigate('/dashboard'); }
    catch (err) { toast.error(err.response?.data?.message || 'Ошибка входа'); resetCaptcha(); }
    finally { setLoading(false); }
  };

  const quickLogin = async id => {
    setSwitchingId(id);
    try { await switchAccount(id); window.location.assign('/dashboard'); }
    catch (err) { toast.error(err.response?.data?.message || 'Не удалось'); }
    finally { setSwitchingId(''); }
  };

  return (
    <div className="flex flex-col justify-center">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Вход</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Войдите в учётную запись UniTest</p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
          </svg>
          <input type="email" className={inputWithIcon} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        </div>

        <div className="relative">
          <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <input type={showPw ? 'text' : 'password'} className={`${inputWithIcon} pr-20`} placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wide text-primary-500 hover:text-primary-600 transition">
            {showPw ? 'Скрыть' : 'Показать'}
          </button>
        </div>

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-medium text-primary-500 hover:text-primary-600 transition">Забыли пароль?</Link>
        </div>

        <SliderCaptcha onVerify={setCaptchaOk} resetKey={captchaKey} />

        <button type="submit" disabled={loading}
          className="chunky-btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm">
          {loading ? <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><LogIn size={16} /> Войти</>}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-slate-600" />
          <span className="text-xs text-gray-400">Или</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-slate-600" />
        </div>

        <button type="button" onClick={loginWithGoogleRedirect}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
          <GoogleIcon /> Войти через Google
        </button>
      </form>

      {savedSessions?.length > 0 && (
        <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
          <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-slate-400">Быстрый вход</p>
          <div className="space-y-1.5">
            {savedSessions.map(s => (
              <button key={s.id} type="button" onClick={() => quickLogin(s.id)} disabled={switchingId === s.id}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left transition hover:border-primary-300 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:hover:border-primary-500">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-primary-100 text-xs font-bold text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                  {s.user?.avatar ? <img src={s.user.avatar} alt="" className="h-full w-full object-cover" /> : <>{s.user?.firstName?.[0]}{s.user?.lastName?.[0]}</>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-white">{s.user?.firstName} {s.user?.lastName}</p>
                  <p className="truncate text-xs text-gray-400">{s.user?.email}</p>
                </div>
                {switchingId === s.id ? <div className="h-3.5 w-3.5 rounded-full border-2 border-primary-300 border-t-primary-600 animate-spin" /> : <RefreshCw size={13} className="text-gray-400" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-slate-400">
        Нет аккаунта?{' '}
        <button type="button" onClick={onSwitch} className="font-semibold text-primary-500 hover:text-primary-600 transition">Зарегистрироваться</button>
      </p>
    </div>
  );
}

/* ─── REGISTER FORM ─── */
function RegisterForm({ onSwitch }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', middleName: '', email: '', password: '', confirmPassword: '', role: 'student'
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

  return (
    <div className="flex flex-col justify-center">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Создать аккаунт</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Присоединяйтесь к UniTest</p>

      <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-600 dark:bg-slate-700">
        {[{ value: 'student', label: 'Студент', icon: UserRound }, { value: 'teacher', label: 'Преподаватель', icon: Users }].map(r => (
          <button key={r.value} type="button" onClick={() => set('role', r.value)}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              form.role === r.value ? 'bg-white text-primary-600 shadow-sm dark:bg-slate-600 dark:text-primary-300' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400'
            }`}>
            <r.icon size={15} /> {r.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Фамилия *</label>
            <input className={inputCls} placeholder="Иванов" value={form.lastName} onChange={e => set('lastName', e.target.value)} autoComplete="family-name" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Имя *</label>
            <input className={inputCls} placeholder="Иван" value={form.firstName} onChange={e => set('firstName', e.target.value)} autoComplete="given-name" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Отчество</label>
          <input className={inputCls} placeholder="Иванович" value={form.middleName} onChange={e => set('middleName', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Email *</label>
          <input type="email" className={inputCls} placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Пароль *</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className={`${inputCls} pr-10`} placeholder="Мин. 6 символов" value={form.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition dark:hover:text-slate-200">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Подтвердите *</label>
            <div className="relative">
              <input type={showCpw ? 'text' : 'password'} className={`${inputCls} pr-10`} placeholder="Повторите" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} autoComplete="new-password" />
              <button type="button" onClick={() => setShowCpw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition dark:hover:text-slate-200">
                {showCpw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <SliderCaptcha onVerify={setCaptchaOk} resetKey={captchaKey} />

        <button type="submit" disabled={loading}
          className="chunky-btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm">
          {loading ? <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><UserPlus size={16} /> Создать аккаунт</>}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200 dark:bg-slate-600" />
          <span className="text-xs text-gray-400">Или</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-slate-600" />
        </div>

        <button type="button" onClick={loginWithGoogleRedirect}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
          <GoogleIcon /> Продолжить с Google
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500 dark:text-slate-400">
        Уже есть аккаунт?{' '}
        <button type="button" onClick={onSwitch} className="font-semibold text-primary-500 hover:text-primary-600 transition">Войти</button>
      </p>
    </div>
  );
}

/* ─── Background grid pattern for the dark area ─── */
function BackgroundPattern() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Dotted grid */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid-dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#94a3b8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-dots)" />
      </svg>

      {/* Subtle radial glows */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-orange-400/[0.10] blur-[120px]" />
      <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-neutral-950/[0.08] blur-[120px]" />
      <motion.div
        animate={{ opacity: [0.03, 0.07, 0.03] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-300/12 blur-[80px]" />
    </div>
  );
}

/* ─── MAIN: AuthPage with animated panel swap ─── */
export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(location.pathname === '/register');

  // Sync URL <> state
  useEffect(() => {
    setIsRegister(location.pathname === '/register');
  }, [location.pathname]);

  const switchTo = (register) => {
    setIsRegister(register);
    navigate(register ? '/register' : '/login', { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#fff8ef] via-white to-[#fff1df] p-3 sm:p-4">
      <BackgroundPattern />

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex w-full max-w-[960px] overflow-hidden rounded-3xl border-2 border-slate-900"
        style={{ minHeight: 'min(700px, 90vh)', boxShadow: '0 8px 0 #0f172a' }}
      >
        {/* ── DESKTOP: animated panel swap ── */}
        <div className="hidden lg:flex lg:w-full">
          {/* Blue panel — slides left/right */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ order: isRegister ? 2 : 1 }}
            className="w-[44%] flex-shrink-0"
          >
            <AccentPanel isRegister={isRegister} />
          </motion.div>

          {/* White form panel */}
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ order: isRegister ? 1 : 2 }}
            className="flex flex-1 flex-col bg-white dark:bg-slate-800"
          >
            <div className="flex-1 overflow-y-auto px-8 py-8 lg:px-10 lg:py-10 custom-scrollbar">
              <AnimatePresence mode="wait">
                {isRegister ? (
                  <motion.div key="register" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.3 }}>
                    <RegisterForm onSwitch={() => switchTo(false)} />
                  </motion.div>
                ) : (
                  <motion.div key="login" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                    <LoginForm onSwitch={() => switchTo(true)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* ── MOBILE: single column ── */}
        <div className="flex w-full flex-col lg:hidden">
          {/* Compact accent header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary-500 via-orange-500 to-neutral-950 px-6 py-8">
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-300/30" />
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -left-6 bottom-0 h-28 w-28 rounded-full bg-amber-200/25" />

            <div className="relative z-10">
            <div className="mb-4 flex items-center gap-2">
                <BrandLogo size={28} showWordmark wordmarkClassName="text-base text-white/90" />
              </div>
              <h2 className="text-xl font-bold italic text-white">WELCOME</h2>
              <p className="mt-1 text-sm text-white/70">
                {isRegister ? 'Создайте аккаунт' : 'Войдите в учётную запись'}
              </p>
            </div>
          </div>

          {/* Mobile form */}
          <div className="flex-1 overflow-y-auto bg-white px-5 py-6 dark:bg-slate-800">
            <AnimatePresence mode="wait">
              {isRegister ? (
                <motion.div key="register-m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <RegisterForm onSwitch={() => switchTo(false)} />
                </motion.div>
              ) : (
                <motion.div key="login-m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <LoginForm onSwitch={() => switchTo(true)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

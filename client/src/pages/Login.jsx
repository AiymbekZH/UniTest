import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, RefreshCw } from 'lucide-react';
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

/* ─── Animated left panel with spheres (SVG) ─── */
function LeftPanel() {
  return (
    <div className="relative hidden overflow-hidden rounded-l-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-10 lg:flex lg:w-[46%] lg:flex-col lg:justify-between">
      {/* Animated spheres */}
      <motion.div
        animate={{ y: [0, -14, 0], x: [0, 6, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-blue-400/40"
      />
      <motion.div
        animate={{ y: [0, 12, 0], x: [0, -8, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-blue-300/30"
      />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute left-1/3 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-blue-400/25"
      />
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute right-8 bottom-12 h-24 w-24 rounded-full bg-white/10"
      />

      {/* Decorative SVG lines */}
      <svg className="absolute inset-0 h-full w-full opacity-10" viewBox="0 0 400 500">
        <motion.path d="M0 250 Q100 200 200 300 T400 250" fill="none" stroke="white" strokeWidth="1.5"
          initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.path d="M0 350 Q150 280 250 380 T400 320" fill="none" stroke="white" strokeWidth="1"
          initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }} />
      </svg>

      {/* Content */}
      <div className="relative z-10">
        {/* Logo */}
        <div className="mb-12 flex items-center gap-2">
          <svg width="32" height="32" viewBox="0 0 72 72" fill="none">
            <rect x="6" y="6" width="60" height="60" rx="16" fill="rgba(255,255,255,0.2)" />
            <path d="M22 24L34 46L41 35L50 49" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-lg font-bold text-white/90">UniTest</span>
        </div>
      </div>

      <div className="relative z-10">
        <h2 className="text-3xl font-bold italic text-white leading-tight">
          WELCOME
        </h2>
        <p className="mt-1 text-lg font-semibold text-white/80">
          Платформа тестирования
        </p>
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
          Создавайте тесты с AI, проходите и анализируйте результаты. Быстрый вход через Google или email.
        </p>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function Login() {
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
    try {
      await login(email, password);
      toast.success('Вход выполнен');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка входа');
      resetCaptcha();
    } finally { setLoading(false); }
  };

  const quickLogin = async id => {
    setSwitchingId(id);
    try { await switchAccount(id); window.location.assign('/dashboard'); }
    catch (err) { toast.error(err.response?.data?.message || 'Не удалось'); }
    finally { setSwitchingId(''); }
  };

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pl-11 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-500 dark:focus:ring-blue-900/30';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1623] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex w-full max-w-[920px] overflow-hidden rounded-3xl shadow-2xl shadow-black/40"
      >
        {/* Left — blue panel */}
        <LeftPanel />

        {/* Right — white form */}
        <div className="flex flex-1 flex-col justify-center bg-white px-8 py-10 dark:bg-slate-800 sm:px-12 lg:rounded-r-3xl lg:rounded-l-none rounded-3xl lg:rounded-none">
          {/* Mobile logo */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <svg width="28" height="28" viewBox="0 0 72 72" fill="none">
              <rect x="6" y="6" width="60" height="60" rx="16" fill="#3b82f6" />
              <path d="M22 24L34 46L41 35L50 49" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-lg font-bold text-gray-800 dark:text-white">UniTest</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Вход</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Войдите в свою учётную запись UniTest</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {/* Email */}
            <div className="relative">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
              <input type="email" className={inputCls} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>

            {/* Password */}
            <div className="relative">
              <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input type={showPw ? 'text' : 'password'} className={`${inputCls} pr-20`} placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wide text-blue-500 hover:text-blue-600 transition">
                {showPw ? 'Скрыть' : 'Показать'}
              </button>
            </div>

            {/* Forgot */}
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs font-medium text-blue-500 hover:text-blue-600 transition">
                Забыли пароль?
              </Link>
            </div>

            {/* Captcha */}
            <SliderCaptcha onVerify={setCaptchaOk} resetKey={captchaKey} />

            {/* Submit */}
            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><LogIn size={16} /> Войти</>}
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
              Войти через Google
            </button>
          </form>

          {/* Saved sessions */}
          {savedSessions?.length > 0 && (
            <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-slate-400">Быстрый вход</p>
              <div className="space-y-2">
                {savedSessions.map(s => (
                  <button key={s.id} type="button" onClick={() => quickLogin(s.id)} disabled={switchingId === s.id}
                    className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition hover:border-blue-300 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:hover:border-blue-500">
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                      {s.user?.avatar ? <img src={s.user.avatar} alt="" className="h-full w-full object-cover" /> : <>{s.user?.firstName?.[0]}{s.user?.lastName?.[0]}</>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-white">{s.user?.firstName} {s.user?.lastName}</p>
                      <p className="truncate text-xs text-gray-400">{s.user?.email}</p>
                    </div>
                    {switchingId === s.id ? <div className="h-4 w-4 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" /> : <RefreshCw size={14} className="text-gray-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-slate-400">
            Нет аккаунта?{' '}
            <Link to="/register" className="font-semibold text-blue-500 hover:text-blue-600 transition">Зарегистрироваться</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

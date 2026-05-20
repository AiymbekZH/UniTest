import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Eye, EyeOff, LogIn, UserPlus, UserRound, Users,
  RefreshCw, Mail, Shield, ArrowLeft, CheckCircle2,
  ArrowRight, Sparkles, KeyRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import SliderCaptcha from '../components/SliderCaptcha';

/* ───────── Google SVG ───────── */
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

/* ───────── Chunky paper input ───────── */
const chunkyInput =
  'w-full rounded-2xl border-[3px] border-slate-900 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-shadow placeholder:font-medium placeholder:text-slate-400 focus:translate-y-0.5 focus:[box-shadow:0_3px_0_#0f172a] dark:border-white/80 dark:bg-slate-900 dark:text-white';
const chunkyInputShadow = { boxShadow: '0 4px 0 #0f172a' };

/* ───────── Left brand panel — paper preset, chunky illustration ───────── */
function BrandPanel({ mode }) {
  const reduced = useReducedMotion();
  const driftA = reduced ? {} : { x: [0, 6, 0], y: [0, -5, 0] };
  const driftB = reduced ? {} : { x: [0, -5, 0], y: [0, 7, 0] };
  const driftC = reduced ? {} : { rotate: [0, 8, 0], y: [0, -4, 0] };

  const heading = mode === 'register'
    ? 'Создайте аккаунт за минуту'
    : mode === 'verify'
      ? 'Почти готово'
      : mode === 'forgot'
        ? 'Сбросим пароль'
        : 'С возвращением!';

  const sub = mode === 'register'
    ? 'Регистрируйтесь, проходите тесты, создавайте свои и поднимайтесь в рейтинге.'
    : mode === 'verify'
      ? 'Введите 6-значный код, который мы отправили вам на email.'
      : mode === 'forgot'
        ? 'Мы пришлём ссылку для восстановления пароля.'
        : 'Войдите в аккаунт и продолжите там, где остановились.';

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-[#FFF8EE] p-8 lg:p-10">
      {/* Paper grain */}
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(15,23,42,0.5) 1px, transparent 1px)',
          backgroundSize: '22px 22px'
        }}
      />

      {/* Chunky decor: outline circle, top-right */}
      <motion.div
        className="absolute right-[-2.5rem] top-[-2.5rem] h-44 w-44 rounded-full border-[6px] border-amber-500/55"
        style={{ boxShadow: '0 8px 0 rgba(146, 64, 14, 0.18)' }}
        animate={driftA}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Chunky decor: filled square, bottom-left */}
      <motion.div
        className="absolute -left-8 -bottom-10 h-32 w-32 rotate-12 rounded-2xl border-[5px] border-slate-900 bg-amber-200"
        style={{ boxShadow: '0 8px 0 rgba(15, 23, 42, 0.45)' }}
        animate={driftB}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Chunky decor: star */}
      <motion.svg
        className="absolute right-[20%] bottom-[18%] h-14 w-14"
        viewBox="0 0 100 100"
        animate={driftC}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M50 4 L60 38 L96 40 L66 60 L78 96 L50 76 L22 96 L34 60 L4 40 L40 38 Z"
          fill="rgba(245, 158, 11, 0.9)"
          stroke="rgba(15, 23, 42, 0.85)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </motion.svg>

      {/* Top: brand */}
      <div className="relative z-10 flex items-center gap-2.5">
        <BrandLogo size={36} />
        <span className="text-xl font-black tracking-tight text-slate-900">UniTest</span>
      </div>

      {/* Middle: heading + sub */}
      <div className="relative z-10 max-w-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border-[3px] border-slate-900 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-900 [box-shadow:0_3px_0_#0f172a]">
              <Sparkles size={12} strokeWidth={2.6} />
              UniTest
            </p>
            <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-4xl">
              {heading}
            </h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-700">{sub}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom: pillars */}
      <div className="relative z-10 grid grid-cols-3 gap-2">
        {[
          { icon: Sparkles, label: 'AI вопросы' },
          { icon: Shield, label: 'Анти-чит' },
          { icon: Users, label: 'Группы' }
        ].map((p) => (
          <div
            key={p.label}
            className="rounded-2xl border-[3px] border-slate-900 bg-white px-3 py-3 text-center [box-shadow:0_4px_0_#0f172a]"
          >
            <p.icon size={16} className="mx-auto mb-1 text-amber-700" strokeWidth={2.6} />
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">{p.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── Password strength meter ───────── */
function passwordStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(score, 4);
}
function PasswordMeter({ pw }) {
  const score = passwordStrength(pw);
  const colors = ['bg-slate-200', 'bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];
  const labels = ['', 'Слабый', 'Средний', 'Хороший', 'Отличный'];
  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? colors[score] : 'bg-slate-200 dark:bg-slate-700'}`}
          />
        ))}
      </div>
      {pw && (
        <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {labels[score]}
        </p>
      )}
    </div>
  );
}

/* ───────── 6-cell code input ───────── */
function CodeInput({ value, onChange, disabled, autoSubmit }) {
  const refs = useRef([]);
  const digits = value.padEnd(6, ' ').split('').slice(0, 6);

  const setDigit = (i, ch) => {
    const next = (value.padEnd(6, ' ').slice(0, 6)).split('');
    next[i] = ch;
    const merged = next.join('').replace(/\s/g, '');
    onChange(merged);
    if (ch && i < 5) refs.current[i + 1]?.focus();
    if (merged.length === 6 && autoSubmit) autoSubmit(merged);
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i].trim() && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < 5) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      e.preventDefault();
      onChange(pasted);
      if (pasted.length === 6 && autoSubmit) autoSubmit(pasted);
      else refs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={d.trim()}
          onChange={e => {
            const ch = e.target.value.replace(/\D/g, '').slice(0, 1);
            setDigit(i, ch);
          }}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          className="h-14 w-11 rounded-2xl border-[3px] border-slate-900 bg-white text-center font-mono text-2xl font-black text-slate-900 outline-none transition-shadow [box-shadow:0_4px_0_#0f172a] focus:translate-y-0.5 focus:[box-shadow:0_2px_0_#0f172a] disabled:opacity-50 dark:border-white/80 dark:bg-slate-900 dark:text-white sm:h-16 sm:w-12 sm:text-3xl"
        />
      ))}
    </div>
  );
}

/* ───────── LOGIN form ───────── */
function LoginForm({ onSwitchRegister, onNeedsVerification }) {
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
      const status = err?.response?.status;
      const data = err?.response?.data || {};
      if (status === 403 && data.requiresVerification) {
        toast('Подтвердите email', { icon: '✉️' });
        onNeedsVerification?.(data.email || email);
        return;
      }
      toast.error(data.message || 'Ошибка входа');
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async id => {
    setSwitchingId(id);
    try {
      await switchAccount(id);
      window.location.assign('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Не удалось');
    } finally {
      setSwitchingId('');
    }
  };

  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Вход</h1>
      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Войдите в учётную запись UniTest</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2.4} />
            <input
              type="email"
              className={`${chunkyInput} pl-11`}
              style={chunkyInputShadow}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Пароль</label>
            <Link to="/forgot-password" className="text-xs font-black text-primary-600 hover:text-primary-700 dark:text-primary-400">
              Забыли?
            </Link>
          </div>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2.4} />
            <input
              type={showPw ? 'text' : 'password'}
              className={`${chunkyInput} pl-11 pr-12`}
              style={chunkyInputShadow}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <SliderCaptcha onVerify={setCaptchaOk} resetKey={captchaKey} />

        <button
          type="submit"
          disabled={loading}
          className="chunky-btn-primary w-full justify-center py-3 text-sm"
        >
          {loading
            ? <div className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            : <><LogIn size={16} strokeWidth={2.6} /> Войти</>}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">или</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <button
          type="button"
          onClick={loginWithGoogleRedirect}
          className="chunky-btn-ghost w-full justify-center gap-2.5 py-3 text-sm"
        >
          <GoogleIcon /> Войти через Google
        </button>
      </form>

      {savedSessions?.length > 0 && (
        <div className="mt-5 rounded-2xl border-[3px] border-slate-900 bg-amber-50 p-3 [box-shadow:0_4px_0_#0f172a] dark:border-white/70 dark:bg-slate-800">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
            Быстрый вход
          </p>
          <div className="space-y-1.5">
            {savedSessions.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => quickLogin(s.id)}
                disabled={switchingId === s.id}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-left transition-transform hover:translate-y-px disabled:opacity-50 dark:border-white/60 dark:bg-slate-900"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-slate-900 bg-amber-200 text-xs font-black text-slate-900 dark:border-white/60">
                  {s.user?.avatar
                    ? <img src={s.user.avatar} alt="" className="h-full w-full object-cover" />
                    : <>{s.user?.firstName?.[0]}{s.user?.lastName?.[0]}</>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {s.user?.firstName} {s.user?.lastName}
                  </p>
                  <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{s.user?.email}</p>
                </div>
                {switchingId === s.id
                  ? <div className="h-4 w-4 rounded-full border-2 border-primary-300 border-t-primary-600 animate-spin" />
                  : <RefreshCw size={14} className="text-slate-400" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
        Нет аккаунта?{' '}
        <button type="button" onClick={onSwitchRegister} className="font-black text-primary-600 hover:text-primary-700 dark:text-primary-400">
          Зарегистрироваться
        </button>
      </p>
    </div>
  );
}

/* ───────── REGISTER form (single step before verify) ───────── */
function RegisterForm({ onSwitchLogin, onCodeSent }) {
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
      const data = await register(payload);
      // Сервер всегда возвращает requiresVerification=true для новых аккаунтов.
      if (data?.requiresVerification) {
        toast.success('Код отправлен на email');
        onCodeSent(data.email || form.email);
      } else if (data?.token) {
        // На случай старого поведения сервера — fallback.
        window.location.assign('/dashboard');
      }
    } catch (err) {
      const data = err?.response?.data || {};
      if (data.requiresVerification) {
        // Аккаунт уже существует и не подтверждён — переключаемся на verify.
        toast('Код отправлен повторно', { icon: '✉️' });
        onCodeSent(data.email || form.email);
        return;
      }
      toast.error(data.message || 'Ошибка регистрации');
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Создать аккаунт</h1>
      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Присоединяйтесь к UniTest за минуту</p>

      <div
        className="mt-5 grid grid-cols-2 gap-1 rounded-2xl border-[3px] border-slate-900 bg-amber-50 p-1 [box-shadow:0_4px_0_#0f172a] dark:border-white/70 dark:bg-slate-800"
      >
        {[
          { value: 'student', label: 'Студент', icon: UserRound },
          { value: 'teacher', label: 'Преподаватель', icon: Users }
        ].map(r => (
          <button
            key={r.value}
            type="button"
            onClick={() => set('role', r.value)}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black transition ${
              form.role === r.value
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-700/60'
            }`}
          >
            <r.icon size={15} strokeWidth={2.6} /> {r.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Фамилия</label>
            <input className={chunkyInput} style={chunkyInputShadow} placeholder="Иванов" value={form.lastName} onChange={e => set('lastName', e.target.value)} autoComplete="family-name" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Имя</label>
            <input className={chunkyInput} style={chunkyInputShadow} placeholder="Иван" value={form.firstName} onChange={e => set('firstName', e.target.value)} autoComplete="given-name" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2.4} />
            <input
              type="email"
              className={`${chunkyInput} pl-11`}
              style={chunkyInputShadow}
              placeholder="you@example.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              autoComplete="email"
            />
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            На этот email мы отправим 6-значный код подтверждения.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Пароль</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className={`${chunkyInput} pr-10`}
                style={chunkyInputShadow}
                placeholder="Мин. 6 символов"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" tabIndex={-1}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordMeter pw={form.password} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Подтвердите</label>
            <div className="relative">
              <input
                type={showCpw ? 'text' : 'password'}
                className={`${chunkyInput} pr-10`}
                style={chunkyInputShadow}
                placeholder="Повторите"
                value={form.confirmPassword}
                onChange={e => set('confirmPassword', e.target.value)}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowCpw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" tabIndex={-1}>
                {showCpw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.confirmPassword && form.password && (
              <p className={`mt-1.5 text-[11px] font-bold ${form.password === form.confirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {form.password === form.confirmPassword ? '✓ Пароли совпадают' : '✗ Пароли не совпадают'}
              </p>
            )}
          </div>
        </div>

        <SliderCaptcha onVerify={setCaptchaOk} resetKey={captchaKey} />

        <button type="submit" disabled={loading} className="chunky-btn-primary w-full justify-center py-3 text-sm">
          {loading
            ? <div className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            : <><UserPlus size={16} strokeWidth={2.6} /> Создать аккаунт</>}
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">или</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>

        <button type="button" onClick={loginWithGoogleRedirect} className="chunky-btn-ghost w-full justify-center gap-2.5 py-3 text-sm">
          <GoogleIcon /> Продолжить с Google
        </button>
      </form>

      <p className="mt-5 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
        Уже есть аккаунт?{' '}
        <button type="button" onClick={onSwitchLogin} className="font-black text-primary-600 hover:text-primary-700 dark:text-primary-400">
          Войти
        </button>
      </p>
    </div>
  );
}

/* ───────── VERIFY form ───────── */
function VerifyForm({ email, onBack, onSwitchLogin }) {
  const { verifyEmail, resendVerificationCode } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const submittedRef = useRef('');

  // Countdown for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Initial cooldown — server enforces 60s, mirror it client-side.
  useEffect(() => {
    setCooldown(60);
  }, []);

  const submit = async (codeStr) => {
    if (loading) return;
    if (!codeStr || codeStr.length !== 6) return;
    if (submittedRef.current === codeStr) return; // защита от дубль-сабмитов
    submittedRef.current = codeStr;
    setLoading(true);
    try {
      const data = await verifyEmail(email, codeStr);
      if (data?.token) {
        toast.success('Email подтверждён!');
        navigate('/dashboard');
      } else {
        toast.error('Не удалось подтвердить');
        submittedRef.current = '';
      }
    } catch (err) {
      const d = err?.response?.data || {};
      toast.error(d.message || 'Неверный код');
      if (d.expired) {
        // Дать ввести заново
        setCode('');
      }
      submittedRef.current = '';
    } finally {
      setLoading(false);
    }
  };

  const onChange = (next) => {
    setCode(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submit(code);
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      await resendVerificationCode(email);
      toast.success('Новый код отправлен');
      setCooldown(60);
      setCode('');
      submittedRef.current = '';
    } catch (err) {
      const d = err?.response?.data || {};
      if (d.cooldownSec) setCooldown(d.cooldownSec);
      toast.error(d.message || 'Не удалось отправить');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-[11px] font-black text-slate-700 transition-transform hover:translate-y-px dark:border-white/70 dark:bg-slate-900 dark:text-slate-200"
      >
        <ArrowLeft size={12} strokeWidth={2.6} /> Назад
      </button>

      <div className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border-[3px] border-slate-900 bg-amber-300 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-900 [box-shadow:0_3px_0_#0f172a]">
        <Mail size={12} strokeWidth={2.6} /> Шаг 2 из 2
      </div>

      <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Подтвердите email</h1>
      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
        Мы отправили 6-значный код на{' '}
        <span className="font-black text-slate-900 dark:text-white">{email}</span>
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <CodeInput value={code} onChange={onChange} disabled={loading} autoSubmit={submit} />

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="chunky-btn-primary w-full justify-center py-3 text-sm"
        >
          {loading
            ? <div className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            : <><CheckCircle2 size={16} strokeWidth={2.6} /> Подтвердить</>}
        </button>

        <div className="rounded-2xl border-[3px] border-slate-900 bg-white p-4 [box-shadow:0_4px_0_#0f172a] dark:border-white/70 dark:bg-slate-900">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Не получили письмо? Проверьте папку «Спам».
          </p>
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0 || resending}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-black text-primary-600 transition hover:text-primary-700 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-primary-400"
          >
            <RefreshCw size={14} strokeWidth={2.6} className={resending ? 'animate-spin' : ''} />
            {cooldown > 0 ? `Отправить ещё раз (${cooldown}с)` : 'Отправить ещё раз'}
          </button>
        </div>
      </form>

      <p className="mt-5 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
        Не тот email?{' '}
        <button type="button" onClick={onBack} className="font-black text-primary-600 hover:text-primary-700 dark:text-primary-400">
          Изменить
        </button>{' '}
        ·{' '}
        <button type="button" onClick={onSwitchLogin} className="font-black text-primary-600 hover:text-primary-700 dark:text-primary-400">
          Войти
        </button>
      </p>
    </div>
  );
}

/* ───────── MAIN ───────── */
export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Mode is one of: 'login' | 'register' | 'verify'.
  // Verify is intermediate — kicked into when register or login returns
  // requiresVerification.
  const [mode, setMode] = useState(location.pathname === '/register' ? 'register' : 'login');
  const [verifyEmail, setVerifyEmail] = useState('');

  useEffect(() => {
    if (location.pathname === '/register') setMode(prev => (prev === 'verify' ? prev : 'register'));
    else setMode(prev => (prev === 'verify' ? prev : 'login'));
  }, [location.pathname]);

  const switchMode = (next) => {
    setMode(next);
    if (next === 'register') navigate('/register', { replace: true });
    else if (next === 'login') navigate('/login', { replace: true });
  };

  const goVerify = (email) => {
    setVerifyEmail(email);
    setMode('verify');
  };

  // Brand panel sits on the right for register, left for login —
  // mirrors classic split layout and adds visual distinction.
  const brandSide = mode === 'register' ? 'right' : 'left';

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#FFF8EE] p-4">
      {/* Subtle paper grain on the page bg */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(15,23,42,0.6) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 grid w-full max-w-[1080px] overflow-hidden rounded-3xl border-[3px] border-slate-900 bg-white dark:border-white/80 dark:bg-slate-900 lg:grid-cols-[44%_56%]"
        style={{ minHeight: 'min(640px, 92vh)', boxShadow: '0 8px 0 #0f172a' }}
      >
        {/* Brand panel — desktop only on chosen side */}
        <div className={`hidden lg:block ${brandSide === 'right' ? 'order-2' : 'order-1'}`}>
          <BrandPanel mode={mode} />
        </div>

        {/* Form panel */}
        <div className={`relative bg-white dark:bg-slate-900 ${brandSide === 'right' ? 'lg:order-1' : 'lg:order-2'}`}>
          {/* Mobile header (compact) */}
          <div className="relative overflow-hidden border-b-[3px] border-slate-900 bg-[#FFF8EE] px-5 py-5 dark:border-white/70 lg:hidden">
            <div
              className="absolute inset-0 opacity-[0.10]"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(15,23,42,0.5) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            />
            <div className="relative flex items-center gap-2.5">
              <BrandLogo size={28} />
              <span className="text-base font-black tracking-tight text-slate-900">UniTest</span>
            </div>
          </div>

          <div className="px-6 py-7 sm:px-9 sm:py-9 lg:px-10 lg:py-10">
            <AnimatePresence mode="wait">
              {mode === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <LoginForm
                    onSwitchRegister={() => switchMode('register')}
                    onNeedsVerification={goVerify}
                  />
                </motion.div>
              )}
              {mode === 'register' && (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <RegisterForm
                    onSwitchLogin={() => switchMode('login')}
                    onCodeSent={goVerify}
                  />
                </motion.div>
              )}
              {mode === 'verify' && (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.25 }}
                >
                  <VerifyForm
                    email={verifyEmail}
                    onBack={() => switchMode('register')}
                    onSwitchLogin={() => switchMode('login')}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

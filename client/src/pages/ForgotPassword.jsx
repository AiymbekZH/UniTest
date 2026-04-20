import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import SliderCaptcha from '../components/SliderCaptcha';

function LeftPanel() {
  return (
    <div className="relative hidden overflow-hidden rounded-l-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-10 lg:flex lg:w-[46%] lg:flex-col lg:justify-between">
      <motion.div animate={{ y: [0, -14, 0], x: [0, 6, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-blue-400/40" />
      <motion.div animate={{ y: [0, 12, 0], x: [0, -8, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-blue-300/30" />
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute left-1/3 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-blue-400/25" />

      <div className="relative z-10">
        <div className="mb-12 flex items-center gap-2">
          <BrandLogo size={32} showWordmark wordmarkClassName="text-lg text-white/90" />
        </div>
      </div>

      <div className="relative z-10">
        <h2 className="text-3xl font-bold italic text-white">RECOVERY</h2>
        <p className="mt-1 text-lg font-semibold text-white/80">Восстановление доступа</p>
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
          Введите email, привязанный к аккаунту. Мы отправим ссылку для сброса пароля.
        </p>
      </div>
    </div>
  );
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaOk, setCaptchaOk] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);
  const { forgotPassword } = useAuth();

  const resetCaptcha = () => { setCaptchaOk(false); setCaptchaKey(k => k + 1); };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!email) return toast.error('Введите email');
    if (!captchaOk) return toast.error('Пройдите проверку');
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      toast.success(res.message || 'Проверьте почту');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Ошибка отправки');
      resetCaptcha();
    } finally { setLoading(false); }
  };

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-500 dark:focus:ring-blue-900/30';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex w-full max-w-[920px] overflow-hidden rounded-3xl shadow-2xl shadow-black/10">
        <LeftPanel />

        <div className="flex flex-1 flex-col justify-center bg-white px-8 py-10 dark:bg-slate-800 sm:px-12 lg:rounded-r-3xl lg:rounded-l-none rounded-3xl lg:rounded-none">
          <div className="mb-5 flex items-center gap-2 lg:hidden">
            <BrandLogo size={28} showWordmark wordmarkClassName="text-lg text-gray-800 dark:text-white" />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Восстановление пароля</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Введите email для получения ссылки сброса</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Email</label>
              <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" />
            </div>

            <SliderCaptcha onVerify={setCaptchaOk} resetKey={captchaKey} />

            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Отправить ссылку'}
            </motion.button>
          </form>

          <Link to="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-500 transition dark:text-slate-400">
            <ArrowLeft size={14} /> Назад ко входу
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

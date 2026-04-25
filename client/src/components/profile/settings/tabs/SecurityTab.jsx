import { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import SectionHeader from '../SectionHeader';

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type={show ? 'text' : 'password'}
        className="input-field pl-9 pr-10 text-sm"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

export default function SecurityTab({
  copy, t, roleLabel,
  currentPassword, setCurrentPassword,
  newPassword, setNewPassword,
  confirmPassword, setConfirmPassword,
  onChangePassword
}) {
  const strength = (() => {
    if (!newPassword) return { level: 0, label: '', tone: 'slate' };
    const len = newPassword.length;
    const hasNum = /\d/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
    const score = (len >= 8 ? 1 : 0) + (len >= 12 ? 1 : 0) + (hasNum ? 1 : 0) + (hasUpper ? 1 : 0) + (hasSymbol ? 1 : 0);
    if (score <= 1) return { level: 1, label: 'Слабый', tone: 'red' };
    if (score <= 3) return { level: 2, label: 'Средний', tone: 'amber' };
    return { level: 3, label: 'Надёжный', tone: 'emerald' };
  })();

  const toneClass = {
    red:     'bg-red-500',
    amber:   'bg-amber-500',
    emerald: 'bg-emerald-500',
    slate:   'bg-slate-200 dark:bg-slate-700'
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy.tabSecurity}
        title={copy.securityHeadline}
        subtitle={copy.securitySubtitle}
      />

      {/* Role / account info */}
      <section className="chunky-card p-3 sm:p-5 lg:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Account role</p>
            <p className="mt-1 text-sm font-black text-dark">{roleLabel}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Роль назначается администратором. Для расширения прав обратись к владельцу платформы.
            </p>
          </div>
        </div>
      </section>

      {/* Password change */}
      <section className="chunky-card p-3 sm:p-5 lg:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('changePassword')}</p>
            <h3 className="mt-1 text-lg font-black text-dark">{t('changePassword')}</h3>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-slate-400">{t('currentPassword')}</span>
            <PasswordInput value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-slate-400">{t('newPassword')}</span>
            <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            {newPassword ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex min-w-[120px] flex-1 gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${i <= strength.level ? toneClass[strength.tone] : 'bg-slate-200 dark:bg-slate-700'}`}
                    />
                  ))}
                </div>
                <span className={`text-[11px] font-black ${
                  strength.tone === 'red' ? 'text-red-500' :
                  strength.tone === 'amber' ? 'text-amber-500' :
                  strength.tone === 'emerald' ? 'text-emerald-500' : 'text-slate-400'
                }`}>
                  {strength.label}
                </span>
              </div>
            ) : null}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-slate-400">{t('repeatNewPassword')}</span>
            <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            {confirmPassword && confirmPassword !== newPassword ? (
              <p className="mt-1.5 text-[11px] font-semibold text-red-500">{t('passwordsMismatch')}</p>
            ) : null}
          </label>
        </div>

        <button
          type="button"
          onClick={onChangePassword}
          className="chunky-btn-primary inline-flex items-center gap-2 text-xs"
        >
          <Lock size={14} />
          {t('changePassword')}
        </button>
      </section>
    </div>
  );
}

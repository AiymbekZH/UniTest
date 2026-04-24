import { Save, Copy, Check, AtSign } from 'lucide-react';
import SectionHeader from '../SectionHeader';

export default function AccountTab({
  copy, t, profileUser,
  username, setUsername, usernameStatus,
  firstName, setFirstName,
  lastName, setLastName,
  middleName, setMiddleName,
  headline, setHeadline,
  bio, setBio,
  saving, onSave,
  copiedId, onCopyId
}) {
  const statusTone = {
    available: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/25 dark:text-emerald-300',
    taken:     'bg-red-50 text-red-600 dark:bg-red-900/25 dark:text-red-300',
    invalid:   'bg-red-50 text-red-600 dark:bg-red-900/25 dark:text-red-300',
    checking:  'bg-amber-50 text-amber-600 dark:bg-amber-900/25 dark:text-amber-300',
    idle:      'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy.tabAccount}
        title={copy.accountHeadline}
        subtitle={copy.accountSubtitle}
        action={
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="chunky-btn-primary hidden lg:inline-flex items-center gap-2 text-xs"
          >
            <Save size={14} />
            {saving ? '...' : copy.saveProfile}
          </button>
        }
      />

      {/* Identity card */}
      <section className="chunky-card p-5 sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{copy.uniqueId}</p>
        <div className="mt-2 flex items-center gap-3">
          <p className="font-mono text-base font-black tracking-tight text-dark">
            {profileUser?.uniqueId || 'N/A'}
          </p>
          <button
            type="button"
            onClick={onCopyId}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-white px-3 py-1.5 text-[11px] font-black text-slate-900 active:translate-y-[2px] dark:border-white dark:bg-slate-900 dark:text-white"
            style={{ boxShadow: '0 3px 0 #0f172a' }}
          >
            {copiedId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copiedId ? copy.idCopied : copy.copyId}
          </button>
        </div>
      </section>

      {/* Username */}
      <section className="chunky-card p-5 sm:p-6 space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">@username</label>
            {usernameStatus.state !== 'idle' ? (
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${statusTone[usernameStatus.state] || statusTone.idle}`}>
                {usernameStatus.message}
              </span>
            ) : null}
          </div>
          <div className="relative">
            <AtSign size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
            <input
              className="input-field pl-9 text-sm"
              value={username}
              placeholder="your_handle"
              maxLength={20}
              onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">3–20 символов: буквы, цифры, _</p>
        </div>
      </section>

      {/* Name fields */}
      <section className="chunky-card p-5 sm:p-6 space-y-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
          {t('firstName')} · {t('lastName')}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-slate-400">{t('firstName')}</span>
            <input className="input-field text-sm" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-slate-400">{t('lastName')}</span>
            <input className="input-field text-sm" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-slate-400">{t('middleName')}</span>
            <input className="input-field text-sm" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
          </label>
        </div>
      </section>

      {/* Headline & bio */}
      <section className="chunky-card p-5 sm:p-6 space-y-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{copy.about}</p>
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
            <span>{copy.headline}</span>
            <span className="font-mono text-[10px] text-slate-400">{headline.length}/120</span>
          </span>
          <input
            className="input-field text-sm"
            value={headline}
            maxLength={120}
            placeholder={copy.headlinePlaceholder}
            onChange={(e) => setHeadline(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
            <span>{copy.bio}</span>
            <span className="font-mono text-[10px] text-slate-400">{bio.length}/400</span>
          </span>
          <textarea
            className="input-field min-h-[140px] resize-y py-3 text-sm"
            value={bio}
            maxLength={400}
            placeholder={copy.bioPlaceholder}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>
      </section>

      {/* Sticky save footer (mobile only) */}
      <div
        className="lg:hidden sticky bottom-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <div className="chunky-card p-3">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="chunky-btn-primary inline-flex w-full items-center justify-center gap-2 text-sm"
          >
            <Save size={15} />
            {saving ? '...' : copy.saveProfile}
          </button>
        </div>
      </div>
    </div>
  );
}

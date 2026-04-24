import { Save, Check } from 'lucide-react';
import SectionHeader from '../SectionHeader';

const PRESET_BG = {
  aurora: 'bg-[linear-gradient(135deg,#fff7ed_0%,#fdba74_45%,#fb923c_100%)]',
  mesh:   'bg-[radial-gradient(circle_at_20%_20%,#fbbf24,transparent_50%),radial-gradient(circle_at_80%_30%,#f97316,transparent_50%),linear-gradient(135deg,#fffaf2,#fde68a)]',
  wave:   'bg-[linear-gradient(135deg,#fff7ed_0%,#ffedd5_35%,#fde68a_70%,#fffaf0_100%)]',
  grid:   'bg-[linear-gradient(135deg,#fffaf4,#ffedd5_50%,#fde68a)]'
};

const LANGUAGES = [
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'ru', label: 'Русский',  flag: '🇷🇺' },
  { code: 'kz', label: 'Қазақша',  flag: '🇰🇿' },
  { code: 'es', label: 'Español',  flag: '🇪🇸' }
];

export default function AppearanceTab({
  copy, t,
  coverPreset, setCoverPreset,
  preferredLanguage, setPreferredLanguage,
  saving, onSave
}) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy.tabAppearance}
        title={copy.appearanceHeadline}
        subtitle={copy.appearanceSubtitle}
        action={
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="chunky-btn-primary inline-flex items-center gap-2 text-xs"
          >
            <Save size={14} />
            {saving ? '...' : copy.saveProfile}
          </button>
        }
      />

      {/* Cover presets with live preview */}
      <section className="chunky-card p-5 sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{copy.choosePreset}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {['aurora', 'mesh', 'wave', 'grid'].map((preset) => {
            const isActive = coverPreset === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setCoverPreset(preset)}
                className={`group relative overflow-hidden rounded-2xl border-2 text-left transition ${
                  isActive
                    ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-900/40'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                }`}
              >
                <div className={`h-24 w-full ${PRESET_BG[preset] || PRESET_BG.aurora}`} />
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-sm font-black text-dark">{copy.presets[preset]}</span>
                  {isActive ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-white">
                      <Check size={14} />
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Language */}
      <section className="chunky-card p-5 sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('language')}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {LANGUAGES.map((item) => {
            const isActive = preferredLanguage === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setPreferredLanguage(item.code)}
                className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${
                  isActive
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/60'
                }`}
              >
                <span className="text-2xl leading-none">{item.flag}</span>
                <span className="flex-1 text-sm font-black text-dark">{item.label}</span>
                {isActive ? <Check size={16} className="text-primary-600" /> : null}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

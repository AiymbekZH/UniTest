import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Share2, QrCode, Shield } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

// Launch / share panel, top of the sidebar.
//
// Owns the "Start test" CTA, the practice-mode shortcut (when
// applicable), and a row of two secondary buttons (share / QR) that
// open modals via callbacks. We deliberately collapse the legacy
// "copy link + QR" pair into a single Share button so the share UX
// stays consistent across desktop / mobile (the ShareSheet modal
// then offers Copy / Telegram / WhatsApp / QR in one place).

export default function LaunchPanel({
  test,
  shareLink,
  canStart,
  attemptInfo,
  onOpenShare,
  onOpenQr,
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const startUrl = `/test/${shareLink}`;
  const practiceUrl = `/test/${shareLink}?practice=true`;

  // We surface a single Anti-cheat warning here and nowhere else in
  // the page, since the Hero already shows the badge. This collapses
  // the legacy double-warning that several users reported as noisy.
  const showAntiCheat = !!test.settings?.antiCheat?.blockTabSwitch;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="chunky-card p-5"
    >
      {showAntiCheat && (
        <div className="mb-4 rounded-2xl border-2 border-red-500 bg-red-50 p-3 text-xs dark:bg-red-900/20">
          <p className="mb-1 flex items-center gap-1.5 font-black uppercase tracking-wide text-red-600 dark:text-red-300">
            <Shield size={12} strokeWidth={2.6} /> Anti-cheat
          </p>
          <p className="font-medium text-red-600 dark:text-red-300">
            {t('tabSwitchBlocked')}: {test.settings.antiCheat.maxViolations}
          </p>
        </div>
      )}

      {/* Attempts used */}
      {attemptInfo.maxAttempts > 0 && (
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-wide">
            <span className="text-slate-500 dark:text-slate-400">{t('attempts')}</span>
            <span className="text-slate-900 dark:text-white">
              {attemptInfo.attempts} / {attemptInfo.maxAttempts}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full border-2 border-slate-900 dark:border-white">
            <div
              className="h-full bg-amber-400 transition-all"
              style={{
                width: `${Math.min(100, (attemptInfo.attempts / attemptInfo.maxAttempts) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {!canStart && (
        <div className="mb-4 rounded-2xl border-2 border-red-500 bg-red-50 p-3 text-center dark:bg-red-900/20">
          <p className="text-sm font-black text-red-600 dark:text-red-300">
            {t('allAttemptsUsed')}
          </p>
        </div>
      )}

      {/* Primary CTA */}
      <button
        type="button"
        onClick={() => navigate(startUrl)}
        disabled={!canStart}
        className="chunky-btn-primary flex w-full items-center justify-center gap-2 py-4 text-base"
      >
        <Play size={18} strokeWidth={2.6} />
        {t('startTest')}
      </button>

      {/* Share row */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onOpenShare}
          className="chunky-btn-ghost flex-1 !py-2.5 text-[13px]"
        >
          <Share2 size={14} strokeWidth={2.6} className="flex-shrink-0" />
          <span className="truncate">{t('shareTest')}</span>
        </button>
        <button
          type="button"
          onClick={onOpenQr}
          className="chunky-btn-ghost flex-shrink-0 !py-2.5 !px-4 text-[13px]"
          aria-label={t('qrCodeTitle')}
          title={t('qrCodeTitle')}
        >
          <QrCode size={14} strokeWidth={2.6} />
        </button>
      </div>

      {/* Practice mode */}
      {test.settings?.practiceMode && (
        <button
          type="button"
          onClick={() => navigate(practiceUrl)}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 bg-emerald-50 px-3 py-2.5 text-[13px] font-bold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
        >
          <Play size={14} strokeWidth={2.6} /> {t('practiceModeLabel') || t('startPractice')}
        </button>
      )}
    </motion.section>
  );
}

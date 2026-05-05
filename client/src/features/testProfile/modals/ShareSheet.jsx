import { Copy, QrCode, Send, MessageCircle, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../../context/LanguageContext';
import { useShareLink } from '../hooks/useShareLink';
import ChunkyModal from './ChunkyModal';

// Share sheet — collapses several share affordances into one modal:
//   - Native Web Share API (when available, e.g. mobile)
//   - Telegram   → opens t.me share link
//   - WhatsApp   → opens wa.me share link
//   - Copy link  → clipboard + toast
//   - QR code    → swaps to QrModal via onOpenQr callback
//
// Telegram / WhatsApp links open in a new tab. Native share is only
// shown when the browser actually supports navigator.share (typical
// mobile Safari / Chrome).
//
// Renders as a bottom-sheet on mobile and a centered card on desktop.

function ShareTile({ label, color, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-slate-900 bg-white p-3 transition-transform hover:-translate-y-0.5 active:translate-y-0 dark:border-white dark:bg-slate-800"
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-900 dark:border-white ${color}`}
      >
        {icon}
      </span>
      <span className="text-[10px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-200">
        {label}
      </span>
    </button>
  );
}

export default function ShareSheet({ open, onClose, shareLink, testTitle, onOpenQr }) {
  const { t } = useLanguage();
  const links = useShareLink(shareLink);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(links.profile);
      toast.success(t('linkCopied'));
      onClose?.();
    } catch {
      toast.error(t('error'));
    }
  };

  const native = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    try {
      await navigator.share({
        title: testTitle || 'Test',
        text: testTitle || 'Test',
        url: links.profile,
      });
      onClose?.();
    } catch {
      // user cancelled — silently swallow
    }
  };

  const openExternal = (url) => {
    if (typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose?.();
  };

  const supportsNative = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <ChunkyModal
      open={open}
      onClose={onClose}
      title={t('shareTest')}
      size="md"
      bottomSheetOnMobile
    >
      <div className="p-5">
        {/* URL preview */}
        <div className="mb-4 break-all rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {links.profile}
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {supportsNative && (
            <ShareTile
              label={t('share') || 'Share'}
              color="bg-amber-300 text-slate-900"
              icon={<Share2 size={20} strokeWidth={2.6} />}
              onClick={native}
            />
          )}

          <ShareTile
            label={t('shareTelegram')}
            color="bg-sky-400 text-white"
            icon={<Send size={20} strokeWidth={2.6} />}
            onClick={() => openExternal(links.telegram)}
          />

          <ShareTile
            label={t('shareWhatsapp')}
            color="bg-emerald-400 text-white"
            icon={<MessageCircle size={20} strokeWidth={2.6} />}
            onClick={() => openExternal(links.whatsapp)}
          />

          <ShareTile
            label={t('shareCopyLink')}
            color="bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white"
            icon={<Copy size={20} strokeWidth={2.6} />}
            onClick={copy}
          />

          <ShareTile
            label={t('shareQrCode')}
            color="bg-violet-300 text-slate-900"
            icon={<QrCode size={20} strokeWidth={2.6} />}
            onClick={onOpenQr}
          />
        </div>
      </div>
    </ChunkyModal>
  );
}

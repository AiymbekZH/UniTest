import toast from 'react-hot-toast';
import { Copy } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useShareLink } from '../hooks/useShareLink';
import ChunkyModal from './ChunkyModal';

// QR code modal. Shows the test-profile URL as a chunky framed QR
// image (served from api.qrserver.com — same as legacy) plus a
// "copy link" affordance.
//
// We deliberately also expose the URL as plain text below the QR so
// people can read it back from a screenshot without scanning, which
// makes it useful for screenshots / slides where the QR may end up
// downscaled.

export default function QrModal({ open, onClose, shareLink }) {
  const { t } = useLanguage();
  const links = useShareLink(shareLink);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(links.profile);
      toast.success(t('linkCopied'));
    } catch {
      toast.error(t('error'));
    }
  };

  return (
    <ChunkyModal open={open} onClose={onClose} title={t('qrCodeTitle')} size="sm">
      <div className="p-5 text-center">
        <div className="mx-auto mb-3 inline-block rounded-2xl border-2 border-slate-900 bg-white p-3 dark:border-white">
          <img
            src={links.qr}
            alt={t('qrCodeTitle')}
            width={200}
            height={200}
            className="block h-48 w-48"
          />
        </div>
        <p className="mb-3 px-2 text-xs font-bold leading-relaxed text-slate-500 dark:text-slate-400">
          {t('qrCodeHelp')}
        </p>

        {/* URL preview (read-only) */}
        <div className="mb-3 break-all rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {links.profile}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="chunky-btn-ghost flex-1 !py-2.5 text-[13px]"
          >
            <Copy size={13} strokeWidth={2.6} /> {t('shareCopyLink')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="chunky-btn-primary flex-1 !py-2.5 text-[13px]"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </ChunkyModal>
  );
}

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Flag } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import api from '../../../services/api';
import ChunkyModal from './ChunkyModal';

// Report-this-test modal. Two states:
//   1. Empty textarea + Cancel/Submit row.
//   2. While submitting → button shows the same label, just disabled.
//
// The submit button stays disabled until the user types something
// non-empty so we never hit the server with an empty reason (which
// the backend would reject anyway, but we save the round-trip).

export default function ReportModal({ open, onClose, testId }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setReason(''); setSubmitting(false); };

  const close = () => {
    if (submitting) return; // don't allow closing mid-submit
    reset();
    onClose?.();
  };

  const submit = async () => {
    const trimmed = reason.trim();
    if (!trimmed || !testId) return;
    setSubmitting(true);
    try {
      await api.post('/reports', {
        targetType: 'test',
        targetId: testId,
        reason: trimmed,
      });
      toast.success(t('reportSent'));
      reset();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ChunkyModal open={open} onClose={close} title={t('reportTest')} size="md">
      <div className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-orange-500">
          <Flag size={16} strokeWidth={2.6} />
          {t('reportTest')}
        </div>

        <textarea
          autoFocus
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('reportReason')}
          maxLength={500}
          className="w-full resize-none rounded-xl border-2 border-slate-900 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-300 dark:border-white dark:bg-slate-800 dark:text-white"
        />
        <div className="mt-1 text-right text-[10px] font-bold text-slate-400 tabular-nums">
          {reason.length} / 500
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="chunky-btn-ghost flex-1 !py-2.5 text-sm"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!reason.trim() || submitting}
            className="chunky-btn-primary flex-1 !py-2.5 text-sm"
          >
            {t('report')}
          </button>
        </div>
      </div>
    </ChunkyModal>
  );
}

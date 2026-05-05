import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, Lock } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';

// A bottom-anchored "Start test" bar that appears once the user
// scrolls past ~480px. Mobile only (`lg:hidden`). The desktop sidebar
// already keeps the Start CTA in view via sticky positioning, so we
// suppress this on lg+ to avoid double UI.
//
// We intentionally don't show a backdrop or animate too aggressively
// — the goal is a subtle "always reachable" affordance, not a popup.

const SHOW_THRESHOLD = 480;

export default function StickyMobileCTA({ shareLink, canStart, testTitle }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_THRESHOLD);
    onScroll(); // initial check (in case the page was scroll-restored)
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-slate-900 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_0_rgba(15,23,42,0.08)] dark:border-white dark:bg-slate-900 lg:hidden"
        >
          <div className="mx-auto flex max-w-md items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t('readyToStart') || t('startTest')}
              </p>
              <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                {testTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => canStart && navigate(`/test/${shareLink}`)}
              disabled={!canStart}
              className="chunky-btn-primary flex-shrink-0 !py-2.5 !px-4 text-[13px]"
            >
              {canStart ? <Play size={14} strokeWidth={2.6} /> : <Lock size={14} strokeWidth={2.6} />}
              {t('startTest')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

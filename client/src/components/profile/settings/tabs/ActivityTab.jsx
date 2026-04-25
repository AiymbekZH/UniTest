import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, MessageSquare, Sparkles, Trash2, ChevronRight
} from 'lucide-react';
import SectionHeader from '../SectionHeader';

export default function ActivityTab({
  copy, t, warnings, myComments, formattedBadges, onDeleteComment
}) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy.tabActivity}
        title={copy.activityHeadline}
        subtitle={copy.activitySubtitle}
      />

      {/* Warnings */}
      <section className="chunky-card p-3 sm:p-5 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{t('warnings')}</p>
            <p className="mt-1 font-mono text-2xl font-black text-dark">{warnings.length}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300">
            <AlertTriangle size={18} />
          </div>
        </div>

        {warnings.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('warningsEmptyDesc')}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {warnings.map((warning, index) => (
              <div
                key={`${warning.createdAt}-${index}`}
                className="rounded-2xl border-2 border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:bg-slate-900/60 dark:text-amber-200">
                    Admin
                  </span>
                  <span className="text-[11px] text-amber-700/80 dark:text-amber-200/70">
                    {new Date(warning.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{warning.message}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Badges full */}
      <section className="chunky-card p-3 sm:p-5 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{copy.badges}</p>
            <p className="mt-1 font-mono text-2xl font-black text-dark">{formattedBadges.length}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
            <Sparkles size={18} />
          </div>
        </div>

        {formattedBadges.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{copy.noBadges}</p>
        ) : (
          <div className="mt-4 grid gap-2 [&>*]:min-w-0 sm:grid-cols-2 lg:grid-cols-3">
            {formattedBadges.map((badge) => (
              <div
                key={`${badge.key}-${badge.unlockedAt}`}
                className="flex items-center gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-700 dark:bg-amber-900/20"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <Sparkles size={14} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-amber-800 dark:text-amber-200">{badge.label}</p>
                  <p className="mt-0.5 text-[10px] text-amber-600/80 dark:text-amber-300/70">
                    {badge.unlockedAt ? new Date(badge.unlockedAt).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My comments */}
      <section className="chunky-card p-3 sm:p-5 lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{copy.comments}</p>
            <p className="mt-1 font-mono text-2xl font-black text-dark">{myComments.length}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
            <MessageSquare size={18} />
          </div>
        </div>

        {myComments.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('noCommentsYet')}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {myComments.map((comment) => (
              <div
                key={comment._id}
                className="rounded-2xl border-2 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{comment.text}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span>{new Date(comment.createdAt).toLocaleString()}</span>
                      {comment.test ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/test-profile/${comment.test.shareLink}`)}
                          className="inline-flex items-center gap-1 text-primary-500 transition hover:text-primary-600"
                        >
                          <ChevronRight size={12} />
                          {comment.test.title}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteComment(comment._id)}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:bg-slate-800 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

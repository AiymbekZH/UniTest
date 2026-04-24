import { Link } from 'react-router-dom';
import { FileText, Star, Users } from 'lucide-react';
import SectionHeader from '../SectionHeader';

export default function PublicTestsTab({ copy, t, publicTests }) {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={copy.tabPublicTests}
        title={copy.publicTests}
        subtitle={copy.publicTestsSubtitle}
      />

      <section className="chunky-card p-5 sm:p-6">
        {publicTests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <FileText size={22} />
            </div>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{copy.noPublicTests}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {publicTests.map((test) => (
              <Link
                key={test._id}
                to={`/test-profile/${test.shareLink}`}
                className="group rounded-2xl border-2 border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary-400 dark:border-slate-700 dark:bg-slate-900/60"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-black text-dark group-hover:text-primary-600">{test.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span>{test.questions?.length || 0} {t('questions')}</span>
                      <span className="inline-flex items-center gap-1"><Users size={10} /> {test.attemptCount || 0}</span>
                      <span className="inline-flex items-center gap-1"><Star size={10} /> {Number(test.rating || 0).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

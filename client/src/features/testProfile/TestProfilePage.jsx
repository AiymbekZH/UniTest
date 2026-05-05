import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import Navbar from '../../components/Navbar';
import CommentsSection from '../../components/CommentsSection';

import { useTestProfileData } from './hooks/useTestProfileData';
import TestProfileSkeleton from './states/TestProfileSkeleton';
import TestWindowClosedCard from './states/TestWindowClosedCard';

import TestHero from './sections/TestHero';
import TestMetaCard from './sections/TestMetaCard';
import DifficultyBar from './sections/DifficultyBar';
import RatingCard from './sections/RatingCard';
import QuestionPreviewCard from './sections/QuestionPreviewCard';
import MyHistoryCard from './sections/MyHistoryCard';
import ScoreDistributionCard from './sections/ScoreDistributionCard';
import RelatedTestsRail from './sections/RelatedTestsRail';
import LeaderboardPreview from './sections/LeaderboardPreview';

import LaunchPanel from './sidebar/LaunchPanel';
import StickyMobileCTA from './sidebar/StickyMobileCTA';

import QrModal from './modals/QrModal';
import ReportModal from './modals/ReportModal';
import ShareSheet from './modals/ShareSheet';

// TestProfile shell.
//
// Replaces the 659-line pages/TestProfile.jsx monolith with a wide
// composition of focused sections. The only top-level state this
// component owns is modal toggles and the (post-Phase-5) "user has
// scrolled past the CTA" flag used by the mobile sticky bar.
//
// All data fetching is delegated to useTestProfileData; all mutation
// calls (rate, rate-difficulty, report) bubble back through that
// hook's setters so the page stays in sync with the latest server
// state without a manual refetch.

export default function TestProfilePage() {
  const { shareLink } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const {
    test,
    leaderboard,
    attemptInfo,
    myRating,
    myDifficulty,
    distribution,
    related,
    myHistory,
    loading,
    error,
    deadlineError,
    rate,
    rateDifficulty,
  } = useTestProfileData(shareLink, user);

  const [showQr, setShowQr] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // Hard error — bounce to dashboard with a toast. Matches legacy
  // behaviour for genuinely missing / server-broken tests.
  useEffect(() => {
    if (error && !deadlineError) {
      toast.error(t('testNotFound'));
      navigate('/dashboard');
    }
  }, [error, deadlineError, navigate, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <TestProfileSkeleton />
      </div>
    );
  }

  if (deadlineError) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <TestWindowClosedCard deadlineError={deadlineError} />
      </div>
    );
  }

  if (!test) return null;

  const canStart = !(attemptInfo.maxAttempts > 0 && attemptInfo.attempts >= attemptInfo.maxAttempts);

  const handleRate = async (value) => {
    if (!user) { toast.error(t('loginToRate')); return; }
    try {
      const res = await rate(value);
      toast.success(res?.alreadyRated ? t('ratingUpdated') : t('thanksForRating'));
    } catch { toast.error(t('error')); }
  };

  const handleRateDifficulty = async (value) => {
    if (!user) { toast.error(t('loginToRate')); return; }
    try {
      const res = await rateDifficulty(value);
      toast.success(res?.alreadyRated ? t('difficultyRatingUpdated') : t('thanksForDifficultyRating'));
    } catch { toast.error(t('error')); }
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 sm:px-6 sm:pb-16 sm:pt-6">
        {/* Back — chunky ghost */}
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="chunky-btn-ghost mb-5 !py-2 !px-3 text-xs"
        >
          <ArrowLeft size={13} strokeWidth={2.6} /> {t('back')}
        </button>

        <TestHero test={test} />

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          {/* Main column */}
          <div className="min-w-0 space-y-5">
            <TestMetaCard
              test={test}
              currentUserId={user?._id || user?.id}
              onReport={() => setShowReport(true)}
            />

            <DifficultyBar
              score={test.difficultyScore}
              count={test.difficultyCount}
            />

            {user && (
              <RatingCard
                myRating={myRating}
                myDifficulty={myDifficulty}
                onRate={handleRate}
                onRateDifficulty={handleRateDifficulty}
              />
            )}

            <QuestionPreviewCard test={test} />

            {user && myHistory?.count > 0 && (
              <MyHistoryCard history={myHistory} />
            )}

            {distribution?.total > 0 && (
              <ScoreDistributionCard distribution={distribution} />
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            <LaunchPanel
              test={test}
              shareLink={shareLink}
              canStart={canStart}
              attemptInfo={attemptInfo}
              onOpenShare={() => setShowShare(true)}
              onOpenQr={() => setShowQr(true)}
            />

            <LeaderboardPreview testId={test._id} leaderboard={leaderboard} />
          </aside>
        </div>

        {/* Related tests rail — full width below the grid */}
        {related?.items?.length > 0 && (
          <div className="mt-6">
            <RelatedTestsRail items={related.items} />
          </div>
        )}

        {/* Comments */}
        {test._id && (
          <div className="mt-8">
            <CommentsSection testId={test._id} />
          </div>
        )}
      </main>

      {/* Mobile sticky CTA — visible once hero CTA scrolls out */}
      <StickyMobileCTA
        shareLink={shareLink}
        canStart={canStart}
        testTitle={test.title}
      />

      {/* Modals */}
      <QrModal open={showQr} onClose={() => setShowQr(false)} shareLink={shareLink} />
      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        testId={test._id}
      />
      <ShareSheet
        open={showShare}
        onClose={() => setShowShare(false)}
        shareLink={shareLink}
        testTitle={test.title}
        onOpenQr={() => { setShowShare(false); setShowQr(true); }}
      />
    </div>
  );
}

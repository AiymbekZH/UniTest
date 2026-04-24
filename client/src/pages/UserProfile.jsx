import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, Calendar, Flag, Flame, Sparkles, Star, Target, Trophy, Users, Medal, BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Navbar';
import ProfileHeroBanner from '../components/profile/ProfileHeroBanner';
import FollowListModal from '../components/profile/FollowListModal';
import { profileBadgeLabels, profileCopy } from '../components/profile/profileCopy';

function StatCard({ icon: Icon, label, value, tone = 'primary' }) {
  const toneMap = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
  };

  return (
    <div className="chunky-card p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneMap[tone] || toneMap.primary}`}>
        <Icon size={20} />
      </div>
      <p className="mt-4 text-3xl font-bold text-dark">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

export default function UserProfile() {
  const { id: paramId, username: paramUsername } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { t, lang } = useLanguage();
  const copy = profileCopy[lang] || profileCopy.en;

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [followListType, setFollowListType] = useState('');

  const currentUserId = currentUser?._id || currentUser?.id || '';
  const profile = profileData?.user || null;
  const profileId = profile?._id || profile?.id || paramId || '';
  const isOwnProfile = currentUserId && (paramId === currentUserId || (profile?.username && currentUser?.username && profile.username === currentUser.username));
  const progress = profileData?.progressSummary;
  const creatorStats = profileData?.creatorStats;
  const followCounts = profileData?.followCounts || { followersCount: 0, followingCount: 0 };
  const publicTests = profileData?.publicTests || [];
  const isFollowing = !!profileData?.followState?.isFollowing;

  const formattedBadges = useMemo(() => {
    return (progress?.badges || []).map((badge) => ({
      ...badge,
      label: profileBadgeLabels[badge.key]?.[lang] || badge.key
    }));
  }, [lang, progress?.badges]);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const endpoint = paramUsername
          ? `/profile/by-username/${paramUsername}`
          : `/profile/${paramId}`;
        const res = await api.get(endpoint);
        setProfileData(res.data);
        const loadedId = res.data?.user?._id || res.data?.user?.id;
        if (loadedId && currentUserId && loadedId === currentUserId) {
          navigate('/profile', { replace: true });
        }
      } catch {
        toast.error(copy.profileLoadError);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [copy.profileLoadError, paramId, paramUsername, currentUserId, navigate]);

  const handleFollowToggle = async () => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }
    if (!profileId) return;

    setFollowLoading(true);
    try {
      const res = isFollowing
        ? await api.delete(`/profile/${profileId}/follow`)
        : await api.post(`/profile/${profileId}/follow`);

      setProfileData((prev) => prev ? {
        ...prev,
        followState: res.data.followState,
        followCounts: res.data.followCounts
      } : prev);
    } catch (error) {
      toast.error(error.response?.data?.message || copy.followError);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim() || !profileId) return;
    try {
      await api.post('/reports', { targetType: 'user', targetId: profileId, reason: reportReason.trim() });
      toast.success(t('reportSent'));
      setShowReport(false);
      setReportReason('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error');
    }
  };

  const roleLabel = profile?.role === 'admin'
    ? t('adminRole')
    : profile?.role === 'teacher'
      ? t('teacher')
      : t('student');

  const heroFooter = (
    <div className="grid gap-3 sm:grid-cols-4">
      <button
        type="button"
        onClick={() => setFollowListType('followers')}
        className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left transition hover:border-primary-200 hover:bg-white dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-primary-700"
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{copy.followers}</p>
        <p className="mt-1 text-xl font-bold text-dark">{followCounts.followersCount || 0}</p>
      </button>

      <button
        type="button"
        onClick={() => setFollowListType('following')}
        className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-left transition hover:border-primary-200 hover:bg-white dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-primary-700"
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{copy.following}</p>
        <p className="mt-1 text-xl font-bold text-dark">{followCounts.followingCount || 0}</p>
      </button>

      <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/70">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{copy.uniqueId}</p>
        <p className="mt-1 text-xl font-bold text-dark">{profile?.uniqueId || 'N/A'}</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/70">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{copy.publishedTests}</p>
        <p className="mt-1 text-xl font-bold text-dark">{creatorStats?.publicTestsCount || 0}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-dark"
        >
          <ArrowLeft size={16} />
          {t('back')}
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <ProfileHeroBanner
            user={profile}
            title={`${profile.firstName || ''} ${profile.lastName || ''}`.trim()}
            roleLabel={roleLabel}
            meta={[
              {
                icon: <Calendar size={13} />,
                label: `${copy.joined} ${new Date(profile.createdAt || Date.now()).toLocaleDateString()}`
              }
            ]}
            footer={heroFooter}
            actions={
              <>
                {currentUserId && currentUserId !== profileId ? (
                  <button
                    type="button"
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                      isFollowing
                        ? 'border border-white/30 bg-white/14 text-white backdrop-blur-xl hover:bg-white/20'
                        : 'bg-white text-slate-900 shadow-xl hover:bg-slate-100'
                    }`}
                  >
                    {followLoading ? '...' : isFollowing ? copy.unfollow : copy.follow}
                  </button>
                ) : null}
                {currentUserId && currentUserId !== profileId ? (
                  <button
                    type="button"
                    onClick={() => setShowReport(true)}
                    className="rounded-full border border-white/20 bg-slate-950/55 px-5 py-3 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-slate-950/70"
                  >
                    {t('report')}
                  </button>
                ) : null}
              </>
            }
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard icon={Sparkles} label={copy.level} value={progress?.level || 1} />
            <StatCard icon={Trophy} label={copy.xp} value={progress?.xp || 0} tone="blue" />
            <StatCard icon={Flame} label={copy.currentStreak} value={progress?.currentStreakDays || 0} tone="amber" />
            <StatCard icon={Medal} label={copy.bestStreak} value={progress?.longestStreakDays || 0} tone="emerald" />
            <StatCard icon={Target} label={copy.completedExams} value={progress?.stats?.totalCompleted || 0} tone="blue" />
            <StatCard icon={Star} label={copy.perfectScores} value={progress?.stats?.perfectScores || 0} tone="amber" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <section className="chunky-card p-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{copy.creatorStats}</p>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-4 dark:bg-slate-800/70">
                  <div className="flex items-center gap-3">
                    <BarChart3 size={18} className="text-primary-500" />
                    <span className="text-sm text-gray-500">{t('testsCreated')}</span>
                  </div>
                  <span className="text-lg font-bold text-dark">{creatorStats?.testsCreated || 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-4 dark:bg-slate-800/70">
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-emerald-500" />
                    <span className="text-sm text-gray-500">{copy.publicPlays}</span>
                  </div>
                  <span className="text-lg font-bold text-dark">{creatorStats?.publicPlays || 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-4 dark:bg-slate-800/70">
                  <div className="flex items-center gap-3">
                    <Star size={18} className="text-amber-500" />
                    <span className="text-sm text-gray-500">{copy.publicRating}</span>
                  </div>
                  <span className="text-lg font-bold text-dark">{creatorStats?.publicAverageRating || 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-4 dark:bg-slate-800/70">
                  <div className="flex items-center gap-3">
                    <Trophy size={18} className="text-blue-500" />
                    <span className="text-sm text-gray-500">{t('avgScore')}</span>
                  </div>
                  <span className="text-lg font-bold text-dark">{creatorStats?.totalScore || 0}%</span>
                </div>
              </div>
            </section>

            <section className="chunky-card p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{copy.publicProgress}</p>
                  <h2 className="mt-2 text-2xl font-bold text-dark">{formattedBadges.length}</h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
                  <Sparkles size={18} />
                </div>
              </div>

              {formattedBadges.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {formattedBadges.map((badge) => (
                    <span
                      key={`${badge.key}-${badge.unlockedAt}`}
                      className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-600 dark:border-primary-900/40 dark:bg-primary-900/10 dark:text-primary-300"
                    >
                      <Sparkles size={12} />
                      {badge.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">{copy.noBadges}</p>
              )}
            </section>
          </div>

          <section className="chunky-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{copy.creatorPortfolio}</p>
                <h2 className="mt-2 text-2xl font-bold text-dark">{copy.publicTests}</h2>
              </div>
              <div className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 dark:border-slate-700 dark:text-slate-200">
                {publicTests.length}
              </div>
            </div>

            {publicTests.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">{copy.noPublicTests}</p>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {publicTests.map((test) => (
                  <Link
                    key={test._id}
                    to={`/test-profile/${test.shareLink}`}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:border-primary-200 hover:bg-white dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-primary-700"
                  >
                    <p className="line-clamp-1 text-base font-semibold text-dark">{test.title}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>{test.questions?.length || 0} {t('questions')}</span>
                      <span>{test.attemptCount || 0} plays</span>
                      <span>{Number(test.rating || 0).toFixed(1)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </motion.div>
      </main>

      <FollowListModal
        open={followListType === 'followers'}
        onClose={() => setFollowListType('')}
        endpoint={profileId ? `/profile/${profileId}/followers` : ''}
        title={copy.followers}
        emptyText={copy.noFollowers}
        loadingText={copy.loadingProfiles}
      />

      <FollowListModal
        open={followListType === 'following'}
        onClose={() => setFollowListType('')}
        endpoint={profileId ? `/profile/${profileId}/following` : ''}
        title={copy.following}
        emptyText={copy.noFollowing}
        loadingText={copy.loadingProfiles}
      />

      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
            onClick={() => setShowReport(false)}
          >
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-900/20 dark:text-orange-300">
                  <Flag size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-dark">{t('reportUser')}</h3>
                  <p className="text-sm text-gray-500">{profile.firstName} {profile.lastName}</p>
                </div>
              </div>

              <textarea
                className="input-field mt-5 min-h-[130px] resize-y py-3 text-sm"
                placeholder={t('reportReason')}
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                maxLength={500}
              />

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReport(false);
                    setReportReason('');
                  }}
                  className="flex-1 rounded-full border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:border-gray-300 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleReport}
                  disabled={!reportReason.trim()}
                  className="flex-1 rounded-full bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('report')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, Calendar, Flag, LayoutDashboard, FileText, Sparkles, UserPlus, UserMinus
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Navbar';
import ProfileHeroBanner from '../components/profile/ProfileHeroBanner';
import FollowListModal from '../components/profile/FollowListModal';
import { profileBadgeLabels, profileCopy } from '../components/profile/profileCopy';
import ProfileTabsNav from '../components/profile/settings/ProfileTabsNav';
import PublicOverviewTab from '../components/profile/settings/public/PublicOverviewTab';
import PublicTestsTab from '../components/profile/settings/public/PublicTestsTab';
import PublicAchievementsTab from '../components/profile/settings/public/PublicAchievementsTab';

const VALID_TABS = ['overview', 'tests', 'achievements'];

function readHashTab() {
  if (typeof window === 'undefined') return 'overview';
  const raw = (window.location.hash || '').replace(/^#/, '').trim();
  return VALID_TABS.includes(raw) ? raw : 'overview';
}

export default function UserProfile() {
  const { id: paramId, username: paramUsername } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { t, lang } = useLanguage();
  const copy = profileCopy[lang] || profileCopy.en;

  const [activeTab, setActiveTab] = useState(readHashTab);

  useEffect(() => {
    const onHash = () => setActiveTab(readHashTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const changeTab = useCallback((id) => {
    if (!VALID_TABS.includes(id)) return;
    setActiveTab(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${id}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [followListType, setFollowListType] = useState('');

  const currentUserId = currentUser?._id || currentUser?.id || '';
  const profile = profileData?.user || null;
  const profileId = profile?._id || profile?.id || paramId || '';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramId, paramUsername, currentUserId]);

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

  // Chunky hero footer tiles: 2x2 mobile / 4-col desktop
  const tileCls = "min-w-0 rounded-xl border-2 border-slate-900 bg-white p-2.5 text-left transition active:translate-y-[1px] dark:border-white dark:bg-slate-800 sm:p-3";
  const tileShadow = { boxShadow: '0 2px 0 #0f172a' };
  const heroFooter = (
    <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0 sm:grid-cols-4">
      <button type="button" onClick={() => setFollowListType('followers')} className={tileCls} style={tileShadow}>
        <p className="truncate text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-[10px]">{copy.followers}</p>
        <p className="mt-0.5 font-mono text-sm font-black text-dark dark:text-white sm:text-base">{followCounts.followersCount || 0}</p>
      </button>
      <button type="button" onClick={() => setFollowListType('following')} className={tileCls} style={tileShadow}>
        <p className="truncate text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-[10px]">{copy.following}</p>
        <p className="mt-0.5 font-mono text-sm font-black text-dark dark:text-white sm:text-base">{followCounts.followingCount || 0}</p>
      </button>
      <div className={tileCls.replace('active:translate-y-[1px]', '')} style={tileShadow}>
        <p className="truncate text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-[10px]">{copy.uniqueId}</p>
        <p className="mt-0.5 truncate font-mono text-xs font-black text-dark dark:text-white sm:text-sm">{profile?.uniqueId || 'N/A'}</p>
      </div>
      <div className={tileCls.replace('active:translate-y-[1px]', '')} style={tileShadow}>
        <p className="truncate text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-[10px]">{copy.publishedTests}</p>
        <p className="mt-0.5 font-mono text-sm font-black text-dark dark:text-white sm:text-base">{creatorStats?.publicTestsCount || 0}</p>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview',     label: copy.tabPublicOverview,     description: copy.tabPublicOverviewDesc,     icon: LayoutDashboard },
    { id: 'tests',        label: copy.tabPublicTests,        description: copy.tabPublicTestsDesc,        icon: FileText,        badge: publicTests.length || undefined },
    { id: 'achievements', label: copy.tabPublicAchievements, description: copy.tabPublicAchievementsDesc, icon: Sparkles,        badge: formattedBadges.length || undefined }
  ];

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
    <div className="min-h-screen overflow-x-clip bg-surface">
      <Navbar />

      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-900 transition active:translate-y-[2px] dark:border-white dark:bg-slate-900 dark:text-white"
          style={{ boxShadow: '0 3px 0 #0f172a' }}
        >
          <ArrowLeft size={13} />
          {t('back')}
        </button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6">
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
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-slate-900 px-4 py-2 text-xs font-black transition active:translate-y-[1px] dark:border-white sm:flex-initial sm:gap-2 sm:px-5 sm:py-2.5 ${
                      isFollowing
                        ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white'
                        : 'bg-primary-500 text-white'
                    }`}
                    style={{ boxShadow: isFollowing ? '0 3px 0 #0f172a' : '0 3px 0 #9a3412' }}
                  >
                    {isFollowing ? <UserMinus size={13} /> : <UserPlus size={13} />}
                    {followLoading ? '...' : isFollowing ? copy.unfollow : copy.follow}
                  </button>
                ) : null}
                {currentUserId && currentUserId !== profileId ? (
                  <button
                    type="button"
                    onClick={() => setShowReport(true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-slate-900 bg-white px-3 py-2 text-xs font-black text-slate-900 transition active:translate-y-[1px] dark:border-white dark:bg-slate-800 dark:text-white sm:gap-2 sm:px-4 sm:py-2.5"
                    style={{ boxShadow: '0 3px 0 #0f172a' }}
                  >
                    <Flag size={13} />
                    <span className="hidden sm:inline">{t('report')}</span>
                  </button>
                ) : null}
              </>
            }
          />

          <div className="space-y-4 lg:grid lg:gap-6 lg:space-y-0 lg:grid-cols-[260px_1fr]">
            <ProfileTabsNav tabs={tabs} activeId={activeTab} onChange={changeTab} />

            <div className="min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'overview' && (
                    <PublicOverviewTab
                      copy={copy}
                      t={t}
                      progress={progress}
                      creatorStats={creatorStats}
                      formattedBadges={formattedBadges}
                      publicTests={publicTests}
                      onGoTests={() => changeTab('tests')}
                      onGoAchievements={() => changeTab('achievements')}
                    />
                  )}

                  {activeTab === 'tests' && (
                    <PublicTestsTab
                      copy={copy}
                      t={t}
                      publicTests={publicTests}
                    />
                  )}

                  {activeTab === 'achievements' && (
                    <PublicAchievementsTab
                      copy={copy}
                      formattedBadges={formattedBadges}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
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
              className="chunky-card relative w-full max-w-md p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-900/20 dark:text-orange-300">
                  <Flag size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-dark">{t('reportUser')}</h3>
                  <p className="text-sm text-slate-500">{profile.firstName} {profile.lastName}</p>
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
                  className="btn-secondary flex-1 py-2.5 text-sm"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleReport}
                  disabled={!reportReason.trim()}
                  className="flex-1 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
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

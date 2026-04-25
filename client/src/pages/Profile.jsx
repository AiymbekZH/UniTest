import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, LayoutDashboard, User, Palette, ShieldCheck, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Navbar';
import ProfileHeroBanner from '../components/profile/ProfileHeroBanner';
import FollowListModal from '../components/profile/FollowListModal';
import { profileBadgeLabels, profileCopy } from '../components/profile/profileCopy';
import ProfileTabsNav from '../components/profile/settings/ProfileTabsNav';
import OverviewTab from '../components/profile/settings/tabs/OverviewTab';
import AccountTab from '../components/profile/settings/tabs/AccountTab';
import AppearanceTab from '../components/profile/settings/tabs/AppearanceTab';
import SecurityTab from '../components/profile/settings/tabs/SecurityTab';
import ActivityTab from '../components/profile/settings/tabs/ActivityTab';

const VALID_TABS = ['overview', 'account', 'appearance', 'security', 'activity'];

function readHashTab() {
  if (typeof window === 'undefined') return 'overview';
  const raw = (window.location.hash || '').replace(/^#/, '').trim();
  return VALID_TABS.includes(raw) ? raw : 'overview';
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { t, lang, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const copy = profileCopy[lang] || profileCopy.en;

  // Tab state with URL hash sync
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

  // Data
  const [profileData, setProfileData] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [followListType, setFollowListType] = useState('');

  // Form state
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState({ state: 'idle', message: '' });
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [coverPreset, setCoverPreset] = useState('aurora');
  const [preferredLanguage, setPreferredLanguage] = useState(lang);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const currentUserId = user?._id || user?.id || '';
  const profileUser = profileData?.user || user;
  const progress = profileData?.progressSummary;
  const creatorStats = profileData?.creatorStats;
  const followCounts = profileData?.followCounts || { followersCount: 0, followingCount: 0 };
  const publicTests = profileData?.publicTests || [];

  const formattedBadges = useMemo(() => {
    return (progress?.badges || []).map((badge) => ({
      ...badge,
      label: profileBadgeLabels[badge.key]?.[lang] || badge.key
    }));
  }, [lang, progress?.badges]);

  // Username availability check
  useEffect(() => {
    if (!username) {
      setUsernameStatus({ state: 'idle', message: '' });
      return undefined;
    }
    if (profileUser?.username && username === profileUser.username) {
      setUsernameStatus({ state: 'idle', message: copy.usernameCurrent || '' });
      return undefined;
    }
    if (!/^[a-z0-9_]{3,20}$/i.test(username)) {
      setUsernameStatus({ state: 'invalid', message: copy.usernameInvalid || '3-20' });
      return undefined;
    }
    setUsernameStatus({ state: 'checking', message: copy.usernameChecking || '...' });
    const handle = setTimeout(async () => {
      try {
        const res = await api.get(`/profile/check-username?value=${encodeURIComponent(username)}`);
        if (res.data?.available) {
          setUsernameStatus({ state: 'available', message: copy.usernameAvailable || 'OK' });
        } else {
          setUsernameStatus({ state: 'taken', message: copy.usernameTaken || 'Taken' });
        }
      } catch (_) {
        setUsernameStatus({ state: 'idle', message: '' });
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [username, profileUser?.username, copy]);

  // Load profile once
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const [profileRes, warningsRes, commentsRes] = await Promise.all([
          api.get('/profile/me'),
          api.get('/profile/me/warnings'),
          api.get('/profile/me/comments')
        ]);

        const nextProfile = profileRes.data;
        setProfileData(nextProfile);
        setWarnings(warningsRes.data.warnings || []);
        setMyComments(commentsRes.data.comments || []);

        const nextUser = nextProfile.user;
        setUsername(nextUser?.username || '');
        setFirstName(nextUser?.firstName || '');
        setLastName(nextUser?.lastName || '');
        setMiddleName(nextUser?.middleName || '');
        setHeadline(nextUser?.headline || '');
        setBio(nextUser?.bio || '');
        setCoverPreset(nextUser?.coverPreset || 'aurora');
        setPreferredLanguage(nextUser?.language || lang);
      } catch {
        toast.error(copy.profileLoadError);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save profile (account + appearance)
  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(t('profileNameRequired'));
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/profile/me', {
        username: username.trim() || undefined,
        firstName,
        lastName,
        middleName,
        headline,
        bio,
        coverPreset,
        language: preferredLanguage
      });

      const nextUser = res.data.user;
      updateUser(nextUser);
      setLanguage(preferredLanguage);
      setProfileData((prev) => prev ? { ...prev, user: nextUser } : prev);
      toast.success(copy.profileUpdated);
    } catch (error) {
      toast.error(error.response?.data?.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateUser(res.data.user);
      setProfileData((prev) => prev ? { ...prev, user: res.data.user } : prev);
      toast.success(copy.avatarUpdated);
    } catch (error) {
      toast.error(error.response?.data?.message || copy.saveError);
    } finally {
      event.target.value = '';
    }
  };

  const handleBannerUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('banner', file);

    try {
      const res = await api.post('/profile/banner', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateUser(res.data.user);
      setProfileData((prev) => prev ? { ...prev, user: res.data.user } : prev);
      toast.success(copy.bannerUpdated);
    } catch (error) {
      toast.error(error.response?.data?.message || copy.saveError);
    } finally {
      event.target.value = '';
    }
  };

  const handleRemoveBanner = async () => {
    try {
      const res = await api.delete('/profile/banner');
      updateUser(res.data.user);
      setProfileData((prev) => prev ? { ...prev, user: res.data.user } : prev);
      toast.success(copy.bannerRemoved);
    } catch (error) {
      toast.error(error.response?.data?.message || copy.saveError);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('passwordFieldsRequired'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordsMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('passwordMinLength'));
      return;
    }

    try {
      await api.put('/profile/password', { currentPassword, newPassword });
      toast.success(t('changePassword'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || copy.saveError);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setMyComments((prev) => prev.filter((comment) => comment._id !== commentId));
      toast.success(t('commentDeleted'));
    } catch {
      toast.error(t('deleteError'));
    }
  };

  const copyIdToClipboard = () => {
    navigator.clipboard.writeText(profileUser?.uniqueId || '');
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
    toast.success(copy.idCopied || t('copied'));
  };

  const roleLabel = profileUser?.role === 'admin'
    ? t('adminRole')
    : profileUser?.role === 'teacher'
      ? t('teacher')
      : t('student');

  // Hero footer: chunky stat tiles in 2x2 mobile / 4-col desktop
  const tileCls = "min-w-0 rounded-xl border-2 border-slate-900 bg-white p-2.5 text-left transition active:translate-y-[1px] dark:border-white dark:bg-slate-800 sm:p-3";
  const tileShadow = { boxShadow: '0 2px 0 #0f172a' };
  const heroFooter = (
    <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0 sm:grid-cols-4">
      <button type="button" onClick={copyIdToClipboard} className={tileCls} style={tileShadow}>
        <p className="truncate text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-[10px]">{copy.uniqueId}</p>
        <p className="mt-0.5 truncate font-mono text-xs font-black text-dark dark:text-white sm:text-sm">{profileUser?.uniqueId || 'N/A'}</p>
      </button>
      <button type="button" onClick={() => setFollowListType('followers')} className={tileCls} style={tileShadow}>
        <p className="truncate text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-[10px]">{copy.followers}</p>
        <p className="mt-0.5 font-mono text-sm font-black text-dark dark:text-white sm:text-base">{followCounts.followersCount || 0}</p>
      </button>
      <button type="button" onClick={() => setFollowListType('following')} className={tileCls} style={tileShadow}>
        <p className="truncate text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-[10px]">{copy.following}</p>
        <p className="mt-0.5 font-mono text-sm font-black text-dark dark:text-white sm:text-base">{followCounts.followingCount || 0}</p>
      </button>
      <button type="button" onClick={() => navigate('/my-tests')} className={tileCls} style={tileShadow}>
        <p className="truncate text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:text-[10px]">{copy.publishedTests}</p>
        <p className="mt-0.5 font-mono text-sm font-black text-dark dark:text-white sm:text-base">{creatorStats?.publicTestsCount || 0}</p>
      </button>
    </div>
  );

  const tabs = [
    { id: 'overview',   label: copy.tabOverview,   description: copy.tabOverviewDesc,   icon: LayoutDashboard },
    { id: 'account',    label: copy.tabAccount,    description: copy.tabAccountDesc,    icon: User },
    { id: 'appearance', label: copy.tabAppearance, description: copy.tabAppearanceDesc, icon: Palette },
    { id: 'security',   label: copy.tabSecurity,   description: copy.tabSecurityDesc,   icon: ShieldCheck },
    { id: 'activity',   label: copy.tabActivity,   description: copy.tabActivityDesc,   icon: Activity, badge: warnings.length || undefined }
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface">
      <Navbar />

      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6">
          <ProfileHeroBanner
            user={profileUser}
            title={`${profileUser?.firstName || ''} ${profileUser?.lastName || ''}`.trim()}
            roleLabel={roleLabel}
            editable
            onAvatarUpload={handleAvatarUpload}
            onBannerUpload={handleBannerUpload}
            onBannerRemove={handleRemoveBanner}
            uploadBannerLabel={copy.uploadBanner}
            replaceBannerLabel={copy.replaceBanner}
            removeBannerLabel={copy.removeBanner}
            meta={[
              {
                icon: <Calendar size={13} />,
                label: `${copy.joined} ${new Date(profileUser?.createdAt || Date.now()).toLocaleDateString()}`
              }
            ]}
            footer={heroFooter}
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
                    <OverviewTab
                      copy={copy}
                      t={t}
                      progress={progress}
                      creatorStats={creatorStats}
                      formattedBadges={formattedBadges}
                      publicTests={publicTests}
                      onGoAccount={() => changeTab('account')}
                    />
                  )}

                  {activeTab === 'account' && (
                    <AccountTab
                      copy={copy}
                      t={t}
                      profileUser={profileUser}
                      username={username}
                      setUsername={setUsername}
                      usernameStatus={usernameStatus}
                      firstName={firstName}
                      setFirstName={setFirstName}
                      lastName={lastName}
                      setLastName={setLastName}
                      middleName={middleName}
                      setMiddleName={setMiddleName}
                      headline={headline}
                      setHeadline={setHeadline}
                      bio={bio}
                      setBio={setBio}
                      saving={saving}
                      onSave={handleSave}
                      copiedId={copiedId}
                      onCopyId={copyIdToClipboard}
                    />
                  )}

                  {activeTab === 'appearance' && (
                    <AppearanceTab
                      copy={copy}
                      t={t}
                      coverPreset={coverPreset}
                      setCoverPreset={setCoverPreset}
                      preferredLanguage={preferredLanguage}
                      setPreferredLanguage={setPreferredLanguage}
                      saving={saving}
                      onSave={handleSave}
                    />
                  )}

                  {activeTab === 'security' && (
                    <SecurityTab
                      copy={copy}
                      t={t}
                      roleLabel={roleLabel}
                      currentPassword={currentPassword}
                      setCurrentPassword={setCurrentPassword}
                      newPassword={newPassword}
                      setNewPassword={setNewPassword}
                      confirmPassword={confirmPassword}
                      setConfirmPassword={setConfirmPassword}
                      onChangePassword={handlePasswordChange}
                    />
                  )}

                  {activeTab === 'activity' && (
                    <ActivityTab
                      copy={copy}
                      t={t}
                      warnings={warnings}
                      myComments={myComments}
                      formattedBadges={formattedBadges}
                      onDeleteComment={handleDeleteComment}
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
        endpoint={currentUserId ? `/profile/${currentUserId}/followers` : ''}
        title={copy.followers}
        emptyText={copy.noFollowers}
        loadingText={copy.loadingProfiles}
      />

      <FollowListModal
        open={followListType === 'following'}
        onClose={() => setFollowListType('')}
        endpoint={currentUserId ? `/profile/${currentUserId}/following` : ''}
        title={copy.following}
        emptyText={copy.noFollowing}
        loadingText={copy.loadingProfiles}
      />
    </div>
  );
}

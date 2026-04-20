import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Check, Copy, Flame, Globe, Lock, Medal, MessageSquare, Save, Sparkles, Star,
  Target, Trophy, Users, ChevronRight, Trash2, BarChart3
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Navbar from '../components/Navbar';
import ProfileHeroBanner from '../components/profile/ProfileHeroBanner';
import FollowListModal from '../components/profile/FollowListModal';
import { profileBadgeLabels, profileCopy } from '../components/profile/profileCopy';

function SummaryCard({ icon: Icon, label, value, tone = 'primary' }) {
  const toneMap = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
  };

  return (
    <div className="glass-card-solid rounded-[1.75rem] p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneMap[tone] || toneMap.primary}`}>
        <Icon size={20} />
      </div>
      <p className="mt-4 text-3xl font-black text-dark">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

function LanguageButton({ active, label, flag, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
          : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500'
      }`}
    >
      <span>{flag}</span>
      {label}
    </button>
  );
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { t, lang, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const copy = profileCopy[lang] || profileCopy.en;

  const [profileData, setProfileData] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [followListType, setFollowListType] = useState('');

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
  }, [copy.profileLoadError, lang]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(t('profileNameRequired'));
      return;
    }

    setSaving(true);
    try {
      const res = await api.put('/profile/me', {
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
    toast.success(t('copied'));
  };

  const roleLabel = profileUser?.role === 'admin'
    ? t('adminRole')
    : profileUser?.role === 'teacher'
      ? t('teacher')
      : t('student');

  const heroFooter = (
    <div className="grid gap-3 sm:grid-cols-4">
      <button
        type="button"
        onClick={copyIdToClipboard}
        className="flex items-center justify-between rounded-[1.4rem] border border-gray-100 bg-gray-50/80 px-4 py-3 text-left transition hover:border-primary-200 hover:bg-white dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-primary-700"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.uniqueId}</p>
          <p className="mt-1 text-sm font-semibold text-dark">{profileUser?.uniqueId || 'N/A'}</p>
        </div>
        {copiedId ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-gray-400" />}
      </button>

      <button
        type="button"
        onClick={() => setFollowListType('followers')}
        className="rounded-[1.4rem] border border-gray-100 bg-gray-50/80 px-4 py-3 text-left transition hover:border-primary-200 hover:bg-white dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-primary-700"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.followers}</p>
        <p className="mt-1 text-xl font-black text-dark">{followCounts.followersCount || 0}</p>
      </button>

      <button
        type="button"
        onClick={() => setFollowListType('following')}
        className="rounded-[1.4rem] border border-gray-100 bg-gray-50/80 px-4 py-3 text-left transition hover:border-primary-200 hover:bg-white dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-primary-700"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.following}</p>
        <p className="mt-1 text-xl font-black text-dark">{followCounts.followingCount || 0}</p>
      </button>

      <button
        type="button"
        onClick={() => navigate('/my-tests')}
        className="rounded-[1.4rem] border border-gray-100 bg-gray-50/80 px-4 py-3 text-left transition hover:border-primary-200 hover:bg-white dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-primary-700"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.publishedTests}</p>
        <p className="mt-1 text-xl font-black text-dark">{creatorStats?.publicTestsCount || 0}</p>
      </button>
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

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
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

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <SummaryCard icon={Sparkles} label={copy.level} value={progress?.level || 1} />
            <SummaryCard icon={Trophy} label={copy.xp} value={progress?.xp || 0} tone="blue" />
            <SummaryCard icon={Flame} label={copy.currentStreak} value={progress?.currentStreakDays || 0} tone="amber" />
            <SummaryCard icon={Medal} label={copy.bestStreak} value={progress?.longestStreakDays || 0} tone="emerald" />
            <SummaryCard icon={Target} label={copy.completedExams} value={progress?.stats?.completedExams || 0} tone="blue" />
            <SummaryCard icon={Star} label={copy.perfectScores} value={progress?.stats?.perfectScores || 0} tone="amber" />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="glass-card-solid rounded-[2rem] p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.about}</p>
                  <h2 className="mt-2 text-2xl font-black text-dark">{t('editProfile')}</h2>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/20 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={16} />
                  {saving ? '...' : copy.saveProfile}
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{t('firstName')}</span>
                  <input className="input-field text-sm" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{t('lastName')}</span>
                  <input className="input-field text-sm" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{t('middleName')}</span>
                  <input className="input-field text-sm" value={middleName} onChange={(event) => setMiddleName(event.target.value)} />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{copy.headline}</span>
                  <input
                    className="input-field text-sm"
                    value={headline}
                    maxLength={120}
                    placeholder={copy.headlinePlaceholder}
                    onChange={(event) => setHeadline(event.target.value)}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{copy.bio}</span>
                  <textarea
                    className="input-field min-h-[140px] resize-y py-3 text-sm"
                    value={bio}
                    maxLength={400}
                    placeholder={copy.bioPlaceholder}
                    onChange={(event) => setBio(event.target.value)}
                  />
                </label>
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{copy.choosePreset}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['aurora', 'mesh', 'wave', 'grid'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCoverPreset(preset)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        coverPreset === preset
                          ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                          : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500'
                      }`}
                    >
                      {copy.presets[preset]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{t('language')}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { code: 'en', label: 'English', flag: '🇬🇧' },
                    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
                    { code: 'kz', label: 'Қазақша', flag: '🇰🇿' },
                    { code: 'es', label: 'Español', flag: '🇪🇸' }
                  ].map((item) => (
                    <LanguageButton
                      key={item.code}
                      active={preferredLanguage === item.code}
                      label={item.label}
                      flag={item.flag}
                      onClick={() => setPreferredLanguage(item.code)}
                    />
                  ))}
                </div>
              </div>
            </section>

            <div className="space-y-6">
              <section className="glass-card-solid rounded-[2rem] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.creatorStats}</p>
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between rounded-[1.4rem] bg-gray-50/80 px-4 py-4 dark:bg-slate-800/70">
                    <div className="flex items-center gap-3">
                      <BarChart3 size={18} className="text-primary-500" />
                      <span className="text-sm text-gray-500">{t('testsCreated')}</span>
                    </div>
                    <span className="text-lg font-black text-dark">{creatorStats?.testsCreated || 0}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[1.4rem] bg-gray-50/80 px-4 py-4 dark:bg-slate-800/70">
                    <div className="flex items-center gap-3">
                      <Trophy size={18} className="text-amber-500" />
                      <span className="text-sm text-gray-500">{copy.publicRating}</span>
                    </div>
                    <span className="text-lg font-black text-dark">{creatorStats?.publicAverageRating || 0}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[1.4rem] bg-gray-50/80 px-4 py-4 dark:bg-slate-800/70">
                    <div className="flex items-center gap-3">
                      <Users size={18} className="text-emerald-500" />
                      <span className="text-sm text-gray-500">{copy.publicPlays}</span>
                    </div>
                    <span className="text-lg font-black text-dark">{creatorStats?.publicPlays || 0}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[1.4rem] bg-gray-50/80 px-4 py-4 dark:bg-slate-800/70">
                    <div className="flex items-center gap-3">
                      <Medal size={18} className="text-blue-500" />
                      <span className="text-sm text-gray-500">{t('avgScore')}</span>
                    </div>
                    <span className="text-lg font-black text-dark">{creatorStats?.totalScore || 0}%</span>
                  </div>
                </div>
              </section>

              <section className="glass-card-solid rounded-[2rem] p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.badges}</p>
                    <h3 className="mt-2 text-xl font-black text-dark">{formattedBadges.length}</h3>
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
          </div>

          <section className="glass-card-solid rounded-[2rem] p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.creatorPortfolio}</p>
                <h2 className="mt-2 text-2xl font-black text-dark">{copy.publicTests}</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/my-tests')}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-primary-700 dark:hover:text-primary-300"
              >
                {copy.viewAllPublished}
              </button>
            </div>

            {publicTests.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">{copy.noPublicTests}</p>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {publicTests.slice(0, 6).map((test) => (
                  <Link
                    key={test._id}
                    to={`/test-profile/${test.shareLink}`}
                    className="rounded-[1.6rem] border border-gray-100 bg-gray-50/80 p-4 transition hover:border-primary-200 hover:bg-white dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-primary-700"
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

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="glass-card-solid rounded-[2rem] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.security}</p>
              <h2 className="mt-2 text-2xl font-black text-dark">{t('changePassword')}</h2>
              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{t('currentPassword')}</span>
                  <div className="relative">
                    <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="password" className="input-field pl-11 text-sm" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{t('newPassword')}</span>
                  <div className="relative">
                    <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="password" className="input-field pl-11 text-sm" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">{t('repeatNewPassword')}</span>
                  <div className="relative">
                    <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="password" className="input-field pl-11 text-sm" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                  </div>
                </label>
              </div>
              <button
                type="button"
                onClick={handlePasswordChange}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <Lock size={15} />
                {t('changePassword')}
              </button>
            </section>

            <section className="glass-card-solid rounded-[2rem] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{t('warnings')}</p>
                  <h2 className="mt-2 text-2xl font-black text-dark">{warnings.length}</h2>
                </div>
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-600 dark:bg-amber-900/20 dark:text-amber-300">
                  {t('warnings')}
                </div>
              </div>

              {warnings.length === 0 ? (
                <p className="mt-5 text-sm text-gray-500">{t('warningsEmptyDesc')}</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {warnings.map((warning, index) => (
                    <div key={`${warning.createdAt}-${index}`} className="rounded-[1.5rem] border border-amber-200/60 bg-amber-50/80 px-4 py-4 dark:border-amber-900/30 dark:bg-amber-900/10">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-600 dark:bg-slate-900/60 dark:text-amber-300">
                          Admin
                        </span>
                        <span className="text-[11px] text-amber-700/80 dark:text-amber-200/70">
                          {new Date(warning.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-slate-200">{warning.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="glass-card-solid rounded-[2rem] p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{copy.comments}</p>
                <h2 className="mt-2 text-2xl font-black text-dark">{myComments.length}</h2>
              </div>
              <div className="rounded-2xl bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
                {t('comments')}
              </div>
            </div>

            {myComments.length === 0 ? (
              <p className="mt-5 text-sm text-gray-500">{t('noCommentsYet')}</p>
            ) : (
              <div className="mt-5 space-y-3">
                {myComments.map((comment) => (
                  <div key={comment._id} className="rounded-[1.5rem] border border-gray-100 bg-gray-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-800/70">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-6 text-gray-700 dark:text-slate-200">{comment.text}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
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
                        onClick={() => handleDeleteComment(comment._id)}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:bg-slate-900 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
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

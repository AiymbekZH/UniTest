import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Dumbbell, Play, RefreshCw } from 'lucide-react';
import AnimatedCounter from '../AnimatedCounter';

/**
 * SmartNextAction — single, contextual CTA.
 *
 * Picks ONE action to surface based on player state, in this priority:
 *   1. Continue session (saved progress within last 5 minutes).
 *   2. Daily challenge available (not completed yet).
 *   3. Daily completed but reward not claimed.
 *   4. Weekly sprint not yet finished.
 *   5. Everything closed → "Browse new tests".
 *
 * Visual: chunky-card with thick border, offset shadow, accent colour
 * derived from the chosen action mode. No glow, no neon — fits the paper
 * hero family.
 *
 * Props:
 *   - continueSession  object | null
 *   - dailyChallenge   object | null    (challengeData.dailyChallenge)
 *   - weeklySprint     object | null    (challengeData.weeklySprint)
 *   - countdownMs      number | null    (ms until next daily reset; for resetIn)
 *   - copy             dashboardCopy[lang]
 *   - onContinue       () => navigate(`/test/${shareLink}`)
 *   - onStartDaily     () => navigate(daily test)
 *   - onClaimDaily     () => navigate(daily test) (same target — server flips reward)
 *   - onOpenSprint     () => navigate('/' or sprint focus)
 *   - onExplore        () => setActiveTab('explore')
 */

const MODES = {
  continue: {
    accent: '#7c3aed',           // violet-600
    accentSoft: '#ede9fe',       // violet-100
    border: '#4c1d95',           // violet-900
    Icon: RefreshCw,
    eyebrow: 'continueTitle',
    actionKey: 'continueButton'
  },
  daily: {
    accent: '#ea580c',           // orange-600
    accentSoft: '#ffedd5',       // orange-100
    border: '#7c2d12',           // brown-950
    Icon: CalendarDays,
    eyebrow: 'dailyChallenge',
    actionKey: 'startChallenge'
  },
  dailyClaim: {
    accent: '#059669',           // emerald-600
    accentSoft: '#d1fae5',       // emerald-100
    border: '#064e3b',           // emerald-900
    Icon: CheckCircle2,
    eyebrow: 'dailyChallenge',
    actionKey: 'startChallenge'
  },
  sprint: {
    accent: '#0284c7',           // sky-600
    accentSoft: '#e0f2fe',       // sky-100
    border: '#0c4a6e',           // sky-900
    Icon: Dumbbell,
    eyebrow: 'weeklySprint',
    actionKey: 'startSprint'
  },
  explore: {
    accent: '#6b7280',           // gray-500
    accentSoft: '#f3f4f6',       // gray-100
    border: '#1f2937',           // gray-800
    Icon: Play,
    eyebrow: 'exploreTab',
    actionKey: 'exploreTests'
  }
};

function pickMode({ continueSession, dailyChallenge, weeklySprint }) {
  if (continueSession) return 'continue';
  if (dailyChallenge?.test) {
    if (dailyChallenge.completed && !dailyChallenge.rewardClaimed) return 'dailyClaim';
    if (!dailyChallenge.completed) return 'daily';
  }
  if (weeklySprint && (weeklySprint.completedCount || 0) < (weeklySprint.goalCount || 3)) {
    return 'sprint';
  }
  return 'explore';
}

function formatCountdown(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function SmartNextAction({
  continueSession,
  dailyChallenge,
  weeklySprint,
  countdownMs,
  copy,
  onContinue,
  onStartDaily,
  onClaimDaily,
  onOpenSprint,
  onExplore
}) {
  const mode = pickMode({ continueSession, dailyChallenge, weeklySprint });
  const conf = MODES[mode];
  const Icon = conf.Icon;

  // Per-mode title + description + numeric "what you'll gain" pill.
  let title;
  let desc;
  let primaryHandler;
  let progressBlock = null;
  let rewardXp = null;

  if (mode === 'continue') {
    title = continueSession?.testTitle || copy.continueTitle;
    desc = copy.resumeAt
      .replace('{{current}}', String((continueSession?.currentQ || 0) + 1))
      .replace('{{total}}', String(continueSession?.questionCount || 0));
    primaryHandler = onContinue;

    const pct = continueSession?.questionCount
      ? Math.min(100, Math.round(((continueSession.answeredCount || 0) / continueSession.questionCount) * 100))
      : 0;
    progressBlock = (
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70" style={{ borderColor: conf.border }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: conf.accent }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </div>
    );
  } else if (mode === 'daily' || mode === 'dailyClaim') {
    title = dailyChallenge?.test?.title || copy.dailyChallenge;
    desc = mode === 'dailyClaim' ? copy.rewardReady : copy.dailyChallengeDesc;
    primaryHandler = mode === 'dailyClaim' ? onClaimDaily : onStartDaily;
    rewardXp = dailyChallenge?.rewardXp || 40;
  } else if (mode === 'sprint') {
    title = copy.weeklySprint;
    desc = copy.sprintProgress
      .replace('{{current}}', String(weeklySprint?.completedCount || 0))
      .replace('{{goal}}', String(weeklySprint?.goalCount || 3));
    primaryHandler = onOpenSprint;
    rewardXp = weeklySprint?.rewardXp || 120;

    const pct = Math.min(100, Math.round(
      ((weeklySprint?.completedCount || 0) / (weeklySprint?.goalCount || 3)) * 100
    ));
    progressBlock = (
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: conf.accent }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </div>
    );
  } else {
    title = copy.exploreTests;
    desc = copy.guestHeroDesc || copy.heroDesc;
    primaryHandler = onExplore;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative flex h-full flex-col rounded-3xl border-[3px] p-5 sm:p-6"
      style={{
        backgroundColor: conf.accentSoft,
        borderColor: conf.border,
        color: '#0f172a',
        boxShadow: `0 6px 0 ${conf.border}`
      }}
    >
      {/* Eyebrow */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-[3px]"
          style={{ borderColor: conf.border, backgroundColor: '#fff', color: conf.accent }}
        >
          <Icon size={15} strokeWidth={2.6} />
        </span>
        <p
          className="text-[11px] font-black uppercase tracking-[0.18em]"
          style={{ color: conf.border }}
        >
          {copy[conf.eyebrow] || conf.eyebrow}
        </p>
      </div>

      {/* Title + desc */}
      <h2 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">{title}</h2>
      <p className="mt-1 max-w-xl text-sm text-slate-700/80">{desc}</p>

      {progressBlock}

      {/* Bottom row: reward + countdown + CTA */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {rewardXp ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border-[2px] bg-white px-3 py-1.5 text-[12px] font-black"
            style={{ borderColor: conf.border, color: conf.border }}
          >
            +<AnimatedCounter value={rewardXp} duration={0.8} /> XP
          </span>
        ) : null}

        {(mode === 'daily' || mode === 'dailyClaim') && countdownMs ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border-[2px] bg-white px-3 py-1.5 font-mono text-[12px] font-black text-slate-700"
            style={{ borderColor: conf.border }}
          >
            <Clock3 size={11} strokeWidth={2.6} />
            {formatCountdown(countdownMs)}
          </span>
        ) : null}

        <span className="flex-1" />

        <button
          type="button"
          onClick={primaryHandler}
          className="inline-flex items-center gap-2 rounded-2xl border-[3px] px-4 py-2 text-sm font-black transition-transform active:translate-y-[2px]"
          style={{
            backgroundColor: conf.accent,
            borderColor: conf.border,
            color: '#ffffff',
            boxShadow: `0 4px 0 ${conf.border}`
          }}
        >
          {copy[conf.actionKey] || conf.actionKey}
          <ArrowRight size={15} strokeWidth={2.8} />
        </button>
      </div>
    </motion.div>
  );
}

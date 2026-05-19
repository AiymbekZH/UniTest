import { motion } from 'framer-motion';
import XPCrystal from './XPCrystal';
import SmartNextAction from './SmartNextAction';

/**
 * MissionControl — flagship dashboard block.
 *
 * Two-pane composition:
 *   - left: XPCrystal (level + progress + tier identity, orbiting motes)
 *   - right: SmartNextAction (the ONE thing to do right now)
 *
 * Both panes live on the same paper-cream surface as the hero so the visual
 * language stays coherent. On mobile the panes stack with the crystal on top.
 *
 * Pure presentational — receives ready data + handlers from Dashboard.jsx.
 */
export default function MissionControl({
  level,
  xp,
  xpIntoLevel,
  xpForNextLevel,
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
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="grid items-stretch gap-4 sm:gap-6 lg:grid-cols-[260px_1fr]"
    >
      {/* Left: Crystal pane */}
      <div className="relative flex items-center justify-center rounded-3xl border-[3px] border-slate-900 bg-[#FFF8EE] p-4 dark:border-white">
        <XPCrystal
          level={level}
          xp={xp}
          xpIntoLevel={xpIntoLevel}
          xpForNextLevel={xpForNextLevel}
          size={220}
        />
      </div>

      {/* Right: Smart Next Action */}
      <SmartNextAction
        continueSession={continueSession}
        dailyChallenge={dailyChallenge}
        weeklySprint={weeklySprint}
        countdownMs={countdownMs}
        copy={copy}
        onContinue={onContinue}
        onStartDaily={onStartDaily}
        onClaimDaily={onClaimDaily}
        onOpenSprint={onOpenSprint}
        onExplore={onExplore}
      />
    </motion.section>
  );
}

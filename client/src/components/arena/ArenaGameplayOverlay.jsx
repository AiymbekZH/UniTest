import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Smile, Volume2, VolumeX, Zap } from 'lucide-react';
import { getArenaSocket } from '../../services/arenaSocket';
import { arenaSounds, setArenaMuted, getArenaMuted } from '../../utils/arenaSounds';
import { haptic } from '../../utils/haptics';

// All 7 power-ups (3 legacy + 4 from Epic E expansion).
const POWER_UPS = [
  { type: 'fiftyFifty',   label: '50/50',     icon: '½',  bg: '#10b981', shadow: '#065f46', text: 'Убрать 2 варианта' },
  { type: 'doublePoints', label: '×2',        icon: '×2', bg: '#f97316', shadow: '#9a3412', text: 'Двойные очки' },
  { type: 'shield',       label: 'Щит',      icon: '⛨',  bg: '#3b82f6', shadow: '#1e3a8a', text: 'Не потерять серию' },
  { type: 'timeFreeze',   label: 'Стоп',     icon: '❄',  bg: '#06b6d4', shadow: '#155e75', text: '+5 сек личного времени' },
  { type: 'steal',        label: 'Кража',    icon: '⚔',  bg: '#dc2626', shadow: '#7f1d1d', text: 'Украсть 50 очков у лидера' },
  { type: 'mirror',       label: 'Зеркало',  icon: '👁', bg: '#a855f7', shadow: '#6b21a8', text: 'Показать % ответов' },
  { type: 'suddenDeath',  label: 'Ва-банк',   icon: '☠',  bg: '#facc15', shadow: '#854d0e', text: '×2 за верно или −1 0 0 за ошибку' }
];

const POWER_UP_BY_TYPE = Object.fromEntries(POWER_UPS.map(p => [p.type, p]));

const EMOJIS = ['😂', '🔥', '😱', '💯', '👏', '😎', '💀', '🎉'];

// Server marks these as 'burst' — frontend renders a screen-wide ring effect.
const BURST_EMOJIS = new Set(['🔥', '🎉', '💯', '👏']);

function isQuestionActive(status) {
  return status === 'live_question' || status === 'question_intro';
}

export default function ArenaGameplayOverlay({
  room,
  participant,
  guestToken
}) {
  const [muted, setMuted] = useState(() => getArenaMuted());
  const [activePowerUp, setActivePowerUp] = useState(null);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const reactionIdRef = useRef(0);
  const lastStatusRef = useRef(null);

  // Burst effect overlay state (screen-wide flash + confetti when a burst emoji lands).
  const [burst, setBurst] = useState(null);
  // Mirror peek result (vote distribution) shown to actor only.
  const [mirrorResult, setMirrorResult] = useState(null);
  // Steal toast: when actor steals from leader.
  const [stealToast, setStealToast] = useState(null);

  const roomId = room?._id;
  const powerUps = participant?.powerUps || {
    fiftyFifty: 0, doublePoints: 0, shield: 0,
    timeFreeze: 0, steal: 0, mirror: 0, suddenDeath: 0
  };
  const currentActive = participant?.activePowerUps?.find(p => p.questionIndex === room?.currentQuestionIndex);

  // Subset of power-ups enabled by the room's template (room.settings.powerUpPool).
  // Empty pool = legacy default (all of them).
  const enabledPowerUps = useMemo(() => {
    const pool = room?.settings?.powerUpPool;
    if (!Array.isArray(pool) || pool.length === 0) return POWER_UPS;
    const allowed = new Set(pool);
    return POWER_UPS.filter(p => allowed.has(p.type));
  }, [room?.settings?.powerUpPool]);

  useEffect(() => {
    if (currentActive?.type) setActivePowerUp(currentActive.type);
    else setActivePowerUp(null);
  }, [currentActive?.type, room?.currentQuestionIndex]);

  useEffect(() => {
    if (!roomId) return;
    const socket = getArenaSocket();
    if (!socket) return;

    const handleReaction = (payload) => {
      if (!payload?.emoji || String(payload.roomId) !== String(roomId)) return;
      reactionIdRef.current += 1;
      const id = reactionIdRef.current;
      const left = 15 + Math.random() * 70;
      setFloatingReactions(prev => [...prev.slice(-14), {
        id, emoji: payload.emoji, displayName: payload.displayName,
        left, targetParticipantId: payload.targetParticipantId
      }]);
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== id));
      }, 2600);
      // Server-flagged or client-side detected burst: trigger screen-wide effect.
      if (payload.burst || BURST_EMOJIS.has(payload.emoji)) {
        setBurst({ id, emoji: payload.emoji });
        setTimeout(() => setBurst(null), 1100);
      }
    };

    const handlePowerUpApplied = (payload) => {
      if (String(payload?.roomId) !== String(roomId)) return;
      arenaSounds.powerUp();
      haptic.warning();
      // Mirror peek: server returns voteDistribution to the actor only.
      if (payload.type === 'mirror' && payload.voteDistribution && Object.keys(payload.voteDistribution).length > 0) {
        setMirrorResult({ at: Date.now(), votes: payload.voteDistribution });
        setTimeout(() => setMirrorResult(null), 6000);
      }
      // Steal: server returns stolenFrom to the actor only.
      if (payload.type === 'steal' && payload.stolenFrom) {
        setStealToast({ at: Date.now(), ...payload.stolenFrom });
        setTimeout(() => setStealToast(null), 4000);
      }
    };

    // Steal event broadcast to everyone in the room (separate from powerUpApplied).
    const handleSteal = (payload) => {
      if (String(payload?.roomId) !== String(roomId)) return;
      arenaSounds.tick();
      haptic.warning();
    };

    socket.on('arena:reaction', handleReaction);
    socket.on('arena:powerUpApplied', handlePowerUpApplied);
    socket.on('arena:steal', handleSteal);

    return () => {
      socket.off('arena:reaction', handleReaction);
      socket.off('arena:powerUpApplied', handlePowerUpApplied);
      socket.off('arena:steal', handleSteal);
    };
  }, [roomId]);

  useEffect(() => {
    const status = room?.status;
    if (!status || status === lastStatusRef.current) return;
    const prev = lastStatusRef.current;
    lastStatusRef.current = status;

    if (status === 'countdown' || status === 'starting_countdown') arenaSounds.countdown();
    if (status === 'live_question' && prev !== 'live_question') arenaSounds.go();
    if (status === 'answer_reveal') arenaSounds.correct();
    if (status === 'final') arenaSounds.final();
  }, [room?.status]);

  const sendReaction = useCallback((emoji) => {
    if (!roomId) return;
    const socket = getArenaSocket();
    if (!socket) return;
    socket.emit('arena:reaction', { roomId, emoji, guestToken });
    haptic.tap();
    setPickerOpen(false);
    setSheetOpen(false);
  }, [roomId, guestToken]);

  const usePowerUp = useCallback((type) => {
    if (!roomId || activePowerUp) return;
    const socket = getArenaSocket();
    if (!socket) return;
    socket.emit('arena:usePowerUp', { roomId, type, guestToken });
    arenaSounds.tick();
    haptic.warning();
    setSheetOpen(false);
  }, [roomId, guestToken, activePowerUp]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setArenaMuted(next);
    haptic.tap();
  };

  const showPowerUps = useMemo(() => {
    return Boolean(participant) && isQuestionActive(room?.status);
  }, [participant, room?.status]);

  if (!room) return null;

  const PowerUpButton = ({ p, size = 'h-12 w-12 text-base' }) => {
    const count = powerUps[p.type] ?? 0;
    const used = count <= 0;
    const isActive = activePowerUp === p.type;
    return (
      <button
        type="button"
        title={`${p.text} · ${count} шт.`}
        onClick={() => usePowerUp(p.type)}
        disabled={used || Boolean(activePowerUp)}
        className={`relative inline-flex items-center justify-center rounded-2xl font-black text-white transition-transform active:translate-y-[3px] disabled:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed ${size}`}
        style={{
          background: isActive ? '#f97316' : p.bg,
          boxShadow: used ? '0 0 0 transparent' : `0 5px 0 ${isActive ? '#9a3412' : p.shadow}`
        }}
      >
        <span>{p.icon}</span>
        {count > 0 && !isActive ? (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-black text-slate-900 shadow">
            {count}
          </span>
        ) : null}
      </button>
    );
  };

  const EmojiGrid = ({ cols = 4 }) => (
    <div className={`grid gap-2 ${cols === 4 ? 'grid-cols-4' : 'grid-cols-8'}`}>
      {EMOJIS.map(e => (
        <button
          key={e}
          type="button"
          onClick={() => sendReaction(e)}
          className="touch-target flex h-12 items-center justify-center rounded-2xl border-2 border-slate-300 bg-slate-50 text-2xl transition-transform hover:bg-slate-100 active:translate-y-[2px] dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          style={{ boxShadow: '0 3px 0 #cbd5e1' }}
        >
          {e}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* Burst effect — full-screen ring shockwave when a 'burst' emoji lands */}
      <AnimatePresence>
        {burst && (
          <motion.div
            key={burst.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-[35] flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.2, opacity: 0.85 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 1.0, ease: 'easeOut' }}
              className="aspect-square w-32 rounded-full border-[6px] border-amber-400"
            />
            <motion.span
              initial={{ scale: 0.4, opacity: 0, y: 20 }}
              animate={{ scale: [0.4, 1.4, 1.0], opacity: [0, 1, 0], y: [20, -30, -90] }}
              transition={{ duration: 1.0 }}
              className="absolute text-7xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)] sm:text-8xl"
            >
              {burst.emoji}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mirror peek result (actor only) */}
      <AnimatePresence>
        {mirrorResult && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="pointer-events-auto fixed left-1/2 top-20 z-50 w-[min(92vw,420px)] -translate-x-1/2"
          >
            <div
              className="rounded-2xl border-2 border-purple-700 bg-purple-50 p-3 text-purple-900 dark:border-purple-300 dark:bg-purple-900/40 dark:text-purple-100"
              style={{ boxShadow: '0 5px 0 #6b21a8' }}
            >
              <p className="mb-1 flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.2em]">
                <span>👁</span> Зеркало — голоса других игроков
              </p>
              <MirrorVotes votes={mirrorResult.votes} options={room?.questionSnapshot?.[room.currentQuestionIndex]?.options} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steal toast (actor only) */}
      <AnimatePresence>
        {stealToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.94 }}
            className="pointer-events-none fixed left-1/2 top-6 z-50 -translate-x-1/2"
          >
            <div
              className="rounded-2xl border-2 border-red-700 bg-red-50 px-4 py-2 text-red-900 dark:border-red-300 dark:bg-red-900/40 dark:text-red-100"
              style={{ boxShadow: '0 5px 0 #7f1d1d' }}
            >
              <p className="text-xs font-black uppercase tracking-[0.18em]">
                ⚔ Кража! −{stealToast.amount} у {stealToast.displayName}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating reactions */}
      <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
        <AnimatePresence>
          {floatingReactions.map(r => (
            <motion.div
              key={r.id}
              initial={{ y: 60, opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ y: -360, opacity: [0, 1, 1, 0], scale: [0.5, 1.35, 1.1, 0.95], rotate: [0, 8, -4, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.4, ease: 'easeOut' }}
              className="absolute bottom-20 flex flex-col items-center gap-1"
              style={{ left: `${r.left}%` }}
            >
              <span className="text-4xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] sm:text-5xl">{r.emoji}</span>
              {r.displayName ? (
                <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-black text-white">
                  {r.displayName}
                </span>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Desktop / tablet control bar */}
      <div className="pointer-events-auto fixed bottom-4 left-1/2 z-40 hidden -translate-x-1/2 sm:block">
        <div
          className="flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white p-2 dark:border-white dark:bg-slate-900"
          style={{ boxShadow: '0 5px 0 var(--shadow-chunky, #1f1a14)' }}
        >
          {showPowerUps && enabledPowerUps.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 pl-1">
                {enabledPowerUps.map(p => <PowerUpButton key={p.type} p={p} size="h-10 w-10 text-sm" />)}
              </div>
              <div className="h-7 w-px bg-slate-300 dark:bg-slate-700" />
            </>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen(p => !p)}
              className={`touch-target flex h-11 w-11 items-center justify-center rounded-2xl border-2 transition ${pickerOpen ? 'border-slate-900 bg-primary-500 text-white dark:border-white' : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'}`}
              style={{ boxShadow: pickerOpen ? '0 3px 0 #9a3412' : '0 3px 0 #cbd5e1' }}
              title="Реакции"
            >
              <Smile size={17} strokeWidth={2.6} />
            </button>
            <AnimatePresence>
              {pickerOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="absolute bottom-14 left-1/2 w-[320px] -translate-x-1/2 rounded-3xl border-2 border-slate-900 bg-white p-3 dark:border-white dark:bg-slate-900"
                  style={{ boxShadow: '0 6px 0 var(--shadow-chunky, #1f1a14)' }}
                >
                  <EmojiGrid cols={4} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            title={muted ? 'Включить звуки' : 'Выключить звуки'}
            className="touch-target flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-slate-300 bg-slate-50 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            style={{ boxShadow: '0 3px 0 #cbd5e1' }}
          >
            {muted ? <VolumeX size={17} strokeWidth={2.6} /> : <Volume2 size={17} strokeWidth={2.6} />}
          </button>
        </div>

        {activePowerUp ? (
          <div className="mt-2 flex justify-center">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-amber-700 bg-amber-300 px-3 py-1 text-xs font-black text-slate-900"
              style={{ boxShadow: '0 3px 0 #b45309' }}
            >
              <Sparkles size={12} strokeWidth={2.8} /> Бустер: {POWER_UPS.find(p => p.type === activePowerUp)?.label}
            </span>
          </div>
        ) : null}
      </div>

      {/* Mobile trigger + bottom sheet */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => { setSheetOpen(true); haptic.tap(); }}
          className="fixed bottom-4 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary-700 bg-primary-500 text-white"
          style={{ boxShadow: '0 6px 0 #9a3412', paddingBottom: 'env(safe-area-inset-bottom)' }}
          aria-label="Бустеры и реакции"
        >
          <Zap size={22} />
        </button>

        <AnimatePresence>
          {sheetOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
            >
              <motion.div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
                onClick={() => setSheetOpen(false)}
              />
              <motion.div
                initial={{ y: 360 }}
                animate={{ y: 0 }}
                exit={{ y: 360 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className="absolute inset-x-0 bottom-0 rounded-t-[2rem] border-t-2 border-slate-900 bg-white p-5 text-slate-900 safe-bottom dark:border-white dark:bg-slate-900 dark:text-white"
              >
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />

                {showPowerUps && enabledPowerUps.length > 0 ? (
                  <>
                    <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">Бустеры</p>
                    <div className="grid grid-cols-4 gap-2">
                      {enabledPowerUps.map(p => (
                        <div key={p.type} className="flex flex-col items-center gap-1">
                          <PowerUpButton p={p} size="h-14 w-14 text-base" />
                          <span className="text-[9px] font-black text-slate-500 dark:text-slate-400">{p.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="my-4 h-px bg-slate-200 dark:bg-slate-700" />
                  </>
                ) : null}

                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">Реакции</p>
                <EmojiGrid cols={4} />

                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 py-3 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    style={{ boxShadow: '0 3px 0 #cbd5e1' }}
                  >
                    {muted ? <VolumeX size={16} strokeWidth={2.6} /> : <Volume2 size={16} strokeWidth={2.6} />}
                    {muted ? 'Включить звук' : 'Выключить звук'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="inline-flex items-center rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 py-3 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    style={{ boxShadow: '0 3px 0 #cbd5e1' }}
                  >
                    Закрыть
                  </button>
                </div>

                {activePowerUp ? (
                  <div
                    className="mt-4 rounded-2xl border-2 border-amber-700 bg-amber-100 px-3 py-2 text-center text-xs font-black text-amber-800 dark:border-amber-300 dark:bg-amber-900/30 dark:text-amber-200"
                    style={{ boxShadow: '0 3px 0 #b45309' }}
                  >
                    <Sparkles size={12} className="mr-1 inline" strokeWidth={2.8} /> Активен: {POWER_UPS.find(p => p.type === activePowerUp)?.label}
                  </div>
                ) : null}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}

// MirrorVotes — small bar chart for the Mirror power-up peek result.
// Shows the percentage of other players that picked each option (so the actor can
// gauge crowd sentiment without seeing the right answer).
function MirrorVotes({ votes, options }) {
  const total = Object.values(votes || {}).reduce((s, n) => s + n, 0) || 1;
  const rows = (options || []).map((opt, i) => {
    const count = votes?.[opt.id] || 0;
    const pct = Math.round((count / total) * 100);
    return { id: opt.id, label: opt.text || `Вариант ${String.fromCharCode(65 + i)}`, count, pct };
  });
  return (
    <ul className="space-y-1">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-2 text-[12px]">
          <span
            className="line-clamp-1 flex-1 truncate font-bold"
            dangerouslySetInnerHTML={{ __html: r.label }}
          />
          <div className="relative h-3 w-24 overflow-hidden rounded-full bg-purple-200 dark:bg-purple-950">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-purple-500"
              style={{ width: `${r.pct}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-[11px] font-black tabular-nums">{r.pct}%</span>
        </li>
      ))}
      {rows.length === 0 && <li className="text-[11px] italic text-purple-600 dark:text-purple-300">Никто ещё не ответил</li>}
    </ul>
  );
}

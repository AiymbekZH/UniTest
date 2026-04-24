import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Smile, Volume2, VolumeX } from 'lucide-react';
import { getArenaSocket } from '../../services/arenaSocket';
import { arenaSounds, setArenaMuted, getArenaMuted } from '../../utils/arenaSounds';

const POWER_UPS = [
  { type: 'fiftyFifty', label: '50/50', icon: '½', accent: 'from-emerald-500 to-emerald-600', text: 'Убрать 2 варианта' },
  { type: 'doublePoints', label: 'x2', icon: '×2', accent: 'from-amber-500 to-orange-500', text: 'Двойные очки' },
  { type: 'shield', label: 'Щит', icon: '⛨', accent: 'from-sky-500 to-indigo-500', text: 'Не потерять серию' }
];

const EMOJIS = ['😂', '🔥', '😱', '💯', '👏', '😎', '💀', '🎉'];

function isQuestionActive(status) {
  return status === 'live_question' || status === 'question_intro';
}

export default function ArenaGameplayOverlay({
  room,
  participant,
  guestToken,
  position = 'bottom',
  compact = false
}) {
  const [muted, setMuted] = useState(() => getArenaMuted());
  const [activePowerUp, setActivePowerUp] = useState(null);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const reactionIdRef = useRef(0);
  const lastStatusRef = useRef(null);

  const roomId = room?._id;
  const powerUps = participant?.powerUps || { fiftyFifty: 0, doublePoints: 0, shield: 0 };
  const currentActive = participant?.activePowerUps?.find(p => p.questionIndex === room?.currentQuestionIndex);

  /* Sync active power-up badge */
  useEffect(() => {
    if (currentActive?.type) setActivePowerUp(currentActive.type);
    else setActivePowerUp(null);
  }, [currentActive?.type, room?.currentQuestionIndex]);

  /* Listen for reactions + play sound cues */
  useEffect(() => {
    if (!roomId) return;
    const socket = getArenaSocket();
    if (!socket) return;

    const handleReaction = (payload) => {
      if (!payload?.emoji || String(payload.roomId) !== String(roomId)) return;
      reactionIdRef.current += 1;
      const id = reactionIdRef.current;
      const left = 20 + Math.random() * 60; // % along horizontal
      setFloatingReactions(prev => [...prev.slice(-14), { id, emoji: payload.emoji, displayName: payload.displayName, left }]);
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== id));
      }, 2400);
    };

    const handlePowerUpApplied = (payload) => {
      if (String(payload?.roomId) !== String(roomId)) return;
      arenaSounds.powerUp();
    };

    socket.on('arena:reaction', handleReaction);
    socket.on('arena:powerUpApplied', handlePowerUpApplied);

    return () => {
      socket.off('arena:reaction', handleReaction);
      socket.off('arena:powerUpApplied', handlePowerUpApplied);
    };
  }, [roomId]);

  /* Status-based sound cues */
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
    setPickerOpen(false);
  }, [roomId, guestToken]);

  const usePowerUp = useCallback((type) => {
    if (!roomId || activePowerUp) return;
    const socket = getArenaSocket();
    if (!socket) return;
    socket.emit('arena:usePowerUp', { roomId, type, guestToken });
    arenaSounds.tick();
  }, [roomId, guestToken, activePowerUp]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setArenaMuted(next);
  };

  const showPowerUps = useMemo(() => {
    return Boolean(participant) && isQuestionActive(room?.status);
  }, [participant, room?.status]);

  if (!room) return null;

  const containerPos = position === 'bottom'
    ? 'fixed bottom-3 left-1/2 z-40 -translate-x-1/2 sm:bottom-4'
    : 'flex';

  return (
    <>
      {/* Floating reactions */}
      <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
        <AnimatePresence>
          {floatingReactions.map(r => (
            <motion.div
              key={r.id}
              initial={{ y: 100, opacity: 0, scale: 0.6 }}
              animate={{ y: -400, opacity: [0, 1, 1, 0], scale: [0.6, 1.3, 1.1, 0.9] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
              className="absolute bottom-20 flex flex-col items-center gap-1"
              style={{ left: `${r.left}%` }}
            >
              <span className="text-4xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">{r.emoji}</span>
              {r.displayName ? (
                <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur-sm">
                  {r.displayName}
                </span>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Control bar */}
      <div className={`${containerPos} w-full max-w-2xl px-3 ${compact ? '' : 'sm:px-0'}`}>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/70 p-1.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          {/* Power-ups */}
          {showPowerUps && (
            <div className="flex items-center gap-1.5 pl-1">
              {POWER_UPS.map(p => {
                const count = powerUps[p.type] ?? 0;
                const used = count <= 0;
                const isActive = activePowerUp === p.type;
                return (
                  <button
                    key={p.type}
                    type="button"
                    title={`${p.text} · ${count} шт.`}
                    onClick={() => usePowerUp(p.type)}
                    disabled={used || Boolean(activePowerUp)}
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-black transition disabled:cursor-not-allowed ${
                      isActive
                        ? 'bg-gradient-to-br ' + p.accent + ' text-white shadow-lg'
                        : used
                          ? 'bg-white/5 text-white/25'
                          : 'bg-gradient-to-br ' + p.accent + ' text-white hover:brightness-110 active:scale-95'
                    }`}
                  >
                    <span>{p.icon}</span>
                    {count > 0 && !isActive ? (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-black text-slate-900">
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
              <div className="h-6 w-px bg-white/10" />
            </div>
          )}

          {/* Emoji picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen(p => !p)}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition ${
                pickerOpen ? 'bg-primary-500 text-white' : 'bg-white/8 hover:bg-white/15'
              }`}
              title="Реакции"
            >
              <Smile size={16} />
            </button>
            <AnimatePresence>
              {pickerOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="absolute bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-[#111113]/95 p-2 shadow-2xl backdrop-blur-xl"
                >
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => sendReaction(e)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-xl transition hover:bg-white/10 active:scale-90"
                    >
                      {e}
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Sound toggle */}
          <button
            type="button"
            onClick={toggleMute}
            title={muted ? 'Включить звуки' : 'Выключить звуки'}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-white transition hover:bg-white/15"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        {/* Active power-up hint */}
        <AnimatePresence>
          {activePowerUp ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 flex items-center justify-center"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-xl">
                <Sparkles size={12} /> Бустер активен: {POWER_UPS.find(p => p.type === activePowerUp)?.label || activePowerUp}
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}

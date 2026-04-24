import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Smile, Volume2, VolumeX, Zap } from 'lucide-react';
import { getArenaSocket } from '../../services/arenaSocket';
import { arenaSounds, setArenaMuted, getArenaMuted } from '../../utils/arenaSounds';
import { haptic } from '../../utils/haptics';

const POWER_UPS = [
  { type: 'fiftyFifty', label: '50/50', icon: '½', bg: '#10b981', shadow: '#065f46', text: 'Убрать 2 варианта' },
  { type: 'doublePoints', label: 'x2', icon: '×2', bg: '#f97316', shadow: '#9a3412', text: 'Двойные очки' },
  { type: 'shield', label: 'Щит', icon: '⛨', bg: '#3b82f6', shadow: '#1e3a8a', text: 'Не потерять серию' }
];

const EMOJIS = ['😂', '🔥', '😱', '💯', '👏', '😎', '💀', '🎉'];

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

  const roomId = room?._id;
  const powerUps = participant?.powerUps || { fiftyFifty: 0, doublePoints: 0, shield: 0 };
  const currentActive = participant?.activePowerUps?.find(p => p.questionIndex === room?.currentQuestionIndex);

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
      setFloatingReactions(prev => [...prev.slice(-14), { id, emoji: payload.emoji, displayName: payload.displayName, left }]);
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== id));
      }, 2600);
    };

    const handlePowerUpApplied = (payload) => {
      if (String(payload?.roomId) !== String(roomId)) return;
      arenaSounds.powerUp();
      haptic.warning();
    };

    socket.on('arena:reaction', handleReaction);
    socket.on('arena:powerUpApplied', handlePowerUpApplied);

    return () => {
      socket.off('arena:reaction', handleReaction);
      socket.off('arena:powerUpApplied', handlePowerUpApplied);
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
          className="touch-target flex h-12 items-center justify-center rounded-2xl bg-white/10 text-2xl transition-transform hover:bg-white/20 active:translate-y-[2px]"
          style={{ boxShadow: '0 4px 0 rgba(0,0,0,0.35)' }}
        >
          {e}
        </button>
      ))}
    </div>
  );

  return (
    <>
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
        <div className="flex items-center gap-2 rounded-full border-2 border-white/15 bg-black/75 p-2 backdrop-blur-xl">
          {showPowerUps && (
            <>
              <div className="flex items-center gap-2 pl-1">
                {POWER_UPS.map(p => <PowerUpButton key={p.type} p={p} size="h-11 w-11 text-sm" />)}
              </div>
              <div className="h-7 w-px bg-white/20" />
            </>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen(p => !p)}
              className={`touch-target flex h-11 w-11 items-center justify-center rounded-2xl text-white transition ${pickerOpen ? 'bg-primary-500' : 'bg-white/10 hover:bg-white/20'}`}
              style={{ boxShadow: '0 4px 0 rgba(0,0,0,0.35)' }}
              title="Реакции"
            >
              <Smile size={17} />
            </button>
            <AnimatePresence>
              {pickerOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="absolute bottom-14 left-1/2 w-[320px] -translate-x-1/2 rounded-3xl border-2 border-white/15 bg-[#111]/95 p-3 backdrop-blur-xl"
                  style={{ boxShadow: '0 8px 0 rgba(0,0,0,0.45)' }}
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
            className="touch-target flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
            style={{ boxShadow: '0 4px 0 rgba(0,0,0,0.35)' }}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        </div>

        {activePowerUp ? (
          <div className="mt-2 flex justify-center">
            <span className="chunky-pill bg-amber-300 text-slate-900" style={{ boxShadow: '0 3px 0 #b45309' }}>
              <Sparkles size={12} /> Бустер: {POWER_UPS.find(p => p.type === activePowerUp)?.label}
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
                className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                onClick={() => setSheetOpen(false)}
              />
              <motion.div
                initial={{ y: 360 }}
                animate={{ y: 0 }}
                exit={{ y: 360 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                className="absolute inset-x-0 bottom-0 rounded-t-[2rem] border-t-2 border-white/15 bg-[#111] p-5 text-white safe-bottom"
              >
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />

                {showPowerUps ? (
                  <>
                    <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary-300">Бустеры</p>
                    <div className="grid grid-cols-3 gap-3">
                      {POWER_UPS.map(p => (
                        <div key={p.type} className="flex flex-col items-center gap-1">
                          <PowerUpButton p={p} size="h-16 w-16 text-lg" />
                          <span className="text-[10px] font-black text-white/70">{p.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="my-4 h-px bg-white/10" />
                  </>
                ) : null}

                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary-300">Реакции</p>
                <EmojiGrid cols={4} />

                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/15 bg-white/10 px-4 py-3 text-xs font-black text-white"
                    style={{ boxShadow: '0 4px 0 rgba(0,0,0,0.35)' }}
                  >
                    {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    {muted ? 'Включить звук' : 'Выключить звук'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="inline-flex items-center rounded-2xl border-2 border-white/15 bg-white/10 px-4 py-3 text-xs font-black text-white"
                    style={{ boxShadow: '0 4px 0 rgba(0,0,0,0.35)' }}
                  >
                    Закрыть
                  </button>
                </div>

                {activePowerUp ? (
                  <div className="mt-4 rounded-2xl border-2 border-amber-400/40 bg-amber-400/15 px-3 py-2 text-center text-xs font-black text-amber-200">
                    <Sparkles size={12} className="mr-1 inline" /> Активен: {POWER_UPS.find(p => p.type === activePowerUp)?.label}
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

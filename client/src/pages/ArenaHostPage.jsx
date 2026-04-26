import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, BookOpen, Clock, Copy, Crown, Eye, Hash, Medal, Pause, Play, Plus,
  QrCode, Share2, Shield, ShieldCheck, SkipForward, Smartphone, Sparkles, Trophy, Tv, UserX, Users, X, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { connectArenaSocket, disconnectArenaSocket, getArenaSocket } from '../services/arenaSocket';
import ArenaQuestionPanel from '../components/arena/ArenaQuestionPanel';
import ArenaStandings from '../components/arena/ArenaStandings';
import ArenaJoinQR from '../components/arena/ArenaJoinQR';
import ArenaGameplayOverlay from '../components/arena/ArenaGameplayOverlay';
import BrandLogo from '../components/BrandLogo';
import Confetti from '../components/ui/Confetti';

const ARENA_EVENTS = [
  'arena:state', 'arena:lobbyState', 'arena:countdown', 'arena:questionIntro',
  'arena:question', 'arena:answerReveal', 'arena:leaderboard', 'arena:roundResult', 'arena:final'
];

const computeTimeLeft = (target) => target ? Math.max(0, new Date(target).getTime() - Date.now()) : 0;
const getPhaseEnd = (room) => room?.phaseEndsAt
  || room?.countdownEndsAt || room?.questionIntroEndsAt
  || room?.questionEndsAt || room?.answerRevealEndsAt
  || room?.leaderboardEndsAt || null;

function statusLabel(status) {
  switch (status) {
    case 'lobby': return 'Лобби';
    case 'countdown':
    case 'starting_countdown': return 'Старт';
    case 'question_intro': return 'Вопрос';
    case 'live_question': return 'Ответы';
    case 'answer_reveal': return 'Правильный ответ';
    case 'leaderboard':
    case 'round_result': return 'Рейтинг';
    case 'final': return 'Финал';
    case 'paused': return 'Пауза';
    default: return 'Arena';
  }
}

// Hash a string to a hue 0-360 for consistent gradient avatars per name.
function hashHue(input = '') {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) hash = (hash * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
}

function getInitials(participant) {
  const user = participant?.user;
  if (user?.firstName || user?.lastName) {
    return `${(user.firstName || '').charAt(0)}${(user.lastName || '').charAt(0)}`.toUpperCase() || '??';
  }
  const name = participant?.guestName || participant?.displayName || '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) || '??').toUpperCase();
}

function Avatar({ participant, size = 56 }) {
  const url = participant?.user?.avatar;
  const initials = getInitials(participant);
  const hue = hashHue(participant?.displayName || participant?.guestName || initials);
  const fontSize = Math.round(size * 0.38);

  if (url) {
    return (
      <img
        src={url}
        alt={participant?.displayName || 'Player'}
        width={size}
        height={size}
        className="rounded-full border-2 border-slate-900 object-cover dark:border-white"
        style={{ width: size, height: size, boxShadow: '0 3px 0 var(--shadow-chunky, #1f1a14)' }}
      />
    );
  }
  return (
    <div
      className="grid place-items-center rounded-full border-2 border-slate-900 font-black text-white dark:border-white"
      style={{
        width: size,
        height: size,
        fontSize,
        background: `linear-gradient(135deg, hsl(${hue} 75% 55%), hsl(${(hue + 40) % 360} 70% 45%))`,
        boxShadow: '0 3px 0 var(--shadow-chunky, #1f1a14)'
      }}
    >
      {initials}
    </div>
  );
}

function MetaChip({ icon: Icon, label, tone = 'default' }) {
  const tones = {
    default: 'bg-white text-slate-900 border-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:border-white',
    primary: 'bg-primary-500 text-white border-primary-700',
    amber: 'bg-amber-400 text-slate-900 border-amber-600'
  };
  const shadow = tone === 'primary' ? '0 3px 0 #9a3412' : tone === 'amber' ? '0 3px 0 #b45309' : '0 3px 0 var(--shadow-chunky, #1f1a14)';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${tones[tone] || tones.default}`}
      style={{ boxShadow: shadow }}
    >
      {Icon ? <Icon size={13} strokeWidth={2.6} /> : null}
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}

function PlayerTile({ participant, onKick }) {
  const name = participant.displayName || participant.guestName || 'Игрок';
  const isOnline = participant.state === 'joined';
  return (
    <motion.div
      layout
      initial={{ scale: 0, y: 24, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      className="group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 border-slate-900 bg-white p-2 dark:border-white dark:bg-slate-800"
      style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
    >
      <div className="relative">
        <Avatar participant={participant} size={48} />
        <span
          className={`absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-800 ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}
          aria-label={isOnline ? 'online' : 'offline'}
        />
      </div>
      <span className="max-w-full truncate text-[11px] font-black text-slate-900 dark:text-white" title={name}>{name}</span>
      {onKick && (
        <button
          type="button"
          onClick={() => onKick(participant._id, name)}
          className="absolute -right-1.5 -top-1.5 hidden h-6 w-6 items-center justify-center rounded-full border-2 border-slate-900 bg-red-500 text-white shadow-[0_2px_0_#7f1d1d] group-hover:flex dark:border-white"
          title="Исключить"
          aria-label={`Исключить ${name}`}
        >
          <UserX size={11} strokeWidth={3} />
        </button>
      )}
    </motion.div>
  );
}

function EmptyTile({ index = 0 }) {
  return (
    <motion.div
      animate={{ opacity: [0.45, 0.7, 0.45] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: (index % 8) * 0.12 }}
      className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-2 dark:border-slate-700 dark:bg-slate-800/50"
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-200 dark:bg-slate-700">
        <Users size={18} className="text-slate-400 dark:text-slate-500" />
      </div>
      <span className="h-2.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden />
    </motion.div>
  );
}

function CountdownRing({ secondsLeft, totalSeconds = 5 }) {
  const ratio = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  const size = 480;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);

  return (
    <div className="relative" style={{ width: size, height: size, maxWidth: '92vmin', maxHeight: '92vmin' }}>
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-slate-200 dark:text-slate-700" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" fill="none"
          className="text-primary-500"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 200ms linear' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <motion.p
          key={secondsLeft}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          className="font-black leading-none text-slate-900 dark:text-white"
          style={{ fontSize: 'clamp(7rem, 22vmin, 16rem)' }}
        >
          {secondsLeft}
        </motion.p>
      </div>
    </div>
  );
}

function PinModal({ pin, joinDomain, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 grid cursor-pointer place-items-center arena-stage-bg p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Код входа"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex h-11 items-center gap-2 rounded-2xl border-2 border-slate-900 bg-white px-3 text-sm font-black text-slate-900 dark:border-white dark:bg-slate-800 dark:text-white"
        style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
        aria-label="Закрыть"
      >
        <X size={16} strokeWidth={3} /> Esc
      </button>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="text-center"
      >
        <p className="text-[12px] font-black uppercase tracking-[0.32em] text-primary-600 dark:text-primary-300 sm:text-sm">
          Заходи на
        </p>
        <p className="mt-2 font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">{joinDomain}</p>
        <p
          className="mt-8 select-all font-mono font-black leading-none text-slate-900 dark:text-white"
          style={{ fontSize: 'clamp(6rem, 24vmin, 18rem)', letterSpacing: '0.14em' }}
        >
          {pin}
        </p>
        <p className="mt-8 text-sm font-bold text-slate-500 dark:text-slate-400">Нажми в любом месте или ESC чтобы закрыть</p>
      </motion.div>
    </motion.div>
  );
}

function QrModal({ url, domain, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 grid cursor-pointer place-items-center arena-stage-bg p-6"
      role="dialog"
      aria-modal="true"
      aria-label="QR-код для входа"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex h-11 items-center gap-2 rounded-2xl border-2 border-slate-900 bg-white px-3 text-sm font-black text-slate-900 dark:border-white dark:bg-slate-800 dark:text-white"
        style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
        aria-label="Закрыть"
      >
        <X size={16} strokeWidth={3} /> Esc
      </button>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="flex cursor-default flex-col items-center gap-4 rounded-3xl border-2 border-slate-900 bg-white p-6 dark:border-white dark:bg-slate-900"
        style={{ boxShadow: '0 8px 0 var(--shadow-chunky, #1f1a14)' }}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400 sm:text-xs">Сканируй камерой</p>
        <ArenaJoinQR url={url} size={400} caption="" />
        <p className="font-mono text-sm font-black text-slate-500 dark:text-slate-400">{domain}</p>
      </motion.div>
    </motion.div>
  );
}

function PodiumCard({ rank, participant }) {
  const tone = rank === 1
    ? { card: 'bg-amber-400 text-slate-900 border-amber-600', shadow: '0 6px 0 #b45309', icon: Crown, label: '1 место', height: 'lg:h-72', delay: 0.1 }
    : rank === 2
      ? { card: 'bg-white text-slate-900 border-slate-900 dark:bg-slate-800 dark:text-white dark:border-white', shadow: '0 6px 0 var(--shadow-chunky, #1f1a14)', icon: Medal, label: '2 место', height: 'lg:h-60', delay: 0.25 }
      : { card: 'bg-primary-500 text-white border-primary-700', shadow: '0 6px 0 #9a3412', icon: Medal, label: '3 место', height: 'lg:h-52', delay: 0.4 };
  const Icon = tone.icon;
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 20, delay: tone.delay }}
      className={`flex flex-col items-center justify-end rounded-3xl border-2 p-4 ${tone.card} ${tone.height}`}
      style={{ boxShadow: tone.shadow }}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-current bg-white/20">
        <Icon size={22} strokeWidth={2.6} />
      </div>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] opacity-80">{tone.label}</p>
      <div className="mt-3"><Avatar participant={participant} size={72} /></div>
      <p className="mt-3 max-w-full truncate text-base font-black" title={participant?.displayName}>{participant?.displayName || '—'}</p>
      <p className="mt-1 font-mono text-2xl font-black tabular-nums">{participant?.score || 0}</p>
    </motion.div>
  );
}

function HostActionBtn({ children, variant = 'ghost', title, onClick, disabled }) {
  const base = 'touch-target inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 font-black text-sm transition-transform active:translate-y-[3px]';
  const tones = {
    ghost: 'bg-white text-slate-900 border-2 border-slate-900 dark:bg-slate-800 dark:text-white dark:border-white',
    primary: 'bg-amber-400 text-slate-900 border-2 border-amber-600',
    success: 'bg-emerald-500 text-white border-2 border-emerald-700',
    warning: 'bg-amber-500 text-white border-2 border-amber-700',
    danger: 'bg-red-500 text-white border-2 border-red-700'
  };
  const shadowMap = {
    ghost: '0 4px 0 var(--shadow-chunky, #1f1a14)',
    primary: '0 4px 0 #b45309',
    success: '0 4px 0 #065f46',
    warning: '0 4px 0 #b45309',
    danger: '0 4px 0 #7f1d1d'
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${tones[variant] || tones.ghost} h-11 disabled:opacity-40 disabled:cursor-not-allowed`}
      style={{ boxShadow: shadowMap[variant] || shadowMap.ghost }}
    >
      {children}
    </button>
  );
}

export default function ArenaHostPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);

  // ESC closes modals / exits present mode.
  useEffect(() => {
    if (!pinModalOpen && !qrModalOpen && !isPresenting) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') {
        setPinModalOpen(false);
        setQrModalOpen(false);
        setIsPresenting(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pinModalOpen, qrModalOpen, isPresenting]);

  // Lock body scroll while a modal is open.
  useEffect(() => {
    if (!pinModalOpen && !qrModalOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [pinModalOpen, qrModalOpen]);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await api.get(`/arena/rooms/${roomId}`);
      setRoom(res.data.room);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Не удалось открыть комнату ведущего');
      navigate('/arena');
    } finally {
      setLoading(false);
    }
  }, [navigate, roomId]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  useEffect(() => {
    if (!room?._id) return undefined;
    const socket = connectArenaSocket() || getArenaSocket();
    if (!socket) return undefined;
    const handleState = (nextRoom) => setRoom(nextRoom);
    const handleError = ({ message }) => { if (message) toast.error(message); };
    ARENA_EVENTS.forEach(e => socket.on(e, handleState));
    socket.on('arena:error', handleError);
    socket.emit('arena:join', { roomId: room._id });
    return () => {
      socket.emit('arena:leave', { roomId: room._id });
      ARENA_EVENTS.forEach(e => socket.off(e, handleState));
      socket.off('arena:error', handleError);
      disconnectArenaSocket();
    };
  }, [room?._id]);

  useEffect(() => {
    const phaseEnd = getPhaseEnd(room);
    if (!phaseEnd) { setTimeLeftMs(0); return undefined; }
    const update = () => setTimeLeftMs(computeTimeLeft(phaseEnd));
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [
    room?.phaseEndsAt, room?.countdownEndsAt, room?.questionIntroEndsAt,
    room?.questionEndsAt, room?.answerRevealEndsAt, room?.leaderboardEndsAt
  ]);

  const runHostAction = async (kind, body) => {
    if (!room?._id) return;
    setActionBusy(true);
    try {
      const res = await api.post(`/arena/rooms/${room._id}/${kind}`, body || {});
      if (res.data?.room) setRoom(res.data.room);
      if (kind === 'cancel') toast.success('Арена отменена');
      if (kind === 'pause') toast.success('Пауза');
      if (kind === 'resume') toast.success('Продолжаем');
      if (kind === 'extend-timer') toast.success(`+${body?.extraSec || 15} сек`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка действия арены');
    } finally {
      setActionBusy(false);
    }
  };

  const kickParticipant = async (participantId, displayName) => {
    if (!participantId) return;
    setActionBusy(true);
    try {
      const res = await api.post(`/arena/rooms/${roomId}/kick/${participantId}`);
      if (res.data?.room) setRoom(res.data.room);
      toast.success(`${displayName || 'Игрок'} исключён`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Не удалось исключить игрока');
    } finally {
      setActionBusy(false);
    }
  };

  const participants = useMemo(() => room?.participants || [], [room?.participants]);
  const onlineCount = participants.filter(p => p.state === 'joined').length;
  const showAnswer = room?.status === 'answer_reveal' || room?.status === 'leaderboard' || room?.status === 'round_result';
  const isCountdown = room?.status === 'countdown' || room?.status === 'starting_countdown';

  const PAUSABLE = ['starting_countdown', 'countdown', 'question_intro', 'live_question', 'answer_reveal', 'leaderboard', 'round_result'];
  const canPause = PAUSABLE.includes(room?.status);
  const isPaused = room?.status === 'paused';
  const canExtend = PAUSABLE.includes(room?.status);
  const isFinal = room?.status === 'final';

  if (loading || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center arena-stage-bg">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-primary-500 dark:border-slate-700" />
      </div>
    );
  }

  const countdownSec = Math.max(0, Math.ceil(timeLeftMs / 1000));
  const joinUrl = `${window.location.origin}/arena/code/${room.joinCode}`;
  const joinDomain = `${window.location.host}/arena`;
  const isLobby = room.status === 'lobby';
  const isEndState = ['final', 'cancelled', 'declined'].includes(room.status);
  const showCommandBar = isLobby || isEndState;

  const copyJoinLink = () => {
    navigator.clipboard.writeText(joinUrl);
    toast.success('Ссылка скопирована');
  };
  const shareJoinLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'UniTest Arena', text: `Заходи в арену: код ${room.joinCode}`, url: joinUrl });
      } catch (_) { /* user cancelled */ }
    } else {
      copyJoinLink();
    }
  };

  return (
    <div className="min-h-screen arena-stage-bg text-slate-900 dark:text-white">
      {isFinal ? <Confetti active duration={3000} /> : null}

      <div className={`relative z-10 flex min-h-screen flex-col p-4 lg:p-6 ${showCommandBar ? 'pb-32' : 'pb-8'}`}>
        {/* HEADER */}
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/arena')}
              className="touch-target grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl border-2 border-slate-900 bg-white text-slate-900 dark:border-white dark:bg-slate-800 dark:text-slate-100"
              style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
              aria-label="Назад"
            >
              <ArrowLeft size={18} strokeWidth={2.6} />
            </button>
            <div className="hidden rounded-2xl bg-white px-3 py-2 dark:bg-slate-800 sm:block">
              <BrandLogo />
            </div>
            {isLobby ? (
              <div className="hidden min-w-0 flex-col leading-tight md:flex">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-primary-600 dark:text-primary-300">LIVE NOW</span>
                <span className="max-w-[280px] truncate text-sm font-black text-slate-900 dark:text-white" title={room.title}>{room.title}</span>
              </div>
            ) : (
              <span
                className="hidden chunky-pill border-2 border-primary-700 bg-primary-500 text-white sm:inline-flex"
                style={{ boxShadow: '0 3px 0 #9a3412' }}
              >
                {statusLabel(room.status)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {isLobby && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-white px-3 py-2 text-sm font-black tabular-nums text-slate-900 dark:border-white dark:bg-slate-800 dark:text-white"
                style={{ boxShadow: '0 3px 0 var(--shadow-chunky, #1f1a14)' }}
                title="Игроки в лобби"
              >
                <Users size={15} strokeWidth={2.6} /> {participants.length}/{room.settings?.maxPlayers || 100}
              </span>
            )}
            <Link
              to={`/arena/code/${room.joinCode}`}
              target="_blank"
              rel="noreferrer"
              className="touch-target hidden h-11 items-center gap-2 rounded-2xl border-2 border-slate-900 bg-white px-3 text-sm font-black text-slate-900 dark:border-white dark:bg-slate-800 dark:text-slate-100 md:inline-flex"
              style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
              title="Открыть player-вид в новой вкладке"
            >
              <Smartphone size={15} /> Player
            </Link>
            {canExtend && (
              <HostActionBtn variant="success" title="+15 сек" onClick={() => runHostAction('extend-timer', { extraSec: 15 })} disabled={actionBusy}>
                <Plus size={15} /> 15s
              </HostActionBtn>
            )}
            {canPause && (
              <HostActionBtn variant="warning" title="Пауза" onClick={() => runHostAction('pause')} disabled={actionBusy}>
                <Pause size={16} />
              </HostActionBtn>
            )}
            {isPaused && (
              <HostActionBtn variant="success" title="Продолжить" onClick={() => runHostAction('resume')} disabled={actionBusy}>
                <Play size={16} />
              </HostActionBtn>
            )}
            {!isLobby && !isEndState && (
              <HostActionBtn variant="primary" title="Пропустить фазу" onClick={() => runHostAction('skip')} disabled={actionBusy}>
                <SkipForward size={16} />
              </HostActionBtn>
            )}
            {!isEndState && (
              <HostActionBtn variant="danger" title={isLobby ? 'Закрыть лобби' : 'Завершить матч'} onClick={() => runHostAction('cancel')} disabled={actionBusy}>
                <XCircle size={16} />
              </HostActionBtn>
            )}
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6">
          {/* LOBBY */}
          {isLobby && (
            <>
              {isPresenting ? (
                /* PRESENT MODE: full broadcast stage (PIN + QR for projector) */
                <section className="grid items-center gap-8 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12 lg:py-8 [&>*]:min-w-0">
                  <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                    <p className="text-[11px] font-black uppercase tracking-[0.32em] text-primary-600 dark:text-primary-300">
                      Заходи на
                    </p>
                    <button
                      type="button"
                      onClick={copyJoinLink}
                      className="mt-2 inline-flex items-center gap-2 font-mono text-2xl font-black tracking-tight text-slate-900 hover:opacity-70 dark:text-white sm:text-3xl"
                      title="Скопировать ссылку"
                    >
                      <span>{joinDomain}</span>
                      <Copy size={18} className="opacity-50" />
                    </button>
                    <p
                      className="mt-6 select-all font-mono font-black leading-none text-slate-900 dark:text-white"
                      style={{ fontSize: 'clamp(5rem, 18vmin, 14rem)', letterSpacing: '0.14em' }}
                    >
                      {room.joinCode}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                      <button type="button" onClick={copyJoinLink} className="chunky-btn chunky-btn-ghost">
                        <Copy size={15} /> Скопировать ссылку
                      </button>
                      <button type="button" onClick={shareJoinLink} className="chunky-btn chunky-btn-ghost">
                        <Share2 size={15} /> Поделиться
                      </button>
                    </div>
                  </div>

                  <div className="grid place-items-center">
                    <div
                      className="flex flex-col items-center gap-3 rounded-3xl border-2 border-slate-900 bg-white p-5 dark:border-white dark:bg-slate-900"
                      style={{ boxShadow: '0 8px 0 var(--shadow-chunky, #1f1a14)' }}
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
                        Сканируй камерой
                      </p>
                      <ArenaJoinQR url={joinUrl} size={280} caption="" />
                      <p className="font-mono text-[11px] font-black tracking-tight text-slate-500 dark:text-slate-400">
                        {joinDomain}/code/{room.joinCode}
                      </p>
                    </div>
                  </div>
                </section>
              ) : (
                /* COMPACT CODE BANNER: slim row with code chip + show-buttons */
                <section
                  className="flex flex-wrap items-center gap-2 rounded-3xl border-2 border-slate-900 bg-white px-3 py-3 dark:border-white dark:bg-slate-900 sm:gap-3 sm:px-4"
                  style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
                >
                  <button
                    type="button"
                    onClick={copyJoinLink}
                    className="inline-flex items-center gap-2 rounded-2xl border-2 border-primary-700 bg-primary-500 px-3 py-2 text-white transition-transform active:translate-y-[2px]"
                    style={{ boxShadow: '0 3px 0 #9a3412' }}
                    title="Скопировать ссылку"
                  >
                    <Hash size={15} strokeWidth={2.6} />
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] opacity-80">КОД</span>
                    <span className="font-mono text-lg font-black tracking-[0.18em] sm:text-xl">{room.joinCode}</span>
                    <Copy size={13} className="opacity-70" />
                  </button>

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setPinModalOpen(true)} className="chunky-btn chunky-btn-ghost" title="Показать PIN на весь экран">
                      <Eye size={15} /> <span className="hidden sm:inline">Показать PIN</span><span className="sm:hidden">PIN</span>
                    </button>
                    <button type="button" onClick={() => setQrModalOpen(true)} className="chunky-btn chunky-btn-ghost" title="Показать QR на весь экран">
                      <QrCode size={15} /> <span className="hidden sm:inline">Показать QR</span><span className="sm:hidden">QR</span>
                    </button>
                    <button type="button" onClick={() => setIsPresenting(true)} className="chunky-btn chunky-btn-ghost" title="Перевести в режим презентации (проектор)">
                      <Tv size={15} /> <span className="hidden md:inline">Презентация</span>
                    </button>
                    <button type="button" onClick={shareJoinLink} className="chunky-btn chunky-btn-ghost" title="Поделиться ссылкой">
                      <Share2 size={15} /> <span className="hidden md:inline">Поделиться</span>
                    </button>
                  </div>
                </section>
              )}

              {/* PLAYERS WALL */}
              <section
                className="rounded-[2rem] border-2 border-slate-900 bg-white p-5 dark:border-white dark:bg-slate-900"
                style={{ boxShadow: '0 6px 0 var(--shadow-chunky, #1f1a14)' }}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.32em] text-primary-600 dark:text-primary-300">Игроки</p>
                    <h2 className="text-xl font-black tabular-nums sm:text-2xl">
                      {participants.length}{' '}
                      <span className="text-slate-400 dark:text-slate-500">/ {room.settings?.maxPlayers || 100}</span>
                    </h2>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-600 bg-emerald-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-300"
                    style={{ boxShadow: '0 3px 0 #047857' }}
                  >
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    {onlineCount} online
                  </span>
                </div>

                {participants.length === 0 ? (
                  <>
                    <div className="grid grid-cols-4 gap-2 [&>*]:min-w-0 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
                      {Array.from({ length: 12 }, (_, i) => <EmptyTile key={i} index={i} />)}
                    </div>
                    <p className="mt-4 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                      Ждём игроков. Пусть сканируют QR ↑
                    </p>
                  </>
                ) : (
                  <motion.div
                    layout
                    className="grid grid-cols-4 gap-2 [&>*]:min-w-0 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12"
                  >
                    <AnimatePresence>
                      {participants.map(p => (
                        <PlayerTile key={p._id} participant={p} onKick={kickParticipant} />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </section>
            </>
          )}

          {/* COUNTDOWN — full takeover with ring + avatars */}
          {isCountdown && (
            <section className="grid flex-1 place-items-center">
              <div className="flex flex-col items-center gap-6 sm:gap-8">
                <span
                  className="chunky-pill border-2 border-primary-700 bg-primary-500 text-white"
                  style={{ boxShadow: '0 3px 0 #9a3412' }}
                >
                  <Sparkles size={13} strokeWidth={2.6} /> Матч начинается
                </span>
                <CountdownRing secondsLeft={countdownSec} totalSeconds={room.settings?.countdownSeconds || 5} />
                {participants.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {participants.slice(0, 8).map((p, i) => (
                      <motion.div
                        key={p._id}
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
                      >
                        <Avatar participant={p} size={44} />
                      </motion.div>
                    ))}
                    {participants.length > 8 && (
                      <span className="ml-2 text-sm font-black text-slate-600 dark:text-slate-300">
                        +{participants.length - 8}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-sm font-black text-slate-600 dark:text-slate-300">Готовы. Стартуем.</p>
              </div>
            </section>
          )}

          {/* QUESTION INTRO — compact: pill + question text + countdown ring */}
          {room.status === 'question_intro' && (
            <section className="grid flex-1 place-items-center">
              <div className="flex w-full max-w-4xl flex-col items-center gap-6 text-center">
                <span
                  className="chunky-pill border-2 border-primary-700 bg-primary-500 text-white"
                  style={{ boxShadow: '0 3px 0 #9a3412' }}
                >
                  <Sparkles size={13} strokeWidth={2.6} /> Вопрос {room.currentQuestion?.questionNumber}/{room.currentQuestion?.totalQuestions}
                </span>
                <h1
                  className="prose prose-headings:!my-0 max-w-3xl text-2xl font-black leading-tight tracking-tight text-slate-900 dark:prose-invert prose-p:!my-0 prose-strong:font-black dark:text-white sm:text-3xl md:text-4xl"
                  dangerouslySetInnerHTML={{ __html: room.currentQuestion?.questionText || '' }}
                />
                <CountdownRing secondsLeft={countdownSec} totalSeconds={Math.max(countdownSec, 3)} />
                <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Готовьтесь отвечать</p>
              </div>
            </section>
          )}

          {/* QUESTION — kept */}
          {(room.status === 'live_question' || room.status === 'answer_reveal') && (
            <ArenaQuestionPanel
              question={room.currentQuestion}
              timeLeftMs={timeLeftMs}
              mode="host"
              showAnswer={showAnswer}
              answerStats={room.answerStats}
            />
          )}

          {/* LEADERBOARD — compact header + dominant standings */}
          {(room.status === 'leaderboard' || room.status === 'round_result') && (
            <section className="flex flex-1 flex-col gap-4">
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-slate-900 bg-primary-500 px-5 py-4 text-white dark:border-white sm:px-6"
                style={{ boxShadow: '0 5px 0 #9a3412' }}
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.32em] text-white/80">Leaderboard</p>
                  <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                    {room.status === 'round_result' ? 'Итоги раунда' : 'Текущий топ'}
                  </h1>
                </div>
                <div
                  className="flex items-center gap-2 rounded-2xl border-2 border-white/40 bg-white/15 px-3 py-2"
                  style={{ boxShadow: '0 3px 0 #7c2d12' }}
                >
                  <Clock size={16} strokeWidth={2.6} />
                  <span className="font-mono text-2xl font-black tabular-nums sm:text-3xl">{countdownSec}с</span>
                </div>
              </div>
              <div className="flex-1">
                <ArenaStandings participants={participants} title="Рейтинг" limit={10} />
              </div>
            </section>
          )}

          {/* PAUSED */}
          {isPaused && (
            <section className="grid flex-1 place-items-center">
              <div
                className="flex flex-col items-center gap-3 rounded-3xl border-2 border-amber-600 bg-amber-400 p-8 text-center text-slate-900"
                style={{ boxShadow: '0 6px 0 #b45309' }}
              >
                <Pause size={48} strokeWidth={2.4} />
                <h2 className="text-3xl font-black">Пауза</h2>
                <p className="text-sm font-bold opacity-80">Нажмите ▶ чтобы продолжить</p>
              </div>
            </section>
          )}

          {/* FINAL — podium + roster */}
          {isEndState && (
            <section className="flex flex-1 flex-col gap-6 pt-2">
              <div className="text-center">
                <span
                  className="chunky-pill border-2 border-primary-700 bg-primary-500 text-white"
                  style={{ boxShadow: '0 3px 0 #9a3412' }}
                >
                  <Trophy size={13} strokeWidth={2.6} /> {room.status === 'final' ? 'Финал' : 'Закрыто'}
                </span>
                <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl md:text-7xl">
                  {room.status === 'final' ? 'Матч завершён' : 'Комната закрыта'}
                </h1>
                <p className="mt-2 truncate text-sm font-bold text-slate-600 dark:text-slate-300">{room.title}</p>
              </div>

              {room.status === 'final' && participants.length > 0 && (
                <div className="grid grid-cols-3 gap-3 [&>*]:min-w-0 sm:gap-6 lg:items-end">
                  <div>{participants[1] ? <PodiumCard rank={2} participant={participants[1]} /> : null}</div>
                  <div>{participants[0] ? <PodiumCard rank={1} participant={participants[0]} /> : null}</div>
                  <div>{participants[2] ? <PodiumCard rank={3} participant={participants[2]} /> : null}</div>
                </div>
              )}

              {room.status === 'final' && participants.length > 3 && (
                <div
                  className="rounded-3xl border-2 border-slate-900 bg-white p-4 dark:border-white dark:bg-slate-900"
                  style={{ boxShadow: '0 6px 0 var(--shadow-chunky, #1f1a14)' }}
                >
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.32em] text-primary-600 dark:text-primary-300">Все игроки</p>
                  <ul className="grid gap-2">
                    {participants.slice(3).map((p, i) => (
                      <li
                        key={p._id}
                        className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <span className="w-8 text-center font-mono text-sm font-black tabular-nums text-slate-500 dark:text-slate-400">
                          #{i + 4}
                        </span>
                        <Avatar participant={p} size={36} />
                        <span className="flex-1 truncate text-sm font-black">{p.displayName || p.guestName || 'Игрок'}</span>
                        <span className="font-mono text-sm font-black tabular-nums">{p.score || 0}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </main>

        <ArenaGameplayOverlay room={room} participant={null} />
      </div>

      {/* COMMAND BAR — sticky bottom for lobby */}
      {isLobby && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-900 bg-white/95 backdrop-blur-sm dark:border-white dark:bg-slate-900/95"
          style={{ boxShadow: '0 -6px 0 var(--shadow-chunky, #1f1a14)' }}
        >
          <div className="mx-auto flex max-w-screen-2xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4 lg:px-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
              <MetaChip icon={Clock} label={`${room.settings?.answerTimeSec || 20} сек / вопрос`} />
              <MetaChip icon={BookOpen} label={`${room.questionCount || 0} вопросов`} />
              <MetaChip icon={Users} label={`макс. ${room.settings?.maxPlayers || 100}`} />
              <MetaChip
                icon={room.settings?.allowGuests ? ShieldCheck : Shield}
                label={room.settings?.allowGuests ? 'Гости разрешены' : 'Только аккаунты'}
              />
            </div>

            <button
              type="button"
              onClick={() => runHostAction('start')}
              disabled={actionBusy || participants.length === 0}
              className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-primary-700 bg-primary-500 px-8 text-xl font-black uppercase tracking-wide text-white transition-transform active:translate-y-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 sm:w-auto"
              style={{ boxShadow: '0 6px 0 #9a3412' }}
            >
              <Play size={24} strokeWidth={3} fill="currentColor" /> СТАРТ
              {participants.length > 0 ? <ArrowRight size={22} strokeWidth={3} className="ml-1 opacity-90" /> : null}
            </button>
          </div>
          {participants.length === 0 && (
            <p className="px-4 pb-3 text-center text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 sm:hidden">
              Минимум 1 игрок чтобы начать
            </p>
          )}
        </div>
      )}

      {/* PRESENT-MODE EXIT BUTTON (floating top-right when projecting) */}
      {isLobby && isPresenting && (
        <button
          type="button"
          onClick={() => setIsPresenting(false)}
          className="fixed right-4 top-20 z-40 inline-flex h-11 items-center gap-2 rounded-2xl border-2 border-slate-900 bg-white px-3 text-sm font-black text-slate-900 dark:border-white dark:bg-slate-800 dark:text-white"
          style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
          title="Вернуться к управлению"
        >
          <X size={16} strokeWidth={3} /> Закрыть презентацию
        </button>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {pinModalOpen && (
          <PinModal
            key="pin-modal"
            pin={room.joinCode}
            joinDomain={joinDomain}
            onClose={() => setPinModalOpen(false)}
          />
        )}
        {qrModalOpen && (
          <QrModal
            key="qr-modal"
            url={joinUrl}
            domain={`${joinDomain}/code/${room.joinCode}`}
            onClose={() => setQrModalOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* COMMAND BAR — sticky bottom for final */}
      {isEndState && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-slate-900 bg-white/95 backdrop-blur-sm dark:border-white dark:bg-slate-900/95"
          style={{ boxShadow: '0 -6px 0 var(--shadow-chunky, #1f1a14)' }}
        >
          <div className="mx-auto flex max-w-screen-2xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4 lg:px-6">
            <p className="text-sm font-black text-slate-600 dark:text-slate-300">
              {room.status === 'final' ? 'Матч окончен. Спасибо всем!' : 'Комната закрыта.'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/arena" className="chunky-btn chunky-btn-ghost">
                <ArrowLeft size={15} /> В Арену
              </Link>
              {room.status === 'final' && (
                <Link to={`/arena/results/${room._id}`} className="chunky-btn chunky-btn-primary">
                  <Trophy size={16} /> Открыть результаты
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

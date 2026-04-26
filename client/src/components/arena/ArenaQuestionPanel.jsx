import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Circle, Clock3, Diamond, Send, Square, Triangle, X } from 'lucide-react';
import ChunkyTile from '../ui/ChunkyTile';

const TILE_STYLES = [
  { icon: Triangle, color: 'red' },
  { icon: Diamond, color: 'blue' },
  { icon: Circle, color: 'amber' },
  { icon: Square, color: 'emerald' }
];

function formatTimer(ms = 0) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins <= 0) return `${secs}`;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/* Circular timer ring — color shifts red→yellow→green with time remaining */
function TimerRing({ timeLeftMs = 0, totalDurationMs = 30000, size = 96 }) {
  const ratio = Math.max(0, Math.min(1, timeLeftMs / Math.max(1, totalDurationMs)));
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);

  const color = ratio > 0.5
    ? '#10b981' // emerald
    : ratio > 0.25
      ? '#f59e0b' // amber
      : '#ef4444'; // red

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(15,23,42,0.08)"
          strokeWidth="8"
          className="dark:[stroke:rgba(255,255,255,0.08)]"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.4, ease: 'linear' }}
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900 dark:text-white">
        <Clock3 size={14} style={{ color }} />
        <span className="mt-0.5 text-2xl font-black leading-none tabular-nums">{formatTimer(timeLeftMs)}</span>
      </div>
    </div>
  );
}

function getCorrectPairEntries(question) {
  return Object.entries(question?.answerSummary?.correctPairs || {});
}

function getCorrectText(question) {
  if (!question?.answerSummary) return '';
  if (question.type === 'fill-blank') return (question.answerSummary.acceptedAnswers || [])[0] || '';
  if (question.type === 'matching') {
    return getCorrectPairEntries(question)
      .map(([left, right]) => {
        const leftText = (question.options || []).find(option => option.id === left)?.text || left;
        return `${leftText} -> ${right}`;
      })
      .join(' | ');
  }
  const correctIds = new Set(question.answerSummary.correctOptionIds || []);
  return (question.options || [])
    .filter(option => correctIds.has(option.id))
    .map(option => option.text)
    .join(', ');
}

export default function ArenaQuestionPanel({
  question,
  timeLeftMs = 0,
  mode = 'player',
  locked = false,
  onSubmit,
  ack = null,
  showAnswer = false,
  answerStats = null
}) {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [matchingPairs, setMatchingPairs] = useState({});

  useEffect(() => {
    setSelectedOptions([]);
    setTextAnswer('');
    setMatchingPairs({});
  }, [question?.questionId]);

  const isHostView = mode === 'host';
  const canSubmit = useMemo(() => {
    if (!question || locked || isHostView || showAnswer) return false;
    if (question.type === 'fill-blank') return textAnswer.trim().length > 0;
    if (question.type === 'matching') {
      return (question.options || []).every(option => matchingPairs[option.id]);
    }
    return selectedOptions.length > 0;
  }, [question, locked, isHostView, showAnswer, textAnswer, matchingPairs, selectedOptions]);

  if (!question) return null;

  const correctIds = new Set(question.answerSummary?.correctOptionIds || []);
  const correctText = getCorrectText(question);
  const answeredTotal = answerStats?.totalParticipants || 0;
  const progressPercent = answeredTotal
    ? Math.min(100, Math.round((answerStats.answeredCount / answeredTotal) * 100))
    : 0;

  const submitAnswer = (override = {}) => {
    if (locked || isHostView || showAnswer) return;
    const nextSelected = override.selectedOptions || selectedOptions;
    onSubmit?.({
      selectedOptions: nextSelected,
      textAnswer,
      matchingPairs: Object.entries(matchingPairs).map(([left, right]) => ({ left, right }))
    });
  };

  const toggleOption = (optionId) => {
    if (locked || isHostView || showAnswer) return;
    if (question.type === 'multiple-choice') {
      setSelectedOptions(prev =>
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
      );
      return;
    }
    setSelectedOptions([optionId]);
    submitAnswer({ selectedOptions: [optionId] });
  };

  return (
    <section className={`${isHostView ? 'min-h-[70vh]' : 'min-h-[calc(100vh-140px)]'} flex flex-col gap-4 text-slate-900 dark:text-white`}>
      <div
        className="rounded-[2rem] border-2 border-slate-900 bg-white p-4 dark:border-white dark:bg-slate-900 sm:p-6"
        style={{ boxShadow: '0 6px 0 var(--shadow-chunky, #1f1a14)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-900 bg-primary-500 px-3 py-1 font-mono text-xs font-black tracking-[0.2em] text-white dark:border-white"
              style={{ boxShadow: '0 3px 0 #9a3412' }}
            >
              {question.questionNumber}/{question.totalQuestions}
            </div>
            <h2
              className={`${isHostView ? 'mt-5 text-3xl md:text-5xl lg:text-6xl' : 'mt-4 text-2xl sm:text-3xl'} prose prose-headings:!my-0 max-w-none font-black leading-[1.05] tracking-tight dark:prose-invert prose-p:!my-0 prose-strong:font-black`}
              dangerouslySetInnerHTML={{ __html: question.questionText || '' }}
            />
          </div>
          <TimerRing timeLeftMs={timeLeftMs} totalDurationMs={question.totalDurationMs || question.timeLimitMs || 30000} size={isHostView ? 120 : 96} />
        </div>

        {question.passage ? (
          <div className={`${isHostView ? 'max-h-[180px] text-xl' : 'max-h-[140px] text-sm'} mt-5 overflow-auto whitespace-pre-wrap rounded-[1.5rem] border-2 border-slate-200 bg-slate-50 p-4 leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200`}>
            {question.passage}
          </div>
        ) : null}

        {answerStats && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <span>Ответили {answerStats.answeredCount}/{answerStats.totalParticipants}</span>
              {showAnswer && <span>Верно {answerStats.correctCount}</span>}
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
              <div className="h-full rounded-full bg-primary-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </div>

      {(question.type === 'single-choice' || question.type === 'multiple-choice' || question.type === 'true-false') && (
        <div className={`${isHostView ? 'grid flex-1 grid-cols-2' : 'grid flex-1 grid-cols-1 sm:grid-cols-2'} gap-3 sm:gap-4`}>
          {(question.options || []).map((option, index) => {
            const style = TILE_STYLES[index % TILE_STYLES.length];
            const Icon = style.icon;
            const active = selectedOptions.includes(option.id);
            const isCorrect = correctIds.has(option.id);
            const wrongSelected = showAnswer && active && !isCorrect;
            const reveal = showAnswer
              ? isCorrect
                ? 'correct'
                : wrongSelected
                  ? 'wrong'
                  : 'dim'
              : null;

            return (
              <ChunkyTile
                key={option.id}
                color={style.color}
                onClick={() => toggleOption(option.id)}
                disabled={locked || isHostView || showAnswer}
                active={active}
                reveal={reveal}
                className={`${isHostView ? 'p-6 sm:p-8 min-h-[140px]' : 'p-5 min-h-[120px]'}`}
                motionProps={{
                  initial: { opacity: 0, y: 24 },
                  animate: { opacity: 1, y: 0 },
                  transition: { delay: index * 0.06, duration: 0.25, ease: 'easeOut' }
                }}
              >
                <div className="relative z-10 flex h-full flex-col justify-between gap-4">
                  <Icon size={isHostView ? 44 : 30} strokeWidth={3.2} />
                  <div>
                    <p
                      className={`${isHostView ? 'text-2xl md:text-4xl' : 'text-xl sm:text-2xl'} prose prose-p:!my-0 max-w-none font-black leading-tight prose-headings:!my-0 prose-strong:font-black`}
                      dangerouslySetInnerHTML={{ __html: option.text || '' }}
                    />
                    <AnimatePresence>
                      {showAnswer && isCorrect && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-900"
                        >
                          <Check size={12} /> верно
                        </motion.span>
                      )}
                      {showAnswer && wrongSelected && (
                        <motion.span
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white"
                        >
                          <X size={12} /> твой ответ
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </ChunkyTile>
            );
          })}
        </div>
      )}

      {question.type === 'fill-blank' && (
        <div
          className="flex flex-1 flex-col gap-4 rounded-[2rem] border-2 border-slate-900 bg-white p-4 dark:border-white dark:bg-slate-900 sm:p-6"
          style={{ boxShadow: '0 6px 0 var(--shadow-chunky, #1f1a14)' }}
        >
          <textarea
            value={textAnswer}
            disabled={locked || isHostView || showAnswer}
            onChange={(event) => setTextAnswer(event.target.value)}
            className="min-h-[180px] flex-1 resize-none rounded-[1.5rem] border-2 border-slate-300 bg-slate-50 px-5 py-4 text-xl font-black text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            placeholder="Введите ответ"
          />
          {showAnswer && (
            <div className="rounded-[1.5rem] border-2 border-emerald-700 bg-emerald-500 px-5 py-4 text-white" style={{ boxShadow: '0 5px 0 #065f46' }}>
              <p className="text-xs font-black uppercase tracking-[0.18em]">Правильный ответ</p>
              <p className="mt-1 text-2xl font-black">{correctText || 'Ответ не указан'}</p>
            </div>
          )}
        </div>
      )}

      {question.type === 'matching' && (
        <div
          className="flex flex-1 flex-col gap-3 rounded-[2rem] border-2 border-slate-900 bg-white p-4 dark:border-white dark:bg-slate-900"
          style={{ boxShadow: '0 6px 0 var(--shadow-chunky, #1f1a14)' }}
        >
          {(question.options || []).map(option => (
            <div key={option.id} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
              <div className="rounded-[1.35rem] border-2 border-slate-300 bg-slate-50 px-4 py-4 text-base font-black text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                {option.text}
              </div>
              <select
                value={matchingPairs[option.id] || ''}
                disabled={locked || isHostView || showAnswer}
                onChange={(event) => setMatchingPairs(prev => ({ ...prev, [option.id]: event.target.value }))}
                className="rounded-[1.35rem] border-2 border-slate-300 bg-white px-4 py-4 text-sm font-black text-slate-900 outline-none transition focus:border-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Выбери пару</option>
                {(question.matchingRightSide || []).map(rightOption => (
                  <option key={rightOption.id} value={rightOption.text}>{rightOption.text}</option>
                ))}
              </select>
            </div>
          ))}
          {showAnswer && correctText && (
            <div
              className="rounded-[1.5rem] border-2 border-emerald-700 bg-emerald-400 px-5 py-4 text-sm font-black text-slate-900"
              style={{ boxShadow: '0 4px 0 #065f46' }}
            >
              {correctText}
            </div>
          )}
        </div>
      )}

      {!isHostView && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border-2 border-slate-900 bg-white p-3 dark:border-white dark:bg-slate-900"
          style={{ boxShadow: '0 4px 0 var(--shadow-chunky, #1f1a14)' }}
        >
          <AnimatePresence mode="wait">
            {ack ? (
              <motion.div
                key="ack"
                initial={{ opacity: 0, y: 12, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-300"
              >
                <Check size={16} strokeWidth={2.8} /> Ответ принят
                {ack.pointsAwarded ? (
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="ml-1 rounded-full border-2 border-emerald-700 bg-emerald-300 px-2 py-0.5 text-xs font-black text-slate-900"
                    style={{ boxShadow: '0 2px 0 #065f46' }}
                  >
                    +{ack.pointsAwarded}
                  </motion.span>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-black text-slate-500 dark:text-slate-400"
              >
                {locked
                  ? 'Ответ уже отправлен'
                  : question.type === 'single-choice' || question.type === 'true-false'
                    ? 'Нажми на плитку'
                    : 'Собери ответ и отправь'}
              </motion.div>
            )}
          </AnimatePresence>
          {(question.type === 'multiple-choice' || question.type === 'matching' || question.type === 'fill-blank') && !showAnswer && (
            <button
              type="button"
              onClick={() => submitAnswer()}
              disabled={!canSubmit}
              className="chunky-btn-primary"
            >
              <Send size={16} /> Отправить
            </button>
          )}
        </div>
      )}

      {showAnswer && correctText && question.type !== 'fill-blank' && question.type !== 'matching' && (
        <div className="rounded-[1.5rem] border-2 border-emerald-700 bg-emerald-500 px-5 py-4 text-white" style={{ boxShadow: '0 5px 0 #065f46' }}>
          <p className="text-xs font-black uppercase tracking-[0.18em]">Правильный ответ</p>
          <p className="mt-1 text-xl font-black">{correctText}</p>
        </div>
      )}
    </section>
  );
}

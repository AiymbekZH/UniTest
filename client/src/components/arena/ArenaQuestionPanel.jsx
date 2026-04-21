import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Clock4, Diamond, Send, Square, Triangle, XCircle } from 'lucide-react';

const TILE_STYLES = [
  {
    icon: Triangle,
    base: 'from-red-500 to-rose-600',
    border: 'border-red-300',
    ring: 'ring-red-200'
  },
  {
    icon: Diamond,
    base: 'from-blue-500 to-sky-600',
    border: 'border-blue-300',
    ring: 'ring-blue-200'
  },
  {
    icon: Circle,
    base: 'from-amber-400 to-orange-500',
    border: 'border-amber-300',
    ring: 'ring-amber-200'
  },
  {
    icon: Square,
    base: 'from-emerald-500 to-green-600',
    border: 'border-emerald-300',
    ring: 'ring-emerald-200'
  }
];

function formatTimer(ms = 0) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins <= 0) return `${secs}`;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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

  const progressPercent = answerStats?.totalParticipants
    ? Math.min(100, Math.round((answerStats.answeredCount / answerStats.totalParticipants) * 100))
    : 0;

  return (
    <section className={`${isHostView ? 'min-h-[62vh]' : ''} overflow-hidden rounded-[2rem] border border-white/60 bg-white/95 shadow-[0_32px_90px_-46px_rgba(15,23,42,0.65)] dark:border-slate-700 dark:bg-slate-950/90`}>
      <div className="border-b border-gray-100 bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 p-5 text-white dark:border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">Вопрос {question.questionNumber} / {question.totalQuestions}</p>
            <h2 className={`${isHostView ? 'mt-3 text-4xl lg:text-6xl' : 'mt-2 text-2xl'} font-black leading-tight tracking-tight`}>
              {question.questionText}
            </h2>
            {question.passage ? (
              <p className={`${isHostView ? 'mt-4 max-h-40 text-lg' : 'mt-3 max-h-28 text-sm'} overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/10 p-4 leading-7 text-white/80`}>
                {question.passage}
              </p>
            ) : null}
          </div>
          <div className="flex min-w-[96px] flex-col items-center rounded-[1.5rem] bg-white px-5 py-4 text-slate-950 shadow-xl">
            <Clock4 size={20} className="text-orange-500" />
            <span className="text-4xl font-black leading-none">{formatTimer(timeLeftMs)}</span>
            <span className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">сек</span>
          </div>
        </div>

        {answerStats && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-white/70">
              <span>Ответили {answerStats.answeredCount}/{answerStats.totalParticipants}</span>
              {showAnswer && <span>Верно {answerStats.correctCount}</span>}
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-orange-400 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6">
        {(question.type === 'single-choice' || question.type === 'multiple-choice' || question.type === 'true-false') && (
          <div className={`${isHostView ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} grid gap-4`}>
            {(question.options || []).map((option, index) => {
              const style = TILE_STYLES[index % TILE_STYLES.length];
              const Icon = style.icon;
              const active = selectedOptions.includes(option.id);
              const isCorrect = correctIds.has(option.id);
              const isWrongSelected = showAnswer && active && !isCorrect;
              const tileState = showAnswer
                ? isCorrect
                  ? 'ring-4 ring-emerald-300 brightness-110'
                  : isWrongSelected
                    ? 'opacity-80 grayscale-[0.25] ring-4 ring-red-300'
                    : 'opacity-45 grayscale'
                : active
                  ? `ring-4 ${style.ring} scale-[1.01]`
                  : 'hover:scale-[1.01] hover:shadow-2xl';

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleOption(option.id)}
                  disabled={locked || isHostView || showAnswer}
                  className={`group relative min-h-[116px] overflow-hidden rounded-[1.75rem] border ${style.border} bg-gradient-to-br ${style.base} p-5 text-left text-white shadow-[0_18px_48px_-28px_rgba(15,23,42,0.9)] transition ${tileState} ${locked || isHostView || showAnswer ? 'cursor-default' : ''}`}
                >
                  <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15" />
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 p-3 backdrop-blur">
                      <Icon size={isHostView ? 30 : 24} strokeWidth={3} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`${isHostView ? 'text-2xl lg:text-3xl' : 'text-lg'} font-black leading-snug drop-shadow-sm`}>
                        {option.text}
                      </p>
                      {showAnswer && isCorrect && (
                        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-[0.14em]">
                          <CheckCircle2 size={15} /> верно
                        </span>
                      )}
                      {showAnswer && isWrongSelected && (
                        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-[0.14em]">
                          <XCircle size={15} /> твой ответ
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {question.type === 'fill-blank' && (
          <div className="space-y-4">
            <textarea
              value={textAnswer}
              disabled={locked || isHostView || showAnswer}
              onChange={(event) => setTextAnswer(event.target.value)}
              className="min-h-[150px] w-full rounded-[1.75rem] border border-gray-200 bg-gray-50 px-5 py-4 text-lg font-semibold text-dark outline-none transition focus:border-orange-300 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="Введите ответ"
            />
            {showAnswer && (
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/15 dark:text-emerald-200">
                <p className="text-xs font-black uppercase tracking-[0.18em]">Правильный ответ</p>
                <p className="mt-1 text-xl font-black">{correctText || 'Ответ не указан'}</p>
              </div>
            )}
          </div>
        )}

        {question.type === 'matching' && (
          <div className="space-y-3">
            {(question.options || []).map(option => (
              <div key={option.id} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-base font-black text-dark dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  {option.text}
                </div>
                <select
                  value={matchingPairs[option.id] || ''}
                  disabled={locked || isHostView || showAnswer}
                  onChange={(event) => setMatchingPairs(prev => ({ ...prev, [option.id]: event.target.value }))}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm font-semibold text-dark outline-none transition focus:border-orange-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">Выбери пару</option>
                  {(question.matchingRightSide || []).map(rightOption => (
                    <option key={rightOption.id} value={rightOption.text}>{rightOption.text}</option>
                  ))}
                </select>
              </div>
            ))}
            {showAnswer && correctText && (
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/15 dark:text-emerald-200">
                {correctText}
              </div>
            )}
          </div>
        )}

        {!isHostView && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-500">
              {ack
                ? `Ответ принят${ack.pointsAwarded ? ` · +${ack.pointsAwarded} очков` : ''}`
                : locked
                  ? 'Ответ уже отправлен'
                  : question.type === 'single-choice' || question.type === 'true-false'
                    ? 'Нажми на плитку, ответ отправится сразу'
                    : 'Скорость и серия влияют на очки'}
            </div>
            {(question.type === 'multiple-choice' || question.type === 'matching' || question.type === 'fill-blank') && !showAnswer && (
              <button
                type="button"
                onClick={() => submitAnswer()}
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={16} /> Отправить
              </button>
            )}
          </div>
        )}

        {showAnswer && correctText && question.type !== 'fill-blank' && question.type !== 'matching' && (
          <div className="mt-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/15 dark:text-emerald-200">
            <p className="text-xs font-black uppercase tracking-[0.18em]">Правильный ответ</p>
            <p className="mt-1 text-lg font-black">{correctText}</p>
          </div>
        )}
      </div>
    </section>
  );
}

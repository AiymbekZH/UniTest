import { useEffect, useMemo, useState } from 'react';
import { Clock4, Send } from 'lucide-react';

function formatTimer(ms = 0) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function ArenaQuestionPanel({
  question,
  timeLeftMs = 0,
  isHostView = false,
  locked = false,
  onSubmit,
  ack = null
}) {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [matchingPairs, setMatchingPairs] = useState({});

  useEffect(() => {
    setSelectedOptions([]);
    setTextAnswer('');
    setMatchingPairs({});
  }, [question?.questionId]);

  const canSubmit = useMemo(() => {
    if (!question || locked || isHostView) return false;
    if (question.type === 'fill-blank') return textAnswer.trim().length > 0;
    if (question.type === 'matching') {
      return (question.options || []).every(option => matchingPairs[option.id]);
    }
    return selectedOptions.length > 0;
  }, [question, locked, isHostView, textAnswer, matchingPairs, selectedOptions]);

  if (!question) return null;

  const toggleOption = (optionId) => {
    if (locked || isHostView) return;
    if (question.type === 'multiple-choice') {
      setSelectedOptions(prev =>
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
      );
      return;
    }
    setSelectedOptions([optionId]);
  };

  const submitAnswer = () => {
    if (!canSubmit) return;
    onSubmit?.({
      selectedOptions,
      textAnswer,
      matchingPairs: Object.entries(matchingPairs).map(([left, right]) => ({ left, right }))
    });
  };

  return (
    <div className="rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_32px_90px_-46px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-slate-900/88">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Вопрос {question.questionNumber} / {question.totalQuestions}</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-dark">{question.questionText}</h2>
          {question.passage ? (
            <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-gray-500">{question.passage}</p>
          ) : null}
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-orange-600 dark:bg-orange-900/20 dark:text-orange-300">
          <Clock4 size={18} />
          <span className="text-lg font-black">{formatTimer(timeLeftMs)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {(question.type === 'single-choice' || question.type === 'multiple-choice' || question.type === 'true-false') && (
          <div className="grid gap-3">
            {(question.options || []).map(option => {
              const active = selectedOptions.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleOption(option.id)}
                  disabled={locked || isHostView}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                    active
                      ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-200'
                      : 'border-gray-200 bg-gray-50 text-dark hover:border-orange-200 hover:bg-orange-50/60 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
                  } ${locked || isHostView ? 'cursor-default' : ''}`}
                >
                  {option.text}
                </button>
              );
            })}
          </div>
        )}

        {question.type === 'fill-blank' && (
          <textarea
            value={textAnswer}
            disabled={locked || isHostView}
            onChange={(event) => setTextAnswer(event.target.value)}
            className="min-h-[120px] w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-dark outline-none transition focus:border-orange-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            placeholder="Введите короткий ответ"
          />
        )}

        {question.type === 'matching' && (
          <div className="space-y-3">
            {(question.options || []).map(option => (
              <div key={option.id} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-dark dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  {option.text}
                </div>
                <select
                  value={matchingPairs[option.id] || ''}
                  disabled={locked || isHostView}
                  onChange={(event) => setMatchingPairs(prev => ({ ...prev, [option.id]: event.target.value }))}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-dark outline-none transition focus:border-orange-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Выбери пару</option>
                  {(question.matchingRightSide || []).map(rightOption => (
                    <option key={rightOption.id} value={rightOption.text}>{rightOption.text}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isHostView && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-500">
            {ack
              ? `Ответ отправлен${ack.pointsAwarded ? ` · +${ack.pointsAwarded} очков` : ''}`
              : 'Скорость и серия влияют на итоговые очки'}
          </div>
          <button
            type="button"
            onClick={submitAnswer}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} /> Отправить ответ
          </button>
        </div>
      )}
    </div>
  );
}

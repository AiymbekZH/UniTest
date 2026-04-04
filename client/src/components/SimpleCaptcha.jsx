import { RefreshCw } from 'lucide-react';

export default function SimpleCaptcha({ challenge, value, onChange, onRefresh, label = 'Капча' }) {
  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/30">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-dark">{label}</p>
          <p className="text-xs text-gray-500">Введите ответ на простую проверку</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:text-gray-300"
        >
          <RefreshCw size={14} />
          Обновить
        </button>
      </div>

      <div className="mb-3 rounded-xl bg-primary-50 px-4 py-3 text-center text-base font-semibold text-primary-700 dark:bg-primary-950/40 dark:text-primary-200">
        {challenge.question}
      </div>

      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="input-field"
        placeholder="Ответ"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
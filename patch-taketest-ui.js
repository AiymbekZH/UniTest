const fs = require('fs');
const file = 'client/src/pages/TakeTest.jsx';
let code = fs.readFileSync(file, 'utf8');

// The Anti-cheat overlay redesign:
const newOverlay = `
      {/* Violation warning modal */}
      <AnimatePresence>
        {showViolationWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white/10 dark:bg-slate-900/40 border border-white/20 dark:border-white/10 backdrop-blur-2xl shadow-[0_0_80px_-15px_rgba(239,68,68,0.5)] rounded-[2rem] p-8 max-w-md w-full text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-20 bg-red-500/20 blur-3xl rounded-full" />
              <div className="w-20 h-20 bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-red-500/20 animate-ping rounded-2xl" />
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                {t('violation') || 'Нарушение правил!'}
              </h3>
              <p className="text-red-200/80 mb-5 text-sm leading-relaxed">{lastViolationText}</p>
              <div className="bg-black/20 rounded-xl p-4 mb-6 border border-white/5">
                <p className="text-lg font-mono font-bold text-red-400">
                  {t('violationCount') || 'Нарушение'}: {violations.length} {test?.settings?.antiCheat?.maxViolations ? \`/ \${test.settings.antiCheat.maxViolations}\` : ''}
                </p>
              </div>
              <button onClick={() => setShowViolationWarning(false)}
                className="w-full bg-red-500 hover:bg-red-400 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)]">
                {t('understood') || 'Понятно'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
`;

code = code.replace(
  /\{\/\* Violation warning modal \*\/\}\s*<AnimatePresence>[\s\S]*?<\/AnimatePresence>/m,
  newOverlay
);


// And Desktop Left Sidebar for Navigation + fixing HTML in question components:
// We look for:
// {/* Question area - grows to fill available space */}
// <main className="flex-1 max-w-3xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-28 sm:pb-32">
const mainAreaStart = `{/* Question area - grows to fill available space */}
      <div className="flex-1 w-full lg:max-w-5xl mx-auto flex gap-6 px-3 sm:px-4 py-4 sm:py-8 pb-28 sm:pb-32">
        {/* Desktop Left Sidebar Navigator */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 glass-card-solid p-5 rounded-2xl border border-gray-200 dark:border-slate-700 max-h-[calc(100vh-120px)] flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">{t('navigation') || 'Навигатор'}</h3>
            <div className="flex flex-wrap gap-2 overflow-y-auto pr-1 custom-scrollbar pb-4">
              {test.questions.map((q, i) => {
                const answered = !!answers[q.id];
                const fb = feedback[q.id];
                const isCurrent = i === currentQ;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentQ(i)}
                    className={\`w-9 h-9 rounded-lg text-xs font-semibold transition-all flex-shrink-0 relative \${
                      isCurrent
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 scale-110 z-10'
                        : fb?.checked
                          ? fb.isCorrect
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                          : answered
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800'
                            : 'bg-gray-100 dark:bg-slate-700/50 text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600 border border-transparent'
                    }\`}
                  >
                    {i + 1}
                    {fb?.checked && !isCurrent && (
                      <div className={\`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 \${
                        fb.isCorrect ? 'bg-emerald-500' : 'bg-red-500'
                      }\`} />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Keyboard shortcuts hint */}
            <div className="flex flex-col gap-2 pt-4 mt-auto border-t border-gray-100 dark:border-slate-700">
              <span className="text-[10px] text-gray-400 flex items-center justify-between"><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[9px] font-mono">1-9</kbd> {t('selectOption') || 'select'}</span>
              <span className="text-[10px] text-gray-400 flex items-center justify-between"><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[9px] font-mono font-bold">← →</kbd> {t('navigation') || 'navigate'}</span>
              <span className="text-[10px] text-gray-400 flex items-center justify-between"><kbd className="px-1 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-[9px] font-mono">Enter</kbd> {t('next') || 'next / submit'}</span>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 max-w-3xl w-full mx-auto lg:mx-0">`;

// Find where <main> starts
code = code.replace(
  /\{\/\* Question area - grows to fill available space \*\/\}\s*<main className="flex-1 max-w-3xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-28 sm:pb-32">/,
  mainAreaStart
);

// Close the flex-1 flex container instead of just main
code = code.replace(
  /<\/AnimatePresence>\s*<\/main>/,
  `</AnimatePresence>\n        </main>\n      </div>`
);

// Mobile bottom bar updates - make it hidden on lg
code = code.replace(
  /<div className="fixed bottom-0 left-0 right-0 z-40 bg-white\/95 dark:bg-slate-900\/95 backdrop-blur-xl border-t border-gray-200 dark:border-slate-700 safe-area-bottom">/,
  `<div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-slate-700 safe-area-bottom lg:hidden">`
);

fs.writeFileSync(file, code, 'utf8');
console.log('TakeTest.jsx UI patched successfully!');

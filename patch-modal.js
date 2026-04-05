const fs = require('fs');
const file = 'client/src/components/AIGenerateModal.jsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Replace states
code = code.replace(
  /const \[questionCount, setQuestionCount\] = useState\(5\);\s*const \[selectedTypes, setSelectedTypes\] = useState\(\['single-choice'\]\);/,
  `const [typeCounts, setTypeCounts] = useState({ 'single-choice': 5 });\n  const [difficulty, setDifficulty] = useState(3);\n  const totalQuestions = Object.values(typeCounts).reduce((a, b) => a + b, 0);`
);

// 2. toggleType -> updateTypeCount
code = code.replace(
  /const toggleType = \(type\) => \{[\s\S]*?\};\s*const handleGenerate/m,
  `const updateTypeCount = (type, diff) => {
    setTypeCounts(prev => {
      const newCount = Math.max(0, (prev[type] || 0) + diff);
      const next = { ...prev };
      if (newCount === 0) delete next[type];
      else next[type] = newCount;
      return next;
    });
  };

  const handleGenerate`
);

// 3. handleGenerate body
code = code.replace(
  /formData\.append\('questionCount', questionCount\);\s*formData\.append\('questionTypes', JSON\.stringify\(selectedTypes\)\);/,
  `formData.append('typeCounts', JSON.stringify(typeCounts));\n      formData.append('difficulty', difficulty);`
);

code = code.replace(
  /if \(!text && !uploadedFile\) \{/,
  `if (totalQuestions === 0) {\n      setError('Select at least one question type count');\n      return;\n    }\n    if (!text && !uploadedFile) {`
);

// 4. handleFullReset
code = code.replace(
  /setQuestionCount\(5\);\s*setSelectedTypes\(\['single-choice'\]\);/,
  `setTypeCounts({ 'single-choice': 5 });\n    setDifficulty(3);`
);

// 5. Azure Watermark
code = code.replace(
  /GPT-5\.2 · Azure OpenAI/,
  `AI Engine`
);

// 6. UI for sliders
const oldUIRegex = /\{\/\* Question Count — with badge \*\/\}[\s\S]*?\{\/\* Error \*\/\}/m;

const newUI = `{/* Difficulty Slider */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {t('difficulty') || 'Difficulty'}
                    </label>
                    <span className="text-xs font-semibold text-indigo-500">{difficulty} / 5</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
                    <span>{t('easy') || 'Easy'}</span>
                    <span>{t('hard') || 'Hard'}</span>
                  </div>
                </div>

                {/* Question Types & Counts */}
                <div>
                  <label className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                    <span>{t('aiQuestionTypes') || 'Question types'}</span>
                    <span className="text-indigo-500 font-bold">{totalQuestions} {t('total') || 'Total'}</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {QUESTION_TYPES.map(({ value, icon }) => {
                      const count = typeCounts[value] || 0;
                      return (
                        <div
                          key={value}
                          className={\`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all \${
                            count > 0 
                              ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/10' 
                              : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30'
                          }\`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={\`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono \${
                              count > 0 ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                            }\`}>
                              {icon}
                            </span>
                            <span className={\`text-sm font-medium \${count > 0 ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-500'}\`}>
                              {typeLabels[value] || value}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateTypeCount(value, -1)}
                              disabled={count === 0}
                              className="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Minus size={12} className="text-gray-600 dark:text-gray-300" />
                            </button>
                            <span className="w-4 text-center text-sm font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
                              {count}
                            </span>
                            <button
                              onClick={() => updateTypeCount(value, 1)}
                              className="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <Plus size={12} className="text-gray-600 dark:text-gray-300" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Error */}`;

code = code.replace(oldUIRegex, newUI);

fs.writeFileSync(file, code, 'utf8');
console.log('AIGenerateModal patched successfully!');

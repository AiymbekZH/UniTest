const fs = require("fs");
const path = require("path");

function replaceFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, "utf8");
    replacements.forEach(([match, replace]) => {
        content = content.replace(match, replace);
    });
    fs.writeFileSync(filePath, content, "utf8");
    console.log("Updated", filePath);
}

// 1. App.jsx
replaceFile("./client/src/App.jsx", [
    [
        "import { useAuth } from './context/AuthContext';",
        "import { useAuth } from './context/AuthContext';\nimport toast, { Toaster, ToastBar } from 'react-hot-toast';"
    ],
    [
        "<Suspense fallback={<PageLoader />}>\n      <Routes>\n      {/* Public routes */}",
        `\<\>
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 2500,
          style: { cursor: 'pointer' }
        }}
      >
        {(t) => (
          <ToastBar toast={t} style={{ ...t.style, padding: '8px 16px', maxWidth: '350px' }}>
            {({ icon, message }) => (
              <div 
                onClick={() => toast.dismiss(t.id)}
                style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}
              >
                {icon}
                <span style={{ flex: 1 }}>{message}</span>
                {t.type !== 'loading' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}
                    style={{ opacity: 0.4, fontSize: '16px', padding: '4px', cursor: 'pointer' }}
                    aria-label="Close"
                  >
                    ?
                  </button>
                )}
              </div>
            )}
          </ToastBar>
        )}
      </Toaster>
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Public routes */}`
    ],
    [
        "      {/* Default redirect */}\n      <Route path=\"*\" element={<Navigate to=\"/dashboard\" />} />\n    </Routes>\n    </Suspense>\n  );\n}",
        "        {/* Default redirect */}\n        <Route path=\"*\" element={<Navigate to=\"/dashboard\" />} />\n      </Routes>\n      </Suspense>\n    </>\n  );\n}"
    ]
]);

// 2. TakeTest.jsx
replaceFile("./client/src/pages/TakeTest.jsx", [
    [
        "                    <span className=\"hidden sm:inline\">{t('finishTest')}</span>\n                  </button>\n                </div>",
        "                    <span className=\"hidden sm:inline\">{t('finishTest')}</span>\n                  </button>\n                  <button \n                    onClick={() => setShowFinishConfirm(true)}\n                    className=\"hidden md:flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all w-full text-white bg-indigo-500 hover:bg-indigo-600 shadow-md shadow-indigo-500/20 active:scale-95\"\n                  >\n                    <Check size={20} />\n                    <span className=\"text-[10px] font-bold uppercase tracking-wider\">Завершить</span>\n                  </button>\n                </div>"
    ]
]);

// 3. CreateTest.jsx
replaceFile("./client/src/pages/CreateTest.jsx", [
    [
        "(<div className=\"flex justify-end gap-2 mt-4\">\n                    <button\n                      onClick={() => setDeleteConfirm(q.id)}\n                      className=\"flex-1 sm:flex-none p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors\"\n                    >\n                      <Trash2 size={16} className=\"mx-auto\" />\n                    </button>\n                  </div>)",
        "(<div className=\"flex justify-end gap-2 mt-4\">\n                    <AnimatePresence mode=\"wait\">\n                      {deleteConfirm === q.id ? (\n                        <motion.div\n                          initial={{ opacity: 0, scale: 0.95, width: 0 }}\n                          animate={{ opacity: 1, scale: 1, width: 'auto' }}\n                          exit={{ opacity: 0, scale: 0.95, width: 0 }}\n                          className=\"flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-2 py-1.5 rounded-lg\"\n                        >\n                          <span className=\"text-[11px] font-medium text-red-600 dark:text-red-400 whitespace-nowrap px-1\">Точно удалить?</span>\n                          <button \n                            onClick={() => removeQuestion(q.id)}\n                            className=\"p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors\"\n                          >\n                            <Check size={14} />\n                          </button>\n                          <button \n                            onClick={() => setDeleteConfirm(null)}\n                            className=\"p-1.5 bg-white dark:bg-slate-800 text-gray-500 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors\"\n                          >\n                            <X size={14} />\n                          </button>\n                        </motion.div>\n                      ) : (\n                        <motion.button\n                          initial={{ opacity: 0, scale: 0.95 }}\n                          animate={{ opacity: 1, scale: 1 }}\n                          exit={{ opacity: 0, scale: 0.95 }}\n                          onClick={() => setDeleteConfirm(q.id)}\n                          className=\"flex-1 sm:flex-none p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors\"\n                        >\n                          <Trash2 size={16} className=\"mx-auto\" />\n                        </motion.button>\n                      )}\n                    </AnimatePresence>\n                  </div>)"
    ],
    [
        "<input type=\"number\" className=\"input-field text-sm py-2.5 pl-9\" min=\"0\" value={test.settings.timeLimit}\n                            onChange={e => updateSettings('timeLimit', parseInt(e.target.value) || 0)}",
        "<input type=\"number\" className=\"input-field text-sm py-2.5 pl-9\" min=\"0\" max=\"9999\" value={test.settings.timeLimit}\n                            onChange={e => updateSettings('timeLimit', Math.max(0, Math.min(parseInt(e.target.value) || 0, 9999)))}"
    ],
    [
        "<input type=\"number\" className=\"input-field text-sm py-2.5 pl-9\" min=\"1\" value={test.settings.maxAttempts}\n                            onChange={e => updateSettings('maxAttempts', parseInt(e.target.value) || 1)}",
        "<input type=\"number\" className=\"input-field text-sm py-2.5 pl-9\" min=\"1\" max=\"999\" value={test.settings.maxAttempts}\n                            onChange={e => updateSettings('maxAttempts', Math.max(1, Math.min(parseInt(e.target.value) || 1, 999)))}"
    ],
    [
        "<input type=\"number\" className=\"input-field text-sm py-2.5 pl-9\" min=\"0\" value={test.settings.inactivityTimeout || 0}\n                            onChange={e => updateSettings('inactivityTimeout', parseInt(e.target.value) || 0)}",
        "<input type=\"number\" className=\"input-field text-sm py-2.5 pl-9\" min=\"0\" max=\"9999\" value={test.settings.inactivityTimeout || 0}\n                            onChange={e => updateSettings('inactivityTimeout', Math.max(0, Math.min(parseInt(e.target.value) || 0, 9999)))}"
    ],
    [
        "<input type=\"number\" className=\"input-field text-sm py-2.5 pl-9\" min=\"0\" value={test.settings.questionPoolSize || 0}\n                            onChange={e => updateSettings('questionPoolSize', parseInt(e.target.value) || 0)}",
        "<input type=\"number\" className=\"input-field text-sm py-2.5 pl-9\" min=\"0\" max=\"9990\" value={test.settings.questionPoolSize || 0}\n                            onChange={e => updateSettings('questionPoolSize', Math.max(0, Math.min(parseInt(e.target.value) || 0, 9990)))}"
    ],
    [
        "<input type=\"number\" className=\"input-field text-sm py-2.5 pl-9\" min=\"2\" max=\"100\"\n                                value={test.settings.variants?.count || 0}\n                                onChange={e => updateSettings('variants', { ...test.settings.variants, count: parseInt(e.target.value) || 0 })}",
        "<input type=\"number\" className=\"input-field text-sm py-2.5 pl-9\" min=\"2\" max=\"100\"\n                                value={test.settings.variants?.count || 0}\n                                onChange={e => updateSettings('variants', { ...test.settings.variants, count: Math.max(2, Math.min(parseInt(e.target.value) || 2, 100)) })}"
    ],
    [
        "<input type=\"number\" className=\"input-field text-sm py-2.5 pl-9\" min=\"1\" value={test.settings.antiCheat.maxViolations}\n                            onChange={e => updateAntiCheat('maxViolations', parseInt(e.target.value) || 5)}",
        "<input type=\"number\" className=\"input-field text-sm py-2.5 pl-9\" min=\"1\" max=\"99\" value={test.settings.antiCheat.maxViolations}\n                            onChange={e => updateAntiCheat('maxViolations', Math.max(1, Math.min(parseInt(e.target.value) || 5, 99)))}"
    ],
    [
        "<ConfirmDialog\n        isOpen={!!deleteConfirm}\n        title={t('deleteQuestion')}\n        message={t('deleteQuestionConfirm', { num: test.questions.findIndex(q => q.id === deleteConfirm) + 1 })}\n        confirmText={t('delete')}\n        cancelText={t('cancel')}\n        onConfirm={() => removeQuestion(deleteConfirm)}\n        onClose={() => setDeleteConfirm(null)}\n        danger\n      />",
        ""
    ]
]);

// 4. TestProfile.jsx
replaceFile("./client/src/pages/TestProfile.jsx", [
    [
        "<div className=\"bg-blue-50/80 dark:bg-blue-900/20 rounded-xl p-4 text-center\">\n                  <div className=\"w-8 h-8 rounded-[10px] bg-blue-100 dark:bg-blue-800/40 text-primary-600 mx-auto mb-2 flex items-center justify-center\"><BarChart3 size={16} /></div>\n                  <p className=\"text-[22px] font-bold text-primary-600 tracking-tight\">{test.questions?.length || 0}</p>\n                  <p className=\"text-[11px] font-medium text-gray-500 uppercase tracking-wider\">{t('questions')}</p>\n                </div>",
        "<div className=\"bg-blue-50/80 dark:bg-blue-900/20 rounded-xl p-4 text-center min-w-0\">\n                  <div className=\"w-8 h-8 rounded-[10px] bg-blue-100 dark:bg-blue-800/40 text-primary-600 mx-auto mb-2 flex items-center justify-center\"><BarChart3 size={16} /></div>\n                  <p className=\"text-[22px] font-bold text-primary-600 tracking-tight truncate\">{test.questions?.length || 0}</p>\n                  <p className=\"text-[11px] font-medium text-gray-500 uppercase tracking-wider truncate\">{t('questions')}</p>\n                </div>"
    ],
    [
        "<div className=\"bg-amber-50/80 dark:bg-amber-900/20 rounded-xl p-4 text-center\">\n                  <div className=\"w-8 h-8 rounded-[10px] bg-amber-100 dark:bg-amber-800/40 text-amber-600 mx-auto mb-2 flex items-center justify-center\"><Clock size={16} /></div>\n                  <p className=\"text-[22px] font-bold text-amber-600 tracking-tight\">{test.settings?.timeLimit || '?'}</p>\n                  <p className=\"text-[11px] font-medium text-gray-500 uppercase tracking-wider\">{t('min')}</p>\n                </div>",
        "<div className=\"bg-amber-50/80 dark:bg-amber-900/20 rounded-xl p-4 text-center min-w-0\">\n                  <div className=\"w-8 h-8 rounded-[10px] bg-amber-100 dark:bg-amber-800/40 text-amber-600 mx-auto mb-2 flex items-center justify-center\"><Clock size={16} /></div>\n                  <p className=\"text-[22px] font-bold text-amber-600 tracking-tight truncate\" title={test.settings?.timeLimit}>{test.settings?.timeLimit || '?'}</p>\n                  <p className=\"text-[11px] font-medium text-gray-500 uppercase tracking-wider truncate\">{t('min')}</p>\n                </div>"
    ],
    [
        "<div className=\"bg-emerald-50/80 dark:bg-emerald-900/20 rounded-xl p-4 text-center\">\n                  <div className=\"w-8 h-8 rounded-[10px] bg-emerald-100 dark:bg-emerald-800/40 text-emerald-600 mx-auto mb-2 flex items-center justify-center\"><Users size={16} /></div>\n                  <p className=\"text-[22px] font-bold text-emerald-600 tracking-tight\">{test.attemptCount || 0}</p>\n                  <p className=\"text-[11px] font-medium text-gray-500 uppercase tracking-wider\">{t('totalParticipants')}</p>\n                </div>",
        "<div className=\"bg-emerald-50/80 dark:bg-emerald-900/20 rounded-xl p-4 text-center min-w-0\">\n                  <div className=\"w-8 h-8 rounded-[10px] bg-emerald-100 dark:bg-emerald-800/40 text-emerald-600 mx-auto mb-2 flex items-center justify-center\"><Users size={16} /></div>\n                  <p className=\"text-[22px] font-bold text-emerald-600 tracking-tight truncate\" title={test.attemptCount}>{test.attemptCount || 0}</p>\n                  <p className=\"text-[11px] font-medium text-gray-500 uppercase tracking-wider truncate\">{t('totalParticipants')}</p>\n                </div>"
    ],
    [
        "<div className=\"bg-purple-50/80 dark:bg-purple-900/20 rounded-xl p-4 text-center\">\n                  <div className=\"w-8 h-8 rounded-[10px] bg-purple-100 dark:bg-purple-800/40 text-purple-600 mx-auto mb-2 flex items-center justify-center\"><Star size={16} /></div>\n                  <p className=\"text-[22px] font-bold text-purple-600 tracking-tight\">{test.rating?.toFixed(1) || '—'}</p>\n                  <p className=\"text-[11px] font-medium text-gray-500 uppercase tracking-wider\">{t('rating')}</p>",
        "<div className=\"bg-purple-50/80 dark:bg-purple-900/20 rounded-xl p-4 text-center min-w-0\">\n                  <div className=\"w-8 h-8 rounded-[10px] bg-purple-100 dark:bg-purple-800/40 text-purple-600 mx-auto mb-2 flex items-center justify-center\"><Star size={16} /></div>\n                  <p className=\"text-[22px] font-bold text-purple-600 tracking-tight truncate\">{test.rating?.toFixed(1) || '—'}</p>\n                  <p className=\"text-[11px] font-medium text-gray-500 uppercase tracking-wider truncate\">{t('rating')}</p>"
    ]
]);

// 5. index.css
replaceFile("./client/src/index.css", [
    [
        "  .dark .input-field {\n    @apply bg-slate-700 border-slate-600 text-gray-100 placeholder-gray-500\n           focus:border-primary-400 focus:shadow-none;\n  }\n\n  .badge {",
        "  .dark .input-field {\n    @apply bg-slate-700 border-slate-600 text-gray-100 placeholder-gray-500\n           focus:border-primary-400 focus:shadow-none;\n  }\n\n  /* Number input - prevent text overflow on large values */\n  input[type=\"number\"].input-field {\n    @apply overflow-hidden text-ellipsis;\n    -moz-appearance: textfield;\n  }\n  input[type=\"number\"].input-field::-webkit-outer-spin-button,\n  input[type=\"number\"].input-field::-webkit-inner-spin-button {\n    -webkit-appearance: none;\n    margin: 0;\n  }\n\n  .badge {"
    ]
]);



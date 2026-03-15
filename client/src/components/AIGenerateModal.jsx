import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Upload, FileText, Loader2, AlertCircle, Plus, Minus, Check, CheckCheck, RotateCcw, ChevronDown, History, Trash2, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';

const QUESTION_TYPES = [
  { value: 'single-choice', icon: '1', label: 'Single Choice' },
  { value: 'multiple-choice', icon: 'N', label: 'Multiple Choice' },
  { value: 'true-false', icon: 'T/F', label: 'True / False' },
  { value: 'fill-blank', icon: '___', label: 'Fill Blank' },
  { value: 'matching', icon: '↔', label: 'Matching' },
];

const FILE_ACCEPT = '.pdf,.docx,.doc,.txt,image/jpeg,image/png,image/gif,image/webp';
const AI_HISTORY_KEY = 'unitest_ai_history';
const MAX_HISTORY = 15;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(AI_HISTORY_KEY) || '[]');
  } catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export default function AIGenerateModal({ isOpen, onClose, onGenerated, currentLanguage = 'ru' }) {
  const { t } = useLanguage();
  
  const [text, setText] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState(['single-choice']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [step, setStep] = useState('input');
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  
  const [history, setHistory] = useState([]);
  
  const fileRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setHistory(loadHistory());
    }
  }, [isOpen]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError(t('aiFileTooLarge') || 'File too large (max 20MB)');
      return;
    }
    setUploadedFile(file);
    setError('');
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const getFileIcon = () => {
    if (!uploadedFile) return null;
    const ext = uploadedFile.name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (ext === 'txt') return '📃';
    return '🖼️';
  };

  const toggleType = (type) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        return prev.length > 1 ? prev.filter(t => t !== type) : prev;
      }
      return [...prev, type];
    });
  };

  const handleGenerate = async () => {
    if (!text && !uploadedFile) {
      setError(t('aiProvideContent') || 'Provide text, file, or image');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      if (text) formData.append('text', text);
      if (uploadedFile) formData.append('file', uploadedFile);
      formData.append('questionCount', questionCount);
      formData.append('questionTypes', JSON.stringify(selectedTypes));
      formData.append('language', currentLanguage);

      const { data } = await api.post('/ai/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      if (!data.questions || data.questions.length === 0) {
        setError(t('aiNoQuestions') || 'AI returned no questions. Try again.');
        setLoading(false);
        return;
      }
      setGeneratedQuestions(data.questions);
      setSelectedQuestions(new Set(data.questions.map((_, i) => i)));
      setStep('preview');

      const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        prompt: text?.slice(0, 100) || (uploadedFile?.name || 'File'),
        questions: data.questions,
        count: data.questions.length,
      };
      const updated = [entry, ...loadHistory()].slice(0, MAX_HISTORY);
      saveHistory(updated);
      setHistory(updated);
    } catch (err) {
      setError(err.response?.data?.error || 'AI generation failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (index) => {
    setSelectedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedQuestions(new Set(generatedQuestions.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedQuestions(new Set());
  };

  const handleAddSelected = () => {
    const selected = generatedQuestions.filter((_, i) => selectedQuestions.has(i));
    if (selected.length > 0) {
      onGenerated(selected);
    }
    handleClose();
  };

  const handleClose = () => {
    setError('');
    setLoading(false);
    onClose();
  };

  const handleFullReset = () => {
    setText('');
    setUploadedFile(null);
    setFilePreview(null);
    setQuestionCount(5);
    setSelectedTypes(['single-choice']);
    setError('');
    setStep('input');
    setGeneratedQuestions([]);
    setSelectedQuestions(new Set());
    setExpandedQuestion(null);
    setLoading(false);
  };

  const goBack = () => {
    setStep('input');
    setExpandedQuestion(null);
  };

  const loadFromHistory = (entry) => {
    setGeneratedQuestions(entry.questions);
    setSelectedQuestions(new Set(entry.questions.map((_, i) => i)));
    setExpandedQuestion(null);
    setStep('preview');
  };

  const deleteHistoryEntry = (id) => {
    const updated = history.filter(h => h.id !== id);
    saveHistory(updated);
    setHistory(updated);
  };

  const clearHistory = () => {
    saveHistory([]);
    setHistory([]);
  };

  const typeLabels = {
    'single-choice': t('singleChoice') || 'Single Choice',
    'multiple-choice': t('multipleChoice') || 'Multiple Choice',
    'true-false': t('trueFalse') || 'True/False',
    'fill-blank': t('fillBlank') || 'Fill Blank',
    'matching': t('matching') || 'Matching',
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-slate-700/50 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                <Sparkles className="text-primary-500" size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {t('aiGenerate') || 'AI Generate'}
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {step === 'input' 
                    ? (t('aiGenerateDesc') || 'Create questions from text or file')
                    : step === 'history'
                    ? (t('aiHistory') || 'Generation history')
                    : `${selectedQuestions.size} / ${generatedQuestions.length} ${t('selected') || 'selected'}`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {step === 'input' && history.length > 0 && (
                <button
                  onClick={() => setStep('history')}
                  className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  title={t('aiHistory') || 'History'}
                >
                  <History size={16} className="text-gray-400" />
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-primary-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                    {history.length}
                  </span>
                </button>
              )}
              <button onClick={handleClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {step === 'history' ? (
              <>
                {history.length === 0 ? (
                  <div className="text-center py-16">
                    <History size={32} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                    <p className="text-sm text-gray-400">{t('aiNoHistory') || 'No generation history yet'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((entry) => (
                      <div
                        key={entry.id}
                        className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-primary-200 dark:hover:border-primary-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all cursor-pointer"
                        onClick={() => loadFromHistory(entry)}
                      >
                        <div className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <Sparkles size={14} className="text-primary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                            {entry.prompt.length > 60 ? entry.prompt.slice(0, 60) + '...' : entry.prompt}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(entry.timestamp).toLocaleDateString()}
                            </span>
                            <span className="text-[11px] text-primary-500 font-medium">
                              {entry.count} {t('questions') || 'questions'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteHistoryEntry(entry.id); }}
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : step === 'input' ? (
              <>
                {/* Text Input */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    <FileText size={14} />
                    {t('aiTextInput') || 'Text content'}
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('aiTextPlaceholder') || 'Paste text, lecture notes, or any content...'}
                    className="w-full h-32 px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl resize-none text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/20 transition-all"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    <Upload size={14} />
                    {t('aiFileInput') || 'File upload'}
                  </label>
                  {uploadedFile ? (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-600 rounded-xl">
                      {filePreview ? (
                        <img src={filePreview} alt="Preview" className="h-12 w-12 rounded-lg border border-gray-200 dark:border-slate-600 object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-lg">
                          {getFileIcon()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{(uploadedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button
                        onClick={removeFile}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full py-8 border border-dashed border-gray-200 dark:border-slate-600 rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all flex flex-col items-center gap-2"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                        <Upload size={18} className="text-gray-400" />
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{t('aiUploadFile') || 'PDF, DOCX, TXT, or Image'}</span>
                      <span className="text-[11px] text-gray-400">max 20MB</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept={FILE_ACCEPT} onChange={handleFileUpload} className="hidden" />
                </div>

                {/* Question Count */}
                <div>
                  <label className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    <span>{t('aiQuestionCount') || 'Number of questions'}</span>
                    <span className="text-lg font-bold text-primary-600 dark:text-primary-400 normal-case tracking-normal">{questionCount}</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuestionCount(Math.max(1, questionCount - 1))}
                      className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
                    >
                      <Minus size={14} className="text-gray-500 dark:text-gray-400" />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full appearance-none cursor-pointer accent-primary-500
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                          [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md
                          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                      />
                    </div>
                    <button
                      onClick={() => setQuestionCount(Math.min(20, questionCount + 1))}
                      className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
                    >
                      <Plus size={14} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Question Types */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 block">
                    {t('aiQuestionTypes') || 'Question types'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {QUESTION_TYPES.map(({ value, icon }) => (
                      <button
                        key={value}
                        onClick={() => toggleType(value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                          selectedTypes.includes(value)
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 ring-1 ring-primary-300 dark:ring-primary-700'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-150 dark:hover:bg-slate-600'
                        }`}
                      >
                        <span className="text-[11px] opacity-60 font-mono">{icon}</span>
                        {typeLabels[value] || value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 text-sm bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 px-4 py-3 rounded-xl">
                    <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-red-600 dark:text-red-400">{error}</span>
                  </div>
                )}
              </>
            ) : (
              /* PREVIEW STEP */
              <>
                {/* Select controls */}
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors font-medium"
                    >
                      <CheckCheck size={13} className="inline mr-1 -mt-0.5" />
                      {t('selectAll') || 'Select all'}
                    </button>
                    <button
                      onClick={deselectAll}
                      className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors font-medium"
                    >
                      {t('deselectAll') || 'Deselect all'}
                    </button>
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    {selectedQuestions.size} / {generatedQuestions.length}
                  </span>
                </div>

                {/* Questions list */}
                <div className="space-y-2">
                  {generatedQuestions.map((q, i) => (
                    <div
                      key={q.id || i}
                      className={`rounded-xl border transition-all ${
                        selectedQuestions.has(i)
                          ? 'border-primary-200 dark:border-primary-800 bg-white dark:bg-slate-800'
                          : 'border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 opacity-50'
                      }`}
                    >
                      {/* Question header */}
                      <div className="flex items-start gap-3 px-4 py-3">
                        <button
                          onClick={() => toggleQuestion(i)}
                          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            selectedQuestions.has(i)
                              ? 'bg-primary-500 border-primary-500 text-white'
                              : 'border-gray-300 dark:border-slate-600 hover:border-primary-400'
                          }`}
                        >
                          {selectedQuestions.has(i) && <Check size={12} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 rounded-full font-medium">
                              {typeLabels[q.type] || q.type}
                            </span>
                            <span className="text-[11px] text-gray-400">{q.points} {t('points') || 'pts'}</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                        </div>
                        <button
                          onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                          className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${expandedQuestion === i ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {expandedQuestion === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3 border-t border-gray-100 dark:border-slate-700">
                              <div className="pt-3 space-y-1.5">
                                {q.options && q.options.length > 0 && (
                                  <div className="space-y-1">
                                    {q.options.map((opt, oi) => (
                                      <div
                                        key={opt.id || oi}
                                        className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                                          opt.isCorrect
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
                                        }`}
                                      >
                                        {opt.isCorrect && <Check size={12} className="flex-shrink-0" />}
                                        <span>{q.type === 'matching' ? `${opt.text} → ${opt.matchPair}` : opt.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {q.type === 'fill-blank' && q.correctAnswer && (
                                  <div className="text-xs px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center gap-1.5">
                                    <Check size={12} className="flex-shrink-0" />
                                    {q.correctAnswer}
                                  </div>
                                )}
                                {q.explanation && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 italic px-1 pt-1">
                                    {q.explanation}
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/30">
            {step === 'history' ? (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('input')}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={14} />
                  {t('back') || 'Back'}
                </button>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={14} />
                    {t('clearAll') || 'Clear all'}
                  </button>
                )}
              </div>
            ) : step === 'input' ? (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                  <Sparkles size={10} />
                  GPT-5.2 &middot; Azure OpenAI
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition-colors"
                  >
                    {t('cancel') || 'Cancel'}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={loading || (!text && !uploadedFile)}
                    className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        {t('aiGenerating') || 'Generating...'}
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        {t('aiGenerateBtn') || 'Generate'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <button
                  onClick={goBack}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={14} />
                  {t('regenerate') || 'Regenerate'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition-colors"
                  >
                    {t('cancel') || 'Cancel'}
                  </button>
                  <button
                    onClick={handleAddSelected}
                    disabled={selectedQuestions.size === 0}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                  >
                    <Plus size={15} />
                    {t('addQuestions') || 'Add'} ({selectedQuestions.size})
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

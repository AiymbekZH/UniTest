import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Upload, FileText, Loader2, AlertCircle, Plus, Minus, Check, CheckCheck, RotateCcw, ChevronDown, File, History, Trash2, Clock, Lock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const QUESTION_TYPES = [
  { value: 'single-choice', icon: '1', label: 'Single Choice' },
  { value: 'multiple-choice', icon: 'N', label: 'Multiple Choice' },
  { value: 'true-false', icon: 'T/F', label: 'True / False' },
  { value: 'fill-blank', icon: '___', label: 'Fill Blank' },
  { value: 'matching', icon: '↔', label: 'Matching' },
];

const FILE_ACCEPT = '.pdf,.docx,.doc,.txt,image/jpeg,image/png,image/gif,image/webp';

export default function AIGenerateModal({ isOpen, onClose, onGenerated, currentLanguage = 'ru' }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  // Step 1: Input state
  const [text, setText] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null); // for image preview
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState(['single-choice']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Step 2: Preview state
  const [step, setStep] = useState('input'); // 'input' | 'preview' | 'history'
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  
  // History
  const [history, setHistory] = useState([]);
  
  const fileRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      api.get('/ai/history')
        .then(res => setHistory(res.data))
        .catch(() => setHistory([]));
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
    
    // Show preview for images
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
      // Use FormData to support file uploads
      const formData = new FormData();
      if (text) formData.append('text', text);
      if (uploadedFile) formData.append('file', uploadedFile);
      formData.append('questionCount', questionCount);
      formData.append('questionTypes', JSON.stringify(selectedTypes));
      formData.append('language', currentLanguage);

      const { data } = await api.post('/ai/generate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 min timeout for AI
      });
      if (!data.questions || data.questions.length === 0) {
        setError(t('aiNoQuestions') || 'AI returned no questions. Try again.');
        setLoading(false);
        return;
      }
      setGeneratedQuestions(data.questions);
      setSelectedQuestions(new Set(data.questions.map((_, i) => i)));
      setStep('preview');

      // Refresh history from backend
      api.get('/ai/history').then(res => setHistory(res.data)).catch(()=>{});
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
    // Keep text/file state so user doesn't lose work on accidental close
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

  const deleteHistoryEntry = async (id) => {
    try {
      await api.delete(`/ai/history/${id}`);
      setHistory(history.filter(h => h._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const clearHistory = async () => {
    try {
      await api.delete('/ai/history');
      setHistory([]);
    } catch (err) {
      console.error(err);
    }
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
          initial={{ scale: 0.96, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200/60 dark:border-gray-700/60"
        >
          {/* Header — clean white, no gradient */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center">
                <Sparkles className="text-indigo-500" size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight">
                  {t('aiGenerate') || 'AI Generate'}
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {step === 'input' 
                    ? (t('aiGenerateDesc') || 'Create questions from text or image')
                    : step === 'history'
                    ? (t('aiHistory') || 'Generation history')
                    : `${generatedQuestions.length} ${t('questionsGenerated') || 'questions generated'} · ${selectedQuestions.size} ${t('selected') || 'selected'}`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {step === 'input' && history.length > 0 && (
                <button
                  onClick={() => setStep('history')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors relative"
                  title={t('aiHistory') || 'History'}
                >
                  <History size={18} className="text-gray-400" />
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-indigo-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{history.length}</span>
                </button>
              )}
              <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {step === 'history' ? (
              /* HISTORY STEP */
              <>
                {history.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <History size={20} className="text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-400">{t('aiNoHistory') || 'No generation history yet'}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {history.map((entry) => (
                      <div
                        key={entry._id}
                        className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                        onClick={() => loadFromHistory(entry)}
                      >
                        <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Sparkles size={14} className="text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                            {entry.prompt.length > 60 ? entry.prompt.slice(0, 60) + '...' : entry.prompt}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(entry.createdAt).toLocaleString()}
                            </span>
                            <span className="text-[11px] text-indigo-500 dark:text-indigo-400 font-medium">
                              {entry.count} {t('questions') || 'questions'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteHistoryEntry(entry._id); }}
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 rounded-lg transition-all"
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
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    <FileText size={14} />
                    {t('aiTextInput') || 'Text content'}
                  </label>
                  <div className="relative">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={t('aiTextPlaceholder') || 'Paste text, lecture notes...'}
                      className="w-full h-44 px-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl resize-none text-sm text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-indigo-300 dark:focus:border-indigo-600 focus:shadow-input-focus transition-all shadow-inner shadow-gray-100/50 dark:shadow-gray-950/50"
                    />
                    <span className="absolute bottom-3 right-3 text-[10px] text-gray-300 dark:text-gray-600 tabular-nums">
                      {text.length}
                    </span>
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    <Upload size={14} />
                    {t('aiFileInput') || 'File (PDF, DOCX, TXT, Image)'}
                  </label>
                  {uploadedFile ? (
                    <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                      {filePreview ? (
                        <img src={filePreview} alt="Preview" className="h-14 w-14 rounded-lg border border-gray-200 dark:border-gray-700 object-cover" />
                      ) : (
                        <div className="h-14 w-14 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg flex items-center justify-center">
                          <File size={20} className="text-indigo-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{(uploadedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button
                        onClick={removeFile}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 transition-all flex flex-col items-center gap-2 group"
                    >
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950/50 transition-colors">
                        <Upload size={18} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
                      </div>
                      <span className="text-sm text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">{t('aiUploadFile') || 'Upload PDF, DOCX, TXT, or Image'}</span>
                      <span className="text-[10px] text-gray-300 dark:text-gray-600">max 20MB</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept={FILE_ACCEPT} onChange={handleFileUpload} className="hidden" />
                </div>

                {/* Question Count — with badge */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                    {t('aiQuestionCount') || 'Questions'}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuestionCount(Math.max(1, questionCount - 1))}
                      className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500"
                    >
                      <Minus size={14} />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="w-full accent-indigo-500 h-1.5"
                      />
                    </div>
                    <button
                      onClick={() => setQuestionCount(Math.min(20, questionCount + 1))}
                      className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500"
                    >
                      <Plus size={14} />
                    </button>
                    <span className="min-w-[2.25rem] h-9 flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-sm font-semibold rounded-lg tabular-nums">
                      {questionCount}
                    </span>
                  </div>
                </div>

                {/* Question Types — pill buttons */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                    {t('aiQuestionTypes') || 'Question types'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {QUESTION_TYPES.map(({ value, icon }) => (
                      <button
                        key={value}
                        onClick={() => toggleType(value)}
                        className={`px-3.5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                          selectedTypes.includes(value)
                            ? 'bg-indigo-500 text-white shadow-btn-glow'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className={`text-xs font-mono ${selectedTypes.includes(value) ? 'text-indigo-200' : 'opacity-50'}`}>{icon}</span>
                        {typeLabels[value] || value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/10 px-4 py-3 rounded-xl border border-red-100 dark:border-red-900/30">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    {error}
                  </div>
                )}
              </>
            ) : (
              /* PREVIEW STEP */
              <>
                {/* Select controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors font-medium"
                    >
                      <CheckCheck size={13} className="inline mr-1" />
                      {t('selectAll') || 'Select all'}
                    </button>
                    <button
                      onClick={deselectAll}
                      className="text-xs px-3 py-1.5 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      {t('deselectAll') || 'Deselect all'}
                    </button>
                  </div>
                  <span className="text-xs text-gray-400 tabular-nums font-medium">
                    {selectedQuestions.size} / {generatedQuestions.length}
                  </span>
                </div>

                {/* Questions list */}
                <div className="space-y-2">
                  {generatedQuestions.map((q, i) => (
                    <div
                      key={q.id || i}
                      className={`border rounded-xl transition-all ${
                        selectedQuestions.has(i)
                          ? 'border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-900'
                          : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 opacity-50'
                      }`}
                    >
                      {/* Question header */}
                      <div className="flex items-start gap-3 px-4 py-3">
                        <button
                          onClick={() => toggleQuestion(i)}
                          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            selectedQuestions.has(i)
                              ? 'bg-indigo-500 border-indigo-500 text-white'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                          }`}
                        >
                          {selectedQuestions.has(i) && <Check size={12} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded font-medium uppercase">
                              {typeLabels[q.type] || q.type}
                            </span>
                            <span className="text-[10px] text-gray-400 tabular-nums">{q.points} {t('points') || 'pts'}</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                        </div>
                        <button
                          onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                          className="flex-shrink-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
                            <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-800">
                              <div className="pt-3 space-y-1.5">
                                {/* Options */}
                                {q.options && q.options.length > 0 && (
                                  <div className="space-y-1">
                                    {q.options.map((opt, oi) => (
                                      <div
                                        key={opt.id || oi}
                                        className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
                                          opt.isCorrect
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400'
                                        }`}
                                      >
                                        {opt.isCorrect && <Check size={12} className="flex-shrink-0" />}
                                        <span>{q.type === 'matching' ? `${opt.text} → ${opt.matchPair}` : opt.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Fill blank answer */}
                                {q.type === 'fill-blank' && q.correctAnswer && (
                                  <div className="text-xs px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center gap-1.5">
                                    <Check size={12} className="flex-shrink-0" />
                                    {q.correctAnswer}
                                  </div>
                                )}
                                {/* Explanation */}
                                {q.explanation && (
                                  <div className="text-xs text-gray-400 dark:text-gray-500 italic px-1 pt-1.5">
                                    {q.explanation}
                                  </div>
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

          {/* Footer — clean, model badge left */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800">
            {step === 'history' ? (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('input')}
                  className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
                >
                  <RotateCcw size={14} />
                  {t('back') || 'Back'}
                </button>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    {t('clearAll') || 'Clear all'}
                  </button>
                )}
              </div>
            ) : step === 'input' ? (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium">
                  <Sparkles size={10} />
                  GPT-5.2 · Azure OpenAI
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
                  >
                    {t('cancel') || 'Cancel'}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={loading || (!text && !uploadedFile)}
                    className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-btn-glow"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {t('aiGenerating') || 'Generating...'}
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
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
                  className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2 font-medium"
                >
                  <RotateCcw size={14} />
                  {t('regenerate') || 'Regenerate'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
                  >
                    {t('cancel') || 'Cancel'}
                  </button>
                  <button
                    onClick={handleAddSelected}
                    disabled={selectedQuestions.size === 0}
                    className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-btn-glow"
                  >
                    <Plus size={16} />
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

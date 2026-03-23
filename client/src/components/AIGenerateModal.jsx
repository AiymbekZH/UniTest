import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Upload, FileText, Loader2, AlertCircle, Plus, Minus, Check, CheckCheck, RotateCcw, ChevronDown, File, History, Trash2, Clock } from 'lucide-react';
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

export default function AIGenerateModal({ isOpen, onClose, onGenerated, currentLanguage = 'ru' }) {
  const { t } = useLanguage();
  
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
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.3, type: "spring", bounce: 0.4 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20 dark:border-gray-700/50 relative"
        >
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none -mr-20 -mt-20 z-0"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none -ml-20 -mb-20 z-0"></div>

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-gray-100/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800/30 shadow-inner">
                <Sparkles className="text-indigo-500 dark:text-indigo-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {t('aiGenerate') || 'AI Generate'}
                </h2>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5 uppercase tracking-wide">
                  {step === 'input' 
                    ? (t('aiGenerateDesc') || 'Create questions from text or image')
                    : step === 'history'
                    ? (t('aiHistory') || 'Generation history')
                    : `${generatedQuestions.length} ${t('questionsGenerated') || 'questions generated'} · ${selectedQuestions.size} ${t('selected') || 'selected'}`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {step === 'input' && history.length > 0 && (
                <button
                  onClick={() => setStep('history')}
                  className="p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors relative shadow-sm"
                  title={t('aiHistory') || 'History'}
                >
                  <History size={18} className="text-gray-500 dark:text-gray-400" />
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-500 text-white text-[10px] font-bold rounded-lg flex items-center justify-center shadow-sm border-2 border-white dark:border-gray-900">{history.length}</span>
                </button>
              )}
              <button onClick={handleClose} className="p-2.5 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800/30 text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl transition-all shadow-sm">
                <X size={18} />
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
                <div className="relative z-10 space-y-6">
                {/* Text Input */}
                <div>
                  <label className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest pl-1">
                    <FileText size={14} className="text-indigo-400" />
                    {t('aiTextInput') || 'Text content'}
                  </label>
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-[1.25rem] blur opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none"></div>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={t('aiTextPlaceholder') || 'Paste text, lecture notes, or topic here...'}
                      className="relative w-full h-44 px-5 py-4 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 rounded-2xl resize-none text-sm font-medium text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-inner"
                    />
                    <span className="absolute bottom-4 right-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-gray-800/80 px-2 py-0.5 rounded-md shadow-sm border border-gray-100 dark:border-gray-700">
                      {text.length}
                    </span>
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest pl-1">
                    <Upload size={14} className="text-purple-400" />
                    {t('aiFileInput') || 'Document or Image'}
                  </label>
                  {uploadedFile ? (
                    <div className="flex items-center gap-4 p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-indigo-200/60 dark:border-indigo-800/60 rounded-2xl shadow-sm transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700">
                      {filePreview ? (
                        <img src={filePreview} alt="Preview" className="h-16 w-16 rounded-xl border border-gray-200 dark:border-gray-700 object-cover shadow-sm" />
                      ) : (
                        <div className="h-16 w-16 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center border border-indigo-100 dark:border-indigo-800/30 shadow-inner">
                          <File size={24} className="text-indigo-500 dark:text-indigo-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{uploadedFile.name}</p>
                        <p className="text-xs font-medium text-gray-500 mt-1">{(uploadedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button
                        onClick={removeFile}
                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full py-10 border-2 border-dashed border-gray-200/80 dark:border-gray-700/80 rounded-2xl bg-white/40 dark:bg-gray-900/40 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all flex flex-col items-center gap-3 group backdrop-blur-sm relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform"></div>
                      <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-gray-100 dark:border-gray-700 relative z-10">
                        <Upload size={20} className="text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                      </div>
                      <div className="text-center relative z-10">
                        <span className="block text-sm font-semibold text-gray-600 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{t('aiUploadFile') || 'Upload PDF, DOCX, TXT, or Image'}</span>
                        <span className="block text-[11px] font-bold text-gray-400 mt-1">max 20MB</span>
                      </div>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept={FILE_ACCEPT} onChange={handleFileUpload} className="hidden" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Question Count */}
                  <div className="bg-white/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 p-5 rounded-2xl shadow-sm backdrop-blur-sm">
                    <label className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-widest">
                      {t('aiQuestionCount') || 'Questions Number'}
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setQuestionCount(Math.max(1, questionCount - 1))}
                        className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-900 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm"
                      >
                        <Minus size={16} />
                      </button>
                      <div className="flex-1 relative flex items-center group">
                        <div className="absolute inset-x-0 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300" style={{ width: `${(questionCount / 20) * 100}%` }}></div>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={20}
                          value={questionCount}
                          onChange={(e) => setQuestionCount(Number(e.target.value))}
                          className="w-full h-2 opacity-0 cursor-pointer absolute inset-0 py-2 focus:outline-none z-10"
                        />
                        {/* Custom thumb */}
                        <div className="absolute w-5 h-5 bg-white border-[3px] border-indigo-500 rounded-full shadow-md pointer-events-none transition-all duration-300 group-hover:scale-110" style={{ left: `calc(${(questionCount / 20) * 100}% - 10px)` }}></div>
                      </div>
                      <button
                        onClick={() => setQuestionCount(Math.min(20, questionCount + 1))}
                        className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-900 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm"
                      >
                        <Plus size={16} />
                      </button>
                      <span className="w-12 h-10 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-base font-extrabold rounded-xl shadow-md border border-indigo-400/50">
                        {questionCount}
                      </span>
                    </div>
                  </div>

                  {/* Question Types */}
                  <div className="bg-white/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 p-5 rounded-2xl shadow-sm backdrop-blur-sm">
                    <label className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-widest">
                      {t('aiQuestionTypes') || 'Question types'}
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {QUESTION_TYPES.map(({ value, icon }) => {
                        const isSelected = selectedTypes.includes(value);
                        return (
                          <button
                            key={value}
                            onClick={() => toggleType(value)}
                            className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 border shadow-sm ${
                              isSelected
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent'
                                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-md'
                            }`}
                          >
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>{icon}</span>
                            {typeLabels[value] || value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
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

          {/* Footer */}
          <div className="relative z-10 px-6 sm:px-8 py-5 border-t border-gray-100/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
            {step === 'history' ? (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('input')}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  {t('back') || 'Back'}
                </button>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="px-5 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center gap-2 border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                  >
                    <Trash2 size={16} />
                    {t('clearAll') || 'Clear all'}
                  </button>
                )}
              </div>
            ) : step === 'input' ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-[11px] font-bold text-indigo-500/70 bg-indigo-50/50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-indigo-100/50 dark:border-indigo-800/30 shadow-inner">
                  <Sparkles size={12} />
                  GPT-4o Model
                </span>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleClose}
                    className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  >
                    {t('cancel') || 'Cancel'}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={loading || (!text && !uploadedFile)}
                    className="flex-1 sm:flex-none px-8 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 transition-all shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)] hover:shadow-[0_8px_25px_-6px_rgba(99,102,241,0.7)] hover:-translate-y-0.5"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        {t('aiGenerating') || 'Generating...'}
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        {t('aiGenerateBtn') || 'Generate Ideas'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <button
                  onClick={goBack}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  {t('regenerate') || 'Regenerate'}
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClose}
                    className="px-6 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  >
                    {t('cancel') || 'Cancel'}
                  </button>
                  <button
                    onClick={handleAddSelected}
                    disabled={selectedQuestions.size === 0}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-[0_8px_20px_-6px_rgba(16,185,129,0.5)] hover:shadow-[0_8px_25px_-6px_rgba(16,185,129,0.7)] hover:-translate-y-0.5"
                  >
                    <Plus size={18} />
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

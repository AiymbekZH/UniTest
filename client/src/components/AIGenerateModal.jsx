import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Upload, FileText, Image, Loader2, AlertCircle, Plus, Minus, Check, CheckCheck, RotateCcw, ChevronDown, File } from 'lucide-react';
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
  const [step, setStep] = useState('input'); // 'input' | 'preview'
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  
  const fileRef = useRef(null);

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
    onClose();
  };

  const goBack = () => {
    setStep('input');
    setExpandedQuestion(null);
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
                <Sparkles className="text-purple-600 dark:text-purple-400" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('aiGenerate') || 'AI Generate'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {step === 'input' 
                    ? (t('aiGenerateDesc') || 'Create questions from text or image')
                    : `${generatedQuestions.length} ${t('questionsGenerated') || 'questions generated'} • ${selectedQuestions.size} ${t('selected') || 'selected'}`
                  }
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {step === 'input' ? (
              <>
                {/* Text Input */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FileText size={16} />
                    {t('aiTextInput') || 'Text content'}
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('aiTextPlaceholder') || 'Paste text, lecture notes...'}
                    className="w-full h-36 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* File Upload (PDF, DOCX, TXT, Image) */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Upload size={16} />
                    {t('aiFileInput') || 'File (PDF, DOCX, TXT, Image)'}
                  </label>
                  {uploadedFile ? (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
                      {filePreview ? (
                        <img src={filePreview} alt="Preview" className="h-16 rounded-lg border border-gray-200 dark:border-gray-700 object-cover" />
                      ) : (
                        <span className="text-2xl">{getFileIcon()}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-400">{(uploadedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button
                        onClick={removeFile}
                        className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-purple-400 transition-colors flex flex-col items-center gap-2 text-gray-400"
                    >
                      <Upload size={24} />
                      <span className="text-sm">{t('aiUploadFile') || 'Upload PDF, DOCX, TXT, or Image'}</span>
                      <span className="text-[10px] opacity-60">max 20MB</span>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept={FILE_ACCEPT} onChange={handleFileUpload} className="hidden" />
                </div>

                {/* Question Count */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    {t('aiQuestionCount') || 'Questions'}: {questionCount}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuestionCount(Math.max(1, questionCount - 1))}
                      className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      className="flex-1 accent-purple-500"
                    />
                    <button
                      onClick={() => setQuestionCount(Math.min(20, questionCount + 1))}
                      className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Question Types */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    {t('aiQuestionTypes') || 'Question types'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {QUESTION_TYPES.map(({ value, icon }) => (
                      <button
                        key={value}
                        onClick={() => toggleType(value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          selectedTypes.includes(value)
                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <span className="text-xs opacity-70">{icon}</span>
                        {typeLabels[value] || value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">
                    <AlertCircle size={16} />
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
                      className="text-xs px-3 py-1.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/70 transition-colors"
                    >
                      <CheckCheck size={14} className="inline mr-1" />
                      {t('selectAll') || 'Select all'}
                    </button>
                    <button
                      onClick={deselectAll}
                      className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {t('deselectAll') || 'Deselect all'}
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">
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
                          ? 'border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 opacity-60'
                      }`}
                    >
                      {/* Question header */}
                      <div className="flex items-start gap-3 px-4 py-3">
                        <button
                          onClick={() => toggleQuestion(i)}
                          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                            selectedQuestions.has(i)
                              ? 'bg-purple-500 border-purple-500 text-white'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {selectedQuestions.has(i) && <Check size={12} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded font-medium uppercase">
                              {typeLabels[q.type] || q.type}
                            </span>
                            <span className="text-[10px] text-gray-400">{q.points} {t('points') || 'pts'}</span>
                          </div>
                          <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2" dangerouslySetInnerHTML={{ __html: q.questionText }} />
                        </div>
                        <button
                          onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                          className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandedQuestion === i ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {expandedQuestion === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3 pt-0 border-t border-gray-200 dark:border-gray-700 mt-0">
                              <div className="pt-3 space-y-2">
                                {/* Options */}
                                {q.options && q.options.length > 0 && (
                                  <div className="space-y-1">
                                    {q.options.map((opt, oi) => (
                                      <div
                                        key={opt.id || oi}
                                        className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                                          opt.isCorrect
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                        }`}
                                      >
                                        {opt.isCorrect && <Check size={12} />}
                                        <span>{q.type === 'matching' ? `${opt.text} → ${opt.matchPair}` : opt.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Fill blank answer */}
                                {q.type === 'fill-blank' && q.correctAnswer && (
                                  <div className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
                                    <Check size={12} className="inline mr-1" />
                                    {q.correctAnswer}
                                  </div>
                                )}
                                {/* Explanation */}
                                {q.explanation && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 italic px-1 pt-1">
                                    💡 {q.explanation}
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
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            {step === 'input' ? (
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Sparkles size={10} />
                  GPT-5.2 • Azure OpenAI
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    {t('cancel') || 'Cancel'}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={loading || (!text && !uploadedFile)}
                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
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
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2"
                >
                  <RotateCcw size={14} />
                  {t('regenerate') || 'Regenerate'}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    {t('cancel') || 'Cancel'}
                  </button>
                  <button
                    onClick={handleAddSelected}
                    disabled={selectedQuestions.size === 0}
                    className="px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
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

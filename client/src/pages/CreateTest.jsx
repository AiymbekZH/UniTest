import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Save, ArrowLeft, Image, Video, Music,
  Check, X, Type, ListChecks, ToggleLeft,
  FileText, Link2, Settings, Upload, ChevronUp, ChevronDown,
  Database, FileSpreadsheet, Eye, EyeOff, Ticket
} from 'lucide-react';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ConfirmDialog from '../components/ConfirmDialog';
import { lazy, Suspense } from 'react';
const RichTextEditor = lazy(() => import('../components/RichTextEditor'));
import { useLanguage } from '../context/LanguageContext';
import { v4 as uuidv4 } from 'uuid';

const questionTypesData = [
  { value: 'single-choice', labelKey: 'singleChoice', icon: Check, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' },
  { value: 'multiple-choice', labelKey: 'multipleChoice', icon: ListChecks, color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30' },
  { value: 'true-false', labelKey: 'trueFalse', icon: ToggleLeft, color: 'bg-green-50 text-green-600 dark:bg-green-900/30' },
  { value: 'essay', labelKey: 'essay', icon: FileText, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30' },
  { value: 'matching', labelKey: 'matching', icon: Link2, color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30' },
  { value: 'fill-blank', labelKey: 'fillBlank', icon: Type, color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30' },
];

function createQuestion(type = 'single-choice') {
  const base = { id: uuidv4(), type, questionText: '', passage: '', points: 1, options: [], correctAnswer: '', media: { type: '', url: '', fileName: '' }, explanation: '' };

  if (type === 'single-choice' || type === 'multiple-choice') {
    base.options = [
      { id: uuidv4(), text: '', isCorrect: false },
      { id: uuidv4(), text: '', isCorrect: false },
      { id: uuidv4(), text: '', isCorrect: false },
      { id: uuidv4(), text: '', isCorrect: false },
    ];
  } else if (type === 'true-false') {
    base.options = [
      { id: uuidv4(), text: 'Верно', isCorrect: false },
      { id: uuidv4(), text: 'Неверно', isCorrect: false },
      { id: uuidv4(), text: 'Не уверен в ответе', isCorrect: false },
    ];
  } else if (type === 'matching') {
    base.options = [
      { id: uuidv4(), text: '', isCorrect: true, matchPair: '' },
      { id: uuidv4(), text: '', isCorrect: true, matchPair: '' },
      { id: uuidv4(), text: '', isCorrect: true, matchPair: '' },
    ];
  }
  return base;
}

export default function CreateTest() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [collapsed, setCollapsed] = useState({});
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, index: null });
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftStatus, setDraftStatus] = useState(''); // '' | 'saving' | 'saved'
  const questionRefs = useRef({});
  const autoSaveTimer = useRef(null);
  const { t } = useLanguage();

  const questionTypes = questionTypesData.map(qt => ({ ...qt, label: t(qt.labelKey) }));

  const [test, setTest] = useState({
    title: '',
    description: '',
    tags: [],
    tagInput: '',
    questions: [createQuestion()],
    settings: {
      timeLimit: 0,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResults: true,
      allowReview: true,
      instantFeedback: true,
      questionPoolSize: 0,
      inactivityTimeout: 0,
      practiceMode: false,
      variants: { enabled: false, count: 0 },
      startDate: '',
      endDate: '',
      maxAttempts: 1,
      isPublic: false,
      antiCheat: {
        blockTabSwitch: true,
        blockCopyPaste: true,
        blockScreenshot: true,
        maxViolations: 5,
      }
    }
  });

  useEffect(() => {
    if (editId) {
      api.get(`/tests/${editId}`).then(res => {
        const t = res.data;
        setTest({
          title: t.title,
          description: t.description || '',
          tags: t.tags || [],
          tagInput: '',
          questions: t.questions || [createQuestion()],
          settings: t.settings || test.settings
        });
      }).catch(() => toast.error(t('errorLoading')));
    } else {
      // Check for draft
      const draft = localStorage.getItem('unitest_draft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (parsed.title || parsed.questions?.length > 1) {
            setShowDraftDialog(true);
          }
        } catch {}
      }
    }
  }, [editId]);

  // Auto-save draft (debounced 2s)
  useEffect(() => {
    if (editId) return; // Don't auto-save when editing existing test
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setDraftStatus('saving');
    autoSaveTimer.current = setTimeout(() => {
      const { tagInput, ...data } = test;
      localStorage.setItem('unitest_draft', JSON.stringify(data));
      setDraftStatus('saved');
      setTimeout(() => setDraftStatus(''), 3000);
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [test, editId]);

  const restoreDraft = () => {
    try {
      const draft = JSON.parse(localStorage.getItem('unitest_draft'));
      if (draft) {
        setTest({ ...draft, tagInput: '' });
        toast.success(t('restore'));
      }
    } catch {}
    setShowDraftDialog(false);
  };

  const discardDraft = () => {
    localStorage.removeItem('unitest_draft');
    setShowDraftDialog(false);
  };

  const updateTest = (field, value) => setTest(prev => ({ ...prev, [field]: value }));
  const updateSettings = (field, value) => setTest(prev => ({
    ...prev, settings: { ...prev.settings, [field]: value }
  }));
  const updateAntiCheat = (field, value) => setTest(prev => ({
    ...prev, settings: {
      ...prev.settings, antiCheat: { ...prev.settings.antiCheat, [field]: value }
    }
  }));

  const updateQuestion = (index, field, value) => {
    const updated = [...test.questions];
    updated[index] = { ...updated[index], [field]: value };
    setTest(prev => ({ ...prev, questions: updated }));
  };

  const updateOption = (qIndex, oIndex, field, value) => {
    const updated = [...test.questions];
    const opts = [...updated[qIndex].options];

    if (field === 'isCorrect' && (updated[qIndex].type === 'single-choice' || updated[qIndex].type === 'true-false')) {
      opts.forEach((o, i) => { opts[i] = { ...o, isCorrect: i === oIndex }; });
    } else {
      opts[oIndex] = { ...opts[oIndex], [field]: value };
    }

    updated[qIndex] = { ...updated[qIndex], options: opts };
    setTest(prev => ({ ...prev, questions: updated }));
  };

  const addOption = (qIndex) => {
    const updated = [...test.questions];
    updated[qIndex].options.push({ id: uuidv4(), text: '', isCorrect: false, matchPair: '' });
    setTest(prev => ({ ...prev, questions: updated }));
  };

  const removeOption = (qIndex, oIndex) => {
    const updated = [...test.questions];
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== oIndex);
    setTest(prev => ({ ...prev, questions: updated }));
  };

  const addQuestion = (type = 'single-choice') => {
    const newQ = createQuestion(type);
    setTest(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
    setActiveQuestion(test.questions.length);
    setShowAddMenu(false);
    setTimeout(() => {
      const el = questionRefs.current[test.questions.length];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const removeQuestion = (index) => {
    if (test.questions.length <= 1) { toast.error(t('minOneQuestion')); return; }
    setTest(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== index) }));
    if (activeQuestion >= test.questions.length - 1) setActiveQuestion(Math.max(0, test.questions.length - 2));
  };

  const scrollToQuestion = (index) => {
    setActiveQuestion(index);
    setCollapsed(prev => ({ ...prev, [index]: false }));
    const el = questionRefs.current[index];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleMediaUpload = async (qIndex, file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/tests/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateQuestion(qIndex, 'media', res.data);
      toast.success(t('mediaUploaded'));
    } catch (err) {
      toast.error(t('errorUploadMedia'));
    }
  };

  const addTag = () => {
    if (test.tagInput.trim() && !test.tags.includes(test.tagInput.trim())) {
      updateTest('tags', [...test.tags, test.tagInput.trim()]);
      updateTest('tagInput', '');
    }
  };

  const stripHtml = (html) => html?.replace(/<[^>]*>/g, '').trim() || '';

  const handleSave = async () => {
    if (!test.title.trim()) { toast.error(t('enterTestTitle')); return; }
    if (test.questions.some(q => !stripHtml(q.questionText))) { toast.error(t('fillAllQuestions')); return; }

    // Validation: check for correct answers and empty options
    for (let i = 0; i < test.questions.length; i++) {
      const q = test.questions[i];
      const num = i + 1;

      // For single-choice, multiple-choice, true-false: must have at least one correct option
      if (['single-choice', 'multiple-choice', 'true-false'].includes(q.type)) {
        if (!q.options.some(o => o.isCorrect)) {
          toast.error(t('noCorrectAnswer', { num }));
          scrollToQuestion(i);
          return;
        }
      }

      // For fill-blank: must have correct answer text
      if (q.type === 'fill-blank' && !q.correctAnswer?.trim()) {
        toast.error(t('noCorrectAnswer', { num }));
        scrollToQuestion(i);
        return;
      }

      // Check for empty option texts (single/multiple choice)
      if (['single-choice', 'multiple-choice'].includes(q.type)) {
        if (q.options.some(o => !o.text.trim())) {
          toast.error(t('emptyOptions', { num }));
          scrollToQuestion(i);
          return;
        }
      }

      // Matching: check for empty texts or pairs
      if (q.type === 'matching') {
        if (q.options.some(o => !o.text.trim() || !o.matchPair?.trim())) {
          toast.error(t('emptyOptions', { num }));
          scrollToQuestion(i);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const { tagInput, ...data } = test;
      if (editId) {
        await api.put(`/tests/${editId}`, data);
        toast.success(t('testUpdated'));
      } else {
        await api.post('/tests', data);
        toast.success(t('testCreated'));
        localStorage.removeItem('unitest_draft');
      }
      navigate('/my-tests');
    } catch (err) {
      toast.error(err.response?.data?.message || t('errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  const handleFileImport = async (file) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const imported = [];
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 3) continue;
        
        const [questionText, type, correctIdx, ...optTexts] = cols;
        const qType = type || 'single-choice';
        const q = createQuestion(qType === 'essay' || qType === 'fill-blank' || qType === 'matching' ? qType : 'single-choice');
        q.questionText = questionText;
        
        if (qType === 'fill-blank') {
          q.type = 'fill-blank';
          q.correctAnswer = correctIdx;
          q.options = [];
        } else if (qType === 'essay') {
          q.type = 'essay';
          q.options = [];
        } else {
          const validOpts = optTexts.filter(Boolean);
          if (validOpts.length > 0) {
            q.options = validOpts.map((text, idx) => ({
              id: uuidv4(),
              text,
              isCorrect: String(idx + 1) === String(correctIdx) || text === correctIdx
            }));
          }
        }
        imported.push(q);
      }
      
      if (imported.length > 0) {
        setTest(prev => ({ ...prev, questions: [...prev.questions, ...imported] }));
        toast.success(`${t('importedQuestions')}: ${imported.length}`);
      } else {
        toast.error(t('cannotParseQuestions'));
      }
    } catch (err) {
      toast.error(t('errorReadingFile'));
    }
    setShowImportModal(false);
  };

  const loadBankQuestions = async () => {
    try {
      const res = await api.get('/question-bank?limit=100');
      setBankQuestions(res.data.questions || []);
      setShowBankModal(true);
    } catch (err) {
      toast.error(t('errorLoadingBank'));
    }
  };

  const addFromBank = (questions) => {
    const toAdd = questions.map(q => ({
      ...createQuestion(q.type),
      type: q.type,
      questionText: q.questionText,
      points: q.points,
      options: q.options,
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || ''
    }));
    setTest(prev => ({ ...prev, questions: [...prev.questions, ...toAdd] }));
    toast.success(`${t('addedFromBank')}: ${toAdd.length}`);
    setShowBankModal(false);
  };

  const saveToBank = async () => {
    try {
      await api.post('/question-bank/bulk', {
        questions: test.questions,
        category: test.title
      });
      toast.success(t('savedToBank'));
    } catch (err) {
      toast.error(t('errorSavingToBank'));
    }
  };

  const MediaIcon = ({ type }) => {
    if (type === 'video') return <Video size={16} />;
    if (type === 'audio') return <Music size={16} />;
    return <Image size={16} />;
  };

  const totalPoints = test.questions.reduce((s, q) => s + (q.points || 0), 0);

  return (
    <div className="min-h-screen bg-surface">
      <Toaster position="top-right" />
      <Navbar />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, index: null })}
        onConfirm={() => removeQuestion(deleteConfirm.index)}
        title={t('deleteQuestion')}
        message={t('deleteQuestionConfirm', { num: (deleteConfirm.index || 0) + 1 })}
        confirmText={t('delete')}
        variant="danger"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex gap-6">
        {/* Left Sidebar: Question Navigator */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-3">
            <div className="glass-card-solid p-4">
              <h3 className="text-sm font-semibold text-dark mb-3">{t('navigation')}</h3>
              <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
                {test.questions.map((q, i) => {
                  const typeInfo = questionTypes.find(t => t.value === q.type);
                  return (
                    <button
                      key={q.id}
                      onClick={() => scrollToQuestion(i)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left
                        ${activeQuestion === i
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 font-medium'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                    >
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0
                        ${activeQuestion === i ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-gray-300'}`}>
                        {i + 1}
                      </span>
                      <span className="truncate flex-1">{stripHtml(q.questionText) || typeInfo?.label || t('question')}</span>
                      {!stripHtml(q.questionText) && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>{t('questionsCount')}: <strong className="text-dark">{test.questions.length}</strong></p>
                <p>{t('pointsCount')}: <strong className="text-dark">{totalPoints}</strong></p>
              </div>
            </div>

            <div className="glass-card-solid p-3 space-y-2">
              <button onClick={loadBankQuestions}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                <Database size={14} /> {t('fromQuestionBank')}
              </button>
              <button onClick={() => setShowImportModal(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                <FileSpreadsheet size={14} /> {t('importCSV')}
              </button>
              <button onClick={saveToBank}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                <Save size={14} /> {t('saveToBank')}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <ArrowLeft size={20} className="text-dark" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-dark">{editId ? t('editTest') : t('createTest')}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {test.questions.length} {t('questions')} · {totalPoints} {t('points')}
                  {!editId && draftStatus && (
                    <span className={`ml-2 ${draftStatus === 'saved' ? 'text-emerald-500' : 'text-gray-400'}`}>
                      {draftStatus === 'saving' ? t('savingDraft') : t('draftSaved')}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSettings(!showSettings)} className="btn-secondary flex items-center gap-2 py-2 px-3 text-xs">
                <Settings size={14} /> {t('settings')}
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2 py-2 px-4 text-xs"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                {editId ? t('update') : t('save')}
              </motion.button>
            </div>
          </motion.div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-5"
              >
                <div className="glass-card-solid p-5 space-y-4">
                  <h3 className="font-semibold text-dark flex items-center gap-2 text-sm"><Settings size={16} /> {t('testSettings')}</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('timeLimitMin')}</label>
                      <input type="number" className="input-field text-sm py-2" min="0" value={test.settings.timeLimit}
                        onChange={e => updateSettings('timeLimit', parseInt(e.target.value) || 0)} placeholder={t('noLimitPlaceholder')} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('maxAttempts')}</label>
                      <input type="number" className="input-field text-sm py-2" min="1" value={test.settings.maxAttempts}
                        onChange={e => updateSettings('maxAttempts', parseInt(e.target.value) || 1)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('maxViolations')}</label>
                      <input type="number" className="input-field text-sm py-2" min="1" value={test.settings.antiCheat.maxViolations}
                        onChange={e => updateAntiCheat('maxViolations', parseInt(e.target.value) || 5)} />
                    </div>
                  </div>

                  {/* Deadline */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('startDate')}</label>
                      <input type="datetime-local" className="input-field text-sm py-2" value={test.settings.startDate || ''}
                        onChange={e => updateSettings('startDate', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('endDate')}</label>
                      <input type="datetime-local" className="input-field text-sm py-2" value={test.settings.endDate || ''}
                        onChange={e => updateSettings('endDate', e.target.value)} />
                    </div>
                  </div>

                  {/* Pool + Inactivity */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('questionPoolSize')}</label>
                      <input type="number" className="input-field text-sm py-2" min="0" value={test.settings.questionPoolSize || 0}
                        onChange={e => updateSettings('questionPoolSize', parseInt(e.target.value) || 0)} placeholder={t('poolSizeHint')} />
                      <p className="text-[10px] text-gray-400 mt-0.5">{t('poolSizeHint')}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('inactivityTimeout')}</label>
                      <input type="number" className="input-field text-sm py-2" min="0" value={test.settings.inactivityTimeout || 0}
                        onChange={e => updateSettings('inactivityTimeout', parseInt(e.target.value) || 0)} placeholder={t('inactivityHint')} />
                      <p className="text-[10px] text-gray-400 mt-0.5">{t('inactivityHint')}</p>
                    </div>
                  </div>

                  {/* Variant/Ticket system */}
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateSettings('variants', { ...test.settings.variants, enabled: !test.settings.variants?.enabled })}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all
                          ${test.settings.variants?.enabled ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500'}`}
                      >
                        <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all
                          ${test.settings.variants?.enabled ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-slate-500'}`}>
                          {test.settings.variants?.enabled && <Check size={8} className="text-white" />}
                        </div>
                        <Ticket size={12} className="inline -mt-0.5" /> {t('variantsEnabled') || 'Система билетов'}
                      </button>
                      {test.settings.variants?.enabled && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-indigo-600 dark:text-indigo-400">{t('variantCount') || 'Кол-во вариантов'}:</label>
                          <input type="number" className="input-field text-sm py-1.5 w-20" min="2" max="100"
                            value={test.settings.variants?.count || 0}
                            onChange={e => updateSettings('variants', { ...test.settings.variants, count: parseInt(e.target.value) || 0 })} />
                        </div>
                      )}
                    </div>
                    {test.settings.variants?.enabled && (
                      <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-2">
                        {t('variantsHint') || 'Студенты выбирают билет при входе. Каждый билет = уникальный порядок вопросов. Один билет на одного студента.'}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'isPublic', label: t('isPublic'), update: updateSettings },
                      { key: 'shuffleQuestions', label: t('shuffleQuestions'), update: updateSettings },
                      { key: 'shuffleOptions', label: t('shuffleOptions'), update: updateSettings },
                      { key: 'showResults', label: t('showResults'), update: updateSettings },
                      { key: 'instantFeedback', label: t('instantFeedback'), update: updateSettings },
                      { key: 'practiceMode', label: t('practiceModeLabel'), update: updateSettings },
                      { key: 'blockTabSwitch', label: t('blockTabSwitch'), update: updateAntiCheat, isAntiCheat: true },
                      { key: 'blockCopyPaste', label: t('blockCopyPaste'), update: updateAntiCheat, isAntiCheat: true },
                      { key: 'blockScreenshot', label: t('blockScreenshot'), update: updateAntiCheat, isAntiCheat: true },
                    ].map(opt => {
                      const val = opt.isAntiCheat ? test.settings.antiCheat[opt.key] : test.settings[opt.key];
                      return (
                        <button
                          key={opt.key}
                          onClick={() => opt.update(opt.key, !val)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all
                            ${val ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700 text-primary-600' : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50'}`}
                        >
                          <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all
                            ${val ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-slate-500'}`}>
                            {val && <Check size={8} className="text-white" />}
                          </div>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Test Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="glass-card-solid p-5 mb-5 space-y-3">
            <input
              className="w-full text-lg font-bold text-dark bg-transparent border-none outline-none placeholder-gray-300 dark:placeholder-gray-600"
              placeholder={t('testTitlePlaceholder')}
              value={test.title}
              onChange={e => updateTest('title', e.target.value)}
            />
            <textarea
              className="input-field resize-none text-sm py-2"
              rows="2"
              placeholder={t('testDescPlaceholder')}
              value={test.description}
              onChange={e => updateTest('description', e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              {test.tags.map((tag, i) => (
                <span key={i} className="badge-info flex items-center gap-1 text-xs">
                  {tag}
                  <button onClick={() => updateTest('tags', test.tags.filter((_, idx) => idx !== i))} className="hover:text-primary-800">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                className="text-xs bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-600 w-28 text-dark"
                placeholder="+ тег"
                value={test.tagInput}
                onChange={e => updateTest('tagInput', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              />
            </div>
          </motion.div>

          {/* Mobile Quick Actions */}
          <div className="lg:hidden flex gap-2 mb-4 overflow-x-auto pb-2">
            <button onClick={loadBankQuestions} className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs whitespace-nowrap">
              <Database size={12} /> {t('fromQuestionBank')}
            </button>
            <button onClick={() => setShowImportModal(true)} className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs whitespace-nowrap">
              <FileSpreadsheet size={12} /> {t('importCSV')}
            </button>
            <button onClick={saveToBank} className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs whitespace-nowrap">
              <Save size={12} /> {t('saveToBank')}
            </button>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <AnimatePresence>
              {test.questions.map((question, qIndex) => (
                <motion.div
                  key={question.id}
                  ref={el => questionRefs.current[qIndex] = el}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className={`glass-card-solid overflow-hidden transition-all
                    ${activeQuestion === qIndex ? 'ring-2 ring-primary-500/30' : ''}`}
                  onClick={() => setActiveQuestion(qIndex)}
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between p-4 cursor-pointer select-none"
                    onClick={e => { e.stopPropagation(); setCollapsed(prev => ({ ...prev, [qIndex]: !prev[qIndex] })); }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex items-center justify-center w-7 h-7 bg-primary-50 dark:bg-primary-900/30 text-primary-600 rounded-lg font-bold text-xs flex-shrink-0">
                        {qIndex + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-dark truncate">
                          {question.questionText || t('newQuestion')}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {questionTypes.find(t => t.value === question.type)?.label} • {question.points} б.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); setDeleteConfirm({ open: true, index: qIndex }); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                      {collapsed[qIndex] ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  {/* Collapsible body */}
                  <AnimatePresence initial={false}>
                  {!collapsed[qIndex] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
                    <div className="px-4 pb-4 space-y-3">
                      {/* Type + Points */}
                      <div className="flex items-center gap-3">
                        <select
                          value={question.type}
                          onChange={e => {
                            const newQ = createQuestion(e.target.value);
                            newQ.questionText = question.questionText;
                            newQ.points = question.points;
                            newQ.media = question.media;
                            newQ.id = question.id;
                            const updated = [...test.questions];
                            updated[qIndex] = newQ;
                            setTest(prev => ({ ...prev, questions: updated }));
                          }}
                          className="text-xs font-medium bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary-500/20 text-dark"
                        >
                          {questionTypes.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" className="w-14 text-center input-field py-1 px-1 text-xs"
                            value={question.points} onChange={e => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 0)} />
                          <span className="text-[10px] text-gray-500">{t('points')}</span>
                        </div>
                      </div>

                      {/* Question text */}
                      <Suspense fallback={<div className="input-field animate-pulse h-20" />}>
                        <RichTextEditor
                          content={question.questionText}
                          onChange={val => updateQuestion(qIndex, 'questionText', val)}
                          placeholder={t('questionTextPlaceholder')}
                        />
                      </Suspense>

                      {/* Optional passage / reading text */}
                      <div>
                        {!question.passage ? (
                          <button
                            onClick={() => updateQuestion(qIndex, 'passage', ' ')}
                            className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            <FileText size={12} />
                            {t('addPassage')}
                          </button>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                <FileText size={12} /> {t('passage')}
                              </span>
                              <button
                                onClick={() => updateQuestion(qIndex, 'passage', '')}
                                className="text-xs text-red-500 hover:text-red-600"
                              >
                                {t('delete')}
                              </button>
                            </div>
                            <textarea
                              className="input-field resize-none text-sm py-2"
                              rows="4"
                              placeholder={t('passagePlaceholder')}
                              value={question.passage.trim() === '' ? '' : question.passage}
                              onChange={e => updateQuestion(qIndex, 'passage', e.target.value || ' ')}
                            />
                          </>
                        )}
                      </div>

                      {/* Media upload */}
                      <div>
                        {question.media?.url ? (
                          <div className="space-y-2">
                            {/* Media preview */}
                            <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-slate-700">
                              {question.media.type === 'image' && (
                                <img src={question.media.url} alt="" className="w-full max-h-48 object-contain" />
                              )}
                              {question.media.type === 'video' && (
                                <video controls playsInline preload="metadata" className="w-full max-h-48">
                                  <source src={question.media.url} />
                                </video>
                              )}
                              {question.media.type === 'audio' && (
                                <div className="p-4">
                                  <audio src={question.media.url} controls className="w-full" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-slate-700 rounded-lg text-xs">
                              <MediaIcon type={question.media.type} />
                              <span className="text-gray-600 dark:text-gray-300 flex-1 truncate">{question.media.fileName}</span>
                              <button onClick={() => updateQuestion(qIndex, 'media', { type: '', url: '', fileName: '' })}
                                className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 p-2.5 border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-lg cursor-pointer 
                            hover:border-primary-300 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all text-xs text-gray-500 dark:text-gray-400">
                            <Upload size={14} />
                            {t('addMedia')}
                            <input type="file" className="hidden" accept="image/*,video/*,audio/*"
                              onChange={e => e.target.files[0] && handleMediaUpload(qIndex, e.target.files[0])} />
                          </label>
                        )}
                      </div>

                      {/* Options based on type */}
                      {(question.type === 'single-choice' || question.type === 'multiple-choice') && (
                        <div className="space-y-2">
                          {question.options.map((opt, oIndex) => (
                            <div key={opt.id} className="flex items-center gap-2">
                              <button
                                onClick={() => updateOption(qIndex, oIndex, 'isCorrect', !opt.isCorrect)}
                                className={`w-5 h-5 ${question.type === 'single-choice' ? 'rounded-full' : 'rounded-md'} border-2 flex items-center justify-center transition-all flex-shrink-0
                                  ${opt.isCorrect ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-slate-500 hover:border-emerald-400'}`}
                              >
                                {opt.isCorrect && <Check size={10} className="text-white" />}
                              </button>
                              <input className="input-field py-1.5 text-sm" placeholder={`${t('optionPlaceholder')} ${oIndex + 1}`}
                                value={opt.text} onChange={e => updateOption(qIndex, oIndex, 'text', e.target.value)} />
                              {question.options.length > 2 && (
                                <button onClick={() => removeOption(qIndex, oIndex)}
                                  className="text-gray-400 hover:text-red-500 flex-shrink-0"><X size={14} /></button>
                              )}
                            </div>
                          ))}
                          <button onClick={() => addOption(qIndex)}
                            className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
                            <Plus size={12} /> {t('addOption')}
                          </button>
                        </div>
                      )}

                      {question.type === 'true-false' && (
                        <div className="space-y-1.5">
                          {question.options.map((opt, oIndex) => (
                            <button key={opt.id} onClick={() => updateOption(qIndex, oIndex, 'isCorrect', true)}
                              className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition-all text-xs font-medium
                                ${opt.isCorrect ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 text-gray-600 dark:text-gray-400'}`}>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                                ${opt.isCorrect ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-slate-500'}`}>
                                {opt.isCorrect && <Check size={8} className="text-white" />}
                              </div>
                              {opt.text}
                            </button>
                          ))}
                        </div>
                      )}

                      {question.type === 'essay' && (
                        <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg text-xs text-gray-500 dark:text-gray-400 italic">
                          {t('essayHint')}
                        </div>
                      )}

                      {question.type === 'fill-blank' && (
                        <div>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{t('correctAnswer')}</label>
                          <input className="input-field text-sm py-2" placeholder={t('enterCorrectAnswer')}
                            value={question.correctAnswer} onChange={e => updateQuestion(qIndex, 'correctAnswer', e.target.value)} />
                        </div>
                      )}

                      {question.type === 'matching' && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-3 mb-1">
                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{t('element')}</span>
                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{t('pair')}</span>
                          </div>
                          {question.options.map((opt, oIndex) => (
                            <div key={opt.id} className="grid grid-cols-2 gap-2 items-center">
                              <input className="input-field py-1.5 text-sm" placeholder={`${t('element')} ${oIndex + 1}`}
                                value={opt.text} onChange={e => updateOption(qIndex, oIndex, 'text', e.target.value)} />
                              <div className="flex items-center gap-1.5">
                                <input className="input-field py-1.5 text-sm" placeholder={`${t('pair')} ${oIndex + 1}`}
                                  value={opt.matchPair || ''} onChange={e => updateOption(qIndex, oIndex, 'matchPair', e.target.value)} />
                                {question.options.length > 2 && (
                                  <button onClick={() => removeOption(qIndex, oIndex)}
                                    className="text-gray-400 hover:text-red-500 flex-shrink-0"><X size={14} /></button>
                                )}
                              </div>
                            </div>
                          ))}
                          <button onClick={() => addOption(qIndex)}
                            className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
                            <Plus size={12} /> {t('addPair')}
                          </button>
                        </div>
                      )}

                      {/* Explanation */}
                      <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                        <input className="input-field py-1.5 text-xs" placeholder={t('explanationPlaceholder')}
                          value={question.explanation} onChange={e => updateQuestion(qIndex, 'explanation', e.target.value)} />
                      </div>
                    </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Add question button (sticky) */}
          <div className="sticky bottom-4 mt-5 z-10">
            <div className="relative">
              <AnimatePresence>
                {showAddMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full mb-2 left-0 right-0 glass-card-solid p-3 shadow-glass-lg"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {questionTypes.map(t => (
                        <button key={t.value} onClick={() => addQuestion(t.value)}
                          className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-slate-600
                            hover:border-primary-300 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all group">
                          <div className={`w-8 h-8 ${t.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <t.icon size={14} />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-sm shadow-xl"
              >
                <Plus size={18} />
                {t('addQuestion')}
              </button>

              {/* Bottom save button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-sm mt-3 bg-emerald-600 hover:bg-emerald-700 shadow-xl"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                {editId ? t('updateTest') : t('saveTest')}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Import CSV Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowImportModal(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()} className="relative w-full max-w-md glass-card-solid p-6">
              <h3 className="text-lg font-bold text-dark mb-2">{t('importFromCSV')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Формат: <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">Вопрос, тип, правильный, вариант1, вариант2, ...</code><br/>
                ???: single-choice, multiple-choice, true-false, essay, fill-blank, matching.<br/>
                Первая строка — заголовок (пропускается).
              </p>
              <label className="flex flex-col items-center gap-2 p-8 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl cursor-pointer
                hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all">
                <FileSpreadsheet size={32} className="text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('clickToSelectFile')}</span>
                <span className="text-xs text-gray-400">.csv, .txt</span>
                <input type="file" className="hidden" accept=".csv,.txt,.tsv"
                  onChange={e => e.target.files[0] && handleFileImport(e.target.files[0])} />
              </label>
              <button onClick={() => setShowImportModal(false)}
                className="w-full btn-secondary mt-3 text-sm py-2">{t('cancel')}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bank Modal */}
      <AnimatePresence>
        {showBankModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowBankModal(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()} className="relative w-full max-w-lg glass-card-solid p-6 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-dark mb-4">{t('questionBankTitle')}</h3>
              {bankQuestions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">{t('bankEmpty')}</p>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {bankQuestions.map(q => (
                      <label key={q._id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                        <input type="checkbox" className="mt-0.5 accent-primary-600" value={q._id} />
                        <div className="min-w-0">
                          <p className="text-sm text-dark truncate">{q.questionText}</p>
                          <p className="text-[10px] text-gray-400">{questionTypes.find(t => t.value === q.type)?.label} • {q.points} б.</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button onClick={() => {
                    const checks = document.querySelectorAll('input[type=checkbox]:checked');
                    const ids = Array.from(checks).map(c => c.value);
                    const selected = bankQuestions.filter(q => ids.includes(q._id));
                    if (selected.length) addFromBank(selected);
                    else toast.error(t('selectQuestions'));
                  }} className="w-full btn-primary text-sm py-2">
                    {t('addSelected')}
                  </button>
                </>
              )}
              <button onClick={() => setShowBankModal(false)} className="w-full btn-secondary mt-2 text-sm py-2">{t('close')}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draft Recovery Dialog */}
      <AnimatePresence>
        {showDraftDialog && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="card p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-bold">{t('draftFound')}</h3>
              <p className="text-sm text-secondary">{t('restoreDraft')}</p>
              <div className="flex gap-3">
                <button onClick={restoreDraft} className="flex-1 btn-primary py-2 text-sm">{t('restore')}</button>
                <button onClick={discardDraft} className="flex-1 btn-secondary py-2 text-sm">{t('discard')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

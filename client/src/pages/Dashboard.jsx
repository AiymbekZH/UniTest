import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Plus, Star, Users, Clock, Eye, EyeOff,
  Trash2, Edit3, Share2, MoreVertical, Tag, Copy, Trophy,
  FileText, BarChart3, Award
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';

const cardColors = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-amber-500 to-amber-600',
  'from-violet-500 to-violet-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
  'from-indigo-500 to-indigo-600',
  'from-pink-500 to-pink-600',
];

export default function Dashboard() {
  const [tests, setTests] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const testsPerPage = 12;

  useEffect(() => {
    fetchTests();
  }, [sort, page, search]);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const sortMap = { latest: undefined, rating: 'rating', popular: 'popular', title: 'title' };
      const params = { sort: sortMap[sort] };
      if (search) params.search = search;
      const res = await api.get('/tests', { params });
      const allTests = res.data.tests || [];
      setTotalPages(Math.ceil(allTests.length / testsPerPage) || 1);
      setTests(allTests);
    } catch (err) {
      toast.error(t('errorLoadingTests'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTests();
  };

  const deleteTest = async (id) => {
    try {
      await api.delete(`/tests/${id}`);
      setTests(prev => prev.filter(t => t._id !== id));
      toast.success(t('testDeleted'));
    } catch (err) {
      toast.error(t('errorDeleting'));
    }
  };

  const copyShareLink = (shareLink) => {
    navigator.clipboard.writeText(`${window.location.origin}/test/${shareLink}`);
    toast.success(t('linkCopied'));
  };

  const getCardColor = (index) => cardColors[index % cardColors.length];

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-900">
      <Toaster position="top-right" />
      <Navbar />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => deleteTest(deleteConfirm.id)}
        title={t('deleteTestTitle')}
        message={t('deleteTestMsg')}
        confirmText={t('delete')}
        variant="danger"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-dark tracking-tight">
            {t('welcome')}, {user?.firstName || 'Guest'}! 👋
          </h1>
          <p className="text-gray-400 dark:text-gray-500 mt-1 text-[15px]">{t('dashboardSubtitle')}</p>
        </motion.div>

        {/* Search & Filters — Apple style */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8"
        >
          <form onSubmit={handleSearch} className="flex-1 relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600" size={16} />
            <input
              type="text"
              className="w-full h-9 pl-10 pr-4 bg-gray-100 dark:bg-slate-800 border-0 rounded-full text-[13px] text-dark placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all"
              placeholder={t('searchTests')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </form>

          <div className="flex gap-1.5">
            {[
              { key: 'latest', label: t('newest') },
              { key: 'popular', label: t('popular') },
              { key: 'rating', label: t('rating') }
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-200 border
                  ${sort === s.key
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tests Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 animate-pulse">
                <div className="h-1 bg-gray-200 dark:bg-slate-700 rounded-full w-full mb-4" />
                <div className="h-5 bg-gray-100 dark:bg-slate-700 rounded-lg w-3/4 mb-3" />
                <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded-lg w-full mb-2" />
                <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded-lg w-1/2 mb-4" />
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-100 dark:bg-slate-700 rounded-full w-20" />
                  <div className="h-6 bg-gray-100 dark:bg-slate-700 rounded-full w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : tests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-dark mb-1">{t('noTests')}</h3>
            <p className="text-gray-400 mb-6 text-sm">{t('createFirst')}</p>
            <button onClick={() => navigate('/create-test')} className="h-10 px-6 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-full transition-all">
              {t('createTest')}
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {tests.slice((page - 1) * testsPerPage, page * testsPerPage).map((test, idx) => (
              <motion.div
                key={test._id}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -3, transition: { duration: 0.15 } }}
                className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden cursor-pointer group relative shadow-sm hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-200 border border-gray-100 dark:border-slate-700/50"
              >
                {/* Color accent bar */}
                <div className={`h-1 w-full bg-gradient-to-r ${getCardColor(idx)}`} />

                {/* Menu */}
                <div className="absolute top-4 right-3 z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === test._id ? null : test._id); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical size={15} className="text-gray-400" />
                  </button>
                  {menuOpen === test._id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-lg shadow-black/8 dark:shadow-black/30 border border-gray-200/80 dark:border-slate-700 p-1 z-20"
                    >
                      {test.creator?._id === user?.id && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/edit-test/${test._id}`); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg"
                          >
                            <Edit3 size={14} /> {t('edit')}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/results/${test._id}`); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg"
                          >
                            <Users size={14} /> {t('viewResults')}
                          </button>
                          <div className="h-px bg-gray-100 dark:bg-slate-700 mx-1 my-0.5" />
                        </>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); copyShareLink(test.shareLink); setMenuOpen(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg"
                      >
                        <Copy size={14} /> {t('copyLink')}
                      </button>
                      {test.creator?._id === user?.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, id: test._id }); setMenuOpen(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 size={14} /> {t('delete')}
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>

                <div onClick={() => navigate(`/test-profile/${test.shareLink}`)} className="p-5">
                  {/* Status + count row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {test.settings?.isPublic ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                          <Eye size={10} /> {t('publicTest')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                          <EyeOff size={10} /> {t('privateTest')}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                      {test.questions?.length || 0} {t('questions')}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-[15px] font-semibold text-dark mb-1 group-hover:text-primary-600 transition-colors line-clamp-1 pr-6 tracking-tight">
                    {test.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[13px] text-gray-400 dark:text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                    {test.description || t('noDescription')}
                  </p>

                  {/* Tags */}
                  {test.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {test.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded-full text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-[9px] font-semibold text-white overflow-hidden">
                        {test.creator?.avatar ? (
                          <img src={test.creator.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <>{test.creator?.firstName?.[0]}{test.creator?.lastName?.[0]}</>
                        )}
                      </div>
                      <span className="text-[12px] text-gray-400">
                        {test.creator?.firstName} {test.creator?.lastName?.[0]}.
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        <span className="text-[12px] text-gray-500 font-medium">{test.rating?.toFixed(1) || '0.0'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[12px] text-gray-400">
                        <Users size={11} />
                        {test.attemptCount || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && tests.length > 0 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={p => { setPage(p); window.scrollTo(0, 0); }} />
        )}
      </main>
    </div>
  );
}

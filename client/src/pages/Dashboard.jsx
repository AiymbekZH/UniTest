import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Plus, Star, Users, Eye, EyeOff,
  Trash2, Edit3, MoreVertical, Tag, Copy, Trophy
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import toast, { Toaster } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

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

  const renderStars = (rating) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={12}
          className={s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{rating?.toFixed(1) || '0.0'}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
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
          <h1 className="text-2xl sm:text-3xl font-bold text-dark">
            {t('welcome')}, {user?.firstName || 'Guest'}!
          </h1>
          <p className="text-gray-500 mt-1">{t('dashboardSubtitle')}</p>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 mb-8 flex-wrap"
        >
          <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200/80 dark:border-slate-600 rounded-full text-sm text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200"
              placeholder={t('searchTests')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </form>

          <div className="flex gap-1 bg-gray-100/80 dark:bg-slate-800 rounded-full p-1 border border-gray-200/50 dark:border-slate-700">
            {[
              { key: 'latest', label: t('newest') },
              { key: 'popular', label: t('popular') },
              { key: 'rating', label: t('rating') }
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all duration-200
                  ${sort === s.key
                    ? 'bg-white dark:bg-slate-700 text-dark shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-dark dark:hover:text-gray-200'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tests Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="glass-card-solid p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-full mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-100 rounded-lg w-16" />
                  <div className="h-6 bg-gray-100 rounded-lg w-16" />
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
            <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-dark mb-2">{t('noTests')}</h3>
            <p className="text-gray-500 mb-6">{t('createFirst')}</p>
            <button onClick={() => navigate('/create-test')} className="btn-primary">
              {t('createTest')}
            </button>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {tests.slice((page - 1) * testsPerPage, page * testsPerPage).map(test => (
              <motion.div
                key={test._id}
                variants={cardVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="glass-card-solid p-5 cursor-pointer group relative flex flex-col"
              >
                {/* Menu */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === test._id ? null : test._id); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>
                  {menuOpen === test._id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-glass border border-gray-100 dark:border-slate-700 p-1.5 z-10"
                    >
                      {test.creator?._id === user?.id && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/edit-test/${test._id}`); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg"
                          >
                            <Edit3 size={14} /> {t('edit')}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/results/${test._id}`); setMenuOpen(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg"
                          >
                            <Users size={14} /> {t('viewResults')}
                          </button>
                          <hr className="my-1 border-gray-100 dark:border-slate-700" />
                        </>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); copyShareLink(test.shareLink); setMenuOpen(null); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg"
                      >
                        <Copy size={14} /> {t('copyLink')}
                      </button>
                      {test.creator?._id === user?.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, id: test._id }); setMenuOpen(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 size={14} /> {t('delete')}
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>

                <div onClick={() => navigate(`/test-profile/${test.shareLink}`)} className="flex flex-col flex-1">
                  {/* Status badge */}
                  <div className="flex items-center gap-2 mb-2.5">
                    {test.settings?.isPublic ? (
                      <span className="badge-info flex items-center gap-1 text-[10px] py-0.5 px-2"><Eye size={10} /> {t('publicTest')}</span>
                    ) : (
                      <span className="badge-warning flex items-center gap-1 text-[10px] py-0.5 px-2"><EyeOff size={10} /> {t('privateTest')}</span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {test.questions?.length || 0} {t('questions')}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-[15px] font-semibold text-dark mb-1 group-hover:text-primary-600 transition-colors line-clamp-1 pr-8">
                    {test.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[13px] text-gray-500 mb-3 line-clamp-1">
                    {test.description || t('noDescription')}
                  </p>

                  {/* Tags */}
                  {test.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {test.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-md text-[11px] text-gray-600 dark:text-gray-400">
                          <Tag size={9} /> {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Spacer to push footer down */}
                  <div className="flex-1" />

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-md flex items-center justify-center text-[10px] font-semibold overflow-hidden flex-shrink-0">
                        {test.creator?.avatar ? (
                          <img src={test.creator.avatar} alt="" className="w-full h-full object-cover rounded-md" />
                        ) : (
                          <>{test.creator?.firstName?.[0]}{test.creator?.lastName?.[0]}</>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 truncate">
                        {test.creator?.firstName} {test.creator?.lastName?.[0]}.
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      {renderStars(test.rating)}
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/leaderboard/${test._id}`); }}
                        className="flex items-center gap-1 text-[10px] text-primary-500 hover:text-primary-600 transition"
                        title="Рейтинг"
                      >
                        <Trophy size={12} />
                      </button>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Users size={12} />
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

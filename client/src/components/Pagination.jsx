import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const delta = 2;
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      {/* First */}
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 
          disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Начало"
      >
        <ChevronsLeft size={16} />
      </button>

      {/* Prev */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 
          disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Назад"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Page numbers */}
      {getPageNumbers().map((page, i) =>
        page === '...' ? (
          <span key={`dots-${i}`} className="px-2 text-gray-400 text-sm">.</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all
              ${currentPage === page
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
          >
            {page}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 
          disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Далее"
      >
        <ChevronRight size={16} />
      </button>

      {/* Last */}
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 
          disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Последняя"
      >
        <ChevronsRight size={16} />
      </button>
    </div>
  );
}

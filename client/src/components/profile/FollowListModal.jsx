import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Loader2, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function FollowListModal({
  open,
  onClose,
  endpoint,
  title,
  emptyText,
  loadingText
}) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!open || !endpoint) return;

    let isMounted = true;
    setLoading(true);

    api.get(endpoint)
      .then((res) => {
        if (!isMounted) return;
        setUsers(res.data.users || []);
      })
      .catch(() => {
        if (!isMounted) return;
        setUsers([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [endpoint, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-800 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
                  <Users size={18} />
                </div>
                <div>
                  <p className="text-base font-bold text-dark">{title}</p>
                  <p className="text-xs text-gray-500">{users.length}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 transition hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-4 sm:p-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <Loader2 size={28} className="animate-spin text-primary-500" />
                  <p className="mt-3 text-sm text-gray-500">{loadingText}</p>
                </div>
              ) : users.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-gray-200 bg-gray-50/80 px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-800/60">
                  <Users size={28} className="mx-auto text-gray-300 dark:text-slate-500" />
                  <p className="mt-3 text-sm font-medium text-gray-600 dark:text-slate-200">{emptyText}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((entry) => (
                    <Link
                      key={entry._id || entry.id}
                      to={`/profile/${entry._id || entry.id}`}
                      onClick={onClose}
                      className="flex items-center gap-4 rounded-[1.5rem] border border-gray-100 bg-gray-50/80 px-4 py-4 transition hover:border-primary-200 hover:bg-white dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-primary-700 dark:hover:bg-slate-800"
                    >
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-primary-100 text-lg font-bold text-primary-600 dark:bg-primary-900/20 dark:text-primary-300">
                        {entry.avatar ? (
                          <img src={entry.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          `${entry.firstName?.[0] || ''}${entry.lastName?.[0] || ''}`
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-dark">
                            {entry.firstName} {entry.lastName}
                          </p>
                          {entry.uniqueId ? (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-slate-700 dark:text-slate-300">
                              {entry.uniqueId}
                            </span>
                          ) : null}
                        </div>
                        {entry.headline ? (
                          <p className="mt-1 truncate text-xs text-gray-500">{entry.headline}</p>
                        ) : null}
                      </div>
                      <ArrowUpRight size={16} className="text-gray-400" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

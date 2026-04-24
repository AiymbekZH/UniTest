import { motion } from 'framer-motion';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';

function PresetBackdrop({ preset = 'aurora' }) {
  if (preset === 'mesh') {
    return (
      <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_18%_24%,rgba(251,146,60,0.42),transparent_30%),radial-gradient(circle_at_78%_18%,rgba(17,17,17,0.28),transparent_28%),radial-gradient(circle_at_65%_78%,rgba(245,158,11,0.24),transparent_30%),linear-gradient(135deg,#fffaf2_0%,#ffedd5_38%,#fde68a_100%)]">
        <motion.div
          className="absolute -left-10 top-8 h-48 w-48 rounded-full bg-white/30 blur-3xl"
          animate={{ x: [0, 24, 0], y: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-0 top-10 h-52 w-52 rounded-full bg-orange-300/25 blur-3xl"
          animate={{ x: [0, -18, 0], y: [0, -12, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    );
  }

  if (preset === 'wave') {
    return (
      <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(135deg,#fff7ed_0%,#ffedd5_28%,#fde68a_58%,#fffaf0_100%)]">
        <svg className="absolute inset-0 h-full w-full opacity-80" viewBox="0 0 1200 400" preserveAspectRatio="none">
          <motion.path
            d="M0,240 C180,180 280,300 460,240 C640,180 760,80 920,150 C1020,195 1110,230 1200,210"
            fill="none"
            stroke="rgba(249,115,22,0.28)"
            strokeWidth="6"
            animate={{ d: [
              'M0,240 C180,180 280,300 460,240 C640,180 760,80 920,150 C1020,195 1110,230 1200,210',
              'M0,228 C160,168 298,286 470,230 C620,182 780,92 930,162 C1034,212 1112,242 1200,220',
              'M0,240 C180,180 280,300 460,240 C640,180 760,80 920,150 C1020,195 1110,230 1200,210'
            ] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.path
            d="M0,300 C210,270 310,170 470,205 C620,238 760,334 920,310 C1050,292 1110,240 1200,250"
            fill="none"
            stroke="rgba(255,255,255,0.68)"
            strokeDasharray="10 10"
            strokeWidth="4"
            animate={{ d: [
              'M0,300 C210,270 310,170 470,205 C620,238 760,334 920,310 C1050,292 1110,240 1200,250',
              'M0,286 C214,258 318,182 474,214 C620,242 750,326 910,302 C1032,282 1118,232 1200,242',
              'M0,300 C210,270 310,170 470,205 C620,238 760,334 920,310 C1050,292 1110,240 1200,250'
            ] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
        </svg>
      </div>
    );
  }

  if (preset === 'grid') {
    return (
      <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(135deg,#fffaf4_0%,#ffedd5_42%,#fde68a_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.34)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.34)_1px,transparent_1px)] bg-[size:42px_42px]" />
        <motion.div
          className="absolute left-[8%] top-[18%] h-24 w-24 rounded-3xl border border-white/50 bg-white/20 backdrop-blur-xl"
          animate={{ y: [0, -10, 0], rotate: [0, -3, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-[10%] top-[12%] h-20 w-20 rounded-3xl border border-white/50 bg-orange-200/20 backdrop-blur-xl"
          animate={{ y: [0, 12, 0], rotate: [0, 4, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-[58%] bottom-[18%] h-16 w-16 rounded-2xl border border-white/50 bg-white/18 backdrop-blur-xl"
          animate={{ x: [0, 16, 0], y: [0, -8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(135deg,#fff7ed_0%,#fdba74_28%,#fb923c_58%,#fef3c7_100%)]">
      <motion.div
        className="absolute -left-16 top-12 h-52 w-52 rounded-full bg-white/35 blur-3xl"
        animate={{ x: [0, 34, 0], y: [0, -10, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-6 top-10 h-56 w-56 rounded-full bg-orange-300/25 blur-3xl"
        animate={{ x: [0, -26, 0], y: [0, 16, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-10 left-1/3 h-56 w-56 rounded-full bg-emerald-200/25 blur-3xl"
        animate={{ x: [0, 16, 0], y: [0, -18, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

export default function ProfileHeroBanner({
  user,
  title,
  roleLabel,
  meta = [],
  actions = null,
  footer = null,
  editable = false,
  onAvatarUpload,
  onBannerUpload,
  onBannerRemove,
  uploadBannerLabel = 'Upload banner',
  replaceBannerLabel = 'Replace banner',
  removeBannerLabel = 'Remove banner'
}) {
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.trim() || 'U';

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900/90">
      <div className="relative h-[220px] sm:h-[280px] lg:h-[320px]">
        {user?.coverImage ? (
          <>
            <img src={user.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/10 via-slate-900/30 to-slate-950/85 sm:via-slate-900/15 sm:to-slate-950/70" />
          </>
        ) : (
          <>
            <PresetBackdrop preset={user?.coverPreset || 'aurora'} />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/0 via-slate-900/35 to-slate-950/85 sm:via-slate-900/10 sm:to-slate-950/65" />
          </>
        )}

        {editable && (
          <div className="absolute right-3 top-3 z-20 flex flex-wrap items-center justify-end gap-1.5 sm:right-6 sm:top-6 sm:gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/30 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-lg backdrop-blur-xl transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs">
              <ImagePlus size={12} className="sm:hidden" />
              <ImagePlus size={14} className="hidden sm:block" />
              <span className="hidden sm:inline">{user?.coverImage ? replaceBannerLabel : uploadBannerLabel}</span>
              <span className="sm:hidden">{user?.coverImage ? 'Заменить' : 'Баннер'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={onBannerUpload} />
            </label>
            {user?.coverImage && (
              <button
                type="button"
                onClick={onBannerRemove}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-slate-950/55 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur-xl transition hover:bg-slate-950/70 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs"
              >
                <Trash2 size={12} className="sm:hidden" />
                <Trash2 size={14} className="hidden sm:block" />
                <span className="hidden sm:inline">{removeBannerLabel}</span>
              </button>
            )}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col items-start gap-2.5 sm:flex-row sm:items-end sm:gap-5">
              <div className="relative flex-shrink-0">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white text-lg font-bold text-primary-600 shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-primary-300 sm:h-24 sm:w-24 sm:text-2xl lg:h-28 lg:w-28 lg:text-3xl">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                {editable && (
                  <label className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl border border-white/40 bg-slate-950/75 text-white shadow-lg backdrop-blur-xl transition hover:bg-slate-950/90 sm:-bottom-2 sm:-right-2 sm:h-10 sm:w-10">
                    <Camera size={14} className="sm:hidden" />
                    <Camera size={16} className="hidden sm:block" />
                    <input type="file" accept="image/*" className="hidden" onChange={onAvatarUpload} />
                  </label>
                )}
              </div>

              <div className="min-w-0 pb-0.5 text-white">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h1 className="truncate text-lg font-bold tracking-tight drop-shadow-md sm:text-2xl lg:text-3xl">{title}</h1>
                  {roleLabel && (
                    <span className="inline-flex rounded-full border border-white/30 bg-slate-900/50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-sm backdrop-blur-xl sm:px-3 sm:py-1 sm:text-[11px]">
                      {roleLabel}
                    </span>
                  )}
                </div>
                {user?.username ? (
                  <p className="mt-0.5 inline-flex items-center text-xs font-black tracking-tight text-orange-200 drop-shadow-md sm:mt-1 sm:text-sm">
                    @{user.username}
                  </p>
                ) : null}
                {user?.headline ? (
                  <p className="mt-1.5 max-w-3xl text-xs font-medium text-white drop-shadow-md line-clamp-2 sm:mt-2 sm:text-sm lg:text-base">{user.headline}</p>
                ) : null}
                {user?.bio ? (
                  <p className="mt-1.5 hidden max-w-3xl text-sm leading-6 text-white/90 drop-shadow-md line-clamp-2 sm:block">{user.bio}</p>
                ) : null}
                {meta.length > 0 && (
                  <div className="mt-2 hidden flex-wrap gap-2 sm:mt-4 sm:flex">
                    {meta.map((item) => (
                      <div
                        key={item.label}
                        className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-slate-900/40 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-xl"
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {actions ? (
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {footer ? (
        <div className="border-t border-gray-100/90 bg-white/95 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/85 sm:px-8">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

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
    <div className="overflow-hidden rounded-2xl border-2 border-slate-900 bg-white dark:border-white dark:bg-slate-900" style={{ boxShadow: '0 4px 0 #0f172a' }}>
      {/* Cover Banner: shorter on mobile (Twitter-style) */}
      <div className="relative h-28 sm:h-44 lg:h-52">
        {user?.coverImage ? (
          <img src={user.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <PresetBackdrop preset={user?.coverPreset || 'aurora'} />
        )}

        {editable && (
          <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5 sm:right-3 sm:top-3 sm:gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border-2 border-slate-900 bg-white px-2.5 py-1 text-[10px] font-black text-slate-900 active:translate-y-[1px] dark:border-white dark:bg-slate-900 dark:text-white sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs" style={{ boxShadow: '0 2px 0 #0f172a' }}>
              <ImagePlus size={11} className="sm:hidden" />
              <ImagePlus size={13} className="hidden sm:block" />
              <span className="hidden sm:inline">{user?.coverImage ? replaceBannerLabel : uploadBannerLabel}</span>
              <span className="sm:hidden">{user?.coverImage ? 'Заменить' : 'Баннер'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={onBannerUpload} />
            </label>
            {user?.coverImage && (
              <button
                type="button"
                onClick={onBannerRemove}
                className="inline-flex items-center gap-1 rounded-full border-2 border-slate-900 bg-red-500 px-2.5 py-1 text-[10px] font-black text-white active:translate-y-[1px] dark:border-white sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs"
                style={{ boxShadow: '0 2px 0 #7f1d1d' }}
                aria-label={removeBannerLabel}
              >
                <Trash2 size={11} className="sm:hidden" />
                <Trash2 size={13} className="hidden sm:block" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body: avatar overlap + content (Twitter-style) */}
      <div className="px-3 pb-3 pt-0 sm:px-5 sm:pb-5">
        {/* Avatar row — overlap banner */}
        <div className="flex items-end justify-between gap-3">
          <div className="relative -mt-10 flex-shrink-0 sm:-mt-14">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-900 bg-white text-xl font-black text-primary-600 dark:border-white dark:bg-slate-900 dark:text-primary-300 sm:h-28 sm:w-28 sm:text-3xl"
              style={{ boxShadow: '0 4px 0 #0f172a' }}>
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            {editable && (
              <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-slate-900 bg-primary-500 text-white active:translate-y-[1px] dark:border-white sm:h-9 sm:w-9" style={{ boxShadow: '0 3px 0 #9a3412' }}>
                <Camera size={12} className="sm:hidden" />
                <Camera size={15} className="hidden sm:block" />
                <input type="file" accept="image/*" className="hidden" onChange={onAvatarUpload} />
              </label>
            )}
          </div>

          {/* Actions appear next to avatar on tablet+; on mobile they wrap below */}
          {actions ? (
            <div className="hidden flex-wrap items-center justify-end gap-2 sm:flex">
              {actions}
            </div>
          ) : null}
        </div>

        {/* Name + role + username + bio (always below avatar — Twitter-style) */}
        <div className="mt-3 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h1 className="break-words text-lg font-black tracking-tight text-dark dark:text-white sm:text-2xl">{title}</h1>
            {roleLabel && (
              <span className="inline-flex rounded-full border-2 border-slate-900 bg-primary-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white dark:border-white sm:px-2.5 sm:py-1 sm:text-[10px]" style={{ boxShadow: '0 2px 0 #9a3412' }}>
                {roleLabel}
              </span>
            )}
          </div>
          {user?.username ? (
            <p className="mt-0.5 text-xs font-black text-primary-600 dark:text-primary-300 sm:text-sm">@{user.username}</p>
          ) : null}
          {user?.headline ? (
            <p className="mt-1.5 break-words text-xs font-semibold text-slate-700 dark:text-slate-200 sm:text-sm">{user.headline}</p>
          ) : null}
          {user?.bio ? (
            <p className="mt-1.5 break-words text-[11px] leading-5 text-slate-500 dark:text-slate-400 sm:text-sm sm:leading-6">{user.bio}</p>
          ) : null}
          {meta.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
              {meta.map((item) => (
                <div
                  key={item.label}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[11px]"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile actions: full-width row below content */}
        {actions ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
            {actions}
          </div>
        ) : null}
      </div>

      {/* Footer (stat tiles) */}
      {footer ? (
        <div className="border-t-2 border-slate-900 bg-slate-50 px-3 py-3 dark:border-white dark:bg-slate-950/40 sm:px-5 sm:py-4">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

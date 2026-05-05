import { MessageSquare, Sparkles } from 'lucide-react';

/**
 * Empty state shown on desktop when no chat is selected. Mobile gets
 * the sidebar in this state, so this never appears there.
 */
export default function ChatRoomEmpty() {
  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50/40 px-6 py-12 dark:bg-slate-900/30">
      <div className="text-center">
        <div
          className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-slate-900 bg-primary-50 text-primary-500 dark:border-white dark:bg-primary-900/20 dark:text-primary-300"
          style={{ boxShadow: '0 4px 0 #0f172a' }}
        >
          <MessageSquare size={36} strokeWidth={2} />
        </div>
        <p className="text-base font-black text-slate-900 dark:text-white">Выберите чат</p>
        <p className="mt-2 max-w-xs text-xs font-medium text-slate-500 dark:text-slate-400">
          Откройте переписку слева или создайте новую через «+»
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border-2 border-amber-300 bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-200">
          <Sparkles size={10} strokeWidth={2.6} />
          <span>Новый интерфейс — beta</span>
        </div>
      </div>
    </div>
  );
}

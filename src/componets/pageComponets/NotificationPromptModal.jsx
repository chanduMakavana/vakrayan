import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiZap, FiTag, FiX } from 'react-icons/fi';

/**
 * Premium Streetwear Push Notification Permission Prompt Modal.
 * Ultra-clean, modern UX with authentic notification visual cues.
 */
function NotificationPromptModal({ isOpen, onClose, onAccept }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-[400px] bg-[var(--color-surface,#ffffff)] border border-[var(--color-border,#e5e7eb)] text-[var(--color-text,#111827)] rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden z-10"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--color-subtle,#f3f4f6)] hover:bg-[var(--color-border,#e5e7eb)] text-[var(--color-muted,#6b7280)] hover:text-[var(--color-text,#111827)] flex items-center justify-center transition-colors cursor-pointer text-sm"
              aria-label="Close notification modal"
            >
              <FiX />
            </button>

            {/* Content */}
            <div className="flex flex-col items-center text-center">
              
              {/* Notification Bell Animated Icon Badge */}
              <div className="relative mb-4 mt-1">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 text-2xl shadow-sm">
                  <FiBell className="animate-bounce" style={{ animationDuration: '2s' }} />
                </div>
                {/* Active Notification Indicator Dot */}
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[var(--color-surface,#ffffff)]"></span>
                </span>
              </div>

              {/* Tag */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
                Push Notifications
              </span>

              {/* Headline */}
              <h2 className="text-xl font-black tracking-tight text-[var(--color-text,#111827)] uppercase font-sans">
                Enable Notifications
              </h2>

              {/* Subtitle */}
              <p className="text-xs text-[var(--color-muted,#6b7280)] font-sans leading-relaxed mt-1.5 mb-5 max-w-[320px]">
                Stay updated with exclusive drops, member perks, and flash sales.
              </p>

              {/* Value Points (Without Live Order Tracking) */}
              <div className="w-full text-left bg-[var(--color-subtle,#f9fafb)] border border-[var(--color-border,#e5e7eb)] rounded-2xl p-3.5 space-y-2.5 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xs">
                    <FiZap />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-[var(--color-text,#111827)] leading-none">VIP Drop Announcements</p>
                    <p className="text-[10px] text-[var(--color-muted,#6b7280)] mt-0.5">First access before limited pieces sell out</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xs">
                    <FiTag />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-[var(--color-text,#111827)] leading-none">Exclusive Flash Discounts</p>
                    <p className="text-[10px] text-[var(--color-muted,#6b7280)] mt-0.5">Secret coupons & subscriber savings</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 bg-[var(--color-subtle,#f3f4f6)] hover:bg-[var(--color-border,#e5e7eb)] font-sans font-bold text-[11px] tracking-wider uppercase text-[var(--color-muted,#6b7280)] hover:text-[var(--color-text,#111827)] rounded-xl transition-all cursor-pointer border border-[var(--color-border,#e5e7eb)]"
                >
                  Maybe Later
                </button>
                <button
                  type="button"
                  onClick={onAccept}
                  className="w-full py-3 bg-neutral-950 hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 font-sans font-bold text-[11px] tracking-wider uppercase text-white rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <FiBell className="text-xs" />
                  Allow Alerts
                </button>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default NotificationPromptModal;

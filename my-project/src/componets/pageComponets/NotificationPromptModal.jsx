import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiCheck, FiX } from 'react-icons/fi';

/**
 * Premium Custom Pre-Permission Prompt Modal for Web Push Notifications.
 * Explains the benefits to the user before requesting native browser permission.
 */
function NotificationPromptModal({ isOpen, onClose, onAccept }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 select-none">
          {/* Blur Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-md bg-gradient-to-b from-[#0D1A14] to-[#050C08] border border-emerald-500/20 text-white rounded-2xl p-6 md:p-8 shadow-2xl overflow-hidden z-10"
          >
            {/* Top Glow bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-white/5"
            >
              <FiX className="text-base" />
            </button>

            {/* Content */}
            <div className="flex flex-col items-center text-center space-y-5 mt-2">
              {/* Animated Bell Icon Container */}
              <div className="relative w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[var(--color-accent)] overflow-hidden shadow-inner">
                <FiBell className="text-3xl animate-bounce" style={{ animationDuration: '2.5s' }} />
                {/* Ripple Effect */}
                <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 animate-pulse" />
              </div>

              {/* Headline */}
              <div className="space-y-1.5">
                <h3 className="text-sm font-black tracking-[0.3em] text-[var(--color-accent)] uppercase">
                  Notifications
                </h3>
                <h2 className="text-xl font-extrabold tracking-tight uppercase font-mono">
                  Stay In The Loop
                </h2>
              </div>

              {/* Description */}
              <p className="text-xs text-neutral-400 leading-relaxed max-w-sm">
                Subscribe to real-time updates and receive instant alerts directly on your device.
              </p>

              {/* Bullet Benefits */}
              <div className="w-full text-left bg-white/5 border border-white/5 rounded-xl p-4 space-y-2.5 text-xs text-neutral-300">
                <div className="flex items-start gap-2.5">
                  <FiCheck className="text-[var(--color-accent)] shrink-0 mt-0.5" />
                  <span>Instant wallet top-up & transaction receipts.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <FiCheck className="text-[var(--color-accent)] shrink-0 mt-0.5" />
                  <span>Real-time order shipment & tracking updates.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <FiCheck className="text-[var(--color-accent)] shrink-0 mt-0.5" />
                  <span>Exclusive droplist release announcements.</span>
                </div>
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-2 gap-3 w-full pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 border border-white/10 hover:border-white/20 hover:bg-white/5 font-mono font-bold text-[10px] tracking-wider uppercase text-neutral-400 hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  Later
                </button>
                <button
                  type="button"
                  onClick={onAccept}
                  className="w-full py-3.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] font-mono font-black text-[10px] tracking-wider uppercase text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-950/50"
                >
                  Enable
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

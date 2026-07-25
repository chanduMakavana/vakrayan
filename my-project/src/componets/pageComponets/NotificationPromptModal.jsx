import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiCheck, FiX } from 'react-icons/fi';

/**
 * Premium Custom Pre-Permission Prompt Modal for Web Push Notifications.
 * Matched to Vakrayan Light Mint & Emerald Theme (#F4FAF7).
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
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container — Light Mint (#F4FAF7) Theme */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-md bg-[#F4FAF7] border-2 border-[var(--color-accent)]/20 text-[#0D1A14] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden z-10"
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--color-accent)]" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#527060] hover:text-[#0D1A14] transition-colors cursor-pointer p-1.5 rounded-full hover:bg-black/5"
            >
              <FiX className="text-base" />
            </button>

            {/* Content */}
            <div className="flex flex-col items-center text-center space-y-4 pt-1">
              {/* Vakrayan Brand Logo Badge */}
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)] text-white flex items-center justify-center shadow-xs">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 5L12 19L21 5" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="text-left">
                  <span className="text-sm font-black tracking-[0.18em] text-[#0D1A14] uppercase block leading-none font-brand">
                    VAKRAYAN
                  </span>
                  <span className="text-[8px] font-mono tracking-[0.25em] text-[var(--color-accent)] uppercase block mt-0.5 font-bold">
                    PREMIUM APPAREL
                  </span>
                </div>
              </div>

              {/* Eyebrow & Headline */}
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[9px] font-mono font-black uppercase tracking-widest border border-[var(--color-accent)]/20">
                  <FiBell className="animate-pulse" /> NOTIFICATION ALERTS
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-wider uppercase font-mono text-[#0D1A14] pt-1">
                  STAY IN THE LOOP
                </h2>
              </div>

              {/* Description */}
              <p className="text-xs text-[#527060] font-sans leading-relaxed max-w-sm font-medium">
                Subscribe to real-time alerts and get instant order tracking, drop releases, and member updates.
              </p>

              {/* Benefits Box */}
              <div className="w-full text-left bg-white border border-[#E0EDE8] rounded-2xl p-4 space-y-2.5 shadow-2xs font-sans">
                <div className="flex items-center gap-2.5 text-xs text-[#0D1A14] font-medium">
                  <div className="w-5 h-5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center shrink-0">
                    <FiCheck className="text-xs" />
                  </div>
                  <span>Instant order shipment & tracking updates</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#0D1A14] font-medium">
                  <div className="w-5 h-5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center shrink-0">
                    <FiCheck className="text-xs" />
                  </div>
                  <span>Exclusive drop announcements & flash sales</span>
                </div>
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-2 gap-3 w-full pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 bg-white border border-[#E0EDE8] hover:bg-neutral-100 font-mono font-bold text-[10px] tracking-wider uppercase text-[#527060] rounded-xl transition-all cursor-pointer"
                >
                  LATER
                </button>
                <button
                  type="button"
                  onClick={onAccept}
                  className="w-full py-3.5 bg-[#0D1A14] hover:bg-neutral-800 font-mono font-black text-[10px] tracking-wider uppercase text-white rounded-xl transition-all cursor-pointer shadow-md"
                >
                  ENABLE NOW
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

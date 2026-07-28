import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSmartphone, FiCheck, FiShield, FiLock } from 'react-icons/fi';

/**
 * PhonePromptModal — Matched to Vakrayan Light Mint & Emerald Theme (#F4FAF7).
 * Displays a mandatory phone prompt modal with high-end editorial styling matching product cards.
 */
function PhonePromptModal({ isOpen, onSubmitPhone }) {
  const [phoneInput, setPhoneInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmed = phoneInput.trim();
    const phonePattern = /^[0-9]{10}$/;

    if (!trimmed) {
      setErrorMsg('PLEASE ENTER YOUR 10-DIGIT MOBILE NUMBER.');
      return;
    }

    if (!phonePattern.test(trimmed)) {
      setErrorMsg('INVALID NUMBER. PLEASE ENTER A VALID 10-DIGIT NUMBER.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitPhone(trimmed);
      setPhoneInput('');
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err?.message || 'FAILED TO LINK NUMBER. PLEASE TRY AGAIN.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none">
          {/* Soft Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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

            {/* Brand Logo Header */}
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
                  <FiLock className="animate-pulse" /> REQUIRED PROFILE VERIFICATION
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-wider uppercase font-mono text-[#0D1A14] pt-1">
                  LINK MOBILE NUMBER
                </h2>
              </div>

              {/* Description */}
              <p className="text-xs text-[#527060] font-sans leading-relaxed max-w-sm font-medium">
                Please enter your 10-digit mobile number to complete your Vakrayan account and receive instant WhatsApp order tracking & delivery SMS.
              </p>

              {/* Benefits Box */}
              <div className="w-full text-left bg-white border border-[#E0EDE8] rounded-2xl p-4 space-y-2.5 shadow-2xs font-sans">
                <div className="flex items-center gap-2.5 text-xs text-[#0D1A14] font-medium">
                  <div className="w-5 h-5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center shrink-0">
                    <FiCheck className="text-xs" />
                  </div>
                  <span>Real-time WhatsApp & SMS order tracking updates</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-[#0D1A14] font-medium">
                  <div className="w-5 h-5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center shrink-0">
                    <FiCheck className="text-xs" />
                  </div>
                  <span>1-Click fast checkout on upcoming limited drops</span>
                </div>
              </div>

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="w-full space-y-4 pt-1">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-mono font-bold tracking-widest uppercase text-[#527060]">
                    MOBILE NUMBER (INDIA +91)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-mono font-black text-[var(--color-accent)] border-r border-[#E0EDE8] pr-2.5">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="ENTER 10 DIGIT NUMBER"
                      value={phoneInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setPhoneInput(val);
                        if (errorMsg) setErrorMsg('');
                      }}
                      className="w-full bg-white border-2 border-[#E0EDE8] focus:border-[var(--color-accent)] rounded-xl py-3.5 pl-16 pr-4 text-xs font-mono font-black text-[#0D1A14] placeholder-neutral-400 outline-hidden transition-all shadow-2xs"
                      disabled={submitting}
                      autoFocus
                    />
                  </div>
                  {errorMsg && (
                    <p className="text-[10px] text-rose-600 font-mono font-bold tracking-wide mt-1">
                      ⚠️ {errorMsg}
                    </p>
                  )}
                </div>

                {/* Privacy Guarantee */}
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-[#527060]">
                  <FiShield className="text-[var(--color-accent)] shrink-0" />
                  <span>Your number is strictly private & encrypted.</span>
                </div>

                {/* Single Mandatory Button */}
                <div className="w-full pt-1">
                  <button
                    type="submit"
                    disabled={submitting || phoneInput.length !== 10}
                    className="w-full py-4 bg-[#0D1A14] hover:bg-neutral-800 active:scale-[0.99] font-mono font-black text-xs tracking-widest uppercase text-white rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'SAVING NUMBER...' : 'SAVE & CONTINUE ACCOUNT →'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default PhonePromptModal;

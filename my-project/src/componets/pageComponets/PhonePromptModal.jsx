import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowRight, FiLock, FiShield } from 'react-icons/fi';

/**
 * PhonePromptModal — Ultra-Minimalist Editorial Design.
 * Clean, distraction-free aesthetic matching modern luxury streetwear apps.
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
      setErrorMsg('Please enter your 10-digit mobile number.');
      return;
    }

    if (!phonePattern.test(trimmed)) {
      setErrorMsg('Please enter a valid 10-digit number.');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitPhone(trimmed);
      setPhoneInput('');
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to link number. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none">
          {/* Subtle Dark Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm"
          />

          {/* Minimalist Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[380px] bg-white text-neutral-900 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden z-10 border border-neutral-100"
          >
            <div className="flex flex-col items-center text-center">
              
              {/* Official Vakrayan Logo */}
              <img 
                src="/vakrayan-merged-logo.png" 
                alt="Vakrayan Logo" 
                className="h-16 sm:h-20 w-auto object-contain mb-4" 
              />

              {/* Minimal Tag */}
              <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest text-emerald-600 uppercase mb-1">
                <FiLock className="text-xs" /> Profile Verification
              </span>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-black text-neutral-950 tracking-tight font-brand mb-1.5">
                Link Mobile Number
              </h2>

              {/* Subtitle */}
              <p className="text-xs text-neutral-500 font-medium leading-relaxed max-w-[280px] mb-6">
                Required for WhatsApp tracking & delivery SMS updates.
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit} className="w-full space-y-4">
                
                {/* Input Field */}
                <div className="space-y-1 text-left">
                  <div className="relative flex items-center bg-neutral-50 rounded-2xl border border-neutral-200 focus-within:border-neutral-950 focus-within:bg-white focus-within:ring-2 focus-within:ring-neutral-950/10 transition-all">
                    <div className="flex items-center gap-1 px-3.5 py-3 text-xs font-bold text-neutral-900 border-r border-neutral-200 shrink-0">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="Enter 10-digit number"
                      value={phoneInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setPhoneInput(val);
                        if (errorMsg) setErrorMsg('');
                      }}
                      className="w-full bg-transparent py-3 px-3.5 text-sm font-semibold text-neutral-950 placeholder-neutral-400 outline-none"
                      disabled={submitting}
                      autoFocus
                    />
                  </div>

                  {errorMsg && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[11px] text-rose-600 font-medium pt-1"
                    >
                      ⚠️ {errorMsg}
                    </motion.p>
                  )}
                </div>

                {/* Privacy indicator */}
                <div className="flex items-center justify-center gap-1 text-[11px] text-neutral-400 font-medium">
                  <FiShield className="text-emerald-500 text-xs shrink-0" />
                  <span>Private, encrypted & secure</span>
                </div>

                {/* Minimal Action Button */}
                <button
                  type="submit"
                  disabled={submitting || phoneInput.length !== 10}
                  className="w-full py-3.5 bg-neutral-950 hover:bg-neutral-800 active:scale-[0.98] font-bold text-xs tracking-wider uppercase text-white rounded-2xl transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span>{submitting ? 'Saving...' : 'Save & Continue'}</span>
                  {!submitting && <FiArrowRight className="text-sm" />}
                </button>

              </form>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default PhonePromptModal;



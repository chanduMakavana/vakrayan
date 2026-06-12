import { motion } from 'framer-motion';
import { FiX, FiMail, FiTruck, FiZap } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

function VipPromoModal({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleStartTrial = () => {
    onClose();
    navigate('/profile?join_vip=true');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
        className="relative w-full max-w-lg bg-neutral-950/90 border border-amber-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden"
      >
        {/* Glow ambient background details */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-amber-500 transition-colors p-1.5 rounded-full hover:bg-neutral-900 cursor-pointer"
          aria-label="Close modal"
        >
          <FiX className="text-lg" />
        </button>

        {/* Brand/Logo Header */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-mono font-black uppercase tracking-widest mb-3">
            <FiZap className="animate-pulse" /> VIP CLUB EARLY ACCESS
          </span>
          <h2 className="text-2xl font-black font-sans text-white tracking-widest uppercase">
            STREET<span className="text-amber-500">—</span>WEAR VIP
          </h2>
          <p className="text-neutral-400 text-xs mt-1.5 font-medium max-w-xs mx-auto">
            Unlock the ultimate premium experience and join the street elite.
          </p>
        </div>

        {/* Benefits List */}
        <div className="space-y-4 my-6">
          <div className="flex gap-4 items-start p-3 rounded-xl bg-neutral-900/40 border border-white/5 hover:border-amber-500/10 transition-colors">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
              <FiZap className="text-base" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">🔒 Unlock VIP Early Access Drops</h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">Shop limited-edition releases, custom streetwear, and hyped drops before they sell out.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start p-3 rounded-xl bg-neutral-900/40 border border-white/5 hover:border-amber-500/10 transition-colors">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
              <FiTruck className="text-base" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">📦 Free Express Shipping</h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">Enjoy free premium express shipping on all orders with zero minimum purchase required.</p>
            </div>
          </div>

          <div className="flex gap-4 items-start p-3 rounded-xl bg-neutral-900/40 border border-white/5 hover:border-amber-500/10 transition-colors">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
              <FiMail className="text-base" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">🎟️ Member-Only Collections & Invites</h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">Get exclusive access to premium collections and private community drop links.</p>
            </div>
          </div>
        </div>

        {/* Pricing / CTA Section */}
        <div className="mt-8 text-center space-y-4">
          <div className="bg-neutral-900/60 border border-white/5 py-4.5 px-6 rounded-xl flex flex-col items-center justify-center gap-1">
            <p className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest">
              Exclusive Trial Offer
            </p>
            <p className="text-lg font-black text-white uppercase tracking-wider">
              1-MONTH FREE TRIAL
            </p>
            <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-wider">
              Then ₹499/6-months · Cancel anytime in your profile
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={handleStartTrial}
              className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-black font-mono font-black text-[11px] tracking-widest uppercase py-4 rounded-xl transition-all duration-200 shadow-md cursor-pointer border border-amber-400"
            >
              ⚡ Start 1-Month Free Trial
            </button>
            <button
              onClick={onClose}
              className="w-full bg-transparent hover:bg-neutral-900 text-neutral-400 hover:text-white font-mono font-bold text-[9px] tracking-widest uppercase py-2.5 rounded-xl transition-all duration-200 cursor-pointer"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default VipPromoModal;

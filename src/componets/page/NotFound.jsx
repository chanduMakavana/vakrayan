import { Link } from 'react-router-dom';
import { FiArrowLeft, FiAlertTriangle } from 'react-icons/fi';

function NotFound() {
  return (
    <div className="w-full min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative selection:bg-[var(--color-accent)] selection:text-white">
      <div className="absolute inset-0 bg-[var(--color-bg)]/95 backdrop-blur-xs z-10" />

      <div className="relative z-20 w-full max-w-md bg-[var(--color-surface)] p-8 md:p-10 rounded-none border border-[var(--color-border)] shadow-xl text-center space-y-6 animate-scale-up">
        
        {/* Warning Icon Badge */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 animate-bounce animate-pulse-glow">
            <FiAlertTriangle className="text-2xl" />
          </div>
        </div>

        {/* 404 Header */}
        <div>
          <h4 className="text-[10px] font-serif tracking-[0.5em] text-[var(--color-accent)] font-black uppercase mb-1">
            ERROR CODE // 404
          </h4>
          <h1 className="text-2xl md:text-3xl font-serif font-black tracking-widest text-[var(--color-text)] uppercase animate-slide-up">
            DROP EXPIRATION
          </h1>
        </div>

        {/* Informational Subtext */}
        <p className="text-xs text-[var(--color-muted)] leading-relaxed max-w-xs mx-auto uppercase tracking-wide font-medium">
          The vakrayan drops archive or page view-frame you are trying to access is currently untraceable or has been wiped from live servers.
        </p>

        {/* Divider */}
        <div className="w-12 h-px bg-[var(--color-border)] mx-auto" />

        {/* Go back CTA */}
        <div className="pt-2">
          <Link 
            to="/" 
            className="inline-flex items-center text-white justify-center gap-3 w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98] font-black text-xs tracking-widest uppercase py-4 rounded-none shadow-md transition-all cursor-pointer"
          >
            <FiArrowLeft className="text-sm"  />
            Continue Shopping
          </Link>
        </div>

      </div>
    </div>
  );
}

export default NotFound;

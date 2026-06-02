import { Link } from 'react-router-dom';
import { FiArrowLeft, FiAlertTriangle } from 'react-icons/fi';

function NotFound() {
  return (
    <div className="w-full min-h-screen bg-[#fafafb] flex items-center justify-center p-6 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative selection:bg-neutral-900 selection:text-white">
      <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-10" />

      <div className="relative z-20 w-full max-w-md bg-white p-8 md:p-10 rounded-2xl border border-neutral-200/60 shadow-xl text-center space-y-6">
        
        {/* Warning Icon Badge */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 animate-bounce">
            <FiAlertTriangle className="text-2xl" />
          </div>
        </div>

        {/* 404 Header */}
        <div>
          <h4 className="text-[10px] tracking-[0.5em] text-rose-600 font-black uppercase mb-1">
            ERROR CODE // 404
          </h4>
          <h1 className="text-2xl md:text-3xl font-black tracking-widest text-neutral-900 uppercase">
            DROP EXPIRATION
          </h1>
        </div>

        {/* Informational Subtext */}
        <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto uppercase tracking-wide font-medium">
          The streetwear drops archive or page view-frame you are trying to access is currently untraceable or has been wiped from live servers.
        </p>

        {/* Divider */}
        <div className="w-12 h-px bg-neutral-200 mx-auto" />

        {/* Go back CTA */}
        <div className="pt-2">
          <Link 
            to="/" 
            className="inline-flex items-center text-black justify-center gap-3 w-full bg-neutral-950 hover:bg-neutral-800 active:scale-[0.98]  font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <FiArrowLeft className="text-sm text-black"  />
            Continue Shopping
          </Link>
        </div>

      </div>
    </div>
  );
}

export default NotFound;

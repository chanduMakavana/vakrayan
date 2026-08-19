import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

function NotFound() {
  return (
    <div className="w-full min-h-screen bg-[#f5f3ee] text-[#1a1a1a] flex flex-col justify-between selection:bg-black selection:text-white font-sans relative overflow-hidden">
      
      {/* 1. SEAMLESS FULL-SCREEN BACKGROUND ARTWORK (WITH AIR-FLOWING TAGS & THREADS) */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <img
          src="/404-luxury-editorial.jpg"
          alt="Vakrayan 404 Visual"
          className="w-full h-full object-cover object-center select-none"
        />
        {/* Soft edge blending */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#f5f3ee]/80 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f5f3ee]/90 to-transparent pointer-events-none" />
      </div>

      {/* 2. TOP MINIMAL LUXURY HEADER */}
      <header className="relative z-20 pt-5 md:pt-7 px-6 md:px-12 max-w-7xl mx-auto w-full flex justify-between items-center">
        <Link to="/" className="flex-shrink-0 flex items-center group">
          <img
            src="/vakrayan-merged-logo.png"
            alt="Vakrayan"
            className="h-10 sm:h-12 md:h-14 w-auto object-contain drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#737373] bg-white/80 px-4 py-1 rounded-full backdrop-blur-xs border border-black/10 shadow-xs">
          PAGE 404
        </span>
      </header>

      {/* 3. CENTER CLEAR SPACE (T-Shirt and Floating Tags in mid-air remain 100% visible) */}
      <div className="relative z-10 flex-1 pointer-events-none" />

      {/* 4. BOTTOM CLEAN "BACK TO HOME" ACTION ONLY */}
      <footer className="relative z-20 pb-8 md:pb-12 px-6 max-w-md mx-auto w-full text-center flex flex-col items-center">
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-black hover:bg-neutral-800 text-white font-bold text-xs tracking-widest uppercase rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <FiArrowLeft className="text-sm" />
          Back to Home
        </Link>
      </footer>

    </div>
  );
}

export default NotFound;

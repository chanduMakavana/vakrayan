import { Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiSearch, FiCompass } from 'react-icons/fi';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function NotFound() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f7f5f0] text-[#1a1a1a] flex flex-col justify-between selection:bg-black selection:text-white font-sans relative overflow-x-hidden">
      
      {/* 1. TOP EDITORIAL HEADER BAR */}
      <header className="relative z-30 pt-6 md:pt-8 px-6 md:px-12 max-w-7xl mx-auto w-full flex justify-between items-center">
        <Link to="/" className="text-xl md:text-2xl font-serif font-black tracking-[0.35em] uppercase text-black hover:opacity-75 transition-opacity">
          VAKRAYAN
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-block font-mono text-[11px] uppercase tracking-[0.25em] text-[#737373]">
            EDITION // UNTRACKED
          </span>
          <Link
            to="/shop"
            className="text-[11px] font-mono font-bold tracking-widest uppercase px-4 py-1.5 rounded-full border border-black/20 hover:bg-black hover:text-white transition-all cursor-pointer"
          >
            Vault Archive
          </Link>
        </div>
      </header>

      {/* 2. CENTER EDITORIAL ARTWORK HERO */}
      <main className="relative z-20 my-auto flex flex-col items-center justify-center px-4 py-6 max-w-5xl mx-auto w-full text-center">
        
        {/* Luxury Editorial Image Container with Soft Floating Animation */}
        <div className="relative w-full max-w-[780px] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-black/5 bg-[#f5f3ee] animate-fade-in group">
          <img
            src="/404-luxury-editorial.jpg"
            alt="Vakrayan 404 Luxury Streetwear Editorial"
            className="w-full h-auto object-cover select-none pointer-events-none transform transition-transform duration-700 group-hover:scale-[1.01]"
            loading="eager"
          />

          {/* Subtle Ambient Light Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#f7f5f0]/80 via-transparent to-transparent opacity-60 pointer-events-none" />
        </div>

        {/* Sophisticated Editorial Subtext */}
        <div className="mt-4 md:mt-6 space-y-2 max-w-md mx-auto">
          <p className="text-xs md:text-sm font-serif italic text-[#404040] tracking-wide">
            "Looks like this piece is sold out or untraceable in the current drop."
          </p>
        </div>

        {/* Instant Search Bar */}
        <form onSubmit={handleSearch} className="mt-6 max-w-md w-full mx-auto relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search oversized tees, anime drops..."
            className="w-full bg-white border border-black/15 focus:border-black rounded-full py-3.5 pl-12 pr-28 text-xs text-black placeholder-[#8c8c8c] tracking-wide outline-none shadow-sm transition-all"
          />
          <FiSearch className="absolute left-4.5 text-[#737373] text-sm pointer-events-none" />
          <button
            type="submit"
            className="absolute right-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-white font-bold text-[11px] tracking-widest uppercase rounded-full transition-all cursor-pointer"
          >
            Find
          </button>
        </form>

        {/* Quick Editorial Action Links */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-mono tracking-widest uppercase">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-black hover:bg-neutral-800 text-white font-bold rounded-full shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <FiArrowLeft className="text-sm" />
            Return Home
          </Link>

          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-black hover:text-white text-black font-bold rounded-full border border-black/20 shadow-xs transition-all cursor-pointer"
          >
            <FiShoppingBag className="text-sm" />
            Shop Latest Drops
          </Link>
        </div>

      </main>

      {/* 3. BOTTOM EDITORIAL FOOTER */}
      <footer className="relative z-30 py-6 px-6 max-w-7xl mx-auto w-full flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono tracking-[0.25em] text-[#737373] uppercase border-t border-black/5 gap-2">
        <span>VAKRAYAN PREMIUM APPAREL</span>
        <span>AESTHETIC ARCHIVE • 2026</span>
      </footer>

    </div>
  );
}

export default NotFound;

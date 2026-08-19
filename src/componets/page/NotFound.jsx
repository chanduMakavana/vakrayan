import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiSearch } from 'react-icons/fi';
import { useState } from 'react';

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
    <div className="w-full min-h-screen bg-[#f5f3ee] text-[#1a1a1a] flex flex-col justify-between selection:bg-black selection:text-white font-sans relative overflow-hidden">
      
      {/* 1. SEAMLESS FULL-SCREEN BACKGROUND ARTWORK */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
        <img
          src="/404-luxury-editorial.jpg"
          alt="Vakrayan 404 Visual"
          className="w-full h-full object-cover object-center select-none"
        />
        {/* Soft Edge Blending Gradients to ensure 100% full screen fluid match */}
        <div className="absolute inset-0 bg-radial from-transparent via-[#f5f3ee]/20 to-[#f5f3ee]/60 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#f5f3ee]/80 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#f5f3ee] via-[#f5f3ee]/80 to-transparent pointer-events-none" />
      </div>

      {/* 2. TOP MINIMAL LUXURY HEADER */}
      <header className="relative z-20 pt-6 md:pt-8 px-6 md:px-12 max-w-7xl mx-auto w-full flex justify-between items-center">
        <Link to="/" className="text-xl md:text-2xl font-serif font-black tracking-[0.35em] uppercase text-black hover:opacity-75 transition-opacity">
          VAKRAYAN
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block font-mono text-[11px] uppercase tracking-[0.25em] text-[#737373] bg-white/70 px-3 py-1 rounded-full backdrop-blur-xs border border-black/10">
            PIECE NOT FOUND
          </span>
        </div>
      </header>

      {/* 3. CENTER SPACER (Leaves the T-Shirt, 404, and Tags completely unobstructed) */}
      <div className="relative z-10 flex-1 flex items-center justify-center pointer-events-none" />

      {/* 4. BOTTOM INTERACTIVE CONTROLS & NAVIGATION */}
      <main className="relative z-20 pb-8 px-4 max-w-xl mx-auto w-full text-center space-y-4">
        
        {/* Editorial Subtext */}
        <div className="space-y-1">
          <p className="text-xs md:text-sm font-serif italic text-[#333333] tracking-wide">
            Looks like this piece is sold out or untraceable in the current drop.
          </p>
        </div>

        {/* Floating Search Bar */}
        <form onSubmit={handleSearch} className="max-w-md w-full mx-auto relative flex items-center shadow-lg rounded-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search drops, oversized tees..."
            className="w-full bg-white/90 backdrop-blur-md border border-black/15 focus:border-black rounded-full py-3 pl-11 pr-24 text-xs text-black placeholder-[#8c8c8c] tracking-wide outline-none transition-all"
          />
          <FiSearch className="absolute left-4 text-[#737373] text-sm pointer-events-none" />
          <button
            type="submit"
            className="absolute right-1 px-4 py-2 bg-black hover:bg-neutral-800 text-white font-bold text-[11px] tracking-widest uppercase rounded-full transition-all cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Minimal Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-black hover:bg-neutral-800 text-white font-bold text-xs tracking-wider uppercase rounded-full shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <FiArrowLeft className="text-sm" />
            Back to Home
          </Link>

          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/90 hover:bg-black hover:text-white text-black font-bold text-xs tracking-wider uppercase rounded-full border border-black/20 backdrop-blur-md shadow-sm transition-all cursor-pointer"
          >
            <FiShoppingBag className="text-sm" />
            Explore Vault
          </Link>
        </div>

      </main>

      {/* 5. MINIMAL BOTTOM BRAND FOOTER */}
      <footer className="relative z-20 pb-4 px-6 text-center text-[10px] font-mono tracking-[0.25em] text-[#8c8c8c] uppercase pointer-events-none">
        VAKRAYAN LUXURY STREETWEAR • 2026
      </footer>

    </div>
  );
}

export default NotFound;

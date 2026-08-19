import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiSearch, FiCompass, FiTrendingUp } from 'react-icons/fi';

const QUICK_COLLECTIONS = [
  { name: 'Oversized Tees', link: '/shop?category=oversized' },
  { name: 'Anime Drops', link: '/shop?category=anime' },
  { name: 'Hoodies & Jackets', link: '/shop?category=hoodies' },
  { name: 'New Arrivals', link: '/shop?sort=newest' },
];

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
    <div className="w-full min-h-screen bg-[#070b09] text-white flex flex-col justify-between relative overflow-hidden selection:bg-emerald-500 selection:text-black">
      
      {/* Background Subtle Luxury Accents (Zero Lag) */}
      <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-32 w-96 h-96 bg-emerald-700/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="relative z-20 pt-6 px-6 max-w-6xl mx-auto w-full flex justify-between items-center">
        <Link to="/" className="text-xl md:text-2xl font-serif font-black tracking-[0.3em] uppercase text-white hover:text-emerald-400 transition-colors">
          VAKRAYAN
        </Link>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-mono tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          PAGE NOT FOUND
        </div>
      </header>

      {/* Center Hero Section */}
      <main className="relative z-20 my-auto px-4 py-8 max-w-2xl mx-auto w-full text-center space-y-7">
        
        {/* Animated Streetwear Garment Icon with 404 Accent */}
        <div className="relative inline-block">
          <div className="w-24 h-24 md:w-28 md:h-28 mx-auto rounded-3xl bg-gradient-to-b from-emerald-500/20 to-emerald-950/40 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.15)]">
            <svg width="56" height="56" viewBox="0 0 50 50" fill="none" className="text-emerald-400 drop-shadow-md">
              <path
                d="M17 6 L9 14 L3 10 L0 17 L7 21 L7 44 L43 44 L43 21 L50 17 L47 10 L41 14 L33 6 C30 10 20 10 17 6 Z"
                fill="#047857"
                stroke="#34d399"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="M19 19 L25 28 L31 19" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-emerald-500 text-black font-mono font-black text-xs tracking-wider shadow-lg">
            404
          </span>
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-mono tracking-[0.5em] text-emerald-400 font-bold uppercase">
            // ARCHIVE VAULT ERROR
          </h4>
          <h1 className="text-3xl md:text-5xl font-serif font-black tracking-wider text-white uppercase">
            DROP OUT OF REACH
          </h1>
          <p className="text-xs md:text-sm text-gray-400 max-w-md mx-auto leading-relaxed font-light">
            The edition or apparel page you're searching for is untraceable or has been moved to our private archives.
          </p>
        </div>

        {/* Instant Search Bar */}
        <form onSubmit={handleSearch} className="max-w-md mx-auto relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search drops, oversized tees, anime..."
            className="w-full bg-white/5 border border-white/15 focus:border-emerald-500/60 rounded-full py-3.5 pl-12 pr-28 text-xs text-white placeholder-gray-500 tracking-wide outline-none transition-all"
          />
          <FiSearch className="absolute left-4.5 text-gray-400 text-sm pointer-events-none" />
          <button
            type="submit"
            className="absolute right-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] tracking-widest uppercase rounded-full transition-all cursor-pointer"
          >
            Find
          </button>
        </form>

        {/* Quick Collection Recommendations */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-gray-400 tracking-wider uppercase">
            <FiTrendingUp className="text-emerald-400" />
            <span>Popular Archives:</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_COLLECTIONS.map((item) => (
              <Link
                key={item.name}
                to={item.link}
                className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 text-gray-300 hover:text-white text-xs font-mono tracking-wide transition-all"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs tracking-widest uppercase rounded-full shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <FiShoppingBag className="text-sm" />
            Explore Live Drops
          </Link>

          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs tracking-widest uppercase rounded-full border border-white/10 hover:border-white/20 transition-all cursor-pointer"
          >
            <FiCompass className="text-sm" />
            Browse Full Vault
          </Link>
        </div>

      </main>

      {/* Footer Minimal Copyright */}
      <footer className="relative z-20 pb-6 text-center text-[10px] text-gray-500 font-mono tracking-widest uppercase">
        VAKRAYAN APPAREL • PREMIUM STREETWEAR 2026
      </footer>

    </div>
  );
}

export default NotFound;

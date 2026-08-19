import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiAward, FiRotateCcw } from 'react-icons/fi';

// 9 High-Style Streetwear T-Shirts attached to specific tree branches
const INITIAL_TSHIRTS = [
  { id: 1, x: 22, y: 46, color: '#18181b', stroke: '#52525b', name: 'Oversized Noir', points: 20, isFallen: false, fallenLeft: 18 },
  { id: 2, x: 31, y: 34, color: '#047857', stroke: '#10b981', name: 'Vakrayan Emerald', points: 30, isFallen: false, fallenLeft: 27 },
  { id: 3, x: 40, y: 24, color: '#dc2626', stroke: '#f87171', name: 'Crimson Drop', points: 25, isFallen: false, fallenLeft: 36 },
  { id: 4, x: 50, y: 17, color: '#09090b', stroke: '#fbbf24', name: 'Golden Anime Graphic', points: 50, isFallen: false, fallenLeft: 47 },
  { id: 5, x: 60, y: 22, color: '#7c3aed', stroke: '#c084fc', name: 'Cyber Lavender', points: 35, isFallen: false, fallenLeft: 58 },
  { id: 6, x: 69, y: 32, color: '#f4f4f5', stroke: '#d4d4d8', name: 'Vintage Boxy White', points: 25, isFallen: false, fallenLeft: 69 },
  { id: 7, x: 78, y: 44, color: '#2563eb', stroke: '#60a5fa', name: 'Acid Wash Blue', points: 20, isFallen: false, fallenLeft: 80 },
  { id: 8, x: 44, y: 39, color: '#059669', stroke: '#34d399', name: 'Signature Tee', points: 15, isFallen: false, fallenLeft: 41 },
  { id: 9, x: 56, y: 37, color: '#d97706', stroke: '#fde047', name: 'Ochre Drop', points: 30, isFallen: false, fallenLeft: 64 },
];

function NotFound() {
  const [tshirts, setTshirts] = useState(INITIAL_TSHIRTS);
  const [score, setScore] = useState(0);
  const [pluckedCount, setPluckedCount] = useState(0);
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  // Pluck a T-shirt from branch and drop it straight down
  const handlePluck = (id) => {
    setTshirts((prev) =>
      prev.map((item) => {
        if (item.id === id && !item.isFallen) {
          setScore((s) => s + item.points);
          setPluckedCount((c) => c + 1);
          return { ...item, isFallen: true };
        }
        return item;
      })
    );
  };

  // Reset/Regrow all T-shirts on tree
  const handleRegrow = () => {
    setTshirts(INITIAL_TSHIRTS);
    setScore(0);
    setPluckedCount(0);
  };

  const isAllPlucked = pluckedCount >= tshirts.length;

  return (
    <div className="w-full min-h-screen relative overflow-hidden bg-[#040a06] text-white flex flex-col justify-between select-none">
      
      {/* ======================================================== */}
      {/* 1. TOP HEADER (LOGO & HARVEST HUD) */}
      {/* ======================================================== */}
      <header className="relative z-40 pt-5 px-5 md:px-8 flex justify-between items-center max-w-7xl mx-auto w-full">
        <Link to="/" className="text-xl md:text-2xl font-serif font-black tracking-[0.25em] uppercase text-white hover:text-emerald-400 transition-colors">
          VAKRAYAN
        </Link>
        
        {/* Score & Pluck Tracker */}
        <div className="flex items-center gap-3 bg-[#0a180e] px-4 py-2 rounded-full border border-emerald-500/40 shadow-lg">
          <div className="text-[11px] font-mono text-emerald-400 font-bold">
            DROPS: <span className="text-sm text-white font-black">{pluckedCount}/{tshirts.length}</span>
          </div>
          <div className="h-3.5 w-px bg-white/20" />
          <div className="text-[11px] font-mono text-amber-400 font-bold">
            SCORE: <span className="text-sm text-white font-black">{score}</span>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. INSTRUCTION BANNER (CLEAR & PROMINENT) */}
      {/* ======================================================== */}
      <div className="relative z-40 text-center px-4 -mt-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-mono tracking-wide">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          👉 Tap any T-Shirt on the Tree to Pluck & Drop!
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MAIN TREE ARENA (FRONT & CENTER - ZERO LAG VECTOR) */}
      {/* ======================================================== */}
      <div className="relative z-30 flex-1 w-full max-w-5xl mx-auto flex items-end justify-center px-2">
        
        {/* Tree SVG Base Canvas */}
        <div className="relative w-full h-[58vh] md:h-[68vh] max-h-[750px] flex items-end justify-center">
          
          <svg
            viewBox="0 0 1000 650"
            className="w-full h-full object-contain object-bottom pointer-events-none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="trunkCrisp" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#1a1109" />
                <stop offset="50%" stopColor="#382414" />
                <stop offset="100%" stopColor="#1f4d2b" />
              </linearGradient>

              <radialGradient id="canopyGreen1" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="70%" stopColor="#059669" />
                <stop offset="100%" stopColor="#022c22" />
              </radialGradient>
            </defs>

            {/* Ground Soil Mound */}
            <ellipse cx="500" cy="635" rx="420" ry="24" fill="#047857" opacity="0.3" />
            <ellipse cx="500" cy="625" rx="300" ry="16" fill="#1a1109" />

            {/* Tree Main Trunk */}
            <path
              d="M470 625 C475 510 460 380 480 300 C490 260 495 200 490 140 C510 200 515 260 525 300 C545 380 530 510 535 625 Z"
              fill="url(#trunkCrisp)"
            />

            {/* Big Left & Right Branches */}
            <path d="M480 370 C410 330 320 310 200 250 C180 240 195 225 220 235 C310 270 395 295 485 320" stroke="url(#trunkCrisp)" strokeWidth="15" strokeLinecap="round" />
            <path d="M525 350 C595 310 685 290 805 230 C825 220 810 205 785 215 C695 250 610 275 520 300" stroke="url(#trunkCrisp)" strokeWidth="15" strokeLinecap="round" />
            <path d="M490 240 C440 180 365 140 290 100" stroke="#382414" strokeWidth="9" strokeLinecap="round" />
            <path d="M515 220 C565 160 640 120 715 80" stroke="#382414" strokeWidth="9" strokeLinecap="round" />
            <path d="M500 140 L500 30" stroke="#1f4d2b" strokeWidth="7" strokeLinecap="round" />

            {/* Lush Vector Foliage Clouds */}
            <circle cx="500" cy="80" r="100" fill="url(#canopyGreen1)" />
            <circle cx="340" cy="160" r="90" fill="url(#canopyGreen1)" />
            <circle cx="210" cy="240" r="80" fill="url(#canopyGreen1)" />
            <circle cx="660" cy="150" r="90" fill="url(#canopyGreen1)" />
            <circle cx="790" cy="230" r="80" fill="url(#canopyGreen1)" />
            <circle cx="430" cy="200" r="60" fill="#10b981" opacity="0.8" />
            <circle cx="580" cy="190" r="60" fill="#10b981" opacity="0.8" />
          </svg>

          {/* ======================================================== */}
          {/* 4. INTERACTIVE T-SHIRTS (CLICKABLE & SWAYING) */}
          {/* ======================================================== */}
          {tshirts.map((item, index) => {
            if (item.isFallen) return null;

            const swayClass = index % 3 === 0 ? 'animate-sway-1' : index % 3 === 1 ? 'animate-sway-2' : 'animate-sway-3';

            return (
              <div
                key={item.id}
                onClick={() => handlePluck(item.id)}
                className={`absolute cursor-pointer select-none group transform -translate-x-1/2 -translate-y-1/2 origin-top ${swayClass}`}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  willChange: 'transform',
                }}
              >
                {/* Hanger Hook & Thread */}
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-4 bg-emerald-950 border-r border-dashed border-gray-400" />
                  <div className="w-3 h-2 -mt-1 border-t-2 border-amber-400 rounded-t-full" />
                </div>

                {/* Streetwear T-Shirt Shape */}
                <div className="transform transition-transform duration-150 group-hover:scale-135 group-active:scale-95 drop-shadow-lg">
                  <svg width="44" height="44" viewBox="0 0 50 50" fill="none">
                    <path
                      d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z"
                      fill={item.color}
                      stroke={item.stroke}
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <rect x="18" y="16" width="10" height="11" fill="rgba(255,255,255,0.3)" rx="1" />
                  </svg>
                </div>

                {/* Score popup preview */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-emerald-300 font-bold bg-black/80 px-1 rounded text-center -mt-1">
                  +{item.points}
                </div>
              </div>
            );
          })}

          {/* ======================================================== */}
          {/* 5. FALLEN T-SHIRTS PILED ON THE GROUND */}
          {/* ======================================================== */}
          <div className="absolute bottom-1 inset-x-0 h-14 pointer-events-none flex items-center justify-center">
            {tshirts.map((item) => {
              if (!item.isFallen) return null;
              return (
                <div
                  key={item.id}
                  className="absolute bottom-2 transform -translate-x-1/2 transition-all duration-300"
                  style={{ left: `${item.fallenLeft}%` }}
                >
                  <div className="relative">
                    <svg width="34" height="34" viewBox="0 0 50 50" fill="none">
                      <path
                        d="M17 6 L9 14 L3 10 L0 17 L7 21 L7 44 L43 44 L43 21 L50 17 L47 10 L41 14 L33 6 C30 10 20 10 17 6 Z"
                        fill={item.color}
                        stroke={item.stroke}
                        strokeWidth="2"
                      />
                    </svg>
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-emerald-400 font-bold bg-black/90 px-1 rounded">
                      ✓
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. BOTTOM ACTIONS & REWARDS */}
      {/* ======================================================== */}
      <footer className="relative z-40 pb-6 px-4 flex flex-col items-center justify-center">
        {isAllPlucked ? (
          // Reward Winner Modal
          <div className="max-w-sm w-full bg-[#0a180e] border-2 border-emerald-500/60 p-4 rounded-2xl text-center space-y-2.5 shadow-2xl">
            <div className="inline-flex items-center gap-1.5 text-amber-400 text-sm font-mono font-bold">
              <FiAward className="text-lg" /> ALL DROPS HARVESTED! ({score} PTS)
            </div>

            <div className="p-2.5 bg-black/60 border border-emerald-500/30 rounded-xl space-y-1">
              <p className="text-[10px] text-gray-300 font-mono">10% OFF Discount Unlocked:</p>
              <div className="text-base font-mono font-black text-emerald-400 tracking-widest">
                VAKRAYAN10
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('VAKRAYAN10');
                  setCopiedCoupon(true);
                  setTimeout(() => setCopiedCoupon(false), 2000);
                }}
                className="text-[10px] text-emerald-300 underline font-mono cursor-pointer"
              >
                {copiedCoupon ? '✓ COPIED!' : 'Click to Copy Code'}
              </button>
            </div>

            <div className="flex gap-2 justify-center pt-0.5">
              <button
                onClick={handleRegrow}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs tracking-wider uppercase rounded-xl border border-white/20 transition-all cursor-pointer inline-flex items-center gap-1"
              >
                <FiRotateCcw /> Regrow
              </button>
              <Link
                to="/"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs tracking-wider uppercase rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center gap-1"
              >
                <FiShoppingBag /> Shop Now
              </Link>
            </div>
          </div>
        ) : (
          // Minimal Bottom Buttons
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs tracking-widest uppercase rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <FiShoppingBag className="text-sm" />
              Continue Shopping
            </Link>

            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs tracking-widest uppercase rounded-full border border-white/10 transition-all cursor-pointer"
            >
              <FiArrowLeft className="text-sm" />
              Back
            </button>
          </div>
        )}
      </footer>

      {/* Zero-Lag Hardware Accelerated Keyframes */}
      <style>{`
        @keyframes sway1 {
          0% { transform: translate(-50%, -50%) rotate(-12deg); }
          100% { transform: translate(-50%, -50%) rotate(14deg); }
        }
        @keyframes sway2 {
          0% { transform: translate(-50%, -50%) rotate(15deg); }
          100% { transform: translate(-50%, -50%) rotate(-13deg); }
        }
        @keyframes sway3 {
          0% { transform: translate(-50%, -50%) rotate(-8deg); }
          100% { transform: translate(-50%, -50%) rotate(12deg); }
        }
        .animate-sway-1 {
          animation: sway1 3.2s ease-in-out infinite alternate;
        }
        .animate-sway-2 {
          animation: sway2 2.8s ease-in-out infinite alternate;
        }
        .animate-sway-3 {
          animation: sway3 3.5s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  );
}

export default NotFound;

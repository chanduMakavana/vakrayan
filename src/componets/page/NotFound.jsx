import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiAward, FiRotateCcw } from 'react-icons/fi';

// High-fidelity Streetwear Drop Items on the Tree
const INITIAL_TREE_TSHIRTS = [
  { id: 1, cx: 270, cy: 330, color: '#18181b', stroke: '#3f3f46', name: 'Oversized Noir', points: 20, isFallen: false, fallenX: 25 },
  { id: 2, cx: 380, cy: 230, color: '#047857', stroke: '#10b981', name: 'Vakrayan Emerald', points: 30, isFallen: false, fallenX: 35 },
  { id: 3, cx: 480, cy: 170, color: '#dc2626', stroke: '#f87171', name: 'Crimson Drop', points: 25, isFallen: false, fallenX: 45 },
  { id: 4, cx: 600, cy: 130, color: '#09090b', stroke: '#fbbf24', name: 'Golden Anime Graphic', points: 50, isFallen: false, fallenX: 52 },
  { id: 5, cx: 720, cy: 160, color: '#7c3aed', stroke: '#a78bfa', name: 'Cyber Lavender', points: 35, isFallen: false, fallenX: 62 },
  { id: 6, cx: 830, cy: 220, color: '#f4f4f5', stroke: '#e4e4e7', name: 'Vintage Boxy White', points: 25, isFallen: false, fallenX: 72 },
  { id: 7, cx: 940, cy: 310, color: '#2563eb', stroke: '#60a5fa', name: 'Acid Wash Blue', points: 20, isFallen: false, fallenX: 82 },
  { id: 8, cx: 530, cy: 270, color: '#059669', stroke: '#34d399', name: 'Signature Tee', points: 15, isFallen: false, fallenX: 40 },
  { id: 9, cx: 670, cy: 260, color: '#d97706', stroke: '#fcd34d', name: 'Ochre Drop', points: 30, isFallen: false, fallenX: 60 },
];

function NotFound() {
  const [tshirts, setTshirts] = useState(INITIAL_TREE_TSHIRTS);
  const [score, setScore] = useState(0);
  const [pluckedCount, setPluckedCount] = useState(0);
  const [lastPlucked, setLastPlucked] = useState(null);
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  // Soundless & smooth tap to drop T-shirt from branch to ground
  const handleDropTshirt = (id) => {
    setTshirts((prev) =>
      prev.map((item) => {
        if (item.id === id && !item.isFallen) {
          setScore((s) => s + item.points);
          setPluckedCount((c) => c + 1);
          setLastPlucked(item);
          return { ...item, isFallen: true };
        }
        return item;
      })
    );
  };

  // Reset tree drops
  const handleRegrowTree = () => {
    setTshirts(INITIAL_TREE_TSHIRTS);
    setScore(0);
    setPluckedCount(0);
    setLastPlucked(null);
  };

  const isAllPlucked = pluckedCount >= tshirts.length;

  return (
    <div className="w-full min-h-screen relative overflow-hidden bg-[#040906] text-white flex flex-col justify-between select-none">
      
      {/* Subtle Atmospheric Grid Background (Zero-lag SVG) */}
      <div className="absolute inset-0 bg-[radial-gradient(#064e3b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#020503] via-transparent to-[#020503]/90 pointer-events-none" />

      {/* ======================================================== */}
      {/* --- TOP HUD BAR (MINIMAL & SLEEK) */}
      {/* ======================================================== */}
      <div className="relative z-30 pt-6 px-5 md:px-10 flex justify-between items-center max-w-7xl mx-auto w-full">
        <Link to="/" className="text-lg md:text-2xl font-serif font-black tracking-[0.3em] uppercase text-white hover:text-emerald-400 transition-colors">
          VAKRAYAN
        </Link>
        
        {/* Score & Harvest Counter */}
        <div className="flex items-center gap-3 bg-black/70 px-4 py-2 rounded-full border border-emerald-500/30 backdrop-blur-sm shadow-lg">
          <div className="text-[11px] font-mono text-emerald-400 font-bold">
            DROPS HARVESTED: <span className="text-sm text-white font-black">{pluckedCount}/{tshirts.length}</span>
          </div>
          <div className="h-3.5 w-px bg-white/20" />
          <div className="text-[11px] font-mono text-amber-400 font-bold">
            SCORE: <span className="text-sm text-white font-black">{score}</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* --- FLOATING INSTRUCTION PILL (TOP CENTER) */}
      {/* ======================================================== */}
      <div className="relative z-30 text-center px-4 -mt-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono tracking-wide shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          👉 Tap or Click any T-Shirt on the Tree to Drop & Harvest!
        </div>
      </div>

      {/* ======================================================== */}
      {/* --- FRONT-LAYER MAJESTIC TREE WITH INTERACTIVE T-SHIRTS */}
      {/* ======================================================== */}
      <div className="relative z-20 w-full flex-1 flex items-end justify-center">
        <svg
          viewBox="0 0 1200 700"
          className="w-full h-[65vh] md:h-[75vh] max-h-[850px] object-cover object-bottom overflow-visible"
          fill="none"
          preserveAspectRatio="xMidYMax meet"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Trunk Gradient */}
            <linearGradient id="crispTrunk" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#181109" />
              <stop offset="60%" stopColor="#3b2615" />
              <stop offset="100%" stopColor="#1e5128" />
            </linearGradient>

            {/* Tree Leaf Cloud Layers */}
            <linearGradient id="leafGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="60%" stopColor="#059669" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>
            
            <linearGradient id="leafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="70%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Backdrop Sun Glow */}
            <radialGradient id="treeAura" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Glowing Tree Aura */}
          <circle cx="600" cy="280" r="360" fill="url(#treeAura)" />

          {/* Ground Surface Island */}
          <ellipse cx="600" cy="690" rx="550" ry="30" fill="#047857" opacity="0.25" />
          <ellipse cx="600" cy="680" rx="380" ry="18" fill="#181109" opacity="0.8" />
          <path d="M450 670 Q300 680 180 685" stroke="#3b2615" strokeWidth="5" strokeLinecap="round" />
          <path d="M750 670 Q900 680 1020 685" stroke="#3b2615" strokeWidth="5" strokeLinecap="round" />

          {/* --- MAIN TREE LAYER --- */}
          <g>
            {/* Trunk */}
            <path
              d="M565 680 C570 560 555 420 575 330 C585 290 592 230 588 170 C608 230 615 290 625 330 C645 420 630 560 635 680 Z"
              fill="url(#crispTrunk)"
            />

            {/* Heavy Main Branches */}
            <path d="M575 400 C505 360 405 340 270 280 C250 270 265 255 290 265 C390 300 480 325 580 350" stroke="url(#crispTrunk)" strokeWidth="16" strokeLinecap="round" />
            <path d="M625 380 C695 340 795 320 930 260 C950 250 935 235 910 245 C810 280 720 305 620 330" stroke="url(#crispTrunk)" strokeWidth="16" strokeLinecap="round" />
            <path d="M585 270 C535 210 455 170 375 130" stroke="#3b2615" strokeWidth="10" strokeLinecap="round" />
            <path d="M615 250 C665 190 745 150 825 110" stroke="#3b2615" strokeWidth="10" strokeLinecap="round" />
            <path d="M595 180 C570 100 520 60 470 20" stroke="#1e5128" strokeWidth="7" strokeLinecap="round" />
            <path d="M605 170 C630 100 680 60 730 20" stroke="#1e5128" strokeWidth="7" strokeLinecap="round" />
            <path d="M600 150 L600 20" stroke="#1e5128" strokeWidth="8" strokeLinecap="round" />

            {/* Lush Vector Foliage Clouds */}
            <circle cx="600" cy="90" r="110" fill="url(#leafGrad1)" />
            <circle cx="600" cy="40" r="85" fill="url(#leafGrad2)" />
            <circle cx="420" cy="180" r="95" fill="url(#leafGrad1)" />
            <circle cx="350" cy="140" r="75" fill="url(#leafGrad2)" />
            <circle cx="270" cy="270" r="90" fill="url(#leafGrad1)" />
            <circle cx="780" cy="170" r="95" fill="url(#leafGrad1)" />
            <circle cx="850" cy="130" r="75" fill="url(#leafGrad2)" />
            <circle cx="930" cy="260" r="90" fill="url(#leafGrad1)" />

            {/* Mid Clusters */}
            <circle cx="510" cy="230" r="60" fill="url(#leafGrad2)" opacity="0.9" />
            <circle cx="690" cy="220" r="60" fill="url(#leafGrad2)" opacity="0.9" />
          </g>

          {/* --- INTERACTIVE STREETWEAR T-SHIRTS (CLICK TO DROP) --- */}
          {tshirts.map((item, index) => {
            if (item.isFallen) return null; // Already fallen to the ground

            const swayAnim = index % 3 === 0 ? 'swayCrisp1' : index % 3 === 1 ? 'swayCrisp2' : 'swayCrisp3';

            return (
              <g
                key={item.id}
                onClick={() => handleDropTshirt(item.id)}
                className="cursor-pointer group select-none"
                style={{
                  transformOrigin: `${item.cx}px ${item.cy}px`,
                  animation: `${swayAnim} ${3 + (index % 3) * 0.5}s ease-in-out infinite alternate`,
                }}
              >
                {/* Hanging Thread */}
                <line
                  x1={item.cx}
                  y1={item.cy}
                  x2={item.cx}
                  y2={item.cy + 28}
                  stroke="#2d3748"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                />

                {/* Hanger */}
                <path
                  d={`M${item.cx} ${item.cy + 28} Q${item.cx + 5} ${item.cy + 24} ${item.cx} ${item.cy + 20} Q${item.cx - 5} ${item.cy + 24} ${item.cx} ${item.cy + 28}`}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                />

                {/* Clickable Hover-Enlarged T-Shirt */}
                <g transform={`translate(${item.cx - 28}, ${item.cy + 28}) scale(1.3)`} className="transition-transform group-hover:scale-160 group-active:scale-120">
                  {/* T-shirt Silhouette */}
                  <path
                    d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z"
                    fill={item.color}
                    stroke={item.stroke}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    className="drop-shadow-lg"
                  />
                  {/* Chest Logo Box */}
                  <rect x="18" y="16" width="10" height="11" fill="rgba(255,255,255,0.25)" rx="1" />
                </g>

                {/* Points Tag Badge on Hover */}
                <text
                  x={item.cx}
                  y={item.cy + 95}
                  textAnchor="middle"
                  fill="#6ee7b7"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                >
                  +{item.points} PTS
                </text>
              </g>
            );
          })}
        </svg>

        {/* ======================================================== */}
        {/* --- FALLEN T-SHIRTS ACCUMULATED AT THE BOTTOM GROUND */}
        {/* ======================================================== */}
        <div className="absolute bottom-2 inset-x-0 h-16 pointer-events-none flex items-center justify-center">
          {tshirts.map((item) => {
            if (!item.isFallen) return null;
            return (
              <div
                key={item.id}
                className="absolute bottom-3 transform -translate-x-1/2 animate-bounce-short"
                style={{ left: `${item.fallenX}%` }}
              >
                <div className="relative group">
                  <svg width="40" height="40" viewBox="0 0 50 50" fill="none">
                    <path
                      d="M17 6 L9 14 L3 10 L0 17 L7 21 L7 44 L43 44 L43 21 L50 17 L47 10 L41 14 L33 6 C30 10 20 10 17 6 Z"
                      fill={item.color}
                      stroke={item.stroke}
                      strokeWidth="2"
                    />
                  </svg>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-emerald-400 font-bold bg-black/80 px-1 rounded">
                    ✓
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* --- BOTTOM FLOATING BAR (WINNER MODAL OR CONTROLS) */}
      {/* ======================================================== */}
      <div className="relative z-30 pb-6 px-4 flex flex-col items-center justify-center">
        {isAllPlucked ? (
          // Win Rewards Card
          <div className="max-w-md w-full bg-black/85 border-2 border-emerald-500/50 p-5 rounded-2xl text-center space-y-3 shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-scale-up">
            <div className="inline-flex items-center gap-2 text-amber-400 text-sm font-mono font-bold">
              <FiAward className="text-xl" /> ALL DROPS HARVESTED! ({score} PTS)
            </div>

            <div className="p-3 bg-emerald-950/70 border border-emerald-500/30 rounded-xl space-y-1">
              <p className="text-[11px] text-gray-300 font-mono">10% OFF Special Discount Unlocked:</p>
              <div className="text-lg font-mono font-black text-emerald-400 tracking-widest">
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
                {copiedCoupon ? '✓ COPIED TO CLIPBOARD' : 'Click to Copy Code'}
              </button>
            </div>

            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={handleRegrowTree}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs tracking-wider uppercase rounded-xl border border-white/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <FiRotateCcw /> Regrow Tree
              </button>
              <Link
                to="/"
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs tracking-wider uppercase rounded-xl shadow-lg transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <FiShoppingBag /> Shop Fresh Drops
              </Link>
            </div>
          </div>
        ) : (
          // Minimal Footer Actions
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs tracking-widest uppercase rounded-full shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <FiShoppingBag className="text-sm" />
              Continue Shopping
            </Link>

            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 text-white font-bold text-xs tracking-widest uppercase rounded-full border border-white/10 transition-all cursor-pointer"
            >
              <FiArrowLeft className="text-sm" />
              Go Back
            </button>
          </div>
        )}
      </div>

      {/* Ultra Lightweight CSS Keyframes (Zero CPU Load) */}
      <style>{`
        @keyframes swayCrisp1 {
          0% { transform: rotate(-14deg); }
          100% { transform: rotate(16deg); }
        }
        @keyframes swayCrisp2 {
          0% { transform: rotate(16deg); }
          100% { transform: rotate(-14deg); }
        }
        @keyframes swayCrisp3 {
          0% { transform: rotate(-10deg); }
          100% { transform: rotate(14deg); }
        }
        @keyframes bounceShort {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

export default NotFound;

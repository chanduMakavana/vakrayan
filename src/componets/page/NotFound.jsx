import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag, FiAward, FiPlay, FiRotateCcw } from 'react-icons/fi';

const TSHIRT_STYLES = [
  { id: 'black', color: '#18181b', stroke: '#3f3f46', name: 'Oversized Noir', points: 10 },
  { id: 'emerald', color: '#047857', stroke: '#064e3b', name: 'Vakrayan Emerald', points: 20 },
  { id: 'gold', color: '#09090b', stroke: '#d4af37', name: 'Golden Anime Drop', points: 50 },
  { id: 'blue', color: '#2563eb', stroke: '#1d4ed8', name: 'Acid Wash Blue', points: 15 },
  { id: 'red', color: '#e11d48', stroke: '#9f1239', name: 'Crimson Heavyweight', points: 25 },
];

function MiniTshirtSVG({ color = '#047857', stroke = '#064e3b', size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17 6 L9 14 L3 10 L0 17 L7 21 L7 44 L43 44 L43 21 L50 17 L47 10 L41 14 L33 6 C30 10 20 10 17 6 Z"
        fill={color}
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="20" y="18" width="10" height="12" fill="rgba(255,255,255,0.2)" rx="1" />
    </svg>
  );
}

function NotFound() {
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [gameOver, setGameOver] = useState(false);
  const [basketPos, setBasketPos] = useState(50); // percentage 0 to 100
  const [fallingItems, setFallingItems] = useState([]);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [harvestCount, setHarvestCount] = useState(0);

  const gameAreaRef = useRef(null);

  // Start the mini game
  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setTimeLeft(20);
    setGameOver(false);
    setFallingItems([]);
    setHarvestCount(0);
  };

  // Keyboard and Touch Movement for Basket
  useEffect(() => {
    if (!gameActive) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        setBasketPos((prev) => Math.max(5, prev - 7));
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        setBasketPos((prev) => Math.min(95, prev + 7));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameActive]);

  // Mouse & Touch Move over game screen
  const handlePointerMove = (e) => {
    if (!gameActive || !gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const relativeX = ((x - rect.left) / rect.width) * 100;
    setBasketPos(Math.max(5, Math.min(95, relativeX)));
  };

  // Game timer countdown
  useEffect(() => {
    if (!gameActive || timeLeft <= 0) {
      if (gameActive && timeLeft <= 0) {
        setGameActive(false);
        setGameOver(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive, timeLeft]);

  // Spawn falling T-Shirts loop
  useEffect(() => {
    if (!gameActive) return;

    const spawner = setInterval(() => {
      const randomStyle = TSHIRT_STYLES[Math.floor(Math.random() * TSHIRT_STYLES.length)];
      const newItem = {
        id: Math.random(),
        x: Math.random() * 80 + 10, // 10% to 90%
        y: 0,
        speed: Math.random() * 1.5 + 2.5,
        style: randomStyle,
      };
      setFallingItems((prev) => [...prev, newItem]);
    }, 600);

    return () => clearInterval(spawner);
  }, [gameActive]);

  // Physics animation loop for falling items & collision detection
  useEffect(() => {
    if (!gameActive) return;

    const physicsLoop = setInterval(() => {
      setFallingItems((prev) => {
        const next = [];
        for (const item of prev) {
          const nextY = item.y + item.speed;

          // Check if caught by basket (around bottom 80% to 92% and x within range)
          if (nextY >= 78 && nextY <= 88) {
            const distance = Math.abs(item.x - basketPos);
            if (distance < 8) {
              // Caught!
              setScore((s) => s + item.style.points);
              setHarvestCount((c) => c + 1);
              continue; // Caught item disappears
            }
          }

          // If not fallen off bottom
          if (nextY < 95) {
            next.push({ ...item, y: nextY });
          }
        }
        return next;
      });
    }, 30);

    return () => clearInterval(physicsLoop);
  }, [gameActive, basketPos]);

  // Handle clicking swaying T-Shirts directly on the tree (Tree Pluck Game)
  const handlePluckTshirt = (points = 10) => {
    setScore((s) => s + points);
    setHarvestCount((h) => h + 1);
  };

  return (
    <div 
      ref={gameAreaRef}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      className="w-full min-h-screen relative overflow-hidden bg-[#061009] text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-black touch-none select-none"
    >
      {/* Background Distressed Concrete Atmosphere */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: `url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#020503] via-transparent to-[#020804] pointer-events-none" />

      {/* ======================================================== */}
      {/* --- GRAND BACKGROUND TREE WITH GROWING & SWAYING PHYSICS */}
      {/* ======================================================== */}
      <div className="absolute inset-0 w-full h-full pointer-events-none flex items-end justify-center overflow-hidden">
        <svg
          viewBox="0 0 1200 800"
          className="w-full h-full object-cover object-bottom"
          fill="none"
          preserveAspectRatio="xMidYMax meet"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="grandTrunkGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1a110a" />
              <stop offset="40%" stopColor="#3d2817" />
              <stop offset="85%" stopColor="#5c3d23" />
              <stop offset="100%" stopColor="#2e7d32" />
            </linearGradient>

            <linearGradient id="grandFoliage1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="40%" stopColor="#059669" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>

            <linearGradient id="grandFoliage2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="60%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            
            <radialGradient id="sunGlow" cx="50%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Glowing Aura */}
          <circle cx="600" cy="360" r="400" fill="url(#sunGlow)" />

          {/* Ground Soil */}
          <ellipse cx="600" cy="790" rx="500" ry="35" fill="#047857" opacity="0.3" />
          <ellipse cx="600" cy="780" rx="360" ry="22" fill="#1a110a" opacity="0.7" />

          {/* Tree Structure */}
          <g style={{ transformOrigin: '600px 780px', animation: 'treeGrow 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
            
            {/* Trunk */}
            <path
              d="M565 780 C570 660 555 520 575 430 C585 390 592 330 588 270 C608 330 615 390 625 430 C645 520 630 660 635 780 Z"
              fill="url(#grandTrunkGrad)"
            />

            {/* Branches */}
            <path d="M575 500 C505 460 405 440 280 380 C260 370 275 355 300 365 C390 400 480 425 580 450" stroke="url(#grandTrunkGrad)" strokeWidth="16" strokeLinecap="round" />
            <path d="M625 480 C695 440 795 420 920 360 C940 350 925 335 900 345 C810 380 720 405 620 430" stroke="url(#grandTrunkGrad)" strokeWidth="16" strokeLinecap="round" />
            <path d="M585 370 C535 310 455 270 375 230" stroke="#3d2817" strokeWidth="10" strokeLinecap="round" />
            <path d="M615 350 C665 290 745 250 825 210" stroke="#3d2817" strokeWidth="10" strokeLinecap="round" />
            <path d="M595 280 C570 200 520 150 470 90" stroke="#2e7d32" strokeWidth="7" strokeLinecap="round" />
            <path d="M605 270 C630 190 680 140 730 80" stroke="#2e7d32" strokeWidth="7" strokeLinecap="round" />
            <path d="M600 240 L600 70" stroke="#2e7d32" strokeWidth="8" strokeLinecap="round" />

            {/* Foliage Blooms */}
            <g style={{ transformOrigin: '600px 240px', animation: 'foliageBloom 2.6s ease-out forwards' }}>
              <circle cx="600" cy="140" r="115" fill="url(#grandFoliage1)" opacity="0.95" />
              <circle cx="600" cy="85" r="90" fill="url(#grandFoliage2)" opacity="0.9" />
              <circle cx="420" cy="240" r="100" fill="url(#grandFoliage1)" opacity="0.95" />
              <circle cx="350" cy="190" r="80" fill="url(#grandFoliage2)" opacity="0.9" />
              <circle cx="270" cy="340" r="95" fill="url(#grandFoliage1)" opacity="0.95" />
              <circle cx="780" cy="220" r="100" fill="url(#grandFoliage1)" opacity="0.95" />
              <circle cx="850" cy="170" r="80" fill="url(#grandFoliage2)" opacity="0.9" />
              <circle cx="930" cy="320" r="95" fill="url(#grandFoliage1)" opacity="0.95" />
            </g>

            {/* Swaying T-Shirts on Branches (Interactive Clickable Plucking) */}
            {!gameActive && (
              <>
                {/* 1. Left Lower Tee */}
                <g 
                  className="pointer-events-auto cursor-pointer group"
                  onClick={() => handlePluckTshirt(15)}
                  style={{ transformOrigin: '230px 335px', animation: 'sway1 3.5s ease-in-out infinite alternate 1.8s' }}
                >
                  <line x1="230" y1="335" x2="230" y2="365" stroke="#1c130c" strokeWidth="2.5" strokeDasharray="3 2" />
                  <g transform="translate(198, 365) scale(1.4)" className="transition-transform group-hover:scale-150">
                    <path d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" strokeLinejoin="round" />
                    <rect x="18" y="16" width="10" height="12" fill="#10b981" rx="1" />
                  </g>
                </g>

                {/* 2. Left Upper Emerald Tee */}
                <g 
                  className="pointer-events-auto cursor-pointer group"
                  onClick={() => handlePluckTshirt(25)}
                  style={{ transformOrigin: '360px 250px', animation: 'sway2 3s ease-in-out infinite alternate 2s' }}
                >
                  <line x1="360" y1="250" x2="360" y2="285" stroke="#1c130c" strokeWidth="2.5" />
                  <g transform="translate(325, 285) scale(1.5)" className="transition-transform group-hover:scale-150">
                    <path d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z" fill="#047857" stroke="#064e3b" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M19 18 L23 26 L27 18" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" />
                  </g>
                </g>

                {/* 3. Golden Anime Tee in Center */}
                <g 
                  className="pointer-events-auto cursor-pointer group"
                  onClick={() => handlePluckTshirt(50)}
                  style={{ transformOrigin: '600px 180px', animation: 'sway3 3.2s ease-in-out infinite alternate 2.2s' }}
                >
                  <line x1="600" y1="180" x2="600" y2="215" stroke="#1c130c" strokeWidth="2.5" />
                  <g transform="translate(562, 215) scale(1.6)" className="transition-transform group-hover:scale-150">
                    <path d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z" fill="#09090b" stroke="#d4af37" strokeWidth="1.8" strokeLinejoin="round" />
                    <circle cx="23" cy="22" r="5.5" fill="#e11d48" />
                  </g>
                </g>

                {/* 4. Right Upper Vintage Tee */}
                <g 
                  className="pointer-events-auto cursor-pointer group"
                  onClick={() => handlePluckTshirt(20)}
                  style={{ transformOrigin: '820px 240px', animation: 'sway1 3.8s ease-in-out infinite alternate 2.4s' }}
                >
                  <line x1="820" y1="240" x2="820" y2="275" stroke="#1c130c" strokeWidth="2.5" strokeDasharray="3 2" />
                  <g transform="translate(788, 275) scale(1.45)" className="transition-transform group-hover:scale-150">
                    <path d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z" fill="#f4f4f5" stroke="#d4d4d8" strokeWidth="1.5" strokeLinejoin="round" />
                    <circle cx="23" cy="21" r="5" fill="#e11d48" />
                  </g>
                </g>

                {/* 5. Right Lower Acid Wash Tee */}
                <g 
                  className="pointer-events-auto cursor-pointer group"
                  onClick={() => handlePluckTshirt(15)}
                  style={{ transformOrigin: '960px 320px', animation: 'sway2 3.4s ease-in-out infinite alternate 2.6s' }}
                >
                  <line x1="960" y1="320" x2="960" y2="355" stroke="#1c130c" strokeWidth="2.5" />
                  <g transform="translate(928, 355) scale(1.4)" className="transition-transform group-hover:scale-150">
                    <path d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1.5" strokeLinejoin="round" />
                  </g>
                </g>
              </>
            )}

          </g>
        </svg>
      </div>

      {/* ======================================================== */}
      {/* --- TOP BAR (LOGO, BADGE & GAME STATS) */}
      {/* ======================================================== */}
      <div className="relative z-30 pt-6 px-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <Link to="/" className="text-xl md:text-2xl font-serif font-black tracking-[0.3em] uppercase text-white/90 hover:text-emerald-400 transition-colors">
          VAKRAYAN
        </Link>
        
        {gameActive ? (
          <div className="flex items-center gap-4 bg-black/60 backdrop-blur-md px-5 py-2 rounded-full border border-emerald-500/40">
            <div className="text-xs font-mono text-emerald-400 font-bold">
              SCORE: <span className="text-base text-white font-black">{score}</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="text-xs font-mono text-amber-400 font-bold">
              TIME: <span className="text-base text-white font-black">{timeLeft}s</span>
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono tracking-widest uppercase backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            404 // DROP EXPIRED
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* --- GAMEPLAY ACTIVE MODE: FALLING ITEMS & BASKET */}
      {/* ======================================================== */}
      {gameActive && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Falling T-Shirt Apparel Pieces */}
          {fallingItems.map((item) => (
            <div
              key={item.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 drop-shadow-xl animate-spin-slow"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transition: 'top 0.03s linear',
              }}
            >
              <MiniTshirtSVG color={item.style.color} stroke={item.style.stroke} size={42} />
              <div className="text-[10px] font-mono text-center text-emerald-300 font-bold -mt-1 bg-black/50 rounded px-1">
                +{item.style.points}
              </div>
            </div>
          ))}

          {/* Player Shopping Bag / Basket */}
          <div
            className="absolute bottom-16 transform -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-75"
            style={{ left: `${basketPos}%` }}
          >
            <div className="w-20 h-14 bg-gradient-to-b from-emerald-500 to-emerald-700 rounded-b-2xl rounded-t-sm border-2 border-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center relative">
              <FiShoppingBag className="text-white text-2xl animate-bounce" />
              {/* Handle */}
              <div className="absolute -top-4 w-10 h-6 border-2 border-emerald-300 rounded-t-full" />
            </div>
            <div className="text-[10px] font-mono text-emerald-300 font-black tracking-widest uppercase mt-1 bg-black/60 px-2 py-0.5 rounded-full">
              CATCH DROPS
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* --- DEFAULT / GAME OVER MODAL CARD (BOTTOM CENTER) */}
      {/* ======================================================== */}
      {!gameActive && (
        <div className="relative z-30 my-auto px-4 py-4 flex flex-col items-center justify-center text-center">
          <div className="max-w-lg w-full bg-black/60 backdrop-blur-2xl border border-emerald-500/20 p-6 md:p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-4">
            
            {gameOver ? (
              // Game Over / Reward Card
              <div className="space-y-4 animate-scale-up">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center text-2xl animate-pulse">
                  <FiAward />
                </div>
                <div>
                  <h4 className="text-[10px] font-mono tracking-[0.4em] text-emerald-400 uppercase font-bold">
                    HARVEST COMPLETE!
                  </h4>
                  <h2 className="text-2xl md:text-3xl font-serif font-black text-white uppercase">
                    You Scored: {score} PTS!
                  </h2>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 text-center space-y-1">
                  <p className="text-[11px] text-gray-300 font-mono">Special Streetwear Discount Unlocked:</p>
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
                    {copiedCoupon ? '✓ COPIED TO CLIPBOARD' : 'Click to Copy Code (10% OFF)'}
                  </button>
                </div>

                <div className="flex gap-3 justify-center pt-1">
                  <button
                    onClick={startGame}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs tracking-widest uppercase rounded-full border border-white/20 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <FiRotateCcw /> Play Again
                  </button>
                  <Link
                    to="/"
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs tracking-widest uppercase rounded-full shadow-lg shadow-emerald-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <FiShoppingBag /> Use Discount
                  </Link>
                </div>
              </div>
            ) : (
              // Default 404 Landing Card
              <>
                <div className="space-y-1">
                  <h4 className="text-[10px] font-mono tracking-[0.5em] text-emerald-400 font-bold uppercase">
                    // ARCHIVE UNREACHABLE
                  </h4>
                  <h1 className="text-2xl md:text-4xl font-serif font-black tracking-wider text-white uppercase">
                    OUT OF THE BRANCHES
                  </h1>
                </div>

                <p className="text-xs md:text-sm text-gray-300/80 max-w-sm mx-auto leading-relaxed font-light">
                  This drop is not found! Pluck the swinging t-shirts above on tree branches or play the drop catch game!
                </p>

                {harvestCount > 0 && (
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 animate-pulse">
                    🍃 Harvested: {harvestCount} T-Shirts ({score} pts)
                  </div>
                )}

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={startGame}
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs tracking-widest uppercase rounded-full shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <FiPlay className="text-sm fill-black" />
                    Catch Drops Mini-Game
                  </button>

                  <Link 
                    to="/" 
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs tracking-widest uppercase rounded-full border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                  >
                    <FiArrowLeft className="text-sm" />
                    Back to Store
                  </Link>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* --- FOOTER INSTRUCTIONS */}
      {/* ======================================================== */}
      <div className="relative z-30 pb-4 text-center text-[10px] text-gray-500 font-mono tracking-widest uppercase">
        {gameActive ? '👈 Slide Finger or Drag Mouse to Move Shopping Bag 👉' : 'Tip: Click or Tap on Tree T-Shirts to Pluck Fresh Drops • VAKRAYAN LABS'}
      </div>

      {/* Physics CSS */}
      <style>{`
        @keyframes treeGrow {
          0% { transform: scaleY(0) scaleX(0.2); opacity: 0; }
          45% { transform: scaleY(0.7) scaleX(0.85); opacity: 0.85; }
          100% { transform: scaleY(1) scaleX(1); opacity: 1; }
        }
        @keyframes foliageBloom {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(0.4); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes sway1 {
          0% { transform: rotate(-16deg); }
          100% { transform: rotate(18deg); }
        }
        @keyframes sway2 {
          0% { transform: rotate(18deg); }
          100% { transform: rotate(-16deg); }
        }
        @keyframes sway3 {
          0% { transform: rotate(-12deg); }
          100% { transform: rotate(15deg); }
        }
      `}</style>
    </div>
  );
}

export default NotFound;

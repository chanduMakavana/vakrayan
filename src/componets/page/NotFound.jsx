import { Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingBag } from 'react-icons/fi';

function FullScreenGrowingTree() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none flex items-end justify-center overflow-hidden">
      <svg
        viewBox="0 0 1200 800"
        className="w-full h-[90vh] md:h-full max-h-[900px] object-cover object-bottom"
        fill="none"
        preserveAspectRatio="xMidYMax meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="grandTrunkGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1c130c" />
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

          <linearGradient id="grandFoliageGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          
          <radialGradient id="sunGlow" cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Back Glow */}
        <circle cx="600" cy="360" r="380" fill="url(#sunGlow)" />

        {/* Ground Mound / Island */}
        <g className="animate-fade-in opacity-90">
          <ellipse cx="600" cy="785" rx="460" ry="40" fill="#064e3b" opacity="0.35" />
          <ellipse cx="600" cy="775" rx="340" ry="25" fill="#1c130c" opacity="0.6" />
          <path d="M450 770 Q300 780 180 790" stroke="#3d2817" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
          <path d="M750 770 Q900 780 1020 790" stroke="#3d2817" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
        </g>

        {/* Giant Majestic Tree with Full Screen Grow Animation */}
        <g style={{ transformOrigin: '600px 770px', animation: 'grandTreeGrow 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
          
          {/* Main Massive Trunk */}
          <path
            d="M570 770 C575 660 560 520 580 430 C588 390 595 330 590 270 C605 330 612 390 620 430 C640 520 625 660 630 770 Z"
            fill="url(#grandTrunkGrad)"
          />

          {/* Primary Left Massive Branch */}
          <path
            d="M580 500 C510 460 410 440 290 380 C270 370 285 355 310 365 C400 400 490 425 585 450"
            stroke="url(#grandTrunkGrad)"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Primary Right Massive Branch */}
          <path
            d="M620 480 C690 440 790 420 910 360 C930 350 915 335 890 345 C800 380 710 405 615 430"
            stroke="url(#grandTrunkGrad)"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Secondary Sub-Branches */}
          <path d="M590 370 C540 310 460 270 380 230" stroke="#3d2817" strokeWidth="10" strokeLinecap="round" />
          <path d="M610 350 C660 290 740 250 820 210" stroke="#3d2817" strokeWidth="10" strokeLinecap="round" />
          <path d="M595 280 C570 200 520 150 470 90" stroke="#2e7d32" strokeWidth="7" strokeLinecap="round" />
          <path d="M605 270 C630 190 680 140 730 80" stroke="#2e7d32" strokeWidth="7" strokeLinecap="round" />
          <path d="M600 240 L600 70" stroke="#2e7d32" strokeWidth="8" strokeLinecap="round" />

          {/* Left Wing Branchlets */}
          <path d="M350 400 C300 360 240 350 180 320" stroke="#3d2817" strokeWidth="7" strokeLinecap="round" />
          <path d="M440 430 C400 380 350 360 290 320" stroke="#3d2817" strokeWidth="7" strokeLinecap="round" />

          {/* Right Wing Branchlets */}
          <path d="M850 380 C900 340 960 330 1020 300" stroke="#3d2817" strokeWidth="7" strokeLinecap="round" />
          <path d="M760 410 C800 360 850 340 910 300" stroke="#3d2817" strokeWidth="7" strokeLinecap="round" />

          {/* Grand Foliage Canopy Clouds with Lush Blooming */}
          <g style={{ transformOrigin: '600px 240px', animation: 'grandFoliageBloom 2.6s ease-out forwards' }}>
            {/* Center Crown */}
            <circle cx="600" cy="140" r="110" fill="url(#grandFoliage1)" opacity="0.95" />
            <circle cx="600" cy="90" r="85" fill="url(#grandFoliage2)" opacity="0.9" />
            <circle cx="600" cy="190" r="95" fill="url(#grandFoliage1)" opacity="0.8" />

            {/* Left Giant Foliage */}
            <circle cx="420" cy="240" r="95" fill="url(#grandFoliage1)" opacity="0.95" />
            <circle cx="360" cy="200" r="75" fill="url(#grandFoliage2)" opacity="0.9" />
            <circle cx="280" cy="340" r="90" fill="url(#grandFoliage1)" opacity="0.95" />
            <circle cx="200" cy="310" r="70" fill="url(#grandFoliage2)" opacity="0.85" />

            {/* Right Giant Foliage */}
            <circle cx="780" cy="220" r="95" fill="url(#grandFoliage1)" opacity="0.95" />
            <circle cx="840" cy="180" r="75" fill="url(#grandFoliage2)" opacity="0.9" />
            <circle cx="920" cy="320" r="90" fill="url(#grandFoliage1)" opacity="0.95" />
            <circle cx="1000" cy="290" r="70" fill="url(#grandFoliage2)" opacity="0.85" />

            {/* Aesthetic Gold/Emerald Highlights */}
            <circle cx="510" cy="130" r="50" fill="url(#grandFoliageGold)" opacity="0.4" />
            <circle cx="690" cy="120" r="50" fill="url(#grandFoliageGold)" opacity="0.4" />
            <circle cx="600" cy="60" r="45" fill="#a7f3d0" opacity="0.6" />
          </g>

          {/* ============================================================ */}
          {/* --- SWAYING APPAREL T-SHIRT FRUITS (FULL SCREEN MAJESTIC) --- */}
          {/* ============================================================ */}

          {/* 1. Left Low Branch (Black Oversized Tee) */}
          <g 
            className="pointer-events-auto cursor-pointer"
            style={{
              transformOrigin: '230px 335px',
              animation: 'swayLong1 3.8s ease-in-out infinite alternate 1.8s, sproutPop 1s ease-out 1.2s both'
            }}
          >
            <line x1="230" y1="335" x2="230" y2="365" stroke="#1c130c" strokeWidth="2.5" strokeDasharray="3 2" />
            <path d="M230 365 Q235 360 230 355 Q225 360 230 365" fill="none" stroke="#d4af37" strokeWidth="2" />
            <g transform="translate(198, 365) scale(1.4)">
              <path
                d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z"
                fill="#18181b"
                stroke="#3f3f46"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <rect x="18" y="16" width="10" height="12" fill="#10b981" rx="1" />
              <line x1="20" y1="21" x2="26" y2="21" stroke="#ffffff" strokeWidth="1.2" />
            </g>
          </g>

          {/* 2. Left Mid Branch (Signature Emerald Tee) */}
          <g 
            className="pointer-events-auto cursor-pointer"
            style={{
              transformOrigin: '360px 250px',
              animation: 'swayLong2 3.2s ease-in-out infinite alternate 2s, sproutPop 1s ease-out 1.4s both'
            }}
          >
            <line x1="360" y1="250" x2="360" y2="285" stroke="#1c130c" strokeWidth="2.5" />
            <g transform="translate(325, 285) scale(1.5)">
              <path
                d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z"
                fill="#047857"
                stroke="#064e3b"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M19 18 L23 26 L27 18" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>

          {/* 3. Center Crown (Special Gold Anime Graphic Tee) */}
          <g 
            className="pointer-events-auto cursor-pointer"
            style={{
              transformOrigin: '600px 180px',
              animation: 'swayLong3 3.5s ease-in-out infinite alternate 2.2s, sproutPop 1s ease-out 1.6s both'
            }}
          >
            <line x1="600" y1="180" x2="600" y2="215" stroke="#1c130c" strokeWidth="2.5" />
            <g transform="translate(562, 215) scale(1.65)">
              <path
                d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z"
                fill="#09090b"
                stroke="#d4af37"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              {/* Golden Japanese Kanji / Crest */}
              <circle cx="23" cy="22" r="5.5" fill="#e11d48" />
              <rect x="21" y="29" width="4" height="6" fill="#fef08a" rx="0.5" />
            </g>
          </g>

          {/* 4. Right Mid Branch (Off-White Vintage Boxy Tee) */}
          <g 
            className="pointer-events-auto cursor-pointer"
            style={{
              transformOrigin: '820px 240px',
              animation: 'swayLong1 4s ease-in-out infinite alternate 2.4s, sproutPop 1s ease-out 1.7s both'
            }}
          >
            <line x1="820" y1="240" x2="820" y2="275" stroke="#1c130c" strokeWidth="2.5" strokeDasharray="3 2" />
            <g transform="translate(788, 275) scale(1.45)">
              <path
                d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z"
                fill="#f4f4f5"
                stroke="#d4d4d8"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="23" cy="21" r="5" fill="#e11d48" />
            </g>
          </g>

          {/* 5. Right Low Branch (Cobalt Acid Wash Blue Tee) */}
          <g 
            className="pointer-events-auto cursor-pointer"
            style={{
              transformOrigin: '960px 320px',
              animation: 'swayLong2 3.6s ease-in-out infinite alternate 2.6s, sproutPop 1s ease-out 1.9s both'
            }}
          >
            <line x1="960" y1="320" x2="960" y2="355" stroke="#1c130c" strokeWidth="2.5" />
            <g transform="translate(928, 355) scale(1.4)">
              <path
                d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z"
                fill="#2563eb"
                stroke="#1d4ed8"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <rect x="18" y="17" width="10" height="11" fill="#ffffff" rx="1" />
            </g>
          </g>

          {/* 6. Extra Left Sub-Fruit (Crimson Red Heavyweight Tee) */}
          <g 
            className="pointer-events-auto cursor-pointer"
            style={{
              transformOrigin: '480px 200px',
              animation: 'swayLong3 3s ease-in-out infinite alternate 2.1s, sproutPop 1s ease-out 2s both'
            }}
          >
            <line x1="480" y1="200" x2="480" y2="230" stroke="#1c130c" strokeWidth="2" />
            <g transform="translate(454, 230) scale(1.15)">
              <path
                d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z"
                fill="#e11d48"
                stroke="#9f1239"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </g>
          </g>

          {/* 7. Extra Right Sub-Fruit (Minimalist Lavender Tee) */}
          <g 
            className="pointer-events-auto cursor-pointer"
            style={{
              transformOrigin: '710px 190px',
              animation: 'swayLong1 3.4s ease-in-out infinite alternate 2.3s, sproutPop 1s ease-out 2.1s both'
            }}
          >
            <line x1="710" y1="190" x2="710" y2="220" stroke="#1c130c" strokeWidth="2" />
            <g transform="translate(684, 220) scale(1.15)">
              <path
                d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z"
                fill="#a855f7"
                stroke="#7e22ce"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </g>
          </g>
        </g>
      </svg>

      {/* Physics CSS for Full-screen Organic Flow */}
      <style>{`
        @keyframes grandTreeGrow {
          0% {
            transform: scaleY(0) scaleX(0.2);
            opacity: 0;
          }
          45% {
            transform: scaleY(0.7) scaleX(0.85);
            opacity: 0.85;
          }
          100% {
            transform: scaleY(1) scaleX(1);
            opacity: 1;
          }
        }

        @keyframes grandFoliageBloom {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(0.4);
            opacity: 0.6;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes sproutPop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          70% {
            transform: scale(1.3);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes swayLong1 {
          0% { transform: rotate(-16deg); }
          50% { transform: rotate(5deg); }
          100% { transform: rotate(18deg); }
        }

        @keyframes swayLong2 {
          0% { transform: rotate(18deg); }
          50% { transform: rotate(-4deg); }
          100% { transform: rotate(-16deg); }
        }

        @keyframes swayLong3 {
          0% { transform: rotate(-12deg); }
          50% { transform: rotate(7deg); }
          100% { transform: rotate(15deg); }
        }
      `}</style>
    </div>
  );
}

function NotFound() {
  return (
    <div className="w-full min-h-screen relative overflow-hidden bg-[#070e0a] text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      
      {/* Background Ambience & Distressed Texture */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: `url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#040806] via-[#07130c]/80 to-[#020503] pointer-events-none" />

      {/* FULL SCREEN GROWING TREE WITH SWAYING APPAREL T-SHIRTS */}
      <FullScreenGrowingTree />

      {/* Top Header Badge / Navigation Indicator */}
      <div className="relative z-30 pt-8 px-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <Link to="/" className="text-xl md:text-2xl font-serif font-black tracking-[0.3em] uppercase text-white/90 hover:text-emerald-400 transition-colors">
          VAKRAYAN
        </Link>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono tracking-widest uppercase backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          404 // DROP EXPIRED
        </div>
      </div>

      {/* Floating Modern Frosted Glass Card in Center / Bottom */}
      <div className="relative z-30 my-auto px-4 py-8 flex flex-col items-center justify-center text-center">
        <div className="max-w-xl w-full bg-black/40 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl space-y-6">
          
          <div className="space-y-2">
            <h4 className="text-[11px] font-mono tracking-[0.6em] text-emerald-400 font-bold uppercase">
              // ARCHIVE UNREACHABLE
            </h4>
            <h1 className="text-3xl md:text-5xl font-serif font-black tracking-wider text-white uppercase">
              OUT OF THE BRANCHES
            </h1>
          </div>

          <p className="text-sm md:text-base text-gray-300/80 max-w-md mx-auto leading-relaxed font-light">
            The streetwear piece you are hunting hasn't grown on our trees yet or was wiped from our active drops.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link 
              to="/" 
              className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs tracking-widest uppercase rounded-full shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <FiShoppingBag className="text-base" />
              Explore Active Drops
            </Link>
            
            <button 
              onClick={() => window.history.back()} 
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-bold text-xs tracking-widest uppercase rounded-full border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              <FiArrowLeft className="text-sm" />
              Go Back
            </button>
          </div>

        </div>
      </div>

      {/* Footer minimal signature */}
      <div className="relative z-30 pb-6 text-center text-[10px] text-gray-500 font-mono tracking-widest uppercase">
        VAKRAYAN APPAREL LABS • 2026
      </div>

    </div>
  );
}

export default NotFound;

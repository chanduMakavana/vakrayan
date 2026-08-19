import { Link } from 'react-router-dom';
import { FiArrowLeft, FiAlertTriangle } from 'react-icons/fi';

function GrowingTreeWithTshirts() {
  return (
    <div className="relative w-full max-w-[280px] h-[220px] mx-auto flex items-center justify-center overflow-visible select-none">
      <svg
        viewBox="0 0 300 240"
        className="w-full h-full drop-shadow-md"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="trunkGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#291e14" />
            <stop offset="60%" stopColor="#4a3525" />
            <stop offset="100%" stopColor="#2e7d32" />
          </linearGradient>

          <linearGradient id="foliageGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="50%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#0f5128" />
          </linearGradient>
          
          <linearGradient id="foliageGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#166534" />
          </linearGradient>
        </defs>

        {/* Soil Base with Growing Roots */}
        <g className="animate-fade-in opacity-80">
          <ellipse cx="150" cy="225" rx="55" ry="7" fill="#1b4332" opacity="0.25" />
          <ellipse cx="150" cy="223" rx="38" ry="4" fill="#3e2723" opacity="0.4" />
          <path d="M140 220 Q120 226 105 228" stroke="#3e2723" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M160 220 Q180 226 195 228" stroke="#3e2723" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Tree Trunk & Branches with Grow/Scale Animation */}
        <g className="origin-bottom transform transition-all" style={{ transformOrigin: '150px 220px', animation: 'treeGrow 2s cubic-bezier(0.34, 1.4, 0.64, 1) forwards' }}>
          {/* Main Trunk */}
          <path
            d="M144 220 C144 185 142 140 148 115 C150 102 153 90 151 75 C149 90 152 102 154 115 C160 140 158 185 158 220 Z"
            fill="url(#trunkGrad)"
          />

          {/* Left Large Branch */}
          <path
            d="M148 135 C132 125 110 120 85 105 C80 102 85 98 92 101 C112 110 130 116 148 123"
            stroke="url(#trunkGrad)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Right Large Branch */}
          <path
            d="M154 125 C172 115 195 112 218 95 C223 92 220 88 212 90 C192 98 174 105 154 113"
            stroke="url(#trunkGrad)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Upper Sub-branches */}
          <path
            d="M150 95 C138 80 120 72 108 58"
            stroke="#2e7d32"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M152 90 C165 78 182 70 196 55"
            stroke="#2e7d32"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M151 75 C151 55 149 42 150 28"
            stroke="#2e7d32"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Lush Green Foliage Clouds with Soft Blooming Pop */}
          <g style={{ transformOrigin: '150px 70px', animation: 'foliageBloom 2.4s ease-out forwards' }}>
            {/* Center Main Canopy */}
            <circle cx="150" cy="50" r="32" fill="url(#foliageGrad1)" opacity="0.95" />
            <circle cx="150" cy="35" r="24" fill="url(#foliageGrad2)" opacity="0.9" />
            
            {/* Left Foliage */}
            <circle cx="100" cy="85" r="28" fill="url(#foliageGrad1)" opacity="0.95" />
            <circle cx="90" cy="75" r="20" fill="url(#foliageGrad2)" opacity="0.85" />
            
            {/* Right Foliage */}
            <circle cx="202" cy="78" r="28" fill="url(#foliageGrad1)" opacity="0.95" />
            <circle cx="212" cy="68" r="20" fill="url(#foliageGrad2)" opacity="0.85" />

            {/* Little aesthetic leaf clusters */}
            <circle cx="125" cy="55" r="16" fill="#86efac" opacity="0.7" />
            <circle cx="178" cy="52" r="16" fill="#86efac" opacity="0.7" />
            <circle cx="150" cy="68" r="18" fill="#14532d" opacity="0.5" />
          </g>

          {/* --- T-SHIRT FRUITS (SWAYING IN THE BREEZE) --- */}
          
          {/* T-Shirt 1: Left Branch (Black Oversized Tee) */}
          <g 
            className="cursor-pointer transition-transform hover:scale-125"
            style={{
              transformOrigin: '88px 105px',
              animation: 'swayTshirt1 3.2s ease-in-out infinite alternate 1.6s, fruitSprout 1s ease-out 1.2s both'
            }}
          >
            {/* Thread / Stem hanger */}
            <line x1="88" y1="105" x2="88" y2="114" stroke="#1b4332" strokeWidth="1.5" strokeDasharray="1.5 1" />
            {/* Hanger Hook */}
            <path d="M88 114 Q91 112 88 110 Q85 112 88 114" fill="none" stroke="#d4af37" strokeWidth="1.2" />
            {/* Miniature T-Shirt Shape */}
            <g transform="translate(73, 114) scale(0.65)">
              {/* T-shirt Silhouette */}
              <path
                d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z"
                fill="#18181b"
                stroke="#3f3f46"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              {/* VAKRAYAN Minimal Box Graphic on Tee */}
              <rect x="18" y="16" width="10" height="12" fill="#10b981" rx="1" />
              <line x1="20" y1="21" x2="26" y2="21" stroke="#ffffff" strokeWidth="1.2" />
            </g>
          </g>

          {/* T-Shirt 2: Center Top (Emerald / Forest Green Signature Tee) */}
          <g 
            className="cursor-pointer transition-transform hover:scale-125"
            style={{
              transformOrigin: '150px 72px',
              animation: 'swayTshirt2 2.8s ease-in-out infinite alternate 1.8s, fruitSprout 1s ease-out 1.5s both'
            }}
          >
            {/* Thread / Stem */}
            <line x1="150" y1="72" x2="150" y2="82" stroke="#1b4332" strokeWidth="1.5" />
            {/* Miniature T-Shirt */}
            <g transform="translate(134, 82) scale(0.72)">
              <path
                d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z"
                fill="#047857"
                stroke="#064e3b"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              {/* Golden 'V' Logo */}
              <path d="M19 18 L23 26 L27 18" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>

          {/* T-Shirt 3: Right Branch (Off-White / Beige Oversized Tee) */}
          <g 
            className="cursor-pointer transition-transform hover:scale-125"
            style={{
              transformOrigin: '210px 96px',
              animation: 'swayTshirt3 3.6s ease-in-out infinite alternate 2s, fruitSprout 1s ease-out 1.8s both'
            }}
          >
            {/* Thread / Stem */}
            <line x1="210" y1="96" x2="210" y2="106" stroke="#1b4332" strokeWidth="1.5" strokeDasharray="1.5 1" />
            {/* Miniature T-Shirt */}
            <g transform="translate(196, 106) scale(0.62)">
              <path
                d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z"
                fill="#f4f4f5"
                stroke="#d4d4d8"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              {/* Anime Japanese Graphic / Red Dot on Chest */}
              <circle cx="23" cy="22" r="4.5" fill="#e11d48" />
            </g>
          </g>

          {/* T-Shirt 4: Little Mini Tee on Mid-Left */}
          <g 
            className="cursor-pointer"
            style={{
              transformOrigin: '122px 90px',
              animation: 'swayTshirt1 2.5s ease-in-out infinite alternate 1.9s, fruitSprout 1s ease-out 2s both'
            }}
          >
            <line x1="122" y1="90" x2="122" y2="98" stroke="#1b4332" strokeWidth="1.2" />
            <g transform="translate(111, 98) scale(0.48)">
              <path
                d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z"
                fill="#3b82f6"
                stroke="#1d4ed8"
                strokeWidth="1.5"
              />
            </g>
          </g>

          {/* T-Shirt 5: Little Mini Tee on Mid-Right */}
          <g 
            className="cursor-pointer"
            style={{
              transformOrigin: '180px 88px',
              animation: 'swayTshirt2 3.1s ease-in-out infinite alternate 2.2s, fruitSprout 1s ease-out 2.1s both'
            }}
          >
            <line x1="180" y1="88" x2="180" y2="96" stroke="#1b4332" strokeWidth="1.2" />
            <g transform="translate(169, 96) scale(0.48)">
              <path
                d="M17 5 L9 13 L3 9 L0 16 L7 20 L7 42 L39 42 L39 20 L46 16 L43 9 L37 13 L29 5 C26 9 20 9 17 5 Z"
                fill="#e11d48"
                stroke="#9f1239"
                strokeWidth="1.5"
              />
            </g>
          </g>
        </g>
      </svg>

      {/* Inline Keyframe Styles for Smooth SVG Physics */}
      <style>{`
        @keyframes treeGrow {
          0% {
            transform: scaleY(0) scaleX(0.4);
            opacity: 0;
          }
          50% {
            transform: scaleY(0.7) scaleX(0.85);
            opacity: 0.8;
          }
          100% {
            transform: scaleY(1) scaleX(1);
            opacity: 1;
          }
        }

        @keyframes foliageBloom {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(0.3);
            opacity: 0.5;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes fruitSprout {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          70% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes swayTshirt1 {
          0% { transform: rotate(-14deg); }
          50% { transform: rotate(4deg); }
          100% { transform: rotate(16deg); }
        }

        @keyframes swayTshirt2 {
          0% { transform: rotate(18deg); }
          50% { transform: rotate(-3deg); }
          100% { transform: rotate(-15deg); }
        }

        @keyframes swayTshirt3 {
          0% { transform: rotate(-12deg); }
          50% { transform: rotate(6deg); }
          100% { transform: rotate(14deg); }
        }
      `}</style>
    </div>
  );
}

function NotFound() {
  return (
    <div className="w-full min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4 md:p-6 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative selection:bg-[var(--color-accent)] selection:text-white">
      <div className="absolute inset-0 bg-[var(--color-bg)]/95 backdrop-blur-xs z-10" />

      <div className="relative z-20 w-full max-w-md bg-[var(--color-surface)] p-6 md:p-8 rounded-2xl border border-[var(--color-border)] shadow-2xl text-center space-y-5 animate-scale-up overflow-hidden">
        
        {/* Animated Tree with Hanging & Swaying T-Shirt Apparel 'Fruits' */}
        <div className="pt-2">
          <GrowingTreeWithTshirts />
        </div>

        {/* 404 Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-mono font-bold tracking-widest uppercase border border-emerald-500/20 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            ERROR CODE // 404
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-black tracking-widest text-[var(--color-text)] uppercase animate-slide-up">
            OUT OF THE BRANCHES
          </h1>
        </div>

        {/* Informational Subtext */}
        <p className="text-xs text-[var(--color-muted)] leading-relaxed max-w-xs mx-auto uppercase tracking-wider font-medium">
          Looks like this apparel drop hasn't grown on our trees yet or was harvested away.
        </p>

        {/* Divider */}
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent mx-auto" />

        {/* Go back CTA */}
        <div className="pt-1">
          <Link 
            to="/" 
            className="inline-flex items-center text-white justify-center gap-3 w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98] font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-lg hover:shadow-emerald-900/20 transition-all duration-200 cursor-pointer"
          >
            <FiArrowLeft className="text-sm" />
            Explore Fresh Drops
          </Link>
        </div>

      </div>
    </div>
  );
}

export default NotFound;

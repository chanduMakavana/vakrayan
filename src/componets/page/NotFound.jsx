import { Link } from 'react-router-dom';
import { FiPlus, FiArrowLeft } from 'react-icons/fi';

function NotFound() {
  return (
    <div className="w-full min-h-screen bg-white text-black flex flex-col justify-between p-6 md:p-12 relative overflow-hidden select-none font-sans">
      
      {/* 1. TOP LEFT MINIMAL MESSAGE (Matching Reference Image) */}
      <header className="relative z-20">
        <h2 className="text-sm md:text-base font-extrabold tracking-tight text-black leading-snug">
          We're not sure what happened there—sorry!
        </h2>
        <p className="text-sm md:text-base font-extrabold tracking-tight text-black">
          Check for typos, try again?
        </p>
      </header>

      {/* 2. CENTER ICONIC 404 WITH CAT / FLASHLIGHT SILHOUETTE */}
      <main className="my-auto flex flex-col items-center justify-center relative py-8">
        
        {/* Giant Crisp Vector Composition */}
        <div className="relative w-full max-w-[420px] h-[260px] md:h-[300px] flex items-center justify-center">
          
          {/* Big Grey 404 Background Numbers */}
          <div className="absolute inset-0 flex items-center justify-between px-4 text-[#bdbdbd] font-black text-[120px] md:text-[155px] tracking-tighter leading-none pointer-events-none select-none">
            <span>4</span>
            <span>4</span>
          </div>

          {/* Centered Spotlight Aura Behind Cat Head */}
          <div className="relative flex flex-col items-center justify-center z-10 -mt-2">
            
            {/* Glowing Search Ring / Spotlight */}
            <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full border border-gray-300 flex items-center justify-center bg-radial from-gray-300/60 via-gray-200/30 to-transparent">
              <div className="w-24 h-24 rounded-full bg-radial from-gray-900/30 via-gray-400/20 to-transparent blur-md" />
            </div>

            {/* Backview Cat Silhouette Looking Into The Portal */}
            <svg
              viewBox="0 0 200 240"
              className="w-36 h-44 md:w-44 md:h-52 -mt-28 md:-mt-34 drop-shadow-md"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Curved Tail on Left */}
              <path
                d="M50 200 C30 190 20 160 30 145 C38 135 48 140 45 152 C40 165 48 185 68 190 Z"
                fill="#000000"
              />
              <path
                d="M60 210 C45 200 35 180 40 165 C45 155 55 160 52 170 C48 180 58 195 78 200 Z"
                fill="#000000"
              />

              {/* Cat Back Body */}
              <path
                d="M100 70 C85 70 75 85 70 110 C65 135 60 180 60 215 C60 220 140 220 140 215 C140 180 135 135 130 110 C125 85 115 70 100 70 Z"
                fill="#000000"
              />

              {/* Cat Head Backview with Pointy Ears */}
              <path
                d="M80 75 L70 40 C75 42 85 52 90 55 C96 54 104 54 110 55 C115 52 125 42 130 40 L120 75 C115 82 85 82 80 75 Z"
                fill="#000000"
              />
            </svg>

          </div>

        </div>

        {/* Minimal Navigation Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-black hover:bg-neutral-800 text-white font-bold text-xs tracking-wider uppercase rounded-md transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <FiArrowLeft /> Back to Home
          </Link>

          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-black font-bold text-xs tracking-wider uppercase rounded-md transition-all cursor-pointer border border-neutral-300"
          >
            Explore Shop
          </Link>
        </div>

      </main>

      {/* 3. BOTTOM BAR (Error Badge on Left, Plus Icon on Right - Matching Reference) */}
      <footer className="relative z-20 flex justify-between items-center w-full">
        
        {/* Left Side: Cat Silhouette Icon + Error Badge */}
        <div className="flex items-center gap-2 bg-neutral-100/90 border border-neutral-200/80 px-3 py-1.5 rounded-lg shadow-xs">
          {/* Cat Icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 2.85 1.2 5.41 3.12 7.23L4 21l3.5-1.5c1.37.5 2.89.5 4.5.5 5.52 0 10-4.48 10-10S17.52 2 12 2zm-3 8c.83 0 1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5S8.17 10 9 10zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z" />
          </svg>
          <span className="text-lg md:text-xl font-black tracking-tight text-black">
            Error
          </span>
        </div>

        {/* Right Side: Square Plus Button */}
        <Link
          to="/"
          title="Return to Home"
          className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 flex items-center justify-center text-black text-lg transition-colors cursor-pointer"
        >
          <FiPlus className="text-xl" />
        </Link>
      </footer>

    </div>
  );
}

export default NotFound;

import React from 'react'

function PromoBanner() {
  return (
    <section className="relative w-full h-[60vh] md:h-[50vh] overflow-hidden bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center flex items-center justify-center border-t border-b border-white/5">
      
      {/* Dark Tint Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xs" />

      {/* Content Area */}
      <div className="relative z-10 text-center px-6 max-w-3xl">
        <h4 className="text-xs tracking-[0.6em] text-red-500 font-black uppercase mb-4 animate-pulse">
          Our Philosophy
        </h4>
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-gray-100 uppercase leading-none mb-6">
          RAW AESTHETICS.<br />
          NO COMPROMISE.
        </h2>
        <p className="text-sm md:text-base text-gray-400 font-light tracking-wide max-w-xl mx-auto leading-relaxed">
          We don't just drop clothing; we define subculture. Every thread is engineered for heavy operations, keeping comfort locked in and motion unbothered.
        </p>
        
        {/* Subtle Branding Accent */}
        <div className="mt-8 flex justify-center items-center gap-4 text-xs tracking-widest text-gray-500 font-bold uppercase">
          <span>EST. 2026</span>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span>MADE IN INDIA</span>
        </div>
      </div>

    </section>
  )
}

export default PromoBanner
import { useState, useEffect } from 'react'
import campaignService from '../../appwrite/campaign'

function PromoBanner() {
  const [promoText, setPromoText] = useState('⚡ FREE DOMESTIC EXPRESS SHIPPING DEPLOYED ON ALL ACTIVE DROP VOLUMES')

  useEffect(() => {
    campaignService.getPromoText()
      .then(text => {
        if (text) setPromoText(text);
      })
      .catch(err => console.error("Failed to load promo text:", err));
  }, [])

  return (
    <section className="relative w-full h-[65vh] md:h-[55vh] overflow-hidden bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center flex flex-col justify-between border-t border-b border-neutral-200/50 pt-16 pb-14">
      
      {/* Light Tint Overlay */}
      <div className="absolute inset-0 bg-white/95 backdrop-blur-xs" />

      {/* Content Area */}
      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto my-auto">
        <h4 className="text-xs tracking-[0.6em] text-indigo-600 font-black uppercase mb-4 animate-pulse">
          Our Philosophy
        </h4>
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-neutral-900 uppercase leading-none mb-6">
          RAW AESTHETICS.<br />
          NO COMPROMISE.
        </h2>
        <p className="text-sm md:text-base text-neutral-500 font-light tracking-wide max-w-xl mx-auto leading-relaxed">
          We don't just drop clothing; we define subculture. Every thread is engineered for heavy operations, keeping comfort locked in and motion unbothered.
        </p>
        
        {/* Subtle Branding Accent */}
        <div className="mt-8 flex justify-center items-center gap-4 text-xs tracking-widest text-neutral-500 font-bold uppercase">
          <span>EST. 2026</span>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
          <span>MADE IN INDIA</span>
        </div>
      </div>

      {/* Streetwear Live Campaign Scrolling Ticker Banner */}
      <div className="absolute bottom-0 left-0 w-full bg-neutral-950 py-3.5 overflow-hidden border-t border-neutral-800 flex z-20">
        <div className="flex whitespace-nowrap animate-marquee">
          <span className="text-[10px] sm:text-xs font-black font-mono tracking-[0.2em] text-white mx-4 uppercase">
            {promoText} &nbsp;&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;&nbsp; {promoText} &nbsp;&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;&nbsp; {promoText} &nbsp;&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
          <span className="text-[10px] sm:text-xs font-black font-mono tracking-[0.2em] text-white mx-4 uppercase select-none">
            {promoText} &nbsp;&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;&nbsp; {promoText} &nbsp;&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;&nbsp; {promoText} &nbsp;&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
        </div>
        <style>{`
          .animate-marquee {
            display: inline-flex;
            white-space: nowrap;
            animation: marquee 35s linear infinite;
          }
          @keyframes marquee {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-50%, 0, 0); }
          }
        `}</style>
      </div>

    </section>
  )
}

export default PromoBanner
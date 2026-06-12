import { useState, useEffect } from 'react'
import campaignService from '../../appwrite/campaign'

function PromoBanner() {
  const [promoText, setPromoText] = useState('⚡ FREE EXPRESS SHIPPING & 7-DAY EASY RETURNS ON ALL ORDERS')

  useEffect(() => {
    // Reset old jargon-filled promo text from localStorage if present
    const localText = localStorage.getItem('campaignPromoText');
    if (localText && (localText.includes('DROP VOLUMES') || localText.includes('DEPLOYED ON ALL'))) {
      localStorage.removeItem('campaignPromoText');
    }

    campaignService.getPromoText()
      .then(text => {
        if (text) setPromoText(text);
      })
      .catch(err => console.error("Failed to load promo text:", err));
  }, [])

  return (
    <section className="relative w-full h-[65vh] md:h-[55vh] overflow-hidden bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center flex flex-col justify-between border-t border-b border-[var(--color-border)] pt-16 pb-14">
      
      {/* Light Tint Overlay */}
      <div className="absolute inset-0 bg-[var(--color-bg)]/95 backdrop-blur-xs" />

      {/* Content Area */}
      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto my-auto border-t-2 border-dotted border-[var(--color-border)] pt-8">
        <h4 className="text-xs tracking-[0.6em] text-[var(--color-accent)] font-black uppercase mb-4 animate-pulse">
          Our Philosophy
        </h4>
        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-[var(--color-text)] uppercase leading-none mb-6">
          RAW AESTHETICS.<br />
          NO COMPROMISE.
        </h2>
        <p className="text-sm md:text-base text-[var(--color-muted)] font-light tracking-wide max-w-xl mx-auto leading-relaxed">
          We don't just drop clothing; we define subculture. Every thread is engineered for heavy operations, keeping comfort locked in and motion unbothered.
        </p>
        
        {/* Subtle Branding Accent */}
        <div className="mt-8 flex justify-center items-center gap-4 text-xs tracking-widest text-[var(--color-muted)] font-bold uppercase">
          <span>EST. 2026</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
          <span>MADE IN INDIA</span>
        </div>
      </div>

      {/* Streetwear Live Campaign Scrolling Ticker Banner */}
      <div className="absolute bottom-0 left-0 w-full bg-black border-t border-b border-neutral-900 py-3.5 overflow-hidden flex z-20 shadow-2xs">
        <div className="flex whitespace-nowrap animate-marquee">
          <span className="text-[10px] sm:text-xs font-black font-mono tracking-[0.2em] text-white mx-4 uppercase">
            {promoText} &nbsp;&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;&nbsp; {promoText} &nbsp;&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;&nbsp; {promoText} &nbsp;&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
          <span className="text-[10px] sm:text-xs font-black font-mono tracking-[0.2em] text-white mx-4 uppercase select-none">
            {promoText} &nbsp;&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;&nbsp; {promoText} &nbsp;&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;&nbsp; {promoText} &nbsp;&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
        </div>
      </div>

    </section>
  )
}

export default PromoBanner

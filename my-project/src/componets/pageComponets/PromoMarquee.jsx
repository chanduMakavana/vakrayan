import { useState, useEffect } from 'react'
import campaignService from '../../services/campaign'

function PromoMarquee() {
  const [promoText, setPromoText] = useState('⚡ FREE EXPRESS SHIPPING & 7-DAY EASY RETURNS ON ALL ORDERS')

  useEffect(() => {
    const localText = localStorage.getItem('campaignPromoText')
    if (localText && (localText.includes('DROP VOLUMES') || localText.includes('DEPLOYED ON ALL'))) {
      localStorage.removeItem('campaignPromoText')
    }
    campaignService.getPromoText()
      .then(text => { if (text) setPromoText(text) })
      .catch(err => console.error('Failed to load promo text:', err))
  }, [])

  const items = [promoText, promoText, promoText, promoText]

  return (
    <div
      className="relative w-full py-3 overflow-hidden flex z-20 select-none"
      style={{
        background: 'linear-gradient(90deg, #059669 0%, #047857 50%, #059669 100%)',
        boxShadow: '0 4px 20px rgba(5,150,105,0.25)',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      <div className="flex w-full overflow-hidden">
        {/* Track 1 */}
        <div className="flex flex-shrink-0 whitespace-nowrap animate-marquee items-center">
          {items.map((text, i) => (
            <span
              key={`track1-${i}`}
              className="inline-flex items-center gap-3 px-6 text-white text-[11px] font-extrabold uppercase tracking-[0.18em]"
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              <span>{text}</span>
              <span className="text-white/60 text-xs">✦</span>
            </span>
          ))}
        </div>

        {/* Track 2 (Seamless loop duplicate) */}
        <div className="flex flex-shrink-0 whitespace-nowrap animate-marquee items-center" aria-hidden="true">
          {items.map((text, i) => (
            <span
              key={`track2-${i}`}
              className="inline-flex items-center gap-3 px-6 text-white text-[11px] font-extrabold uppercase tracking-[0.18em]"
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              <span>{text}</span>
              <span className="text-white/60 text-xs">✦</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PromoMarquee

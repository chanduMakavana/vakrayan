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

  return (
    <div
      className="relative w-full py-3.5 overflow-hidden flex z-20"
      style={{
        background: 'linear-gradient(90deg, #059669 0%, #047857 50%, #059669 100%)',
        boxShadow: '0 4px 20px rgba(5,150,105,0.25)',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      <div className="flex whitespace-nowrap animate-marquee">
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            fontFamily: "'Jost', sans-serif",
            letterSpacing: '0.18em',
            color: '#fff',
            margin: '0 16px',
            textTransform: 'uppercase'
          }}
        >
          {promoText} &nbsp;&nbsp;✦&nbsp;&nbsp; {promoText} &nbsp;&nbsp;✦&nbsp;&nbsp; {promoText} &nbsp;&nbsp;✦&nbsp;&nbsp;
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            fontFamily: "'Jost', sans-serif",
            letterSpacing: '0.18em',
            color: '#fff',
            margin: '0 16px',
            textTransform: 'uppercase'
          }}
          aria-hidden="true"
        >
          {promoText} &nbsp;&nbsp;✦&nbsp;&nbsp; {promoText} &nbsp;&nbsp;✦&nbsp;&nbsp; {promoText} &nbsp;&nbsp;✦&nbsp;&nbsp;
        </span>
      </div>
    </div>
  )
}

export default PromoMarquee

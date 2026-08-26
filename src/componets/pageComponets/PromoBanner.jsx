import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import campaignService from '../../services/campaign'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.05 } }
}

const childVariants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } }
}

const statsData = [
  { value: '100+', label: 'Happy Customers' },
  { value: '10+', label: 'Premium Styles' },
  { value: '7 Days', label: 'Easy Returns' },
  { value: '100%', label: 'Quality Assured' },
]

function PromoBanner() {
  const [promoText, setPromoText] = useState('⚡ FREE EXPRESS SHIPPING & 7-DAY EASY RETURNS ON ALL ORDERS')
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.05 })
  const [fallbackShow, setFallbackShow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setFallbackShow(true), 800)
    return () => clearTimeout(timer)
  }, [])

  const shouldShow = isInView || fallbackShow

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
    <section
      className="relative w-full overflow-hidden"
      style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #F4FAF7 0%, #EDFAF3 50%, #F0F7F3 100%)'
        }}
      />

      {/* Ambient blobs */}
      <div className="absolute top-0 left-1/4 w-80 h-80 blob blob-green animate-blob" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-0 right-1/4 w-60 h-60 blob blob-teal animate-blob" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/2 left-0 w-40 h-40 blob blob-emerald animate-blob" style={{ animationDelay: '5s', opacity: 0.08 }} />

      {/* Content */}
      <motion.div
        ref={sectionRef}
        variants={containerVariants}
        initial="hidden"
        animate={shouldShow ? "show" : "hidden"}
        className="relative z-10 max-w-[1728px] mx-auto px-6 py-10 md:py-12 text-center"
      >
        <motion.div variants={childVariants} className="flex justify-center mb-3">
          <div className="accent-line" />
        </motion.div>

        <motion.p variants={childVariants} className="eyebrow mb-2">
          Our Philosophy
        </motion.p>

        <motion.h2
          variants={childVariants}
          style={{
            fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
            fontSize: 'clamp(2.2rem, 5vw, 4rem)',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.01em',
            color: 'var(--color-text)',
            lineHeight: 1.0,
            marginBottom: 12
          }}
        >
          Raw Aesthetics.
          <br />
          <span style={{ color: 'var(--color-accent)' }}>No Compromise.</span>
        </motion.h2>

        <motion.p
          variants={childVariants}
          style={{
            color: 'var(--color-muted)',
            fontSize: 15,
            lineHeight: 1.6,
            maxWidth: 520,
            margin: '0 auto 20px',
            fontFamily: "'Jost', sans-serif"
          }}
        >
          We don't just drop clothing — we define subculture. Every thread is engineered for heavy operations, keeping comfort locked in and motion unbothered.
        </motion.p>

        {/* Stats row */}
        <motion.div
          variants={childVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4"
        >
          {statsData.map(({ value, label }) => (
            <div
              key={label}
              className="glass-card p-5 text-center transition-all duration-300 hover:shadow-md"
              style={{ borderRadius: 16, border: '1px solid var(--color-border-hard)' }}
            >
              <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontSize: 30, fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1, marginBottom: 6 }}>
                {value}
              </p>
              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Brand tags */}
        <motion.div variants={childVariants} className="mt-8 flex justify-center items-center gap-4 flex-wrap">
          {['EST. 2026', 'MADE IN INDIA', 'PREMIUM QUALITY'].map((tag, i) => (
            <span
              key={tag}
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-muted)'
              }}
            >
              {i > 0 && <span style={{ marginRight: 16, color: 'var(--color-accent)' }}>·</span>}
              {tag}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}

export default PromoBanner

import React from 'react'
import { motion } from 'framer-motion'

function Loader({ type = 'inline', text }) {
  const renderContent = () => {
    switch (type) {
      case 'splash':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-6"
          >
            <img 
              src="/vakrayan-logo-icon.png" 
              alt="Vakrayan Logo" 
              fetchPriority="high"
              className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-md" 
            />
            <div className="flex flex-col items-center gap-1">
              <h1
                className="text-lg md:text-xl font-brand font-black tracking-[0.45em] text-[var(--color-text)] uppercase"
                style={{ fontFamily: "'VakrayanFont', sans-serif" }}
              >
                VAKRAYAN
              </h1>
              <p
                className="text-[9px] font-bold tracking-[0.3em] uppercase"
                style={{ color: 'var(--color-muted)', fontFamily: 'Jost, sans-serif' }}
              >
                Premium Apparel
              </p>
            </div>

            <div className="w-32 h-[2px] bg-[var(--color-border)] rounded-full overflow-hidden relative">
              <div
                className="absolute inset-0 w-1/2 rounded-full"
                style={{
                  background: 'var(--color-accent)',
                  animation: 'loading 1s infinite linear',
                }}
              />
            </div>

            {text && (
              <p
                className="text-[10px] font-mono font-bold tracking-[0.25em] uppercase animate-pulse"
                style={{ color: 'var(--color-accent)' }}
              >
                {text}
              </p>
            )}
          </motion.div>
        )
      case 'overlay':
        return (
          <div className="flex flex-col items-center gap-5">
            <div className="flex flex-col items-center gap-1">
              <h3 
                className="text-xs font-brand tracking-widest text-[#34D399] uppercase font-black animate-pulse"
                style={{ fontFamily: "'VakrayanFont', sans-serif" }}
              >
                {text || 'SECURELY LOADING VAKRAYAN...'}
              </h3>
            </div>
            <div className="w-24 h-[2px] bg-white/10 rounded-full overflow-hidden relative">
              <div
                className="absolute inset-0 w-1/2 rounded-full"
                style={{
                  background: '#34D399',
                  animation: 'loading 0.9s infinite linear',
                }}
              />
            </div>
          </div>
        )
      case 'inline':
      default:
        return (
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-20 h-[2px] rounded-full overflow-hidden relative"
              style={{ background: 'var(--color-border)' }}
            >
              <div
                className="absolute inset-0 w-1/2 rounded-full"
                style={{
                  background: 'var(--color-accent)',
                  animation: 'loading 0.9s infinite linear',
                }}
              />
            </div>
            <p style={{ color: 'var(--color-muted)', fontSize: 11, letterSpacing: '0.15em', fontFamily: "'Jost', sans-serif" }}>
              {text || 'LOADING'}
            </p>
          </div>
        )
    }
  }

  if (type === 'splash') {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)] select-none animate-fade-in">
        {renderContent()}
      </div>
    )
  }

  if (type === 'overlay') {
    return (
      <div 
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center animate-fade-in select-none"
        style={{ background: 'rgba(13,26,20,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      >
        {renderContent()}
      </div>
    )
  }

  return (
    <div className="w-full min-h-[40vh] flex items-center justify-center select-none">
      {renderContent()}
    </div>
  )
}

export default Loader

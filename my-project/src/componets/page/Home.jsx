import { useState, useEffect, useRef } from 'react'
import Navbar from '../pageComponets/Navbar'
import Hero from '../pageComponets/Hero'
import CategoryGrid from '../pageComponets/CategoryGrid'
import BestSellers from '../pageComponets/BestSeller'
import PromoBanner from '../pageComponets/PromoBanner'
import Footer from '../pageComponets/Footer'
import { playTick, playWinChime, triggerConfetti } from '../../utils/sensoryHelper'

function Home() {
  const canvasRef = useRef(null)
  const confettiCanvasRef = useRef(null)
  const [wheelOpen, setWheelOpen] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [wonCode, setWonCode] = useState('')

  const segments = [
    { code: 'STREET15', label: '15% OFF', color: '#111111' },
    { code: 'TRY_AGAIN', label: 'Try Again', color: '#e11d48' },
    { code: 'DROP20', label: '20% OFF', color: '#6366f1' },
    { code: 'STREET10', label: '10% OFF', color: '#0ea5e9' },
    { code: 'FREESHIP', label: 'Free Ship', color: '#10b981' },
    { code: 'DROP5', label: '5% OFF', color: '#f59e0b' }
  ]

  const drawWheel = (angle) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const radius = width / 2
    ctx.clearRect(0, 0, width, height)

    const arcSize = (2 * Math.PI) / segments.length

    segments.forEach((seg, i) => {
      const startAngle = i * arcSize + angle
      const endAngle = startAngle + arcSize

      ctx.beginPath()
      ctx.fillStyle = seg.color
      ctx.moveTo(radius, radius)
      ctx.arc(radius, radius, radius - 10, startAngle, endAngle)
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()

      ctx.save()
      ctx.translate(radius, radius)
      ctx.rotate(startAngle + arcSize / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText(seg.label, radius - 30, 4)
      ctx.restore()
    })

    ctx.beginPath()
    ctx.fillStyle = '#ffffff'
    ctx.arc(radius, radius, 18, 0, 2 * Math.PI)
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#111111'
    ctx.stroke()

    ctx.beginPath()
    ctx.fillStyle = '#e11d48'
    ctx.arc(radius, radius, 6, 0, 2 * Math.PI)
    ctx.fill()
  }

  useEffect(() => {
    const hasSpun = localStorage.getItem('hasSpunPromoWheel')
    if (!hasSpun) {
      const timer = setTimeout(() => {
        setWheelOpen(true)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (wheelOpen && canvasRef.current) {
      drawWheel(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wheelOpen])

  const spinWheel = () => {
    if (spinning) return
    setSpinning(true)

    const spinDuration = 3000
    const startTimestamp = performance.now()
    
    const winIdx = Math.random() > 0.5 ? 0 : 2
    const arcSize = (2 * Math.PI) / segments.length
    const targetAngle = 10 * Math.PI * 2 - (winIdx * arcSize) - (arcSize / 2)

    let lastTickAngle = 0

    const animateSpin = (now) => {
      const elapsed = now - startTimestamp
      const progress = Math.min(elapsed / spinDuration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const currentAngle = easeProgress * targetAngle

      drawWheel(currentAngle)

      // Dynamic physical mechanical tick sound
      const currentSegIdx = Math.floor((currentAngle % (Math.PI * 2)) / arcSize)
      const lastSegIdx = Math.floor((lastTickAngle % (Math.PI * 2)) / arcSize)
      if (currentSegIdx !== lastSegIdx) {
        playTick()
      }
      lastTickAngle = currentAngle

      if (progress < 1) {
        requestAnimationFrame(animateSpin)
      } else {
        setSpinning(false)
        const winningSeg = segments[winIdx]
        setWonCode(winningSeg.code)
        
        sessionStorage.setItem('activePromoCode', winningSeg.code)
        sessionStorage.setItem('activeDiscountPercent', winningSeg.code === 'STREET15' ? '15' : '20')
        navigator.clipboard.writeText(winningSeg.code)
        localStorage.setItem('hasSpunPromoWheel', 'true')
        
        window.dispatchEvent(new Event('coupon-applied'))
        
        // Celebrate with arpeggio chimes and confetti showers
        playWinChime()
        if (confettiCanvasRef.current) {
          triggerConfetti(confettiCanvasRef.current)
        }
      }
    }

    requestAnimationFrame(animateSpin)
  }

  return (
    <>
      <Navbar />
      <Hero />
      <CategoryGrid />
      <BestSellers />
      <PromoBanner />
      
      {/* Spinning Wheel Modal Overlay */}
      {wheelOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs" onClick={() => {
            if (!spinning) setWheelOpen(false)
          }}></div>
          
          {/* Confetti canvas for full screen modal explosion */}
          <canvas 
            ref={confettiCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
          />
          
          <div className="relative bg-white border border-neutral-100 rounded-2xl max-w-sm w-full p-6 text-center space-y-6 shadow-2xl z-10 animate-scale-up">
            {!spinning && (
              <button 
                onClick={() => setWheelOpen(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 cursor-pointer p-1 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            <div className="space-y-1">
              <span className="text-[9px] bg-neutral-900 text-white font-mono tracking-widest px-2.5 py-0.5 rounded">
                ⚡ EXCLUSIVE VISITOR DROP
              </span>
              <h2 className="text-xl font-black uppercase tracking-wider text-neutral-900 pt-2">
                Lucky Promo Wheel
              </h2>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                Spin the wheel to win premium promo codes!
              </p>
            </div>

            <div className="relative flex justify-center py-2">
              <canvas 
                ref={canvasRef} 
                width="240" 
                height="240" 
                className="rounded-full shadow-md bg-white border border-neutral-100"
              />
              <div className="absolute right-[44.5%] top-0 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-rose-600 drop-shadow-md z-20"></div>
            </div>

            <div className="space-y-4">
              {!wonCode ? (
                <button
                  onClick={spinWheel}
                  disabled={spinning}
                  className="w-full py-3.5 bg-neutral-950 hover:bg-[var(--theme-primary)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg disabled:bg-neutral-150 disabled:text-neutral-400 disabled:cursor-not-allowed"
                >
                  {spinning ? 'SPINNING...' : 'TAP TO SPIN'}
                </button>
              ) : (
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/60 space-y-3 animate-fade-in">
                  <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                    Congrats! You Won
                  </div>
                  <div className="text-2xl font-black text-rose-500 tracking-wider font-mono">
                    {wonCode}
                  </div>
                  <p className="text-[10px] text-neutral-500 max-w-xs mx-auto leading-relaxed">
                    Code automatically copied to your clipboard & saved for checkout.
                  </p>
                  
                  <div className="pt-2">
                    <button
                      onClick={() => setWheelOpen(false)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Shop Collection &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </>
  )
}

export default Home

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getOptimizedImageUrl } from '../../utils/imageOptimizer'
import slidesService from '../../services/slides'

const STORAGE_KEY = 'vakrayan_hero_slides'

const DEFAULT_SLIDES = [
  {
    $id: 'default-1',
    image: 'https://b2-upload-gateway.vakrayan.workers.dev/file/1786854633429_Create_image_ratio_version_2K_202608152012-processed_lightpdf.com_.png',
    mobileImage: 'https://b2-upload-gateway.vakrayan.workers.dev/file/1786854633429_Create_image_ratio_version_2K_202608152012-processed_lightpdf.com_.png',
    link: '/shop'
  },
  {
    $id: 'default-2',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=75',
    mobileImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=75',
    link: '/shop'
  }
]

const getInitialSlides = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    // Ignore error
  }
  return DEFAULT_SLIDES
}

function Hero() {
  const navigate = useNavigate()
  const [slides, setSlides] = useState(getInitialSlides)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  // Touch Swipe coordinates (Mobile)
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 })
  
  // Mouse Drag coordinates (Desktop/Laptop — direct slide switch without physical image dragging)
  const [mouseDownX, setMouseDownX] = useState(0)

  useEffect(() => {
    let active = true

    slidesService.getSlides().then(res => {
      if (active) {
        if (res && res.length > 0) {
          setSlides(res)
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(res))
          } catch (e) {}
        } else {
          setSlides(DEFAULT_SLIDES)
        }
      }
    }).catch(() => {
      if (active) {
        setSlides(prev => prev || DEFAULT_SLIDES)
      }
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    setIsMobile(window.innerWidth < 768)
    // Debounced to prevent render flooding during window resize
    let debounceTimer
    const debouncedResize = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(handleResize, 150)
    }
    window.addEventListener('resize', debouncedResize)
    return () => {
      window.removeEventListener('resize', debouncedResize)
      clearTimeout(debounceTimer)
    }
  }, [])

  // Auto-play timer — uses functional state update so currentIndex is NOT a dep.
  // This prevents the timer from being recreated on every slide advance.
  useEffect(() => {
    if (!slides || slides.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides?.length])

  const nextSlide = () => {
    if (!slides || slides.length <= 1) return
    setCurrentIndex(prev => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    if (!slides || slides.length <= 1) return
    setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length)
  }

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e) => {
    setTouchStartPos({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    })
  }

  const handleTouchEnd = (e) => {
    if (!touchStartPos.x && !touchStartPos.y) return
    const touchEnd = e.changedTouches[0]
    const diffX = touchStartPos.x - touchEnd.clientX
    const diffY = touchStartPos.y - touchEnd.clientY

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        nextSlide()
      } else {
        prevSlide()
      }
    }
    setTouchStartPos({ x: 0, y: 0 })
  }

  // Laptop Mouse Drag Gesture Handlers (Direct slide switch without dragging image position)
  const handleMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('.no-hero-link')) return
    setMouseDownX(e.clientX)
  }

  const handleMouseUp = (e) => {
    if (!mouseDownX) return
    if (e.target.closest('button') || e.target.closest('.no-hero-link')) {
      setMouseDownX(0)
      return
    }

    const diffX = mouseDownX - e.clientX
    const threshold = 40

    if (diffX > threshold) {
      // Mouse dragged Left -> DIRECTLY switch to next slide
      nextSlide()
    } else if (diffX < -threshold) {
      // Mouse dragged Right -> DIRECTLY switch to prev slide
      prevSlide()
    } else if (Math.abs(diffX) < 5) {
      // Simple click without drag -> open slide link
      const activeSlide = (slides && slides[currentIndex]) || DEFAULT_SLIDES[0]
      if (activeSlide?.link) {
        navigate(activeSlide.link)
      }
    }
    setMouseDownX(0)
  }

  if (!slides || slides.length === 0) {
    return (
      <div 
        className="w-full relative overflow-hidden select-none" 
        style={{ height: 'clamp(300px, 70vh, 90vh)', background: 'linear-gradient(135deg, #0D1A14 0%, #071A10 100%)' }}
      >
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full animate-pulse" style={{ background: '#059669', filter: 'blur(80px)', opacity: 0.08 }} />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full animate-pulse" style={{ background: '#34D399', filter: 'blur(60px)', opacity: 0.06 }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(5,150,105,0.05) 0%, rgba(0,0,0,0.6) 100%)' }} />

        {/* Bottom hero content overlay */}
        <div className="hidden md:block absolute bottom-0 left-0 right-0 z-20 px-6 md:px-14 pb-4 md:pb-5 pointer-events-none">
          <div
            className="inline-flex items-center gap-3 px-4 py-2.5"
            style={{
              background: 'rgba(244,250,247,0.14)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 12
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px #34D399' }} />
            <span className="font-brand" style={{ color: '#fff', fontFamily: "'VakrayanFont', 'Barlow Condensed', 'Impact', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Vakrayan
            </span>
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontFamily: "'Jost', sans-serif", fontWeight: 500, letterSpacing: '0.1em' }}>
              Premium Apparel
            </span>
          </div>
        </div>
      </div>
    )
  }

  const activeSlide = slides[currentIndex] || slides[0]

  const slideVariants = {
    enter: { opacity: 0, scale: 1.04 },
    center: { opacity: 1, scale: 1, transition: { opacity: { duration: 0.45 }, scale: { type: 'tween', ease: 'easeOut', duration: 0.8 } } },
    exit: { opacity: 0, scale: 0.97, transition: { opacity: { duration: 0.35 }, scale: { type: 'tween', ease: 'easeIn', duration: 0.5 } } }
  }

  return (
    <div 
      className="w-full relative overflow-hidden select-none touch-pan-y bg-neutral-950" 
      style={{ height: 'clamp(300px, 70vh, 90vh)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* Slide images container */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentIndex}
            variants={slideVariants}
            initial={false}
            animate="center"
            exit="exit"
            className="absolute inset-0 cursor-pointer"
          >
            <img
              src={getOptimizedImageUrl(isMobile && activeSlide.mobileImage ? activeSlide.mobileImage : activeSlide.image, isMobile ? 800 : 1600, 75)}
              alt={activeSlide.alt || activeSlide.title || 'Vakrayan Premium Apparel Collection'}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              width={isMobile ? 800 : 1600}
              height={isMobile ? 600 : 900}
              className="w-full h-full object-cover select-none pointer-events-none"
              draggable={false}
            />
            {/* Gradient overlay - bottom to top */}
            <div 
              className="absolute inset-0 pointer-events-none" 
              style={{
                background: 'linear-gradient(to top, rgba(5,26,14,0.60) 0%, rgba(5,26,14,0.10) 45%, rgba(0,0,0,0.05) 100%)'
              }} 
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom hero content overlay */}
      <div className="hidden md:block absolute bottom-0 left-0 right-0 z-20 px-6 md:px-14 pb-4 md:pb-5 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          {/* Brand badge */}
          <div
            className="inline-flex items-center gap-3 px-4 py-2.5 pointer-events-auto cursor-pointer no-hero-link"
            onClick={(e) => { e.stopPropagation(); if (activeSlide.link) navigate(activeSlide.link) }}
            onMouseDown={e => e.stopPropagation()}
            onMouseUp={e => e.stopPropagation()}
            style={{
              background: 'rgba(244,250,247,0.14)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 12
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px #34D399' }} />
            <span className="font-brand" style={{ color: '#fff', fontFamily: "'VakrayanFont', 'Barlow Condensed', 'Impact', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Vakrayan
            </span>
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontFamily: "'Jost', sans-serif", fontWeight: 500, letterSpacing: '0.1em' }}>
              Premium Apparel
            </span>
          </div>
        </motion.div>
      </div>

      {/* Slide controls (Desktop & Tablet Navigation Arrows) */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            onMouseDown={e => e.stopPropagation()}
            onMouseUp={e => e.stopPropagation()}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 cursor-pointer transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(244,250,247,0.18)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 12,
              color: '#fff',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(5,150,105,0.40)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,250,247,0.18)'}
            aria-label="Previous slide"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>

          <button
            type="button"
            onClick={nextSlide}
            onMouseDown={e => e.stopPropagation()}
            onMouseUp={e => e.stopPropagation()}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 cursor-pointer transition-all duration-200 hover:scale-105"
            style={{
              background: 'rgba(244,250,247,0.18)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 12,
              color: '#fff',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(5,150,105,0.40)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,250,247,0.18)'}
            aria-label="Next slide"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </button>

          {/* Indicator pills */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={e => { e.stopPropagation(); setCurrentIndex(idx) }}
                onMouseDown={e => e.stopPropagation()}
                onMouseUp={e => e.stopPropagation()}
                className="cursor-pointer transition-all duration-300"
                style={{
                  height: 6,
                  width: currentIndex === idx ? 28 : 6,
                  borderRadius: 99,
                  background: currentIndex === idx ? '#059669' : 'rgba(255,255,255,0.40)',
                  border: 'none'
                }}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default Hero

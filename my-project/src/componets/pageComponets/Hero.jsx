import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import slidesService from '../../appwrite/slides'

const DEFAULT_SLIDES = [
  {
    $id: 'default-1',
    image: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=1600',
    mobileImage: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=800',
    link: '/shop'
  },
  {
    $id: 'default-2',
    image: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=1600',
    mobileImage: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=800',
    link: '/shop'
  },
  {
    $id: 'default-3',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1600',
    mobileImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=800',
    link: '/shop'
  }
]

function Hero() {
  const navigate = useNavigate()
  const [slides, setSlides] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  // Fetch slides from Appwrite
  useEffect(() => {
    let active = true
    slidesService.getSlides().then((res) => {
      if (active && res && res.length > 0) {
        setSlides(res)
      } else if (active) {
        setSlides(DEFAULT_SLIDES)
      }
    }).catch(() => {
      if (active) setSlides(DEFAULT_SLIDES)
    })

    return () => {
      active = false
    }
  }, [])

  // Handle mobile resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-play slideshow every 5 seconds
  useEffect(() => {
    if (slides.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [slides])

  const nextSlide = (e) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = (e) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const activeSlide = slides[currentIndex] || DEFAULT_SLIDES[0]

  const fadeVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.8, ease: "easeInOut" } },
    exit: { opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }
  }

  return (
    <div className='w-full h-[65vh] md:h-[90vh] relative overflow-hidden bg-neutral-950 flex flex-col justify-between pb-4 md:pb-0'>
      
      {/* Dynamic Background Image Slider with Cross-Fade */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide.$id || currentIndex}
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 cursor-pointer"
            onClick={() => {
              if (activeSlide.link) {
                navigate(activeSlide.link)
              }
            }}
          >
            <img
              src={isMobile && activeSlide.mobileImage ? activeSlide.mobileImage : activeSlide.image}
              alt="Streetwear Banner Banner"
              className="w-full h-full object-cover select-none"
            />
            {/* Dark tint overlay for rich aesthetic contrast and readable text */}
            <div className="absolute inset-0 bg-neutral-950/45 backdrop-brightness-[0.8]" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Gradient SVG Wave Background to blend elements smoothly */}
      <div className='absolute bottom-0 w-full z-20 leading-0 pointer-events-none'>
        <svg
          className='w-full'
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.4" />
              <stop offset="30%" stopColor="#262a2e" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#343a40" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path 
            fill="url(#wave-gradient)" 
            d="M0,32L48,74.7C96,117,192,203,288,218.7C384,235,480,181,576,144C672,107,768,85,864,80C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          ></path>
        </svg>
      </div>

      {/* Main Static Content Overlay */}
      <div className='relative z-10 text-center mt-16 px-4 pointer-events-none'>
        <h1 className='text-gray-100 text-4xl sm:text-7xl md:text-9xl tracking-wider font-extrabold [text-shadow:2px_1px_15px_rgba(0,0,0,0.6)] uppercase'>
          STREETWEAR
        </h1>
        
        <h2 className='text-white text-lg sm:text-2xl md:text-3xl tracking-widest mt-1 font-bold [text-shadow:2px_1px_10px_rgba(0,0,0,0.6)]'>
          SOLVING
        </h2>

        <div className='flex justify-center mt-6 pointer-events-auto'>
          <Link
            to="/shop"
            className='bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] py-3.5 px-8 rounded-full text-white font-black tracking-widest uppercase shadow-xl text-xs md:text-sm transition-all duration-300 transform hover:scale-105 active:scale-95'
          >
            Shop Collection &rarr;
          </Link>
        </div>
      </div>

      {/* Interactive Controls Overlay (Dots + Arrows) */}
      {slides.length > 1 && (
        <>
          {/* Arrow Controls */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-xs transition-colors cursor-pointer border border-white/15"
            aria-label="Previous slide"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-xs transition-colors cursor-pointer border border-white/15"
            aria-label="Next slide"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
            </svg>
          </button>

          {/* Indicator Dots */}
          <div className="absolute bottom-10 left-0 right-0 z-30 flex justify-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentIndex(idx)
                }}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'
                } cursor-pointer`}
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

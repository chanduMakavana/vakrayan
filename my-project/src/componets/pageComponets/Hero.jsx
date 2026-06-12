import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const [direction, setDirection] = useState(0) // -1 for left, 1 for right
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [imagesLoaded, setImagesLoaded] = useState(false)

  // Fetch slides and preload all images
  useEffect(() => {
    let active = true

    const preloadImages = (slidesList) => {
      const urls = []
      slidesList.forEach(s => {
        if (s.image) urls.push(s.image)
        if (s.mobileImage) urls.push(s.mobileImage)
      })

      if (urls.length === 0) {
        setImagesLoaded(true)
        return
      }

      let count = 0
      urls.forEach(url => {
        const img = new window.Image()
        img.src = url
        img.onload = () => {
          count++
          if (count === urls.length && active) {
            setImagesLoaded(true)
          }
        }
        img.onerror = () => {
          count++
          if (count === urls.length && active) {
            setImagesLoaded(true)
          }
        }
      })
    }

    slidesService.getSlides().then((res) => {
      if (active) {
        const list = res && res.length > 0 ? res : DEFAULT_SLIDES
        setSlides(list)
        preloadImages(list)
      }
    }).catch(() => {
      if (active) {
        setSlides(DEFAULT_SLIDES)
        preloadImages(DEFAULT_SLIDES)
      }
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
      setDirection(1)
      setCurrentIndex((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [slides])

  const nextSlide = (e) => {
    e.stopPropagation()
    setDirection(1)
    setCurrentIndex((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = (e) => {
    e.stopPropagation()
    setDirection(-1)
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const activeSlide = slides[currentIndex] || DEFAULT_SLIDES[0]

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? '100%' : direction < 0 ? '-100%' : '0%',
      opacity: 0.95
    }),
    center: {
      x: '0%',
      opacity: 1,
      transition: {
        x: { type: "tween", ease: "easeInOut", duration: 0.5 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (direction) => ({
      x: direction < 0 ? '100%' : direction > 0 ? '-100%' : '0%',
      opacity: 0.95,
      transition: {
        x: { type: "tween", ease: "easeInOut", duration: 0.5 },
        opacity: { duration: 0.2 }
      }
    })
  }

  if (!imagesLoaded) {
    return (
      <div className="w-full h-[65vh] md:h-[80vh] relative overflow-hidden bg-neutral-900 animate-pulse">
        {/* Skeleton Left Arrow Control */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-neutral-800/80 rounded-full" />
        
        {/* Skeleton Right Arrow Control */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 bg-neutral-800/80 rounded-full" />

        {/* Skeleton Indicator Dots */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
          {Array.from({ length: slides.length > 0 ? slides.length : 3 }).map((_, idx) => (
            <div
              key={idx}
              className="w-2.5 h-2.5 rounded-full bg-neutral-850"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='w-full h-[65vh] md:h-[80vh] relative overflow-hidden bg-neutral-955'>
      
      {/* Dynamic Background Image Slider with Horizontal Slide */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
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
              alt="Streetwear Banner"
              className="w-full h-full object-cover select-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 pointer-events-none" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Interactive Controls Overlay (Dots + Arrows) */}
      {slides.length > 1 && (
        <>
          {/* Arrow Controls */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/30 hover:bg-black/50 text-white p-3.5 rounded-full backdrop-blur-xs transition-all cursor-pointer border border-white/10 hover:scale-110"
            aria-label="Previous slide"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/30 hover:bg-black/50 text-white p-3.5 rounded-full backdrop-blur-xs transition-all cursor-pointer border border-white/10 hover:scale-110"
            aria-label="Next slide"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
            </svg>
          </button>

          {/* Indicator Dots */}
          <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentIndex(idx)
                }}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? 'bg-[var(--color-surface)] w-6 rounded-full' : 'w-2.5 bg-[var(--color-surface)]/40 hover:bg-[var(--color-surface)]/60'
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

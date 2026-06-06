<<<<<<< HEAD
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
      <div className="w-full h-[55vh] md:h-[75vh] relative overflow-hidden bg-neutral-900 animate-pulse">
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
    <div className='w-full h-[55vh] md:h-[75vh] relative overflow-hidden bg-neutral-955'>
      
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
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Interactive Controls Overlay (Dots + Arrows) */}
      {slides.length > 1 && (
        <>
          {/* Arrow Controls */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full backdrop-blur-xs transition-colors cursor-pointer border border-white/10"
            aria-label="Previous slide"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full backdrop-blur-xs transition-colors cursor-pointer border border-white/10"
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
=======
import { Link } from 'react-router-dom'
import heroImage from '../../assets/hero-model.png'

function Hero() {
  return (
    <>
      {/* Main Hero Container */}
      <div className='w-full h-[65vh] md:h-[90vh] relative overflow-hidden bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover flex flex-col justify-between pb-4 md:pb-0'>    
        
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

        {/* Title and CTA button positioned in the background layer */}
        <div className='relative z-10 text-center mt-8 px-4'>
          <h1 className='text-gray-200 text-4xl sm:text-7xl md:text-9xl tracking-wider font-extrabold [text-shadow:2px_1px_10px_#e4dddd] uppercase'>
            STREETWEAR
          </h1>
          
          <h2 className='text-white text-lg sm:text-2xl md:text-3xl tracking-widest mt-1'>
            SOLVING
          </h2>

          <div className='flex justify-center mt-4'>
            <Link
              to="/shop"
              className='relative z-40 bg-[var(--theme-primary)] py-2 px-5 rounded-2xl text-white font-bold capitalize shadow-lg text-sm md:text-base hover:bg-[var(--theme-primary-hover)] transition-colors'
            >
              Shop Collection
            </Link>
          </div>
        </div>

        {/* Foreground Model Image situated in front of the text background */}
        <img 
          src={heroImage} 
          alt="Hero Model"
          className='absolute bottom-0 z-20 left-1/2 -translate-x-1/2 md:left-[10%] md:translate-x-0 w-[55vw] sm:w-[45vw] md:w-[30vw] max-w-105 pointer-events-none' 
        />

        {/* Thumbnails list positioned to remain interactive on the foreground */}
        <div className='relative z-40 w-full mt-auto md:absolute md:bottom-0 left-0 right-0 flex flex-col md:flex-row justify-end items-center gap-6 px-6 md:px-16 pb-4'>
          
          {/* Layout spacer for desktop */}
          <div className='hidden md:block md:w-[40%]' />
          
          {/* Thumbnails Gallery */}
          <div className='grayscale flex gap-2 sm:gap-5 justify-center overflow-x-auto max-w-full py-1'>
            <img 
              src="https://i.pinimg.com/originals/c5/88/6d/c5886d8da3842f3ca6372ee0158fc841.jpg"
              className='w-20 sm:w-28 md:w-30 h-24 sm:h-32 md:h-35 -translate-y-1 md:-translate-y-5 rounded-xl shadow-2xl object-cover'
              alt="Thumb 1" 
            />
            <img 
              src="https://i.pinimg.com/originals/7b/56/ba/7b56baf6294d437c9b22ca01434b287e.jpg"
              className='w-20 sm:w-28 md:w-30 h-24 sm:h-32 md:h-35 -translate-y-1 md:-translate-y-5 rounded-xl shadow-2xl object-cover'
              alt="Thumb 2" 
            />
            <img 
              src="https://i.pinimg.com/originals/02/14/ef/0214efe3a76a76cbe65988be1e3315de.jpg"
              className='w-20 sm:w-28 md:w-30 h-24 sm:h-32 md:h-35 -translate-y-1 md:-translate-y-5 rounded-xl shadow-2xl object-cover'
              alt="Thumb 3" 
            />
          </div>

        </div>

      </div>
    </>
>>>>>>> 61e2559d0e1cd6e0dbf11f31859e58bc8057f893
  )
}

export default Hero

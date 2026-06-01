import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../../features/login'
import { updateQuery } from '../../features/search'
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
            {/* High z-index ensures the button remains clickable above foreground imagery */}
            <button className='relative z-40 bg-red-500 py-2 px-5 rounded-2xl text-white font-bold capitalize shadow-lg text-sm md:text-base hover:bg-red-600 transition-colors'>
              <Link to="/shop">
                Shop Collection
              </Link>
            </button>
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
  )
}

export default Hero

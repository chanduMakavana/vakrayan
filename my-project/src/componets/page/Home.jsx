import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../../features/login'
import Navbar from '../pageComponets/Navbar'
import { updateQuery } from '../../features/search'
import heroImage from '../../assets/hero-model.png'
function Home() {


  return (
    <>
      <Navbar />

      {/* hero */}

      <div
        className='w-full h-[90vh]  relative overflow-hidden bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover'>    
          <svg
          className='absolute bottom-0 w-full z-20'

          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320"><path fill="#78818a" fill-opacity="1" d="M0,32L48,74.7C96,117,192,203,288,218.7C384,235,480,181,576,144C672,107,768,85,864,80C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>

        <img src={heroImage} alt=""
          className=' absolute  -bottom-10 w-100 z-10 left-[10%]' />

        <h1 
        className='text-gray-200 text-9xl tracking-wider font-extrabold text-center mt-10 [text-shadow:2px_1px_10px_#e4dddd]'>STRETEAT</h1>

        <h2 className='text-center text-white text-3xl tracking-widest' >SELVING</h2>

          <button 
          className='absolute w-fit bg-red-500 py-2  px-5 rounded-2xl left-1/2 transform -translate-x-1/2 mt-5 text-white font-bold capitalize'>
            <Link >
              Shop Collection
            </Link>
          </button>

         <div 
         className='absolute bottom-0 left-0 right-0 flex justify-around gap-[20%] z-20 '>
           <p className=' w-[30vw] bottom-3 left-30 z-20 text-white'>
            The balance of motion defines our paths, shaping contemporary street aesthetics with premium heavyweight drops every season
          </p>
          <div>

          </div>
         </div>
            </div>
      
    </>
  )
}

export default Home

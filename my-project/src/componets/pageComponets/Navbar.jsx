import React from 'react'
import {Link} from 'react-router-dom'
function Navbar() {
  return (
    <nav className='w-fit mx-auto px-5 py-3 rounded-bl-2xl rounded-br-2xl  flex justify-center items-center gap-20  bg-white'>
        <div
        className='flex gap-7'>
            <div>Men</div>
            <div>Women</div>
            <div>Snekers</div>
        </div>

        <div className=''>
          <img src="https://prod-img.thesouledstore.com/static/non-member-logo2.gif?w=100&dpr=2" alt=""
          className='w-20'/>
        </div>

        <div
        className='flex gap-7'>
          <div>
            <Link >Sign In</Link>
          </div>
          <div>
            <Link>Sign UP</Link>
          </div>
        </div>
    </nav>
  )
}

export default Navbar

import React from 'react'
import { Link } from 'react-router-dom'

function Footer() {
  return (
    <footer className="bg-[#0b0b0d] text-gray-400 py-16 px-6 md:px-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6">
        
        {/* Brand Info */}
        <div className="flex flex-col gap-4">
          <h3 className="text-white text-xl font-black tracking-widest uppercase">
            STREET<span className="text-red-500">-</span>WEAR
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
            Premium heavyweight drops crafted carefully to define contemporary street culture. Join the movement.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-3">
          <h4 className="text-white text-xs font-black tracking-widest uppercase mb-1">Navigation</h4>
          <Link to="/" className="text-xs hover:text-white transition-colors">Home</Link>
          <Link to="/category/printed-tshirt" className="text-xs hover:text-white transition-colors">New Arrivals</Link>
          <Link to="/category/shirts" className="text-xs hover:text-white transition-colors">Men's Wear</Link>
          <Link to="/about" className="text-xs hover:text-white transition-colors">About Brand</Link>
        </div>

        {/* Social Handles */}
        <div className="flex flex-col gap-3">
          <h4 className="text-white text-xs font-black tracking-widest uppercase mb-1">Follow Us</h4>
          <a href="#" className="text-xs hover:text-white transition-colors tracking-wide">INSTAGRAM &nearr;</a>
          <a href="#" className="text-xs hover:text-white transition-colors tracking-wide">PINTEREST &nearr;</a>
          <a href="#" className="text-xs hover:text-white transition-colors tracking-wide">TWITTER / X &nearr;</a>
        </div>

        {/* Newsletter Subscription */}
        <div className="flex flex-col gap-3">
          <h4 className="text-white text-xs font-black tracking-widest uppercase mb-1">Get the Intel</h4>
          <p className="text-xs text-gray-500">Subscribe to receive early drops notification and secret discounts.</p>
          <div className="flex mt-2 max-w-sm rounded-lg overflow-hidden border border-white/10 focus-within:border-white/30 transition-colors">
            <input 
              type="email" 
              placeholder="ENTER YOUR EMAIL" 
              className="bg-neutral-900/50 text-white placeholder-gray-600 text-xs tracking-wider px-4 py-3 w-full outline-hidden"
            />
            <button className="bg-white text-black font-black text-xs px-4 uppercase hover:bg-gray-200 transition-colors">
              Join
            </button>
          </div>
        </div>

      </div>

      {/* Copyright Disclaimer */}
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] tracking-widest text-gray-600 uppercase font-bold">
        <span>&copy; 2026 STREETWEAR CO. ALL RIGHTS RESERVED.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-gray-400 transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
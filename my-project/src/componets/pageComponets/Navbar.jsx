import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { ImSearch } from 'react-icons/im';
import { CgShoppingCart } from 'react-icons/cg';
import { BsFillPersonFill } from 'react-icons/bs';
import { HiMenuAlt3, HiX } from 'react-icons/hi';
import { useDispatch } from 'react-redux';
import { logout } from '../../features/login'; // Aapka logout slice action

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // LocalStorage handling safely
  const localStorageData = JSON.parse(localStorage.getItem("loginData")) || [];
  const loginStatus = localStorageData.length > 0 ? localStorageData.some(data => data.isLogin) : false;
  const accountDetail = localStorageData.length > 0 ? localStorageData.find(data => data.isLogin === true) : null;

  const linkStyles = ({ isActive }) =>
    isActive
      ? 'text-white border-b-2 border-red-500 pb-1 font-black transition-all'
      : 'text-gray-400 hover:text-white transition-all duration-200 pb-1';

  // Handling user session removal smoothly
  const handleLogout = async () => {
   await dispatch(logout());
    setAccountOpen(false);
    navigate('/signUp');
  };

  return (
    <nav className="bg-[#0f0f11] border-b border-white/5 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex justify-between items-center capitalize font-semibold">

        {/* Brand Logo */}
        <div className="text-xl font-black uppercase tracking-widest text-white">
          <Link to="/">
            STREET<span className="text-red-500">-</span>WEAR
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:block">
          <ul className="flex gap-8 text-sm tracking-wider uppercase">
            <li><NavLink to="/" className={linkStyles}>Home</NavLink></li>
            <li><NavLink to="/new-arrivals" className={linkStyles}>New Arrival</NavLink></li>
            <li><NavLink to="/men" className={linkStyles}>Men wear</NavLink></li>
            <li><NavLink to="/about" className={linkStyles}>About</NavLink></li>
          </ul>
        </div>

        {/* Action Icons Area */}
        <div className="flex items-center gap-6 text-gray-400 text-lg">
          <ImSearch className="hover:text-white cursor-pointer transition-colors duration-200" />

          {/* Cart Counter Icon */}
          <div className="relative cursor-pointer hover:text-white transition-colors duration-200">
            <CgShoppingCart className="text-xl" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">0</span>
          </div>

          {/* Dynamic Profile Navigation Switch */}
          {loginStatus ? (
            <div className="relative">
              <BsFillPersonFill 
                className="hover:text-white cursor-pointer transition-colors duration-200 hidden sm:block text-xl"
                onClick={() => setAccountOpen(!accountOpen)} 
              />
              
              {/* Premium Matte Styled Account Menu Overlay */}
              {accountOpen && (
                <div className='absolute right-0 mt-3 w-48 bg-[#141417] border border-white/5 rounded-xl shadow-2xl py-2 z-50 backdrop-blur-md animate-fade-in'>
                  <div className="px-4 py-2 border-b border-white/5">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Active Crew</p>
                    <p className="text-sm text-white font-black uppercase tracking-wide truncate mt-0.5">
                      {accountDetail?.fullName || accountDetail?.name || "GUEST"}
                    </p>
                  </div>
                  
                  {/* Account Action Buttons */}
                  <div className="p-1">
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left text-xs font-bold text-red-400 hover:text-white hover:bg-red-500/10 px-3 py-2 rounded-lg transition-all duration-150 uppercase tracking-wider cursor-pointer"
                    >
                      Sign Out &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/signUp">
              <BsFillPersonFill className="hover:text-white cursor-pointer transition-colors duration-200 hidden sm:block text-xl" />
            </Link>
          )}

          {/* Mobile Hamburg Menu Button */}
          <button onClick={() => setIsOpen(!isOpen)} className="text-white text-2xl md:hidden focus:outline-hidden cursor-pointer">
            {isOpen ? <HiX /> : <HiMenuAlt3 />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Dropdown */}
      <div className={`md:hidden fixed top-16 left-0 w-full bg-[#0f0f11] border-b border-white/5 transition-all duration-300 ease-in-out z-40 ${isOpen ? 'opacity-100 visible h-auto py-6' : 'opacity-0 invisible h-0 overflow-hidden'}`}>
        <ul className="flex flex-col gap-5 items-center text-sm tracking-widest uppercase font-bold">
          <li><NavLink to="/" onClick={() => setIsOpen(false)} className={linkStyles}>Home</NavLink></li>
          <li><NavLink to="/new-arrivals" onClick={() => setIsOpen(false)} className={linkStyles}>New Arrival</NavLink></li>
          <li><NavLink to="/men" onClick={() => setIsOpen(false)} className={linkStyles}>Men wear</NavLink></li>
          <li><NavLink to="/about" onClick={() => setIsOpen(false)} className={linkStyles}>About</NavLink></li>
          
          {/* Mobile Profile Actions Block */}
          {loginStatus ? (
            <li className="pt-4 border-t border-white/5 w-4/5 text-center flex flex-col gap-2">
              <span className="text-xs text-gray-400 font-black uppercase">
                {accountDetail?.fullName || accountDetail?.name}
              </span>
              <button onClick={handleLogout} className="text-xs font-black text-red-500 uppercase tracking-widest mt-1">
                Log Out
              </button>
            </li>
          ) : (
            <li className="pt-4 border-t border-white/5 w-4/5 text-center">
              <NavLink to="/signUp" onClick={() => setIsOpen(false)} className={linkStyles}>Join Crew</NavLink>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
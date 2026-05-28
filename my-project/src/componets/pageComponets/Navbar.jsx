import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { ImSearch } from 'react-icons/im';
import { CgShoppingCart } from 'react-icons/cg';
import { BsFillPersonFill } from 'react-icons/bs';
import { HiMenuAlt3, HiX } from 'react-icons/hi';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/login';
import { clearCart } from '../../features/addToCart';
import AddToCartPage from './AddToCartPage';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const localStorageData = JSON.parse(localStorage.getItem("loginData")) || [];
  const loginStatus = localStorageData.some(data => data.isLogin);
  const accountDetail = localStorageData.find(data => data.isLogin === true) || null;

  const cartItems = useSelector(state => state.cart);
  const totalQty = cartItems.reduce((t, i) => t + (i.quantity || 1), 0);

  const linkStyles = ({ isActive }) =>
    isActive
      ? 'text-white border-b-2 border-red-500 pb-1 font-black transition-all'
      : 'text-gray-400 hover:text-white transition-all duration-200 pb-1';

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCart());
    setAccountOpen(false);
    navigate('/signUp');
  };

  return (
    <>
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

          {/* Action Icons */}
          <div className="flex items-center gap-6 text-gray-400 text-lg">
            <ImSearch className="hover:text-white cursor-pointer transition-colors duration-200" />

            {/* Cart Icon */}
            <div
              className="relative cursor-pointer hover:text-white transition-colors duration-200"
              onClick={() => {
                if (!loginStatus) { navigate('/login'); return; }
                setCartOpen(!cartOpen);
                setAccountOpen(false);
              }}
            >
              <CgShoppingCart className="text-xl" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {totalQty}
              </span>
            </div>

            {/* Profile */}
            {loginStatus ? (
              <div className="relative">
                <BsFillPersonFill
                  className="hover:text-white cursor-pointer transition-colors duration-200 hidden sm:block text-xl"
                  onClick={() => setAccountOpen(!accountOpen)}
                />
                {accountOpen && (
                  <div className="absolute right-0 mt-3 w-48 bg-[#141417] border border-white/5 rounded-xl shadow-2xl py-2 z-50 backdrop-blur-md">
                    <div className="px-4 py-2 border-b border-white/5">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Active Crew</p>
                      <p className="text-sm text-white font-black uppercase tracking-wide truncate mt-0.5">
                        {accountDetail?.name || "GUEST"}
                      </p>
                    </div>
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

            {/* Mobile Menu Button */}
            <button onClick={() => setIsOpen(!isOpen)} className="text-white text-2xl md:hidden focus:outline-hidden cursor-pointer">
              {isOpen ? <HiX /> : <HiMenuAlt3 />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        <div className={`md:hidden fixed top-16 left-0 w-full bg-[#0f0f11] border-b border-white/5 transition-all duration-300 ease-in-out z-40 ${isOpen ? 'opacity-100 visible h-auto py-6' : 'opacity-0 invisible h-0 overflow-hidden'}`}>
          <ul className="flex flex-col gap-5 items-center text-sm tracking-widest uppercase font-bold">
            <li><NavLink to="/" onClick={() => setIsOpen(false)} className={linkStyles}>Home</NavLink></li>
            <li><NavLink to="/new-arrivals" onClick={() => setIsOpen(false)} className={linkStyles}>New Arrival</NavLink></li>
            <li><NavLink to="/men" onClick={() => setIsOpen(false)} className={linkStyles}>Men wear</NavLink></li>
            <li><NavLink to="/about" onClick={() => setIsOpen(false)} className={linkStyles}>About</NavLink></li>

            {loginStatus ? (
              <li className="pt-4 border-t border-white/5 w-4/5 text-center flex flex-col gap-2">
                <span className="text-xs text-gray-400 font-black uppercase">{accountDetail?.name}</span>
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

      {/* Cart Drawer */}
      <div className={`fixed top-0 right-0 h-screen w-full sm:w-100 bg-[#121214] border-l border-white/5 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <AddToCartPage onClose={() => setCartOpen(false)} />
      </div>
    </>
  );
}

export default Navbar;

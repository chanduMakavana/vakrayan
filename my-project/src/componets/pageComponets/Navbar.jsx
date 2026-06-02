import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { ImSearch } from 'react-icons/im';
import { CgShoppingCart } from 'react-icons/cg';
import { BsFillPersonFill } from 'react-icons/bs';
import { HiMenuAlt3, HiX } from 'react-icons/hi';
import { useDispatch, useSelector } from 'react-redux';
import { logout as logoutAction } from '../../features/login'; 
import authService from '../../appwrite/auth';
import { AiOutlineClose } from "react-icons/ai";
import { clearCartState } from '../../features/addToCart';




function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Retrieve auth state from Redux store and Appwrite cloud session
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const cartItems = useSelector(state => state.cart || []);
  const cartCount = cartItems.reduce((acc, item) => acc + Number(item.quantity || 0), 0);

  const cleanAdminEmail = import.meta.env.VITE_ADMIN_EMAIL 
    ? import.meta.env.VITE_ADMIN_EMAIL.replace(/['"]/g, '') 
    : '';
  const isAdmin = isAuthenticated && user && (
    user.email === "makwanachandu480@gmail.com" || 
    user.email === import.meta.env.VITE_ADMIN_EMAIL ||
    user.email === cleanAdminEmail
  );

  const linkStyles = ({ isActive }) =>
    isActive
      ? 'text-neutral-900 border-b-2 border-[var(--theme-primary)] pb-1 font-black transition-all'
      : 'text-neutral-500 hover:text-neutral-900 transition-all duration-200 pb-1';

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchVal.trim())}`);
      setSearchOpen(false);
      setSearchVal('');
    }
  };

  const handleLogout = async () => {
    try {
      // Terminate cloud authentication session gracefully
      await authService.logout();
    } catch (error) {
      console.log("Navbar logout cloud ignore:", error);
    } finally {
      // Clean up local store and state
      dispatch(logoutAction());
      dispatch(clearCartState());
      setAccountOpen(false);
      setIsOpen(false);
      navigate('/login');
    }
  };

  return (
    <>
      <nav className="bg-white/90 border-b border-neutral-200/60 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex justify-between items-center capitalize font-semibold">

          {/* Brand Logo */}
          <div className="text-xl font-black uppercase tracking-widest text-neutral-900">
            <Link to="/">
              STREET<span className="text-[var(--theme-primary)]">-</span>WEAR
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:block">
            <ul className="flex gap-6 text-[10px] tracking-[0.2em] font-black uppercase">
              <li><NavLink to="/" className={linkStyles}>Home</NavLink></li>
              <li><NavLink to="/shop" className={linkStyles}>Men</NavLink></li>
              <li><NavLink to="/category/oversized-tshirt" className={linkStyles}>Oversized T-Shirt</NavLink></li>
              <li><NavLink to="/category/printed-tshirt" className={linkStyles}>Printed T-Shirt</NavLink></li>
              <li><NavLink to="/category/shirts" className={linkStyles}>Shirts</NavLink></li>
            </ul>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-6 text-neutral-500 text-lg">
            <ImSearch className="hover:text-neutral-900 cursor-pointer transition-colors duration-200" onClick={() => setSearchOpen(!searchOpen)} />



            {/* Cart Icon */}
            <div
              className="relative cursor-pointer hover:text-neutral-900 transition-colors duration-200 animate-fade-in"
              onClick={() => {
                if (!isAuthenticated) { navigate('/login'); return; }
                navigate('/cart');
              }}
            >
              <CgShoppingCart className="text-xl" />
              {isAuthenticated && cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[var(--theme-primary)] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {cartCount}
                </span>
              )}
            </div>

            {/* Profile Component */}
            {isAuthenticated && user ? (
              <div className="relative">
                <BsFillPersonFill
                  className="hover:text-neutral-900 cursor-pointer transition-colors duration-200 hidden sm:block text-xl"
                  onClick={() => setAccountOpen(!accountOpen)}
                />
                {accountOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white border border-neutral-200/80 rounded-xl shadow-2xl py-2 z-50 backdrop-blur-md">
                    <div className="px-4 py-2 border-b border-neutral-100">
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Active Crew</p>
                      <p className="text-sm text-neutral-900 font-black uppercase tracking-wide truncate mt-0.5">
                        {user.name || "GUEST"}
                      </p>
                      <p className='text-xs lowercase text-neutral-500'>{user.email}</p>
                      
                      <div className="flex gap-2 mt-2">
                        <Link to="/profile" onClick={() => setAccountOpen(false)} className="text-[10px] text-neutral-900 hover:text-white hover:bg-neutral-900 py-1 px-2 rounded-md inline-block uppercase font-bold tracking-wider transition-colors border border-neutral-200">
                          My Profile
                        </Link>

                        {/* Render Admin Panel link if authorized */}
                        {isAdmin && (
                          <Link to="/admin" onClick={() => setAccountOpen(false)} className="text-[10px] text-[var(--theme-primary)] hover:text-white hover:bg-[var(--theme-primary)] py-1 px-2 rounded-md inline-block uppercase font-bold tracking-wider transition-colors border border-[var(--theme-primary)]/30">
                            Admin Panel
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg transition-all duration-150 uppercase tracking-wider cursor-pointer"
                      >
                        Sign Out &rarr;
                      </button>
                    </div>
                    <div className='absolute top-2 right-2 p-1 text-neutral-400 hover:text-neutral-950 cursor-pointer'>
                      <AiOutlineClose 
                      onClick={()=>setAccountOpen(false)}/>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login">
                <BsFillPersonFill className="hover:text-neutral-900 cursor-pointer transition-colors duration-200 hidden sm:block text-xl" />
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button onClick={() => setIsOpen(!isOpen)} className="text-neutral-800 text-2xl lg:hidden focus:outline-hidden cursor-pointer">
              {isOpen ? <HiX /> : <HiMenuAlt3 />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        <div className={`lg:hidden fixed top-18.25 left-0 w-full bg-white border-b border-neutral-200/60 transition-all duration-300 ease-in-out z-40 ${isOpen ? 'opacity-100 visible h-auto py-6' : 'opacity-0 invisible h-0 overflow-hidden'}`}>
          <ul className="flex flex-col gap-5 items-center text-sm tracking-widest uppercase font-bold">
            <li><NavLink to="/" onClick={() => setIsOpen(false)} className={linkStyles}>Home</NavLink></li>
            <li><NavLink to="/shop" onClick={() => setIsOpen(false)} className={linkStyles}>Men</NavLink></li>
            <li><NavLink to="/category/oversized-tshirt" onClick={() => setIsOpen(false)} className={linkStyles}>Oversized T-Shirt</NavLink></li>
            <li><NavLink to="/category/printed-tshirt" onClick={() => setIsOpen(false)} className={linkStyles}>Printed T-Shirt</NavLink></li>
            <li><NavLink to="/category/shirts" onClick={() => setIsOpen(false)} className={linkStyles}>Shirts</NavLink></li>

            {isAuthenticated && user ? (
              <li className="pt-4 border-t border-neutral-200/60 w-4/5 text-center flex flex-col gap-2">
                <span className="text-xs text-neutral-800 font-black uppercase">{user.name}</span>
                <span className="text-xs text-neutral-500 font-light lowercase">{user.email}</span>
                <Link to="/profile" onClick={() => setIsOpen(false)} className="text-xs font-black text-neutral-900 uppercase tracking-widest mt-1">
                  My Profile
                </Link>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setIsOpen(false)} className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest">
                    Admin Panel
                  </Link>
                )}
                <button onClick={handleLogout} className="text-xs font-black text-rose-600 uppercase tracking-widest mt-1">
                  Log Out
                </button>
              </li>
            ) : (
              <li className="pt-4 border-t border-neutral-200/60 w-4/5 text-center">
                <NavLink to="/login" onClick={() => setIsOpen(false)} className={linkStyles}>Create Account</NavLink>
              </li>
            )}
          </ul>
        </div>
      </nav>

      {/* Dynamic Slide-down Search Bar */}
      <div className={`bg-neutral-900 text-white z-45 sticky top-18.25 transition-all duration-300 ease-in-out overflow-hidden ${searchOpen ? 'max-h-16 py-3 border-b border-neutral-800 shadow-xl' : 'max-h-0 py-0'}`}>
        <form onSubmit={handleSearchSubmit} className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between gap-4">
          <input 
            type="text" 
            placeholder="TYPE STYLE & PRESS ENTER TO SEARCH..." 
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="bg-transparent border-b border-neutral-700 focus:border-white text-xs tracking-widest font-black uppercase py-2 outline-hidden w-full text-white placeholder-neutral-500"
          />
          <button type="submit" className="text-[10px] font-black tracking-widest text-[var(--theme-primary)] hover:text-white uppercase transition-colors shrink-0">SEARCH</button>
        </form>
      </div>
    </>
  );
}

export default Navbar;

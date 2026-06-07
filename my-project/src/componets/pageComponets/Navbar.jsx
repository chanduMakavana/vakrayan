import { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { ImSearch } from 'react-icons/im';
import { CgShoppingCart } from 'react-icons/cg';
import { BsFillPersonFill, BsHeart, BsHeartFill } from 'react-icons/bs';
import { HiMenuAlt3, HiX, HiPlus, HiMinus } from 'react-icons/hi';
import { useDispatch, useSelector } from 'react-redux';
import { logout as logoutAction, toggleAdminMode } from '../../features/login'; 
import authService from '../../appwrite/auth';
import cartService from '../../appwrite/cart';
import productsService from '../../appwrite/products';
import { AiOutlineClose } from "react-icons/ai";
import { clearCartState, addCartItemState, updateCartItemState, removeCartItemState, setCartItems } from '../../features/addToCart';
import { setWishlistItems, addWishlistItemState, removeWishlistItemState, clearWishlistState } from '../../features/wishlistSlice';
import { motion } from 'framer-motion';
import wishlistService from '../../appwrite/wishlist';
import { useToast } from '../../context/ToastContext';




function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Retrieve auth state from Redux store and Appwrite cloud session (hoisted for scoping checks)
  const { user, isAuthenticated, adminMode } = useSelector(state => state.auth);
  const cartItems = useSelector(state => state.cart || []);
  const products = useSelector(state => state.products.items || []);
  const cartCount = cartItems.reduce((acc, item) => acc + Number(item.quantity || 0), 0);

  const [isOpen, setIsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  // Search autocomplete suggestions
  const suggestions = searchVal.trim().length >= 2
    ? products.filter(p => {
        const query = searchVal.toLowerCase();
        return (
          (p.name && p.name.toLowerCase().includes(query)) ||
          (p.category && p.category.toLowerCase().includes(query))
        );
      }).slice(0, 6)
    : [];

  // Extended Interactive States (Cart & Wishlist Drawers)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [wishlistDrawerOpen, setWishlistDrawerOpen] = useState(false);
  const [animateCart, setAnimateCart] = useState(false);
  const [animateWishlist, setAnimateWishlist] = useState(false);
  const [removingIds, setRemovingIds] = useState(new Set());

  const wishlist = useSelector(state => state.wishlist || []);

  // Hydrate Redux wishlist from localStorage on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
    dispatch(setWishlistItems(saved));
  }, [dispatch]);

  // Sync wishlist with Appwrite cloud database upon authentication
  useEffect(() => {
    async function syncWishlistCloud() {
      if (isAuthenticated && user) {
        try {
          const localSaved = JSON.parse(localStorage.getItem('wishlist')) || [];
          const cloudDocs = await wishlistService.syncWishlist(user.$id, localSaved);
          
          const mergedList = [];
          cloudDocs.forEach(doc => {
            const foundProd = products.find(p => (p.$id || p.id) === doc.productId);
            if (foundProd) {
              mergedList.push(foundProd);
            }
          });
          
          if (mergedList.length > 0) {
            localStorage.setItem('wishlist', JSON.stringify(mergedList));
            dispatch(setWishlistItems(mergedList));
          }
        } catch (err) {
          console.error("Failed to sync cloud wishlist:", err);
        }
      }
    }
    if (products.length > 0) {
      syncWishlistCloud();
    }
  }, [isAuthenticated, user, products, dispatch]);

  const handleToggleWishlist = async (product) => {
    const productId = product.$id || product.id;
    const exists = wishlist.some(item => (item.$id || item.id) === productId);
    let updated;
    setAnimateWishlist(true);
    setTimeout(() => setAnimateWishlist(false), 300);

    if (exists) {
      dispatch(removeWishlistItemState(productId));
      const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
      updated = saved.filter(item => (item.$id || item.id) !== productId);
      localStorage.setItem('wishlist', JSON.stringify(updated));
      if (isAuthenticated && user) {
        try {
          await wishlistService.removeFromWishlist(user.$id, productId);
        } catch (e) {
          console.warn("⚠️ Appwrite wishlist cloud sync failed:", e.message);
        }
      }
    } else {
      dispatch(addWishlistItemState(product));
      const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
      updated = [...saved, product];
      localStorage.setItem('wishlist', JSON.stringify(updated));
      if (isAuthenticated && user) {
        try {
          await wishlistService.addToWishlist(user.$id, productId);
        } catch (e) {
          console.warn("⚠️ Appwrite wishlist cloud sync failed:", e.message);
        }
      }
    }
  };

  // Debounced search logic (350ms duration)
  useEffect(() => {
    if (!searchOpen) return;
    const timer = setTimeout(() => {
      if (searchVal.trim()) {
        navigate(`/shop?search=${encodeURIComponent(searchVal.trim())}`);
      } else {
        navigate(`/shop`);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchVal, searchOpen, navigate]);

  // Listen to cart additions for spring micro-animations
  useEffect(() => {
    const triggerCartAnim = () => {
      setAnimateCart(true);
      setTimeout(() => setAnimateCart(false), 300);
    };
    window.addEventListener('cart-item-added', triggerCartAnim);
    return () => window.removeEventListener('cart-item-added', triggerCartAnim);
  }, []);



  const handleMoveToCart = async (product) => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }
    try {
      const size = 'M'; // Default size
      const existsInCart = cartItems.find(i => i.product_id === (product.$id || product.id) && i.size === size);
      if (existsInCart) {
        const newQty = Number(existsInCart.quantity) + 1;
        const sub = Number(existsInCart.price) * newQty;
        await cartService.updateCartItem(existsInCart.$id, { quantity: newQty, subtotal: sub });
        dispatch(updateCartItemState({ $id: existsInCart.$id, quantity: newQty, subtotal: sub }));
      } else {
        const cartPayload = {
          userId: user.$id,
          product_id: product.$id || product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1,
          subtotal: Number(product.price),
          product_Image: product.front_image_link || product.image_url || product.product_Image || product.product_image || product.image || 'https://placehold.co/400x500',
          size: size
        };
        const response = await cartService.addToCart(cartPayload);
        if (response) {
          dispatch(addCartItemState(response));
        } else {
          const mockDoc = { $id: 'item_' + Date.now(), ...cartPayload };
          dispatch(addCartItemState(mockDoc));
        }
      }
      handleToggleWishlist(product);
      showToast(`🛍️ "${product.name}" moved to shopping bag!`, "success");
    } catch (error) {
      console.error("Move to cart drawer issue:", error);
    }
  };

  const handleCartQuantityShift = async (item, operation) => {
    try {
      let targetQuantity = Number(item.quantity);
      if (operation === 'increase') {
        let availableStock = 10;
        try {
          const liveProduct = await productsService.getProductById(item.product_id);
          if (liveProduct) {
            let stocks = {};
            try {
              stocks = JSON.parse(liveProduct.sizes_stock || '{}');
            } catch {
              stocks = {};
            }
            const baseSize = item.size ? String(item.size).split('/')[0].trim() : 'M';
            availableStock = stocks[baseSize] !== undefined ? Number(stocks[baseSize]) : 10;
          }
        } catch (err) {
          console.warn("Live stock check failed, falling back to cache:", err.message);
          const prod = products.find(p => p.$id === item.product_id || p.id === item.product_id);
          if (prod) {
            let stocks = {};
            try {
              stocks = JSON.parse(prod.sizes_stock || '{}');
            } catch {
              stocks = {};
            }
            const baseSize = item.size ? String(item.size).split('/')[0].trim() : 'M';
            availableStock = stocks[baseSize] !== undefined ? Number(stocks[baseSize]) : 10;
          }
        }

        if (targetQuantity + 1 > availableStock) {
          showToast(`Cannot increase quantity. Only ${availableStock} items left in stock for size ${item.size}.`, "error");
          return;
        }
        targetQuantity += 1;
      }
      if (operation === 'decrease') targetQuantity -= 1;

      if (targetQuantity < 1) {
        dispatch(removeCartItemState(item.$id));
        await cartService.removeFromCart(item.$id);
        return;
      }

      const calculatedSubtotal = Number(item.price) * targetQuantity;
      dispatch(updateCartItemState({ $id: item.$id, quantity: targetQuantity, subtotal: calculatedSubtotal }));
      await cartService.updateCartItem(item.$id, {
        quantity: targetQuantity,
        subtotal: calculatedSubtotal
      });
    } catch (error) {
      console.error("Failed to alter drawer cart quantity:", error);
      if (user && user.$id) {
        cartService.getCartItems(user.$id)
          .then(items => dispatch(setCartItems(items)))
          .catch(e => console.error("Rollback cart fetch failed:", e));
      }
    }
  };

  const handleCartRemove = async (documentId) => {
    if (removingIds.has(documentId)) return;
    setRemovingIds(prev => {
      const next = new Set(prev);
      next.add(documentId);
      return next;
    });

    try {
      dispatch(removeCartItemState(documentId));
      await cartService.removeFromCart(documentId);
    } catch (error) {
      console.error("Failed to extract item from drawer:", error);
      if (user && user.$id) {
        cartService.getCartItems(user.$id)
          .then(items => dispatch(setCartItems(items)))
          .catch(e => console.error("Rollback cart fetch failed:", e));
      }
    } finally {
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    }
  };

  // Admin check: single env-var lookup — no hardcoded emails in source
  const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || '').replace(/['"]/g, '').trim()
  const isAdmin = isAuthenticated && user && adminEmail && user.email === adminEmail

  const linkStyles = ({ isActive }) =>
    isActive
      ? 'text-neutral-950 underline underline-offset-8 decoration-1 decoration-neutral-950 font-bold transition-all duration-300'
      : 'text-neutral-400 hover:text-neutral-950 transition-all duration-300';

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
      // Clean up local store, wishlist, and state
      dispatch(logoutAction());
      dispatch(clearCartState());
      localStorage.removeItem('wishlist'); // Prevent wishlist leaking between users on shared devices
      dispatch(clearWishlistState());
      setAccountOpen(false);
      setIsOpen(false);
      navigate('/login');
    }
  };

  return (
    <>
      <nav className="bg-white sticky top-0 z-50 border-b border-neutral-950/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex justify-between items-center capitalize font-semibold">

          {/* Brand Logo */}
          <div className="text-sm font-mono font-black uppercase tracking-[0.35em] text-neutral-950">
            <Link to="/">
              STREETWEAR
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:block">
            <ul className="flex gap-8 text-[11px] tracking-[0.2em] font-bold uppercase font-sans">
              <li><NavLink to="/" className={linkStyles}>Home</NavLink></li>
              <li><NavLink to="/shop" className={linkStyles}>Men</NavLink></li>
              <li><NavLink to="/category/oversized-tshirt" className={linkStyles}>Oversized T-Shirt</NavLink></li>
              <li><NavLink to="/category/printed-tshirt" className={linkStyles}>Printed T-Shirt</NavLink></li>
              <li><NavLink to="/category/shirts" className={linkStyles}>Shirts</NavLink></li>
            </ul>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-6 text-neutral-500 text-lg">
            {/* Admin Mode Toggle Switch */}
            {isAdmin && (
              <div className="flex items-center gap-2 mr-1">
                <span className="text-[9px] font-mono font-black tracking-widest text-neutral-450 uppercase select-none">
                  ADMIN
                </span>
                <button
                  onClick={() => dispatch(toggleAdminMode())}
                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-250 ease-in-out focus:outline-hidden ${
                    adminMode ? 'bg-neutral-950' : 'bg-neutral-200'
                  }`}
                  title={adminMode ? "Disable Admin Mode" : "Enable Admin Mode"}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-250 ease-in-out ${
                      adminMode ? 'translate-x-3' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}

            <ImSearch className="hover:text-neutral-900 cursor-pointer transition-colors duration-200" onClick={() => setSearchOpen(!searchOpen)} />



            {/* Wishlist Heart Icon */}
            <div
              className="relative cursor-pointer hover:text-neutral-900 transition-colors duration-200"
              onClick={() => {
                if (!isAuthenticated) { navigate('/login'); return; }
                setWishlistDrawerOpen(true);
              }}
            >
              {wishlist.length > 0 ? (
                <BsHeartFill className="text-xl text-[var(--theme-primary)] animate-pulse" />
              ) : (
                <BsHeart className="text-xl hover:text-rose-500" />
              )}
              {wishlist.length > 0 && (
                <motion.span 
                  animate={animateWishlist ? { scale: [1, 1.4, 1] } : {}}
                  transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  className="absolute -top-2 -right-2 bg-neutral-900 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center"
                >
                  {wishlist.length}
                </motion.span>
              )}
            </div>

            {/* Cart Icon (Toggles Sidebar Drawer) */}
            <div
              className="relative cursor-pointer hover:text-neutral-900 transition-colors duration-200 animate-fade-in"
              onClick={() => {
                if (!isAuthenticated) { navigate('/login'); return; }
                setCartDrawerOpen(true);
              }}
            >
              <CgShoppingCart className="text-xl" />
              {isAuthenticated && cartCount > 0 && (
                <motion.span 
                  animate={animateCart ? { scale: [1, 1.4, 1] } : {}}
                  transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  className="absolute -top-2 -right-2 bg-[var(--theme-primary)] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse"
                >
                  {cartCount}
                </motion.span>
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
                  <div className="absolute right-0 mt-3 w-56 bg-white border border-neutral-950 rounded-none py-2 z-50">
                    <div className="px-4 py-2 border-b border-neutral-950/10">
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest font-mono">Active Crew</p>
                      <p className="text-sm text-neutral-950 font-black uppercase tracking-wide truncate mt-0.5">
                        {user.name || "GUEST"}
                      </p>
                      <p className='text-xs lowercase text-neutral-500 font-mono'>{user.email}</p>
                      
                      <div className="flex gap-2 mt-2">
                        <Link to="/profile" onClick={() => setAccountOpen(false)} className="text-[10px] text-neutral-950 hover:bg-neutral-950 hover:text-white py-1.5 px-2.5 rounded-none inline-block uppercase font-bold tracking-wider transition-colors border border-neutral-950">
                          My Profile
                        </Link>

                        {/* Render Admin Panel link if authorized */}
                        {isAdmin && (
                          <Link to="/admin" onClick={() => setAccountOpen(false)} className="text-[10px] text-neutral-950 hover:bg-neutral-950 hover:text-white py-1.5 px-2.5 rounded-none inline-block uppercase font-bold tracking-wider transition-colors border border-neutral-950">
                            Admin Panel
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-none transition-all duration-150 uppercase tracking-wider cursor-pointer font-mono"
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
        <div className={`lg:hidden fixed top-[73px] left-0 w-full bg-white border-b border-neutral-200/60 transition-all duration-300 ease-in-out z-40 ${isOpen ? 'opacity-100 visible h-auto py-6' : 'opacity-0 invisible h-0 overflow-hidden'}`}>
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
                
                {isAdmin && (
                  <div className="flex justify-center items-center gap-3 py-2 border-y border-neutral-100 my-1">
                    <span className="text-[10px] font-mono font-black tracking-widest text-neutral-450 uppercase select-none">
                      ADMIN MODE
                    </span>
                    <button
                      onClick={() => dispatch(toggleAdminMode())}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-250 ease-in-out focus:outline-hidden ${
                        adminMode ? 'bg-neutral-950' : 'bg-neutral-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-250 ease-in-out ${
                          adminMode ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}

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
      <div className={`bg-white text-neutral-950 z-45 sticky top-[73px] transition-all duration-300 ease-in-out ${searchOpen ? 'max-h-16 py-3 border-b border-neutral-950 overflow-visible' : 'max-h-0 py-0 overflow-hidden'}`}>
        <form onSubmit={handleSearchSubmit} className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between gap-4 relative">
          <input 
            type="text" 
            placeholder="TYPE TO SEARCH THE STYLES ARCHIVE..." 
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="bg-transparent border-b border-neutral-200 focus:border-neutral-950 text-xs tracking-widest font-mono uppercase py-2 outline-hidden w-full text-neutral-950 placeholder-neutral-400"
          />
          <button type="submit" className="text-[10px] font-mono font-bold tracking-widest bg-neutral-950 border border-neutral-950 text-white px-4 py-2 hover:bg-white hover:text-neutral-950 transition-colors uppercase shrink-0 rounded-none">SEARCH</button>

          {/* Autocomplete Dropdown suggestions */}
          {searchVal.trim().length >= 2 && (
            <div className="absolute top-full left-6 right-6 md:left-12 md:right-12 mt-3 bg-white/95 backdrop-blur-md border border-neutral-950/15 shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-neutral-100 no-print rounded-none">
              {suggestions.length > 0 ? (
                suggestions.map((p) => {
                  const img = p.front_image_link || p.image_url || p.product_Image || p.product_image || p.image || 'https://placehold.co/100x125';
                  return (
                    <div 
                      key={p.$id || p.id}
                      onClick={() => {
                        navigate(`/product/${p.$id || p.id}`);
                        setSearchOpen(false);
                        setSearchVal('');
                      }}
                      className="flex items-center gap-4 p-3.5 hover:bg-neutral-50 cursor-pointer transition-all duration-150 text-left"
                    >
                      <img 
                        src={img} 
                        alt={p.name} 
                        className="w-10 h-12 object-cover border border-neutral-200 shrink-0 bg-neutral-50"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black uppercase tracking-wider text-neutral-950 truncate">
                          {p.name}
                        </h4>
                        <p className="text-[9px] font-mono font-bold text-neutral-450 uppercase tracking-widest mt-0.5">
                          {p.category || 'Styles Archive'}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-black text-neutral-950 shrink-0">
                        ₹{Number(p.price).toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-[0.2em]">
                  No matching styles found in archive
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Sidebar Cart Drawer */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ease-in-out ${cartDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setCartDrawerOpen(false)}></div>
        
        {/* Drawer Content */}
        <div className={`absolute top-0 right-0 h-full w-full sm:w-[450px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${cartDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          {/* Header */}
          <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-neutral-900">
              🛍️ SHOPPING BAG ({cartCount})
            </h3>
            <button 
              onClick={() => setCartDrawerOpen(false)}
              className="text-neutral-400 hover:text-neutral-900 p-2 transition-colors cursor-pointer"
            >
              <HiX className="text-xl" />
            </button>
          </div>

          {/* Cart Items list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <CgShoppingCart className="text-5xl text-neutral-300 animate-bounce" />
                <p className="text-xs uppercase tracking-widest font-mono font-bold text-neutral-400">
                  Your cart is empty
                </p>
                <button 
                  onClick={() => { setCartDrawerOpen(false); navigate('/shop'); }}
                  className="bg-neutral-950 text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-none hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Shop Now
                </button>
              </div>
            ) : (
              cartItems.map((item) => {
                const matchingProd = products.find(p => p.$id === item.product_id || p.id === item.product_id);
                const imgUrl = item.product_Image || item.product_image || item.image || item.front_image_link || item.image_url || matchingProd?.front_image_link || matchingProd?.image_url || matchingProd?.image || 'https://placehold.co/100x125';
                
                return (
                  <div key={item.$id} className="flex gap-4 p-4 border border-neutral-950/10 rounded-none hover:border-neutral-950 transition-all duration-200">
                    <img 
                      src={imgUrl} 
                      alt={item.name} 
                      className="w-20 h-24 object-cover rounded-none border border-neutral-200 shrink-0"
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-950 line-clamp-2">
                            {item.name}
                          </h4>
                          <button 
                            onClick={() => handleCartRemove(item.$id)}
                            disabled={removingIds.has(item.$id)}
                            className="text-rose-500 hover:text-rose-700 transition-colors p-1 cursor-pointer disabled:opacity-50"
                          >
                            {removingIds.has(item.$id) ? (
                              <span className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-none animate-spin block" />
                            ) : (
                              <HiX className="text-base" />
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1 font-mono">
                          Size: {item.size || 'M'} | ₹{item.price}
                        </p>
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center border border-neutral-950/15 rounded-none overflow-hidden bg-neutral-50">
                          <button 
                            onClick={() => handleCartQuantityShift(item, 'decrease')}
                            className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                          >
                            <HiMinus className="text-xs" />
                          </button>
                          <span className="px-3 text-xs font-mono font-bold text-neutral-900">
                            {item.quantity}
                          </span>
                          <button 
                            onClick={() => handleCartQuantityShift(item, 'increase')}
                            className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                          >
                            <HiPlus className="text-xs" />
                          </button>
                        </div>
                        <span className="text-xs font-mono font-bold text-neutral-900">
                          ₹{item.subtotal}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Checkout Summary */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-neutral-950/10 bg-neutral-50/50 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest font-mono">
                  Subtotal
                </span>
                <span className="text-base font-mono font-bold text-neutral-900">
                  ₹{cartItems.reduce((acc, item) => acc + Number(item.subtotal || 0), 0)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link
                  to="/cart"
                  onClick={() => setCartDrawerOpen(false)}
                  className="w-full py-3 bg-white border border-neutral-950 hover:bg-neutral-50 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-neutral-950 rounded-none text-center transition-all cursor-pointer"
                >
                  View Cart
                </Link>
                <button
                  onClick={() => {
                    setCartDrawerOpen(false);
                    navigate('/checkout');
                  }}
                  className="w-full py-3 bg-neutral-950 hover:bg-neutral-800 text-white text-[10px] font-mono font-bold uppercase tracking-[0.15em] rounded-none text-center transition-all cursor-pointer"
                >
                  Checkout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Wishlist Drawer */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ease-in-out ${wishlistDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setWishlistDrawerOpen(false)}></div>
        
        {/* Drawer Content */}
        <div className={`absolute top-0 right-0 h-full w-full sm:w-[450px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${wishlistDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          {/* Header */}
          <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-neutral-900">
              ❤️ WISHLIST ({wishlist.length})
            </h3>
            <button 
              onClick={() => setWishlistDrawerOpen(false)}
              className="text-neutral-400 hover:text-neutral-900 p-2 transition-colors cursor-pointer"
            >
              <HiX className="text-xl" />
            </button>
          </div>

          {/* Wishlist Items list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {wishlist.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <BsHeart className="text-5xl text-neutral-300 animate-pulse text-rose-300" />
                <p className="text-xs uppercase tracking-widest font-mono font-bold text-neutral-400">
                  Your wishlist is empty
                </p>
                <button 
                  onClick={() => { setWishlistDrawerOpen(false); navigate('/shop'); }}
                  className="bg-neutral-950 text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-none hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  View Fits
                </button>
              </div>
            ) : (
              wishlist.map((item) => (
                <div key={item.$id || item.id} className="flex gap-4 p-4 border border-neutral-950/10 rounded-none hover:border-neutral-950 transition-all duration-200">
                  <img 
                    src={item.front_image_link || item.image_url || item.product_Image || item.product_image || item.image || 'https://placehold.co/100x125'} 
                    alt={item.name} 
                    className="w-20 h-24 object-cover rounded-none border border-neutral-200 shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-950 line-clamp-2">
                          {item.name}
                        </h4>
                        <button 
                          onClick={() => handleToggleWishlist(item)}
                          className="text-rose-500 hover:text-rose-700 transition-colors p-1 cursor-pointer"
                        >
                          <HiX className="text-base" />
                        </button>
                      </div>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1 font-mono">
                        ₹{item.price}
                      </p>
                    </div>

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleMoveToCart(item)}
                        className="flex-1 py-2 bg-neutral-950 hover:bg-neutral-800 text-white text-[9px] font-bold uppercase tracking-wider rounded-none text-center transition-all cursor-pointer"
                      >
                        Move to Bag
                      </button>
                      <button
                        onClick={() => {
                          setWishlistDrawerOpen(false);
                          navigate(`/product/${item.$id || item.id}`);
                        }}
                        className="py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[9px] font-bold uppercase tracking-wider rounded-none transition-all cursor-pointer"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Navbar;

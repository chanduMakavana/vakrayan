import { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { logout as logoutAction, toggleAdminMode } from '../../features/login';
import authService from '../../appwrite/auth';
import cartService from '../../appwrite/cart';
import productsService from '../../appwrite/products';
import { clearCartState, addCartItemState, updateCartItemState, removeCartItemState, setCartItems } from '../../features/addToCart';
import { setWishlistItems, addWishlistItemState, removeWishlistItemState, clearWishlistState } from '../../features/wishlistSlice';
import wishlistService from '../../appwrite/wishlist';
import { useToast } from '../../context/ToastContext';
import { filterProductsForMode } from '../../features/productsSlice';
import { calculateOffersDiscount } from '../../utils/discountCalculator';
import { generateGuestCartId, loadGuestCartItems, saveGuestCartItems } from '../../utils/guestCartHelper';

// Icons (inline SVGs — no extra dependency)
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const HeartIcon = ({ filled }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);
const BagIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);
const UserIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const CloseIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const MinusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

// Drawer animation variants
const drawerVariants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } },
  exit:   { x: '100%', transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } },
};

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};

const dropdownVariants = {
  hidden:  { opacity: 0, y: -8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.15 } },
};

const mobileMenuVariants = {
  hidden:  { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto', transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, height: 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

/* ── Drawer shared structure ─────────────────────────────── */
const DrawerWrapper = ({ open, onClose, children }) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-[200]">
        <motion.div
          key="backdrop"
          variants={backdropVariants}
          initial="hidden" animate="visible" exit="exit"
          className="absolute inset-0 bg-black/30 backdrop-blur-xs"
          onClick={onClose}
        />
        <motion.div
          key="drawer"
          variants={drawerVariants}
          initial="hidden" animate="visible" exit="exit"
          className="absolute top-0 right-0 h-full w-full sm:w-[420px] flex flex-col"
          style={{ 
            background: 'var(--glass-bg-heavy)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            boxShadow: 'var(--shadow-xl)',
            borderLeft: '1px solid var(--glass-border-green)'
          }}
        >
          {children}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);



function Navbar() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const { showToast } = useToast();
  const searchRef  = useRef(null);

  const { user, isAuthenticated, adminMode } = useSelector(s => s.auth);
  const cartItems  = useSelector(s => s.cart || []);
  const products   = useSelector(s => s.products.items || []);
  const wishlist   = useSelector(s => s.wishlist || []);
  const cartCount  = cartItems.reduce((acc, i) => acc + Number(i.quantity || 0), 0);

  const [isOpen,            setIsOpen]            = useState(false);
  const [accountOpen,       setAccountOpen]       = useState(false);
  const [searchOpen,        setSearchOpen]        = useState(false);
  const [searchVal,         setSearchVal]         = useState('');
  const [cartDrawerOpen,    setCartDrawerOpen]    = useState(false);
  const [wishlistDrawerOpen,setWishlistDrawerOpen]= useState(false);
  const [animateCart,       setAnimateCart]       = useState(false);
  const [animateWishlist,   setAnimateWishlist]   = useState(false);
  const [removingIds,       setRemovingIds]       = useState(new Set());
  const [collectionsOpen,   setCollectionsOpen]   = useState(false);
  const [recentlyViewed,    setRecentlyViewed]    = useState([]);


  // Selection Checkboxes State (store deselected items to automatically select new items)
  const [deselectedItemIds, setDeselectedItemIds] = useState(() => {
    const saved = sessionStorage.getItem('deselected_cart_item_ids');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (err) {
        console.warn("Failed to parse deselected cart item IDs in Navbar:", err);
      }
    }
    return [];
  });

  const selectedItemIds = cartItems.filter(item => !deselectedItemIds.includes(item.$id)).map(item => item.$id);

  // Load recently viewed products when wishlist drawer is opened
  useEffect(() => {
    if (wishlistDrawerOpen) {
      try {
        const viewedIds = JSON.parse(localStorage.getItem('recently_viewed')) || [];
        if (viewedIds.length > 0 && products.length > 0) {
          const list = viewedIds
            .map(id => products.find(p => (p.$id || p.id) === id))
            .filter(Boolean)
            .slice(0, 3);
          setTimeout(() => {
            setRecentlyViewed(list);
          }, 0);
        }
      } catch (e) {
        console.error("Error loading recently viewed:", e);
      }
    }
  }, [wishlistDrawerOpen, products]);



  // Close account dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('#account-menu')) setAccountOpen(false);
    };
    if (accountOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [accountOpen]);

  // Auto-focus search input
  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  // Block body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = (cartDrawerOpen || wishlistDrawerOpen || isOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [cartDrawerOpen, wishlistDrawerOpen, isOpen]);

  // Hydrate wishlist
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
    dispatch(setWishlistItems(saved));
  }, [dispatch]);

  // Sync wishlist cloud
  useEffect(() => {
    async function syncCloud() {
      if (!isAuthenticated || !user || products.length === 0) return;
      try {
        const local = JSON.parse(localStorage.getItem('wishlist')) || [];
        const docs  = await wishlistService.syncWishlist(user.$id, local);
        const merged = docs
          .map(d => products.find(p => (p.$id || p.id) === d.productId))
          .filter(Boolean);
        if (merged.length > 0) {
          localStorage.setItem('wishlist', JSON.stringify(merged));
          dispatch(setWishlistItems(merged));
        }
      } catch (e) { console.error('Wishlist cloud sync failed:', e); }
    }
    syncCloud();
  }, [isAuthenticated, user, products, dispatch]);

  // Cart add animation
  useEffect(() => {
    const trigger = () => { setAnimateCart(true); setTimeout(() => setAnimateCart(false), 400); };
    window.addEventListener('cart-item-added', trigger);
    return () => window.removeEventListener('cart-item-added', trigger);
  }, []);


  // Admin check
  const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || '').replace(/['"]/g, '').trim();
  const isAdmin    = isAuthenticated && user && adminEmail && user.email === adminEmail;

  // Search suggestions (keywords and products matching searchVal)
  const searchSuggestions = useMemo(() => {
    if (searchVal.trim().length < 2) return { keywords: [], products: [] };
    const q = searchVal.toLowerCase().trim();

    // 1. Filter products matching by name, category, tags, tag, or fit
    const matchedProducts = products.filter(p => {
      const nameMatch = p.name?.toLowerCase().includes(q);
      const categoryMatch = p.category?.toLowerCase().includes(q);
      const tagsMatch = Array.isArray(p.tags) && p.tags.some(t => t?.toLowerCase().includes(q));
      const singleTagMatch = p.tag?.toLowerCase().includes(q);
      const fitMatch = p.fit_type?.toLowerCase().includes(q);
      return nameMatch || categoryMatch || tagsMatch || singleTagMatch || fitMatch;
    });

    // 2. Extract unique matching keywords/tags/categories
    const keywordsSet = new Set();
    products.forEach(p => {
      if (p.category && p.category.toLowerCase().includes(q)) {
        keywordsSet.add(p.category.replace(/-/g, ' '));
      }
      if (Array.isArray(p.tags)) {
        p.tags.forEach(t => {
          if (t && t.toLowerCase().includes(q)) {
            keywordsSet.add(t);
          }
        });
      }
      if (p.tag && p.tag.toLowerCase().includes(q)) {
        keywordsSet.add(p.tag);
      }
      if (p.fit_type && p.fit_type.toLowerCase().includes(q)) {
        keywordsSet.add(p.fit_type);
      }
    });

    return {
      keywords: Array.from(keywordsSet).slice(0, 4),
      products: matchedProducts.slice(0, 6)
    };
  }, [searchVal, products]);

  const navLink = ({ isActive }) =>
    `relative text-[12px] font-semibold tracking-[0.06em] transition-base cursor-pointer px-1 py-0.5 ${
      isActive 
        ? 'text-[var(--color-accent)]' 
        : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
    }`;

  /* ── Handlers ───────────────────────────────────────────── */
  const handleLogout = async () => {
    try { await authService.logout(); } catch { // ignore
    }
    finally {
      dispatch(logoutAction());
      dispatch(filterProductsForMode(false));
      dispatch(clearCartState());
      localStorage.removeItem('wishlist');
      dispatch(clearWishlistState());
      setAccountOpen(false);
      setIsOpen(false);
      navigate('/login');
    }
  };

  const handleToggleAdminMode = () => {
    const nextAdminMode = !adminMode;
    dispatch(toggleAdminMode());
    dispatch(filterProductsForMode(nextAdminMode));
  };

  const handleToggleWishlist = async (product) => {
    const pid    = product.$id || product.id;
    const exists = wishlist.some(i => (i.$id || i.id) === pid);
    setAnimateWishlist(true);
    setTimeout(() => setAnimateWishlist(false), 400);

    if (exists) {
      dispatch(removeWishlistItemState(pid));
      const updated = (JSON.parse(localStorage.getItem('wishlist')) || []).filter(i => (i.$id || i.id) !== pid);
      localStorage.setItem('wishlist', JSON.stringify(updated));
      if (isAuthenticated && user) {
        try { await wishlistService.removeFromWishlist(user.$id, pid); } catch { // ignore
        }
      }
    } else {
      dispatch(addWishlistItemState(product));
      const updated = [...(JSON.parse(localStorage.getItem('wishlist')) || []), product];
      localStorage.setItem('wishlist', JSON.stringify(updated));
      if (isAuthenticated && user) {
        try { await wishlistService.addToWishlist(user.$id, pid); } catch { // ignore
        }
      }
    }
  };

  const handleMoveToCart = async (product) => {
    try {
      const size     = 'M';
      const pid      = product.$id || product.id;
      const existing = cartItems.find(i => i.product_id === pid && i.size === size);

      if (!isAuthenticated || !user) {
        let guestItems = loadGuestCartItems();

        const guestExisting = guestItems.find(i => i.product_id === pid && i.size === size);
        let response;
        if (guestExisting) {
          guestExisting.quantity += 1;
          guestExisting.subtotal = Number(guestExisting.price) * guestExisting.quantity;
          response = guestExisting;
        } else {
          const itemPrice = Number(product.price);
          response = {
            $id: generateGuestCartId(),
            name: product.name,
            userId: 'guest',
            size: size,
            price: itemPrice,
            quantity: 1,
            subtotal: itemPrice,
            product_id: pid,
            product_Image: product.front_image_link || product.image_url || product.image || 'https://placehold.co/400x500'
          };
          guestItems.push(response);
        }
        saveGuestCartItems(guestItems);
        dispatch(addCartItemState(response));
        handleToggleWishlist(product);
        showToast(`"${product.name}" moved to bag!`, 'success');
        return;
      }

      if (existing) {
        const qty = Number(existing.quantity) + 1;
        const sub = Number(existing.price) * qty;
        await cartService.updateCartItem(existing.$id, { quantity: qty, subtotal: sub });
        dispatch(updateCartItemState({ $id: existing.$id, quantity: qty, subtotal: sub }));
      } else {
        const payload = {
          userId: user.$id, product_id: pid,
          name: product.name, price: Number(product.price),
          quantity: 1, subtotal: Number(product.price),
          product_Image: product.front_image_link || product.image_url || product.image || 'https://placehold.co/400x500',
          size,
        };
        const res = await cartService.addToCart(payload);
        dispatch(addCartItemState(res || { ...payload }));
      }
      handleToggleWishlist(product);
      showToast(`"${product.name}" moved to bag!`, 'success');
    } catch (e) { console.error('Move to cart failed:', e); }
  };

  const handleQtyShift = async (item, op) => {
    try {
      let qty = Number(item.quantity);
      if (op === 'increase') {
        let stock = 10;
        try {
          const live  = await productsService.getProductById(item.product_id);
          const stocks = JSON.parse(live?.sizes_stock || '{}');
          const base   = (item.size || 'M').split('/')[0].trim();
          stock = stocks[base] !== undefined ? Number(stocks[base]) : 10;
        } catch {
          const cached = products.find(p => p.$id === item.product_id || p.id === item.product_id);
          if (cached) {
            const stocks = JSON.parse(cached?.sizes_stock || '{}');
            const base   = (item.size || 'M').split('/')[0].trim();
            stock = stocks[base] !== undefined ? Number(stocks[base]) : 10;
          }
        }
        if (qty + 1 > stock) { showToast(`Only ${stock} left in size ${item.size}`, 'error'); return; }
        qty += 1;
      } else {
        qty -= 1;
      }
      if (qty < 1) {
        dispatch(removeCartItemState(item.$id));
        if (isAuthenticated && user) {
          await cartService.removeFromCart(item.$id);
        } else {
          let guestItems = loadGuestCartItems();
          guestItems = guestItems.filter(i => i.$id !== item.$id);
          saveGuestCartItems(guestItems);
        }
        return;
      }
      const sub = Number(item.price) * qty;
      dispatch(updateCartItemState({ $id: item.$id, quantity: qty, subtotal: sub }));
      if (isAuthenticated && user) {
        await cartService.updateCartItem(item.$id, { quantity: qty, subtotal: sub });
      } else {
        let guestItems = loadGuestCartItems();
        const idx = guestItems.findIndex(i => i.$id === item.$id);
        if (idx !== -1) {
          guestItems[idx].quantity = qty;
          guestItems[idx].subtotal = sub;
          saveGuestCartItems(guestItems);
        }
      }
    } catch (e) {
      console.error('Qty shift failed:', e);
      if (isAuthenticated && user?.$id) {
        cartService.getCartItems(user.$id).then(items => dispatch(setCartItems(items))).catch(() => {});
      }
    }
  };

  const handleCartRemove = async (id) => {
    if (removingIds.has(id)) return;
    setRemovingIds(prev => new Set([...prev, id]));
    try {
      dispatch(removeCartItemState(id));
      if (isAuthenticated && user) {
        await cartService.removeFromCart(id);
      } else {
        let guestItems = loadGuestCartItems();
        guestItems = guestItems.filter(i => i.$id !== id);
        saveGuestCartItems(guestItems);
      }
    } catch (e) {
      console.error('Cart remove failed:', e);
      if (isAuthenticated && user?.$id) {
        cartService.getCartItems(user.$id).then(items => dispatch(setCartItems(items))).catch(() => {});
      }
    } finally {
      setRemovingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const handleSizeChange = async (item, newSize) => {
    if (!newSize || newSize === item.size) return;
    try {
      // Check if item with the same product ID and newSize already exists
      const existing = cartItems.find(
        i => i.$id !== item.$id && i.product_id === item.product_id && String(i.size).toUpperCase() === String(newSize).toUpperCase()
      );

      if (existing) {
        const updatedQty = existing.quantity + item.quantity;
        const updatedSub = Number(existing.price) * updatedQty;

        // 1. Update existing item
        dispatch(updateCartItemState({ $id: existing.$id, quantity: updatedQty, subtotal: updatedSub }));
        if (isAuthenticated && user) {
          await cartService.updateCartItem(existing.$id, {
            quantity: updatedQty,
            subtotal: updatedSub
          });
        }

        // 2. Remove current item
        dispatch(removeCartItemState(item.$id));
        if (isAuthenticated && user) {
          await cartService.removeFromCart(item.$id);
        } else {
          let guestItems = loadGuestCartItems();
          const existIdx = guestItems.findIndex(i => i.$id === existing.$id);
          if (existIdx !== -1) {
            guestItems[existIdx].quantity = updatedQty;
            guestItems[existIdx].subtotal = updatedSub;
          }
          guestItems = guestItems.filter(i => i.$id !== item.$id);
          saveGuestCartItems(guestItems);
        }

        showToast(`Merged with existing size ${newSize} item in your cart.`, "success");
      } else {
        dispatch(updateCartItemState({ $id: item.$id, size: newSize }));
        if (isAuthenticated && user) {
          await cartService.updateCartItem(item.$id, { size: newSize });
        } else {
          let guestItems = loadGuestCartItems();
          const idx = guestItems.findIndex(i => i.$id === item.$id);
          if (idx !== -1) {
            guestItems[idx].size = newSize;
            saveGuestCartItems(guestItems);
          }
        }
        showToast(`Size updated to ${newSize}.`, "success");
      }
    } catch (err) {
      console.error("Size update failure:", err);
      showToast("Failed to update item size.", "error");
    }
  };

  const allProducts = useSelector(state => state.products.allItems);
  const offers = useSelector(state => state.products.offers);

  const selectedCartItems = cartItems.filter(item => selectedItemIds.includes(item.$id));
  const cartTotalBeforeDiscount = selectedCartItems.reduce((acc, i) => acc + Number((i.price || 0) * (i.quantity || 0)), 0);

  const { totalDiscount: bundleDiscount, appliedOffers } = useMemo(() => {
    return calculateOffersDiscount(selectedCartItems, allProducts, offers);
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [selectedCartItems, allProducts, offers]);

  const cartTotal = cartTotalBeforeDiscount - bundleDiscount;

  return (
    <>
      {/* ── Main Navbar ─────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(244,250,247,0.88)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(5,150,105,0.12)',
          boxShadow: '0 4px 24px rgba(5,150,105,0.06), 0 1px 4px rgba(0,0,0,0.04)'
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-10 lg:px-12 py-0">
          <div className="flex items-center justify-between h-20">

            {/* Brand */}
            <Link
              to="/"
              className="flex-shrink-0 flex  items-center group"
            >
              <img
                src="/vakrayan-logo.png"
                alt="Vakrayan Logo"
                className="h-13 w-13 object-contain drop-shadow-md"
              />
              <img
                src="/vakrayan-text.png"
                alt="Vakrayan"
                className="h-7 w-25 md:h-8  object-contain drop-shadow-xs transition-all duration-200 group-hover:opacity-80"
              />
            </Link>

            {/* Desktop nav links */}
            <ul className="hidden lg:flex items-center gap-8">
              <li>
                <NavLink to="/" className={navLink} end>
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink to="/shop" className={navLink}>
                  Shop
                </NavLink>
              </li>
              <li 
                className="relative"
                onMouseEnter={() => setCollectionsOpen(true)}
                onMouseLeave={() => setCollectionsOpen(false)}
              >
                <button className="link-underline text-[11px] font-semibold tracking-[0.12em] uppercase transition-base text-[var(--color-muted)] hover:text-[var(--color-text)] flex items-center gap-1 cursor-pointer">
                  Collections
                  <svg className={`w-3 h-3 transition-transform ${collectionsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <AnimatePresence>
                  {collectionsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.97 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute left-0 mt-3 w-52 p-2 rounded-2xl z-50 flex flex-col gap-0.5"
                      style={{
                        background: 'var(--glass-bg-heavy)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid var(--glass-border-green)',
                        boxShadow: 'var(--shadow-lg)'
                      }}
                    >
                      <Link to="/category/oversized-tshirt" className="px-3 py-2.5 text-[12px] font-semibold rounded-xl text-left text-[var(--color-text)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)] transition-all duration-150">Oversized T-Shirts</Link>
                      <Link to="/category/printed-tshirt" className="px-3 py-2.5 text-[12px] font-semibold rounded-xl text-left text-[var(--color-text)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)] transition-all duration-150">Printed T-Shirts</Link>
                      <Link to="/category/shirts" className="px-3 py-2.5 text-[12px] font-semibold rounded-xl text-left text-[var(--color-text)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)] transition-all duration-150">Shirts</Link>
                      <Link to="/category/hoodies" className="px-3 py-2.5 text-[12px] font-semibold rounded-xl text-left text-[var(--color-text)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)] transition-all duration-150">Hoodies</Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
              <li>
                <NavLink to="/profile?tab=orders" className={navLink}>
                  Track Order
                </NavLink>
              </li>
            </ul>

            {/* Action icons */}
            <div className="flex items-center gap-1">

              {/* Admin toggle */}
              {isAdmin && (
                <div className="hidden sm:flex items-center gap-2 mr-2 px-3 py-1.5 rounded-full bg-[var(--color-subtle)] border border-[var(--color-border)]">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-[var(--color-muted)] select-none">
                    Admin
                  </span>
                  <button
                    onClick={handleToggleAdminMode}
                    className={`relative inline-flex h-4 w-7 rounded-full border-0 cursor-pointer transition-colors duration-200 ${
                      adminMode ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 mt-[1px] rounded-full bg-[var(--color-surface)] shadow-sm transition-transform duration-200 ${adminMode ? 'translate-x-3' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              )}

              {/* Search */}
              <button
                onClick={() => { setSearchOpen(v => !v); setSearchVal(''); }}
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-base cursor-pointer"
                style={{ background: 'rgba(5,150,105,0.06)' }}
              >
                <SearchIcon />
              </button>

              {/* Wishlist */}
              <button
                onClick={() => { if (!isAuthenticated) { navigate('/login'); return; } setWishlistDrawerOpen(true); }}
                className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-base cursor-pointer"
                style={{ 
                  color: wishlist.length > 0 ? 'var(--color-accent)' : 'var(--color-muted)',
                  background: wishlist.length > 0 ? 'rgba(5,150,105,0.10)' : 'rgba(5,150,105,0.06)'
                }}
              >
                <motion.span animate={animateWishlist ? { scale: [1, 1.3, 1] } : {}} transition={{ type: 'spring', stiffness: 400, damping: 12 }}>
                  <HeartIcon filled={wishlist.length > 0} />
                </motion.span>
                <AnimatePresence>
                  {wishlist.length > 0 && (
                    <motion.span
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white"
                      style={{ background: 'var(--color-accent)', boxShadow: '0 2px 6px rgba(5,150,105,0.4)' }}
                    >
                      {wishlist.length}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Cart */}
              <button
                onClick={() => setCartDrawerOpen(true)}
                className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-base cursor-pointer"
                style={{ 
                  color: cartCount > 0 ? 'var(--color-accent)' : 'var(--color-muted)',
                  background: cartCount > 0 ? 'rgba(5,150,105,0.10)' : 'rgba(5,150,105,0.06)'
                }}
              >
                <motion.span animate={animateCart ? { scale: [1, 1.3, 1] } : {}} transition={{ type: 'spring', stiffness: 400, damping: 12 }}>
                  <BagIcon />
                </motion.span>
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white"
                      style={{ background: 'var(--color-accent)', boxShadow: '0 2px 6px rgba(5,150,105,0.4)' }}
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Account */}
              <div id="account-menu" className="relative hidden sm:block">
                <button
                  onClick={() => setAccountOpen(v => !v)}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-subtle)] transition-base cursor-pointer"
                >
                  {isAuthenticated && user ? (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white"
                      style={{ background: 'var(--color-accent)' }}
                    >
                      {(user.name || 'U')[0].toUpperCase()}
                    </div>
                  ) : (
                    <UserIcon />
                  )}
                </button>

                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden" animate="visible" exit="exit"
                      className="absolute right-0 mt-3 w-64 rounded-2xl overflow-hidden z-50"
                      style={{ 
                        background: 'var(--glass-bg-heavy)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid var(--glass-border-green)',
                        boxShadow: 'var(--shadow-lg)'
                      }}
                    >
                      {isAuthenticated && user ? (
                        <>
                          <div className="px-4 py-3.5 border-b border-[var(--color-border)]">
                            <p className="text-[10px] font-semibold tracking-widest uppercase text-[var(--color-muted)] mb-1">Signed in as</p>
                            <p className="text-sm font-bold text-[var(--color-text)] truncate">{user.name || 'User'}</p>
                            <p className="text-[11px] text-[var(--color-muted)] truncate">{user.email}</p>
                          </div>
                          <div className="p-2">
                            <Link
                              to="/profile" onClick={() => setAccountOpen(false)}
                              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-base"
                            >
                              My Profile
                            </Link>
                            {isAdmin && (
                              <Link
                                to="/admin" onClick={() => setAccountOpen(false)}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-base"
                              >
                                Admin Panel
                              </Link>
                            )}
                            <button
                              onClick={handleLogout}
                              className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-semibold text-rose-500 hover:bg-rose-50 transition-base cursor-pointer mt-0.5 border-t border-[var(--color-border)]"
                            >
                              Sign Out
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 space-y-2">
                          <Link
                            to="/login" onClick={() => setAccountOpen(false)}
                            className="block w-full text-center py-2.5 rounded-xl text-[12px] font-bold text-white transition-base"
                            style={{ background: 'var(--color-accent)' }}
                          >
                            Sign In
                          </Link>
                          <Link
                            to="/signup" onClick={() => setAccountOpen(false)}
                            className="block w-full text-center py-2.5 rounded-xl text-[12px] font-bold text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-base"
                          >
                            Create Account
                          </Link>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsOpen(v => !v)}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-subtle)] transition-base cursor-pointer lg:hidden"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={isOpen ? 'close' : 'menu'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    {isOpen ? <CloseIcon /> : <MenuIcon />}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } }}
              exit={{ height: 0, opacity: 0, transition: { duration: 0.2 } }}
              className="border-t overflow-visible"
              style={{ 
                background: 'rgba(244,250,247,0.97)',
                borderColor: 'rgba(5,150,105,0.10)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)'
              }}
            >
              <div className="content-shell py-3 relative">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchVal.trim()) {
                      navigate(`/shop?search=${encodeURIComponent(searchVal.trim())}`);
                      setSearchOpen(false);
                      setSearchVal('');
                    }
                  }}
                  className="flex items-center gap-3"
                >
                  <span className="text-[var(--color-muted)] shrink-0"><SearchIcon /></span>
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search styles, categories..."
                    value={searchVal}
                    onChange={e => setSearchVal(e.target.value)}
                    className="flex-1 bg-transparent text-[13px] font-medium text-[var(--color-text)] placeholder-zinc-400 outline-none py-1"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                  />
                  {searchVal && (
                    <button type="button" onClick={() => setSearchVal('')} className="text-[var(--color-muted)] hover:text-[var(--color-text)] transition-base cursor-pointer">
                      <CloseIcon size={16} />
                    </button>
                  )}
                </form>

                {/* Suggestions */}
                <AnimatePresence>
                  {(searchSuggestions.keywords.length > 0 || searchSuggestions.products.length > 0) && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden" animate="visible" exit="exit"
                      className="absolute top-full left-4 right-4 sm:left-6 sm:right-6 md:left-10 md:right-10 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden z-50 mt-1 p-4 space-y-4"
                      style={{ boxShadow: 'var(--shadow-lg)' }}
                    >
                      {/* Suggested Keywords / Tags Section */}
                      {searchSuggestions.keywords.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[9px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest block">
                            🏷️ Suggested Searches
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {searchSuggestions.keywords.map(keyword => (
                              <button
                                key={keyword}
                                type="button"
                                onClick={() => {
                                  navigate(`/shop?search=${encodeURIComponent(keyword)}`);
                                  setSearchOpen(false);
                                  setSearchVal('');
                                }}
                                className="bg-[var(--color-subtle)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-sans font-bold text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-md cursor-pointer transition-colors border border-[var(--color-border)]"
                              >
                                {keyword}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Matching Products Section */}
                      {searchSuggestions.products.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[9px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest block">
                            👕 Matching Products
                          </span>
                          <div className="divide-y divide-[var(--color-border)]/50">
                            {searchSuggestions.products.map(p => {
                              const img = p.front_image_link || p.image_url || p.image || 'https://placehold.co/80x100';
                              return (
                                <button
                                  key={p.$id || p.id}
                                  type="button"
                                  onClick={() => {
                                    navigate(`/product/${p.slug || p.$id || p.id}`);
                                    setSearchOpen(false);
                                    setSearchVal('');
                                  }}
                                  className="w-full flex items-center gap-3 py-2.5 hover:bg-[var(--color-bg)] transition-base text-left border-b border-zinc-50/10 last:border-0 first:pt-0"
                                >
                                  <img src={img} alt={p.name} className="w-8 h-10 object-cover rounded-md bg-[var(--color-subtle)] shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-[var(--color-text)] truncate">{p.name}</p>
                                    <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider">{p.category?.replace(/-/g, ' ')}</p>
                                  </div>
                                  <span className="text-[11px] font-bold text-[var(--color-text)] shrink-0">
                                    ₹{Number(p.price).toLocaleString('en-IN')}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden" animate="visible" exit="exit"
              className="lg:hidden border-t max-h-[calc(100vh-80px)] overflow-y-auto scrollbar-thin"
              style={{ 
                background: 'rgba(244,250,247,0.97)',
                borderColor: 'rgba(5,150,105,0.10)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}
            >
              <div className="content-shell py-6 space-y-1">
                <NavLink to="/" onClick={() => setIsOpen(false)} className={({ isActive }) => `block px-3 py-3 rounded-xl text-[13px] font-semibold transition-base ${isActive ? 'bg-[var(--color-subtle)] text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'}`} end>
                  Home
                </NavLink>
                <NavLink to="/shop" onClick={() => setIsOpen(false)} className={({ isActive }) => `block px-3 py-3 rounded-xl text-[13px] font-semibold transition-base ${isActive ? 'bg-[var(--color-subtle)] text-[var(--color-text)]' : 'text-[var(--color-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'}`}>
                  Shop
                </NavLink>
                <NavLink
                  to="/profile?tab=orders"
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => `flex items-center gap-2.5 px-3 py-3 rounded-xl text-[13px] font-semibold transition-base ${isActive ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]' : 'text-[var(--color-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'}`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  Track Order
                </NavLink>
                
                <div className="px-3 py-2 space-y-2">
                  <span className="text-[10px] font-bold tracking-widest text-[var(--color-muted)] uppercase">Collections</span>
                  <div className="grid grid-cols-2 gap-2 pl-2">
                    <Link to="/category/oversized-tshirt" onClick={() => setIsOpen(false)} className="text-[12px] font-semibold text-[var(--color-text)] hover:text-[var(--color-text)]">Oversized</Link>
                    <Link to="/category/printed-tshirt" onClick={() => setIsOpen(false)} className="text-[12px] font-semibold text-[var(--color-text)] hover:text-[var(--color-text)]">Printed</Link>
                    <Link to="/category/shirts" onClick={() => setIsOpen(false)} className="text-[12px] font-semibold text-[var(--color-text)] hover:text-[var(--color-text)]">Shirts</Link>
                    <Link to="/category/hoodies" onClick={() => setIsOpen(false)} className="text-[12px] font-semibold text-[var(--color-text)] hover:text-[var(--color-text)]">Hoodies</Link>
                  </div>
                </div>



                <div className="pt-4 mt-2 border-t border-[var(--color-border)]">
                  {isAuthenticated && user ? (
                    <div className="space-y-1">
                      <div className="px-3 py-2">
                        <p className="text-[12px] font-bold text-[var(--color-text)]">{user.name}</p>
                        <p className="text-[11px] text-[var(--color-muted)]">{user.email}</p>
                      </div>
                      <Link to="/profile" onClick={() => setIsOpen(false)} className="block px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-base">My Profile</Link>
                      {isAdmin && (
                        <>
                          <Link to="/admin" onClick={() => setIsOpen(false)} className="block px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-bg)] transition-base">Admin Panel</Link>
                          <div className="flex items-center justify-between px-3 py-2.5">
                            <span className="text-[12px] font-semibold text-[var(--color-text)]">Admin Mode</span>
                            <button
                              onClick={handleToggleAdminMode}
                              className={`relative inline-flex h-5 w-9 rounded-full border-0 cursor-pointer transition-colors duration-200 ${adminMode ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}`}
                            >
                              <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-[var(--color-surface)] shadow-sm transition-transform duration-200 ${adminMode ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                        </>
                      )}
                      <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold text-rose-500 hover:bg-rose-50 transition-base cursor-pointer">Sign Out</button>
                    </div>
                  ) : (
                    <div className="flex gap-2 px-3">
                      <Link to="/login" onClick={() => setIsOpen(false)} className="flex-1 text-center py-2.5 rounded-xl text-[12px] font-bold text-white transition-base" style={{ background: 'var(--color-accent)' }}>Sign In</Link>
                      <Link to="/signup" onClick={() => setIsOpen(false)} className="flex-1 text-center py-2.5 rounded-xl text-[12px] font-bold text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-base">Register</Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Cart Drawer ──────────────────────────────────────── */}
      <DrawerWrapper open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
          <div>
            <p className="eyebrow mb-0.5">Shopping</p>
            <h3 className="text-[15px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Your Bag <span className="text-[var(--color-muted)] font-normal">({cartCount})</span>
            </h3>
          </div>
          <button onClick={() => setCartDrawerOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-subtle)] transition-base cursor-pointer">
            <CloseIcon />
          </button>
        </div>

        {/* Free Shipping Progress (Temporarily 100% Free Shipping event) */}
        {cartItems.length > 0 && (
          <div className="bg-[var(--color-subtle)] border-b border-[var(--color-border)] p-4 px-6 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold tracking-wider uppercase">
              <span className="text-[var(--color-text)]">
                ✓ Free Shipping Activated (Limited Time)
              </span>
              <span className="text-[var(--color-muted)] font-mono">
                100%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}


        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 scrollbar-thin">
          {cartItems.length === 0 ? (
            <div className="flex flex-col">
              <div className="flex flex-col items-center justify-center gap-4 text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-subtle)] flex items-center justify-center text-[var(--color-muted)]">
                  <BagIcon />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--color-muted)]">Your bag is empty</p>
                  <p className="text-[11px] text-[var(--color-muted)] mt-1">Add some styles to get started</p>
                </div>
                <button
                  onClick={() => { setCartDrawerOpen(false); navigate('/shop'); }}
                  className="btn-dark text-[11px] px-6 py-3"
                >
                  Shop Now
                </button>
              </div>

              {/* Recommendations when empty */}
              {products.length > 0 && (
                <div className="border-t border-[var(--color-border)] pt-6 mt-6">
                  <h4 className="text-[10px] font-bold tracking-wider uppercase text-[var(--color-muted)] mb-3 text-left">Curated For You</h4>
                  <div
                    className="flex gap-3 pb-3"
                    style={{
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      cursor: 'grab',
                      userSelect: 'none',
                      scrollBehavior: 'auto'
                    }}
                    onMouseDown={e => {
                      const el = e.currentTarget;
                      el.style.cursor = 'grabbing';
                      let startX = e.pageX;
                      let scrollLeft = el.scrollLeft;
                      let lastX = e.pageX;
                      let velocity = 0;
                      let rafId = null;

                      const onMove = ev => {
                        const dx = ev.pageX - startX;
                        velocity = ev.pageX - lastX;
                        lastX = ev.pageX;
                        el.scrollLeft = scrollLeft - dx;
                      };

                      const onUp = () => {
                        el.style.cursor = 'grab';
                        window.removeEventListener('mousemove', onMove);
                        window.removeEventListener('mouseup', onUp);

                        // Momentum / inertia
                        const momentum = () => {
                          if (Math.abs(velocity) < 0.5) return;
                          el.scrollLeft -= velocity;
                          velocity *= 0.88;
                          rafId = requestAnimationFrame(momentum);
                        };
                        rafId = requestAnimationFrame(momentum);
                      };

                      window.addEventListener('mousemove', onMove);
                      window.addEventListener('mouseup', onUp);
                      if (rafId) cancelAnimationFrame(rafId);
                    }}
                  >
                    {products.slice(0, 4).map(p => {
                      const img = p.front_image_link || p.image_url || p.image || 'https://placehold.co/100x125';
                      const pId = p.$id || p.id;
                      return (
                        <div key={pId} className="flex flex-col bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-xl snap-start" style={{ minWidth: 140, maxWidth: 140, flexShrink: 0 }}>
                          <img src={img} alt={p.name} className="w-full h-24 object-cover rounded-lg bg-[var(--color-border)]" draggable={false} />
                          <p className="text-[10px] font-bold text-[var(--color-text)] truncate mt-2">{p.name}</p>
                          <p className="text-[11px] font-black text-[var(--color-text)] mt-0.5">₹{Number(p.price).toLocaleString('en-IN')}</p>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleMoveToCart(p);
                            }}
                            className="mt-2 w-full py-1.5 bg-neutral-950 text-white rounded-lg text-[9px] font-mono tracking-widest font-bold uppercase text-center hover:bg-neutral-800 transition-colors"
                          >
                            + ADD
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Select All Toggle inside Drawer */}
              <div className="flex items-center justify-between p-2.5 bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-xl text-[10px] font-mono mb-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold uppercase text-[var(--color-text)]">
                  <input
                    type="checkbox"
                    checked={cartItems.length > 0 && selectedItemIds.length === cartItems.length}
                    onChange={() => {
                      if (selectedItemIds.length === cartItems.length) {
                        const allIds = cartItems.map(i => i.$id);
                        setDeselectedItemIds(allIds);
                        sessionStorage.setItem('deselected_cart_item_ids', JSON.stringify(allIds));
                        sessionStorage.setItem('selected_cart_item_ids', JSON.stringify([]));
                      } else {
                        setDeselectedItemIds([]);
                        sessionStorage.setItem('deselected_cart_item_ids', JSON.stringify([]));
                        const allIds = cartItems.map(i => i.$id);
                        sessionStorage.setItem('selected_cart_item_ids', JSON.stringify(allIds));
                      }
                    }}
                    className="w-3.5 h-3.5 rounded text-[var(--color-accent)] focus:ring-[var(--color-accent)] accent-[var(--color-accent)] border-[var(--color-border)] cursor-pointer"
                  />
                  SELECT ALL ({cartItems.length})
                </label>
                {selectedItemIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = cartItems.map(i => i.$id);
                      setDeselectedItemIds(allIds);
                      sessionStorage.setItem('deselected_cart_item_ids', JSON.stringify(allIds));
                      sessionStorage.setItem('selected_cart_item_ids', JSON.stringify([]));
                    }}
                    className="text-[9px] font-black text-rose-655 hover:text-rose-700 uppercase cursor-pointer"
                  >
                    Deselect
                  </button>
                )}
              </div>

              {cartItems.map(item => {
                const img = item.product_Image || item.image || 'https://placehold.co/100x125';
                const isSelected = selectedItemIds.includes(item.$id);
                return (
                  <motion.div
                    key={item.$id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-base ${
                      isSelected ? 'border-[var(--color-accent)]/60 bg-[var(--color-surface)] shadow-2xs' : 'border-[var(--color-border)]'
                    }`}
                  >
                    {/* Item Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const updatedDeselected = isSelected
                          ? [...deselectedItemIds, item.$id]
                          : deselectedItemIds.filter(id => id !== item.$id);
                        setDeselectedItemIds(updatedDeselected);
                        sessionStorage.setItem('deselected_cart_item_ids', JSON.stringify(updatedDeselected));
                        
                        const updatedSelected = cartItems
                          .filter(i => !updatedDeselected.includes(i.$id))
                          .map(i => i.$id);
                        sessionStorage.setItem('selected_cart_item_ids', JSON.stringify(updatedSelected));
                      }}
                      className="w-3.5 h-3.5 rounded text-[var(--color-accent)] focus:ring-[var(--color-accent)] accent-[var(--color-accent)] border-[var(--color-border)] cursor-pointer shrink-0"
                    />

                    <img src={img} alt={item.name} className="w-18 h-22 w-[72px] h-[88px] object-cover rounded-xl bg-[var(--color-subtle)] shrink-0" />
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[var(--color-text)] truncate">{item.name}</p>
                          
                          {/* Size Selection Dropdown */}
                          <div className="flex items-center gap-1 text-[10px] text-[var(--color-muted)] mt-1">
                            <span>Size:</span>
                            <select
                              value={item.size || 'M'}
                              onChange={(e) => handleSizeChange(item, e.target.value)}
                              className="bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-1.5 py-0.5 text-[10px] text-[var(--color-text)] font-semibold outline-hidden cursor-pointer transition-colors"
                            >
                              {((products.find(p => p.$id === item.product_id || p.id === item.product_id)?.sizes || []).length > 0
                                ? products.find(p => p.$id === item.product_id || p.id === item.product_id).sizes
                                : ['S', 'M', 'L', 'XL']
                              ).map((sz) => (
                                <option key={sz} value={sz}>{sz}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button onClick={() => handleCartRemove(item.$id)} disabled={removingIds.has(item.$id)} className="text-[var(--color-muted)] hover:text-rose-400 transition-base cursor-pointer shrink-0 mt-0.5 disabled:opacity-50">
                          <CloseIcon size={15} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 bg-[var(--color-subtle)] rounded-lg p-1">
                          <button onClick={() => handleQtyShift(item, 'decrease')} className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-base cursor-pointer">
                            <MinusIcon />
                          </button>
                          <span className="w-6 text-center text-[12px] font-bold text-[var(--color-text)]">{item.quantity}</span>
                          <button onClick={() => handleQtyShift(item, 'increase')} className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-base cursor-pointer">
                            <PlusIcon />
                          </button>
                        </div>
                        <span className="text-[13px] font-bold text-[var(--color-text)]">₹{Number(item.subtotal || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Recommendations when not empty */}
              {products.length > 0 && (
                <div className="border-t border-[var(--color-border)] pt-6 mt-6">
                  <h4 className="text-[10px] font-bold tracking-wider uppercase text-[var(--color-muted)] mb-3 text-left">Complete Your Look</h4>
                  <div
                    className="flex gap-3 pb-3"
                    style={{ overflowX:'auto', overflowY:'hidden', WebkitOverflowScrolling:'touch', scrollbarWidth:'none', msOverflowStyle:'none', cursor:'grab', userSelect:'none' }}
                    onMouseDown={e => {
                      const el = e.currentTarget; el.style.cursor = 'grabbing';
                      let startX = e.pageX, scrollLeft = el.scrollLeft, lastX = e.pageX, velocity = 0, rafId = null;
                      const onMove = ev => { const dx = ev.pageX - startX; velocity = ev.pageX - lastX; lastX = ev.pageX; el.scrollLeft = scrollLeft - dx; };
                      const onUp = () => { el.style.cursor = 'grab'; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); const go = () => { if (Math.abs(velocity) < 0.5) return; el.scrollLeft -= velocity; velocity *= 0.88; rafId = requestAnimationFrame(go); }; rafId = requestAnimationFrame(go); };
                      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); if (rafId) cancelAnimationFrame(rafId);
                    }}
                  >
                    {products
                      .filter(p => !cartItems.some(item => item.product_id === (p.$id || p.id)))
                      .slice(0, 4)
                      .map(p => {
                        const img = p.front_image_link || p.image_url || p.image || 'https://placehold.co/100x125';
                        const pId = p.$id || p.id;
                        return (
                          <div key={pId} className="flex flex-col bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-xl" style={{ minWidth: 140, maxWidth: 140, flexShrink: 0 }}>
                            <img src={img} alt={p.name} className="w-full h-24 object-cover rounded-lg bg-[var(--color-border)]" draggable={false} />
                            <p className="text-[10px] font-bold text-[var(--color-text)] truncate mt-2">{p.name}</p>
                            <p className="text-[11px] font-black text-[var(--color-text)] mt-0.5">₹{Number(p.price).toLocaleString('en-IN')}</p>
                            <button
                              onClick={async (e) => { e.stopPropagation(); await handleMoveToCart(p); }}
                              className="mt-2 w-full py-1.5 bg-neutral-950 text-white rounded-lg text-[9px] font-mono tracking-widest font-bold uppercase text-center hover:bg-neutral-800 transition-colors"
                            >+ ADD</button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="px-6 py-5 border-t border-[var(--color-border)] space-y-4" style={{ background: 'var(--color-bg)' }}>
            <div className="space-y-2">
              {bundleDiscount > 0 && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--color-muted)] font-semibold uppercase tracking-wider font-mono text-[9px]">Original Subtotal</span>
                  <span className="text-[var(--color-muted)] line-through font-mono">₹{cartTotalBeforeDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {bundleDiscount > 0 && (
                <div className="space-y-1 bg-[var(--color-subtle)] border border-[var(--color-accent)]/10 p-2.5 rounded-lg text-[9px] uppercase font-mono tracking-wider text-[var(--color-text)]">
                  <span className="font-bold block mb-1">Bundle Savings</span>
                  {appliedOffers.map((o) => (
                    <div key={o.id} className="flex justify-between">
                      <span>• {o.name} {o.timesApplied > 1 ? `(x${o.timesApplied})` : ''}</span>
                      <span className="font-bold text-emerald-600 font-mono">-₹{o.discount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-semibold text-[var(--color-muted)]">Subtotal</span>
                <span className="text-[16px] font-bold text-[var(--color-text)]">₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/cart" onClick={() => setCartDrawerOpen(false)} className="btn-ghost text-[11px] py-3 text-center rounded-xl">
                View Cart
              </Link>
              <button
                onClick={() => {
                  if (selectedItemIds.length === 0) {
                    showToast("Please select at least one item to checkout.", "error");
                    return;
                  }
                  setCartDrawerOpen(false);
                  sessionStorage.setItem('selected_cart_item_ids', JSON.stringify(selectedItemIds));
                  navigate('/checkout');
                }}
                className="btn-dark text-[11px] py-3 rounded-xl cursor-pointer"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </DrawerWrapper>

      {/* ── Wishlist Drawer ──────────────────────────────────── */}
      <DrawerWrapper open={wishlistDrawerOpen} onClose={() => setWishlistDrawerOpen(false)}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)]">
          <div>
            <p className="eyebrow mb-0.5">Saved Items</p>
            <h3 className="text-[15px] font-bold text-[var(--color-text)]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Wishlist <span className="text-[var(--color-muted)] font-normal">({wishlist.length})</span>
            </h3>
          </div>
          <button onClick={() => setWishlistDrawerOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-subtle)] transition-base cursor-pointer">
            <CloseIcon />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 scrollbar-thin">
          {wishlist.length === 0 ? (
            <div className="flex flex-col">
              <div className="flex flex-col items-center justify-center gap-4 text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-subtle)] flex items-center justify-center text-[var(--color-muted)]">
                  <HeartIcon />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--color-muted)]">Nothing saved yet</p>
                  <p className="text-[11px] text-[var(--color-muted)] mt-1">Tap the heart on any item to save it</p>
                </div>
                <button onClick={() => { setWishlistDrawerOpen(false); navigate('/shop'); }} className="btn-dark text-[11px] px-6 py-3">
                  Browse Styles
                </button>
              </div>

              {/* Recommended For You when empty */}
              {products.length > 0 && (
                <div className="border-t border-[var(--color-border)] pt-6 mt-6">
                  <h4 className="text-[10px] font-bold tracking-wider uppercase text-[var(--color-muted)] mb-3 text-left">Recommended For You</h4>
                  <div
                    className="flex gap-3 pb-3"
                    style={{ overflowX:'auto', overflowY:'hidden', WebkitOverflowScrolling:'touch', scrollbarWidth:'none', msOverflowStyle:'none', cursor:'grab', userSelect:'none' }}
                    onMouseDown={e => {
                      const el = e.currentTarget; el.style.cursor = 'grabbing';
                      let startX = e.pageX, scrollLeft = el.scrollLeft, lastX = e.pageX, velocity = 0, rafId = null;
                      const onMove = ev => { const dx = ev.pageX - startX; velocity = ev.pageX - lastX; lastX = ev.pageX; el.scrollLeft = scrollLeft - dx; };
                      const onUp = () => { el.style.cursor = 'grab'; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); const go = () => { if (Math.abs(velocity) < 0.5) return; el.scrollLeft -= velocity; velocity *= 0.88; rafId = requestAnimationFrame(go); }; rafId = requestAnimationFrame(go); };
                      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); if (rafId) cancelAnimationFrame(rafId);
                    }}
                  >
                    {products
                      .filter(p => !wishlist.some(item => (item.$id || item.id) === (p.$id || p.id)))
                      .slice(0, 4)
                      .map(p => {
                        const img = p.front_image_link || p.image_url || p.image || 'https://placehold.co/100x125';
                        const pId = p.$id || p.id;
                        return (
                          <div key={pId} className="flex flex-col bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-xl" style={{ minWidth: 140, maxWidth: 140, flexShrink: 0 }}>
                            <img src={img} alt={p.name} className="w-full h-24 object-cover rounded-lg bg-[var(--color-border)]" draggable={false} />
                            <p className="text-[10px] font-bold text-[var(--color-text)] truncate mt-2">{p.name}</p>
                            <p className="text-[11px] font-black text-[var(--color-text)] mt-0.5">₹{Number(p.price).toLocaleString('en-IN')}</p>
                            <button onClick={async (e) => { e.stopPropagation(); await handleMoveToCart(p); }} className="mt-2 w-full py-1.5 bg-neutral-950 text-white rounded-lg text-[9px] font-mono tracking-widest font-bold uppercase text-center hover:bg-neutral-800 transition-colors">+ ADD</button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Recently Viewed when empty */}
              {recentlyViewed.length > 0 && (
                <div className="border-t border-[var(--color-border)] pt-6 mt-6">
                  <h4 className="text-[10px] font-bold tracking-wider uppercase text-[var(--color-muted)] mb-3 text-left">Recently Viewed</h4>
                  <div
                    className="flex gap-3 pb-3"
                    style={{ overflowX:'auto', overflowY:'hidden', WebkitOverflowScrolling:'touch', scrollbarWidth:'none', msOverflowStyle:'none', cursor:'grab', userSelect:'none' }}
                    onMouseDown={e => {
                      const el = e.currentTarget; el.style.cursor = 'grabbing';
                      let startX = e.pageX, scrollLeft = el.scrollLeft, lastX = e.pageX, velocity = 0, rafId = null;
                      const onMove = ev => { const dx = ev.pageX - startX; velocity = ev.pageX - lastX; lastX = ev.pageX; el.scrollLeft = scrollLeft - dx; };
                      const onUp = () => { el.style.cursor = 'grab'; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); const go = () => { if (Math.abs(velocity) < 0.5) return; el.scrollLeft -= velocity; velocity *= 0.88; rafId = requestAnimationFrame(go); }; rafId = requestAnimationFrame(go); };
                      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); if (rafId) cancelAnimationFrame(rafId);
                    }}
                  >
                    {recentlyViewed.map(p => {
                      const img = p.front_image_link || p.image_url || p.image || 'https://placehold.co/100x125';
                      const pId = p.$id || p.id;
                      return (
                        <div key={pId} className="flex flex-col bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-xl" style={{ minWidth: 140, maxWidth: 140, flexShrink: 0 }}>
                          <img src={img} alt={p.name} className="w-full h-24 object-cover rounded-lg bg-[var(--color-border)]" draggable={false} />
                          <p className="text-[10px] font-bold text-[var(--color-text)] truncate mt-2">{p.name}</p>
                          <p className="text-[11px] font-black text-[var(--color-text)] mt-0.5">₹{Number(p.price).toLocaleString('en-IN')}</p>
                          <button onClick={async (e) => { e.stopPropagation(); await handleMoveToCart(p); }} className="mt-2 w-full py-1.5 bg-neutral-950 text-white rounded-lg text-[9px] font-mono tracking-widest font-bold uppercase text-center hover:bg-neutral-800 transition-colors">+ ADD</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {wishlist.map(item => {
                const img = item.front_image_link || item.image_url || item.image || 'https://placehold.co/100x125';
                return (
                  <motion.div
                    key={item.$id || item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-3 p-3 rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-border)] transition-base"
                  >
                    <img src={img} alt={item.name} className="w-[72px] h-[88px] object-cover rounded-xl bg-[var(--color-subtle)] shrink-0" />
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[var(--color-text)] truncate">{item.name}</p>
                          <p className="text-[13px] font-bold text-[var(--color-text)] mt-1">₹{Number(item.price).toLocaleString('en-IN')}</p>
                        </div>
                        <button onClick={() => handleToggleWishlist(item)} className="text-[var(--color-muted)] hover:text-rose-400 transition-base cursor-pointer shrink-0 mt-0.5">
                          <CloseIcon size={15} />
                        </button>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleMoveToCart(item)} className="flex-1 py-2 rounded-lg text-[11px] font-bold text-white transition-base cursor-pointer" style={{ background: 'var(--color-text)' }}>
                          Move to Bag
                        </button>
                        <button onClick={() => { setWishlistDrawerOpen(false); navigate(`/product/${item.slug || item.$id || item.id}`); }} className="px-3 py-2 rounded-lg text-[11px] font-bold text-[var(--color-text)] bg-[var(--color-subtle)] hover:bg-[var(--color-border)] transition-base cursor-pointer">
                          View
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Recommended For You when list has items */}
              {products.length > 0 && (
                <div className="border-t border-[var(--color-border)] pt-6 mt-6">
                  <h4 className="text-[10px] font-bold tracking-wider uppercase text-[var(--color-muted)] mb-3 text-left">Recommended For You</h4>
                  <div
                    className="flex gap-3 pb-3"
                    style={{ overflowX:'auto', overflowY:'hidden', WebkitOverflowScrolling:'touch', scrollbarWidth:'none', msOverflowStyle:'none', cursor:'grab', userSelect:'none' }}
                    onMouseDown={e => {
                      const el = e.currentTarget; el.style.cursor = 'grabbing';
                      let startX = e.pageX, scrollLeft = el.scrollLeft, lastX = e.pageX, velocity = 0, rafId = null;
                      const onMove = ev => { const dx = ev.pageX - startX; velocity = ev.pageX - lastX; lastX = ev.pageX; el.scrollLeft = scrollLeft - dx; };
                      const onUp = () => { el.style.cursor = 'grab'; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); const go = () => { if (Math.abs(velocity) < 0.5) return; el.scrollLeft -= velocity; velocity *= 0.88; rafId = requestAnimationFrame(go); }; rafId = requestAnimationFrame(go); };
                      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); if (rafId) cancelAnimationFrame(rafId);
                    }}
                  >
                    {products
                      .filter(p => !wishlist.some(item => (item.$id || item.id) === (p.$id || p.id)))
                      .slice(0, 4)
                      .map(p => {
                        const img = p.front_image_link || p.image_url || p.image || 'https://placehold.co/100x125';
                        const pId = p.$id || p.id;
                        return (
                          <div key={pId} className="flex flex-col bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-xl" style={{ minWidth: 140, maxWidth: 140, flexShrink: 0 }}>
                            <img src={img} alt={p.name} className="w-full h-24 object-cover rounded-lg bg-[var(--color-border)]" draggable={false} />
                            <p className="text-[10px] font-bold text-[var(--color-text)] truncate mt-2">{p.name}</p>
                            <p className="text-[11px] font-black text-[var(--color-text)] mt-0.5">₹{Number(p.price).toLocaleString('en-IN')}</p>
                            <button onClick={async (e) => { e.stopPropagation(); await handleMoveToCart(p); }} className="mt-2 w-full py-1.5 bg-neutral-950 text-white rounded-lg text-[9px] font-mono tracking-widest font-bold uppercase text-center hover:bg-neutral-800 transition-colors">+ ADD</button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DrawerWrapper>
    </>
  );
}

export default Navbar;

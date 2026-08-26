import { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { logout as logoutAction, toggleAdminMode } from '../../features/login';
import authService from '../../services/auth';
import cartService from '../../services/cart';
import productsService from '../../services/products';
import { clearCartState, addCartItemState, updateCartItemState, removeCartItemState, setCartItems } from '../../features/addToCart';
import { setWishlistItems, addWishlistItemState, removeWishlistItemState, clearWishlistState } from '../../features/wishlistSlice';
import wishlistService from '../../services/wishlist';
import { useToast } from '../../context/ToastContext';
import { filterProductsForMode } from '../../features/productsSlice';
import { calculateOffersDiscount } from '../../utils/discountCalculator';
import { generateGuestCartId, loadGuestCartItems, saveGuestCartItems } from '../../utils/guestCartHelper';

// Icons (inline SVGs — no extra dependency)
const SearchIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const TagIcon = ({ size = 14, className = "text-[var(--color-accent)] inline-block" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const PackageIcon = ({ size = 14, className = "text-[var(--color-accent)] inline-block" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const ClockIcon = ({ size = 14, className = "text-[var(--color-accent)] inline-block" }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
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
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
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
  const [recentSearches,    setRecentSearches]    = useState([]);

  // Load recent searches when search drawer opens
  useEffect(() => {
    if (searchOpen) {
      const saved = JSON.parse(localStorage.getItem('recent_searches')) || [];
      setRecentSearches(saved);
    }
  }, [searchOpen]);

  // Clear recent searches history
  const clearRecentSearches = () => {
    localStorage.removeItem('recent_searches');
    setRecentSearches([]);
  };

  // Perform search and save keyword history
  const handleKeywordSearch = (keyword) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    
    let recent = JSON.parse(localStorage.getItem('recent_searches')) || [];
    recent = [trimmed, ...recent.filter(s => s !== trimmed)].slice(0, 5);
    localStorage.setItem('recent_searches', JSON.stringify(recent));
    setRecentSearches(recent);
    
    navigate(`/shop?search=${encodeURIComponent(trimmed)}`);
    setSearchOpen(false);
    setSearchVal('');
  };
  const [cartDrawerOpen,    setCartDrawerOpen]    = useState(false);
  const [wishlistDrawerOpen,setWishlistDrawerOpen]= useState(false);
  const [animateCart,       setAnimateCart]       = useState(false);
  const [animateWishlist,   setAnimateWishlist]   = useState(false);
  const [removingIds,       setRemovingIds]       = useState(new Set());
  const [collectionsOpen,   setCollectionsOpen]   = useState(false);
  const [aboutModalOpen,     setAboutModalOpen]     = useState(false);
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


  // ✅ FIX: Consistently check role/labels for admin access to support Firebase role assignment
  const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || 'chandumakavana61@gmail.com').replace(/['"]/g, '').trim().toLowerCase();
  const hasAdminRole = user?.prefs?.role === 'admin';
  const hasAdminLabel = Array.isArray(user?.labels) && user.labels.includes('admin');
  const userEmail = (user?.email || '').trim().toLowerCase();
  const hasAdminEmail = Boolean(userEmail && (userEmail === adminEmail || userEmail === 'chandumakavana61@gmail.com'));
  const isAdmin    = Boolean(isAuthenticated && user && (hasAdminRole || hasAdminLabel || hasAdminEmail));


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
      localStorage.removeItem('remember_me');
      localStorage.removeItem('google_session_expiry');
      sessionStorage.removeItem('session_active');
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
        <div className="max-w-[1728px] mx-auto px-3 sm:px-6 md:px-10 lg:px-12 py-0">
          <div className="flex items-center justify-between h-20">

            {/* Brand */}
            <Link
              to="/"
              className="flex-shrink-0 flex items-center group py-1"
            >
              <img
                src="/vakrayan-merged-logo.png"
                alt="Vakrayan"
                width={160}
                height={56}
                className="h-11 sm:h-12 md:h-14 w-auto object-contain drop-shadow-xs transition-transform duration-300 group-hover:scale-105 block [html[data-theme=dark]_&]:hidden"
              />
              <img
                src="/vakrayan-merged-logo-white.png"
                alt="Vakrayan"
                loading="lazy"
                decoding="async"
                width={160}
                height={56}
                className="h-11 sm:h-12 md:h-14 w-auto object-contain drop-shadow-xs transition-transform duration-300 group-hover:scale-105 hidden [html[data-theme=dark]_&]:block"
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
              <li>
                <button
                  type="button"
                  onClick={() => setAboutModalOpen(true)}
                  className={navLink({ isActive: aboutModalOpen })}
                >
                  About Us
                </button>
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
                    aria-label="Toggle admin mode"
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
                aria-label="Search store products"
                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-base cursor-pointer"
                style={{ background: 'rgba(5,150,105,0.06)' }}
              >
                <SearchIcon />
              </button>

              {/* Wishlist */}
              <button
                onClick={() => { if (!isAuthenticated) { navigate('/login'); return; } setWishlistDrawerOpen(true); }}
                aria-label={`View wishlist (${wishlist.length} items)`}
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
                aria-label={`View shopping cart (${cartCount} items)`}
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
                  aria-label="Account menu"
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
                        backdropFilter: 'blur(28px) saturate(190%)',
                        WebkitBackdropFilter: 'blur(28px) saturate(190%)',
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
                aria-label="Toggle navigation menu"
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
                background: 'rgba(255,255,255,0.98)',
                borderColor: 'rgba(5,150,105,0.15)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)'
              }}
            >
              <div className="content-shell py-3 relative">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (searchVal.trim()) {
                      handleKeywordSearch(searchVal);
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

                {/* Suggestions / Recent History */}
                <AnimatePresence>
                  {searchOpen && (searchVal.trim().length >= 2 || recentSearches.length > 0) && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden" animate="visible" exit="exit"
                      className="absolute top-full left-4 right-4 sm:left-6 sm:right-6 md:left-10 md:right-10 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden z-50 mt-1 p-4 space-y-4 shadow-xl"
                    >
                      {searchVal.trim().length >= 2 ? (
                        <>
                          {/* Suggested Keywords / Tags Section */}
                          {searchSuggestions.keywords.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[9px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest flex items-center gap-1.5">
                                <TagIcon size={12} /> Suggested Searches
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {searchSuggestions.keywords.map(keyword => (
                                  <button
                                    key={keyword}
                                    type="button"
                                    onClick={() => handleKeywordSearch(keyword)}
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
                              <span className="text-[9px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest flex items-center gap-1.5">
                                <PackageIcon size={12} /> Products
                              </span>
                              <div className="divide-y divide-zinc-100 max-h-60 overflow-y-auto pr-1">
                                {searchSuggestions.products.slice(0, 5).map(p => {
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

                          {searchSuggestions.keywords.length === 0 && searchSuggestions.products.length === 0 && (
                            <div className="py-6 text-center text-[var(--color-muted)] text-[11px] font-mono tracking-wider flex items-center justify-center gap-2">
                              <SearchIcon size={14} /> No matching suggestions found
                            </div>
                          )}
                        </>
                      ) : recentSearches.length > 0 ? (
                        /* Zero-Query suggestions: ONLY Recently Searched History */
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest flex items-center gap-1.5">
                              <ClockIcon size={12} /> Recent Searches
                            </span>
                            <button 
                              type="button" 
                              onClick={clearRecentSearches}
                              className="text-[9px] font-mono text-red-500 hover:underline cursor-pointer font-bold"
                            >
                              Clear all
                            </button>
                          </div>
                          <div className="flex flex-col gap-1">
                            {recentSearches.map(term => (
                              <button
                                key={term}
                                type="button"
                                onClick={() => handleKeywordSearch(term)}
                                className="flex items-center justify-between hover:bg-[var(--color-subtle)] text-[11px] font-medium text-[var(--color-text)] px-3 py-2 rounded-xl cursor-pointer transition-colors text-left"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <SearchIcon size={12} className="text-[var(--color-muted)] shrink-0" />
                                  <span className="truncate">{term}</span>
                                </div>
                                <span className="text-[9px] text-[var(--color-muted)] font-mono">search</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
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
              className="lg:hidden border-t max-h-[calc(100dvh-130px)] sm:max-h-[calc(100vh-130px)] overflow-y-auto scrollbar-thin touch-pan-y"
              style={{ 
                background: 'rgba(255,255,255,0.98)',
                borderColor: 'rgba(5,150,105,0.15)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}
            >
              <div className="content-shell py-6 pb-28 space-y-1">
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
                
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setAboutModalOpen(true);
                  }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-3 rounded-xl text-[13px] font-semibold text-[var(--color-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-base cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  About Us
                </button>



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
          <button 
            onClick={() => setCartDrawerOpen(false)} 
            aria-label="Close shopping bag"
            className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-subtle)] transition-base cursor-pointer"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Free Shipping Progress */}
        {cartItems.length > 0 && (
          <div className="bg-neutral-50 border-b border-zinc-200 p-3.5 px-6 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold tracking-wider uppercase">
              <span className="text-zinc-900 font-mono">
                {cartTotal >= 999 
                  ? "✓ You've unlocked free shipping!" 
                  : `₹${Math.round(999 - cartTotal)} away from free shipping`
                }
              </span>
              <span className="text-zinc-500 font-mono">
                {Math.min(100, Math.round((cartTotal / 999) * 100))}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-zinc-950 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (cartTotal / 999) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 scrollbar-thin">
          {cartItems.length === 0 ? (
            <div className="flex flex-col">
              <div className="flex flex-col items-center justify-center gap-4 text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-zinc-400">
                  <BagIcon />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-zinc-600">Your bag is empty</p>
                  <p className="text-[11px] text-zinc-400 mt-1">Add some styles to get started</p>
                </div>
                <button
                  onClick={() => { setCartDrawerOpen(false); navigate('/shop'); }}
                  className="bg-zinc-950 text-white hover:bg-zinc-800 text-[11px] font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition-all"
                >
                  Shop Now
                </button>
              </div>

              {/* Recommendations when empty */}
              {products.length > 0 && (
                <div className="border-t border-zinc-200 pt-6 mt-6">
                  <h4 className="text-[10px] font-bold tracking-wider uppercase text-zinc-500 mb-3 text-left">Curated For You</h4>
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
                        <div key={pId} className="flex flex-col bg-white border border-zinc-200 p-3 rounded-xl snap-start" style={{ minWidth: 140, maxWidth: 140, flexShrink: 0 }}>
                          <img src={img} alt={p.name} className="w-full h-24 object-cover rounded-lg bg-neutral-100" draggable={false} />
                          <p className="text-[10px] font-bold text-zinc-900 truncate mt-2">{p.name}</p>
                          <p className="text-[11px] font-black text-zinc-900 mt-0.5">₹{Number(p.price).toLocaleString('en-IN')}</p>
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
              <div className="flex items-center justify-between p-2.5 bg-white border border-zinc-200 rounded-xl text-[10px] font-mono mb-2 text-zinc-900">
                <label className="flex items-center gap-2 cursor-pointer font-bold uppercase text-zinc-900">
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
                    className="w-3.5 h-3.5 rounded text-zinc-950 focus:ring-zinc-950 accent-zinc-950 border-zinc-300 cursor-pointer"
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
                    className="text-[9px] font-black text-rose-600 hover:text-rose-700 uppercase cursor-pointer"
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
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                      isSelected ? 'border-zinc-400 bg-white shadow-xs' : 'border-zinc-200 bg-white'
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
                      className="w-3.5 h-3.5 rounded text-zinc-950 focus:ring-zinc-950 accent-zinc-950 border-zinc-300 cursor-pointer shrink-0"
                    />

                    <img src={img} alt={item.name} className="w-[72px] h-[88px] object-cover rounded-xl bg-neutral-100 border border-zinc-200 shrink-0" />
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-zinc-900 uppercase truncate">{item.name}</p>
                          
                          {/* Size Selection Dropdown */}
                          <div className="flex items-center gap-1 text-[10px] text-zinc-600 mt-1">
                            <span>Size:</span>
                            <select
                              value={item.size || 'M'}
                              onChange={(e) => handleSizeChange(item, e.target.value)}
                              className="bg-white border border-zinc-300 focus:border-zinc-900 rounded-md px-1.5 py-0.5 text-[10px] text-zinc-900 font-bold outline-none cursor-pointer transition-colors"
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
                        <button onClick={() => handleCartRemove(item.$id)} disabled={removingIds.has(item.$id)} className="text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer shrink-0 mt-0.5 disabled:opacity-50">
                          <CloseIcon size={15} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 bg-white border border-zinc-300 rounded-lg p-0.5">
                          <button onClick={() => handleQtyShift(item, 'decrease')} className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-600 hover:bg-neutral-100 transition-colors cursor-pointer">
                            <MinusIcon />
                          </button>
                          <span className="w-6 text-center text-[12px] font-bold text-zinc-900">{item.quantity}</span>
                          <button onClick={() => handleQtyShift(item, 'increase')} className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-600 hover:bg-neutral-100 transition-colors cursor-pointer">
                            <PlusIcon />
                          </button>
                        </div>
                        <span className="text-[13px] font-bold text-zinc-900 font-mono">₹{Number(item.subtotal || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Recommendations when not empty */}
              {products.length > 0 && (
                <div className="border-t border-zinc-200 pt-6 mt-6">
                  <h4 className="text-[10px] font-bold tracking-wider uppercase text-zinc-500 mb-3 text-left">Complete Your Look</h4>
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
                          <div key={pId} className="flex flex-col bg-white border border-zinc-200 p-3 rounded-xl" style={{ minWidth: 140, maxWidth: 140, flexShrink: 0 }}>
                            <img src={img} alt={p.name} className="w-full h-24 object-cover rounded-lg bg-neutral-100" draggable={false} />
                            <p className="text-[10px] font-bold text-zinc-900 truncate mt-2">{p.name}</p>
                            <p className="text-[11px] font-black text-zinc-900 mt-0.5">₹{Number(p.price).toLocaleString('en-IN')}</p>
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
          <div className="px-6 py-5 border-t border-zinc-200 space-y-4 bg-white">
            <div className="space-y-2">
              {bundleDiscount > 0 && (
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-500 font-semibold uppercase tracking-wider font-mono text-[9px]">Original Subtotal</span>
                  <span className="text-zinc-400 line-through font-mono">₹{cartTotalBeforeDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {bundleDiscount > 0 && (
                <div className="space-y-1 bg-neutral-50 border border-zinc-200 p-2.5 rounded-lg text-[9px] uppercase font-mono tracking-wider text-zinc-900">
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
                <span className="text-[12px] font-bold uppercase tracking-wider text-zinc-600 font-mono">Subtotal</span>
                <span className="text-[16px] font-black text-zinc-900 font-mono">₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/cart" onClick={() => setCartDrawerOpen(false)} className="bg-white text-zinc-900 border border-zinc-300 hover:bg-neutral-100 text-[11px] font-bold uppercase tracking-wider py-3 text-center rounded-xl transition-all">
                View Cart
              </Link>
              <button
                onClick={() => {
                  if (selectedItemIds.length === 0) {
                    showToast("Please select at least one item to checkout.", "error");
                    return;
                  }
                  if (products && products.length > 0) {
                    const isLiveProduct = (p) => p && (p.is_live === true || p.is_live === 'true' || p.is_live === 1 || p.is_live === '1') && p.is_active !== false && !p.is_deleted;
                    const invalidItems = cartItems.filter(item => !products.some(p => (p.$id === item.product_id || p.id === item.product_id) && isLiveProduct(p)));
                    if (invalidItems.length > 0) {
                      invalidItems.forEach(item => {
                        dispatch(removeCartItemState(item.$id));
                        if (isAuthenticated && user) {
                          cartService.removeFromCart(item.$id).catch(() => {});
                        }
                      });
                      showToast("Some items in your cart are in Draft mode or unavailable and have been removed.", "error");
                      return;
                    }
                  }
                  setCartDrawerOpen(false);
                  sessionStorage.setItem('selected_cart_item_ids', JSON.stringify(selectedItemIds));
                  navigate('/checkout');
                }}
                className="bg-zinc-950 text-white hover:bg-zinc-800 text-[11px] font-bold uppercase tracking-wider py-3 rounded-xl cursor-pointer transition-all"
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
          <button 
            onClick={() => setWishlistDrawerOpen(false)} 
            aria-label="Close wishlist drawer"
            className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-subtle)] transition-base cursor-pointer"
          >
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

      {/* Premium Glassmorphic About Us Modal */}
      <AnimatePresence>
        {aboutModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden space-y-6 text-center"
            >
              {/* Ambient Glow */}
              <div className="absolute -top-12 -right-12 w-44 h-44 bg-[var(--color-accent)]/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={() => setAboutModalOpen(false)}
                aria-label="Close about us modal"
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--color-subtle)] hover:bg-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] flex items-center justify-center transition-all cursor-pointer font-bold text-xs"
              >
                ✕
              </button>

              {/* Brand Emblem Header */}
              <div className="flex flex-col items-center gap-2 pt-1">
                <img
                  src="/vakrayan-merged-logo.png"
                  alt="Vakrayan Logo"
                  loading="lazy"
                  decoding="async"
                  width={160}
                  height={56}
                  className="h-12 sm:h-14 w-auto object-contain drop-shadow-md block [html[data-theme=dark]_&]:hidden"
                />
                <img
                  src="/vakrayan-merged-logo-white.png"
                  alt="Vakrayan Logo"
                  loading="lazy"
                  decoding="async"
                  width={160}
                  height={56}
                  className="h-12 sm:h-14 w-auto object-contain drop-shadow-md hidden [html[data-theme=dark]_&]:block"
                />
                <span className="text-[9.5px] font-mono font-bold tracking-[0.25em] uppercase text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-3.5 py-1 rounded-full border border-[var(--color-accent)]/20 mt-1">
                  HERITAGE & CRAFTSMANSHIP // EST. 2026
                </span>
              </div>

              {/* Brand Ethos Story */}
              <div className="space-y-3 text-xs text-[var(--color-muted)] leading-relaxed font-sans px-2">
                <p className="font-bold text-[var(--color-text)] text-sm">
                  Contemporary Heavyweight Streetwear — Crafted Carefully in India.
                </p>
                <p>
                  At <strong className="text-[var(--color-text)]">VAKRAYAN</strong>, we build heavyweight streetwear drops designed for those who value individuality, durability, and raw street culture aesthetics.
                </p>
                <p>
                  Every garment is constructed from <strong>240+ GSM premium cotton</strong>, precision tailored with relaxed oversized fits, and finished with signature high-density artwork.
                </p>
              </div>

              {/* Key Brand Pillars */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[var(--color-border)] text-center">
                <div className="p-3 rounded-2xl bg-[var(--color-subtle)]/50 border border-[var(--color-border)]">
                  <svg className="w-4 h-4 text-emerald-700 block mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span className="text-[9.5px] font-mono font-bold text-[var(--color-text)] uppercase block">240+ GSM</span>
                  <span className="text-[8px] text-[var(--color-muted)] uppercase">Heavy Cotton</span>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--color-subtle)]/50 border border-[var(--color-border)]">
                  <svg className="w-4 h-4 text-amber-500 fill-amber-500 block mb-1" viewBox="0 0 24 24">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  <span className="text-[9.5px] font-mono font-bold text-[var(--color-text)] uppercase block">EXPRESS</span>
                  <span className="text-[8px] text-[var(--color-muted)] uppercase">Pan-India Delivery</span>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--color-subtle)]/50 border border-[var(--color-border)]">
                  <svg className="w-4 h-4 text-emerald-600 block mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span className="text-[9.5px] font-mono font-bold text-[var(--color-text)] uppercase block">7-DAY</span>
                  <span className="text-[8px] text-[var(--color-muted)] uppercase">Easy Returns</span>
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => {
                  setAboutModalOpen(false);
                  navigate('/shop');
                }}
                className="w-full py-3.5 rounded-2xl bg-[var(--color-accent)] hover:opacity-90 text-white font-mono font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-[var(--color-accent)]/20"
              >
                EXPLORE THE ARCHIVES →
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;

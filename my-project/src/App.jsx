import './App.css'
import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'framer-motion'
import { login as loginAction, logout as logoutAction, setLoading } from './features/login'
import authService from './appwrite/auth'
import cartService from './appwrite/cart'
import { setCartItems } from './features/addToCart'
import productsService from './appwrite/products'
import { setProducts } from './features/productsSlice'
import { sendWebhookNotification } from './utils/webhookHelper'
import { mergeLocalCartToDb } from './utils/cartMergeHelper'

import Home from './componets/page/Home'
import SignUp from './componets/page/SignUp'
import Login from './componets/page/Login'
import ResetPassword from './componets/page/ResetPassword'
import AdminPanel from './componets/page/AddminPanel'
import ProductDetail from './componets/page/ProductDetail'
import NotFound from './componets/page/NotFound'
import AddToCartPage from './componets/pageComponets/AddToCartPage'
import Shop from './componets/page/Shop'
import Checkout from './componets/page/Checkout'
import UserProfile from './componets/page/UserProfile'
import OrderDetail from './componets/page/OrderDetail'
import ProtectedRoute from './componets/ProtectedRoute'
import AdminRoute from './componets/AdminRoute'
import Navbar from './componets/pageComponets/Navbar'

// Elegant Vertical Lift page transition variants (Snappy & Responsive)
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
}

function PageWrapper({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AppRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path='/signup'         element={<PageWrapper><SignUp /></PageWrapper>} />
        <Route path='/login'          element={<PageWrapper><Login /></PageWrapper>} />
        <Route path='/reset-password' element={<PageWrapper><ResetPassword /></PageWrapper>} />
        <Route path='/'               element={<PageWrapper><Home /></PageWrapper>} />
        <Route path='/product/:idOrSlug'    element={<PageWrapper><ProductDetail /></PageWrapper>} />
        <Route path='/shop'           element={<PageWrapper><Shop /></PageWrapper>} />
        <Route path='/category/:category' element={<PageWrapper><Shop /></PageWrapper>} />
        <Route path='/cart'           element={<PageWrapper><AddToCartPage /></PageWrapper>} />
        <Route path='/*'              element={<PageWrapper><NotFound /></PageWrapper>} />

        {/* Protected routes */}
        <Route path='/checkout' element={
          <ProtectedRoute><PageWrapper><Checkout /></PageWrapper></ProtectedRoute>
        } />
        <Route path='/profile' element={
          <ProtectedRoute><PageWrapper><UserProfile /></PageWrapper></ProtectedRoute>
        } />
        <Route path='/order/:id' element={
          <ProtectedRoute><PageWrapper><OrderDetail /></PageWrapper></ProtectedRoute>
        } />

        {/* Admin-only route */}
        <Route path='/admin' element={
          <AdminRoute><PageWrapper><AdminPanel /></PageWrapper></AdminRoute>
        } />
      </Routes>
    </AnimatePresence>
  )
}

function AppContent() {
  const dispatch = useDispatch()
  const { loading: authLoading } = useSelector((state) => state.auth)
  const productsFetched = useSelector((state) => state.products.fetched)
  const location = useLocation()
  
  const loading = authLoading || !productsFetched;

  useEffect(() => {
    authService.getCurrentUser()
      .then(async (userData) => {
        if (userData) {
          dispatch(loginAction({ user: userData }))
          
          // Check if this is a brand new user (created within the last 10 minutes) to trigger Google OAuth signups too
          const createdAtStr = userData.$createdAt || userData.registration;
          if (createdAtStr) {
            const createdAtTime = new Date(createdAtStr).getTime();
            const timeDiff = Math.abs(Date.now() - createdAtTime);
            const hasSentKey = `sent_signup_${userData.$id || userData.id}`;
            const prefs = userData.prefs || {};
            if (timeDiff < 600000 && !localStorage.getItem(hasSentKey) && !prefs.signup_notified) {
              localStorage.setItem(hasSentKey, 'true');
              authService.updatePreferences({ ...prefs, signup_notified: true })
                .catch(err => console.warn('Failed to update signup_notified preference in App.jsx:', err.message));
              
              sendWebhookNotification('user.signup', {
                name: userData.name || 'Anonymous',
                email: userData.email,
                userId: userData.$id || userData.id
              });
            }
          }

          try {
            await mergeLocalCartToDb(userData.$id)
            const cartItems = await cartService.getCartItems(userData.$id)
            dispatch(setCartItems(cartItems))
          } catch (cartErr) {
            console.error('Cart retrieval or merge on session recovery failed:', cartErr)
          }
        } else {
          dispatch(logoutAction())
          
          // Hydrate guest cart on initial mount if not logged in
          try {
            const saved = localStorage.getItem('guest_cart_items')
            const guestItems = saved ? JSON.parse(saved) : []
            dispatch(setCartItems(guestItems))
          } catch (e) {
            console.warn('Failed to load guest cart on mount:', e)
          }
        }
      })
      .catch((error) => {
        console.error('Session recovery failed on mount:', error)
        dispatch(logoutAction())
      })
      .finally(() => {
        dispatch(setLoading(false))
      })

    productsService.getProducts()
      .then((loadedProducts) => {
        const normalized = Array.isArray(loadedProducts) ? loadedProducts : []
        dispatch(setProducts(normalized))
      })
      .catch((prodError) => {
        console.error('Failed to preload products in store:', prodError)
        dispatch(setProducts([])) // Ensure fetching finishes even on error
      })
  }, [dispatch])

  // Premium loading splash screen
  if (loading) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-6"
        >
          {/* Brand wordmark */}
          <div className="flex flex-col items-center gap-1">
            <h1
              className="text-2xl md:text-3xl font-black tracking-[0.35em] text-[var(--color-text)] uppercase"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              STREET<span style={{ color: 'var(--color-accent)' }}>—</span>WEAR
            </h1>
            <p
              className="text-[9px] font-bold tracking-[0.3em] uppercase"
              style={{ color: 'var(--color-muted)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              Premium Apparel
            </p>
          </div>

          {/* Thin progress bar */}
          <div className="w-32 h-[2px] bg-[var(--color-border)] rounded-full overflow-hidden relative">
            <div
              className="absolute inset-0 w-1/2 rounded-full"
              style={{
                background: 'var(--color-accent)',
                animation: 'loading 1s infinite linear'
              }}
            />
          </div>
        </motion.div>
      </div>
    )
  }

  // Determine if Navbar should render statically outside of route animations
  const hideNavbarRoutes = ['/login', '/signup', '/reset-password', '/admin', '/cart']
  const isKnownRoute = ['/', '/shop', '/checkout', '/profile', '/order', '/product', '/category'].some(route => 
    location.pathname === route || location.pathname.startsWith(route + '/')
  )
  const shouldShowNavbar = !hideNavbarRoutes.some(route => location.pathname.startsWith(route)) && isKnownRoute

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <ScrollToTop />
      {shouldShowNavbar && <Navbar />}
      <AppRoutes />
    </div>
  )
}

function App() {
  return (
    <AppContent />
  )
}

export default App

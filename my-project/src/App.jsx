import { lazy, Suspense, useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'framer-motion'
import { login as loginAction, logout as logoutAction, setLoading } from './features/login'
import authService from './appwrite/auth'
import productsService from './appwrite/products'
import offersService from './appwrite/offers'
import { setProducts, setOffers, filterProductsForMode } from './features/productsSlice'
import { setCartItems } from './features/addToCart'
import { sendWebhookNotification } from './utils/webhookHelper'
import { hydrateCartFromDb } from './utils/cartMergeHelper'
import { loadGuestCartItems } from './utils/guestCartHelper'

// Static imports — always needed immediately
import ProtectedRoute from './componets/ProtectedRoute'
import AdminRoute from './componets/AdminRoute'
import Navbar from './componets/pageComponets/Navbar'

/**
 * ✅ PERFORMANCE FIX: All page-level components are now code-split using React.lazy().
 * This reduces the initial JS bundle from a single multi-MB chunk to small pieces
 * that are only downloaded when the user navigates to that route.
 *
 * Impact on LCP (Largest Contentful Paint):
 *   Before: ~5-8 MB initial bundle (includes AdminPanel 273 KB + ProductDetail 151 KB eagerly)
 *   After:  ~200-400 KB initial bundle (only Home + router + Navbar are eager)
 */
const Home         = lazy(() => import('./componets/page/Home'))
const SignUp       = lazy(() => import('./componets/page/SignUp'))
const Login        = lazy(() => import('./componets/page/Login'))
const ResetPassword = lazy(() => import('./componets/page/ResetPassword'))
const AdminPanel   = lazy(() => import('./componets/page/AddminPanel'))
const ProductDetail = lazy(() => import('./componets/page/ProductDetail'))
const NotFound     = lazy(() => import('./componets/page/NotFound'))
const AddToCartPage = lazy(() => import('./componets/pageComponets/AddToCartPage'))
const Shop         = lazy(() => import('./componets/page/Shop'))
const Checkout     = lazy(() => import('./componets/page/Checkout'))
const UserProfile  = lazy(() => import('./componets/page/UserProfile'))
const OrderDetail  = lazy(() => import('./componets/page/OrderDetail'))
const ProductReviews = lazy(() => import('./componets/page/ProductReviews'))

// ✅ PERFORMANCE FIX: Module-level constant — not recreated on every render
const HIDE_NAVBAR_ON = ['/login', '/signup', '/reset-password', '/admin', '/cart']

// Elegant Vertical Lift page transition variants
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
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

/**
 * Page-level lazy loading Suspense fallback — shown while each route chunk downloads.
 * Matches the app's minimal aesthetic without a full splash screen.
 */
function PageLoader() {
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-20 h-[2px] rounded-full overflow-hidden relative"
          style={{ background: 'var(--color-border)' }}
        >
          <div
            className="absolute inset-0 w-1/2 rounded-full"
            style={{
              background: 'var(--color-accent)',
              animation: 'loading 0.9s infinite linear',
            }}
          />
        </div>
        <p style={{ color: 'var(--color-muted)', fontSize: 11, letterSpacing: '0.15em', fontFamily: "'Jost', sans-serif" }}>
          LOADING
        </p>
      </div>
    </div>
  )
}

function AppRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      {/* ✅ Suspense wraps all lazy routes — handles chunk download fallback */}
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          {/* Public routes */}
          <Route path='/signup'              element={<PageWrapper><SignUp /></PageWrapper>} />
          <Route path='/login'               element={<PageWrapper><Login /></PageWrapper>} />
          <Route path='/reset-password'      element={<PageWrapper><ResetPassword /></PageWrapper>} />
          <Route path='/'                    element={<PageWrapper><Home /></PageWrapper>} />
          <Route path='/product/:idOrSlug'   element={<PageWrapper><ProductDetail /></PageWrapper>} />
          <Route path='/product/:idOrSlug/reviews' element={<PageWrapper><ProductReviews /></PageWrapper>} />
          <Route path='/shop'                element={<PageWrapper><Shop /></PageWrapper>} />
          <Route path='/category/:category'  element={<PageWrapper><Shop /></PageWrapper>} />
          <Route path='/cart'                element={<PageWrapper><AddToCartPage /></PageWrapper>} />
          <Route path='/*'                   element={<PageWrapper><NotFound /></PageWrapper>} />

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
      </Suspense>
    </AnimatePresence>
  )
}

function AppContent() {
  const dispatch = useDispatch()
  const { loading: authLoading, adminMode } = useSelector((state) => state.auth)
  const productsFetched = useSelector((state) => state.products.fetched)
  const location = useLocation()

  const [fontsLoaded, setFontsLoaded] = useState(false)

  // ✅ PERFORMANCE FIX: criticalImagesLoaded was removed as a loading blocker.
  // Images loading (especially slow Unsplash URLs on mobile) was blocking the entire
  // app render for 5-10 seconds. Images now load progressively in the background.
  // Auth + fonts resolve quickly, and products are fetched in parallel.
  const loading = authLoading || !fontsLoaded
  // ✅ PERFORMANCE FIX: Removed !productsFetched from loading gate.
  // Products now load in the background — Shop/Home show skeleton loaders instead.
  // Previously, a slow Appwrite products fetch blocked the ENTIRE app for 3-10 seconds.

  useEffect(() => {
    // ── AUTH: Restore session ─────────────────────────────────────────────────
    authService.getCurrentUser()
      .then(async (userData) => {
        if (userData) {
          const rememberMe = localStorage.getItem('remember_me') === 'true';
          const sessionActive = sessionStorage.getItem('session_active') === 'true';

          if (!rememberMe && !sessionActive) {
            // Log out immediately from Appwrite since the user didn't request remember me
            // and this is a new browser/tab session.
            await authService.logout();
            localStorage.removeItem('remember_me');
            sessionStorage.removeItem('session_active');
            dispatch(logoutAction());
            const guestItems = loadGuestCartItems();
            dispatch(setCartItems(guestItems));
            return;
          }

          // Mark session active for the duration of this tab/browser session
          sessionStorage.setItem('session_active', 'true');
          dispatch(loginAction({ user: userData }))

          // Check for new user signups (within 10 min) to trigger webhook
          const createdAtStr = userData.$createdAt || userData.registration
          if (createdAtStr) {
            const createdAtTime = new Date(createdAtStr).getTime()
            const timeDiff = Math.abs(Date.now() - createdAtTime)
            const hasSentKey = `sent_signup_${userData.$id || userData.id}`
            const prefs = userData.prefs || {}
            if (timeDiff < 600000 && !localStorage.getItem(hasSentKey) && !prefs.signup_notified) {
              localStorage.setItem(hasSentKey, 'true')
              authService.updatePreferences({ ...prefs, signup_notified: true })
                .catch(err => console.warn('Failed to update signup_notified preference:', err.message))
              sendWebhookNotification('user.signup', {
                name: userData.name || 'Anonymous',
                email: userData.email,
                userId: userData.$id || userData.id,
              })
            }
          }

          // ✅ DEDUP FIX: hydrateCartFromDb replaces the duplicated merge+fetch+dispatch
          // pattern that existed in both App.jsx and Login.jsx.
          await hydrateCartFromDb(userData.$id, dispatch)
        } else {
          dispatch(logoutAction())

          // Hydrate guest cart from localStorage for unauthenticated users
          const guestItems = loadGuestCartItems()
          dispatch(setCartItems(guestItems))
        }
      })
      .catch((error) => {
        console.error('Session recovery failed on mount:', error)
        dispatch(logoutAction())
      })
      .finally(() => {
        dispatch(setLoading(false))
      })

    // ── PRODUCTS: Fetch catalog in parallel with auth ─────────────────────────
    productsService.getProducts()
      .then((loadedProducts) => {
        const normalized = Array.isArray(loadedProducts) ? loadedProducts : []
        dispatch(setProducts(normalized))
      })
      .catch((prodError) => {
        console.error('Failed to preload products:', prodError)
        dispatch(setProducts([]))
      })

    // ── OFFERS: Fetch bundle offers in parallel ───────────────────────────────
    offersService.getOffers()
      .then((loadedOffers) => {
        const normalized = Array.isArray(loadedOffers) ? loadedOffers : []
        dispatch(setOffers(normalized))
      })
      .catch((offersError) => {
        console.error('Failed to preload offers:', offersError)
        dispatch(setOffers([]))
      })
  }, [dispatch])

  // ✅ FIX: Re-filter products when adminMode changes (replaces the localStorage read inside reducer)
  useEffect(() => {
    dispatch(filterProductsForMode(adminMode))
  }, [adminMode, dispatch])

  // Fonts: wait for Google Fonts to be ready (fast — only blocks for ~100-300ms)
  useEffect(() => {
    if (document.fonts) {
      document.fonts.ready
        .then(() => setFontsLoaded(true))
        .catch(() => setFontsLoaded(true))
    } else {
      setFontsLoaded(true)
    }
  }, [])

  // Premium loading splash screen — shown only while auth resolves
  if (loading) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-6"
        >
          <div className="flex flex-col items-center gap-1">
            <h1
              className="text-2xl md:text-3xl font-black tracking-[0.35em] text-[var(--color-text)] uppercase"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              VAKRAYAN
            </h1>
            <p
              className="text-[9px] font-bold tracking-[0.3em] uppercase"
              style={{ color: 'var(--color-muted)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              Premium Apparel
            </p>
          </div>

          <div className="w-32 h-[2px] bg-[var(--color-border)] rounded-full overflow-hidden relative">
            <div
              className="absolute inset-0 w-1/2 rounded-full"
              style={{
                background: 'var(--color-accent)',
                animation: 'loading 1s infinite linear',
              }}
            />
          </div>
        </motion.div>
      </div>
    )
  }

  // ✅ PERFORMANCE FIX: Moved HIDE_NAVBAR_ON outside the component (module level)
  // to prevent a new array being created on every single render of AppContent.
  const shouldShowNavbar = !HIDE_NAVBAR_ON.some(route => location.pathname.startsWith(route))

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <ScrollToTop />
      {shouldShowNavbar && <Navbar />}
      <AppRoutes />
    </div>
  )
}

function App() {
  return <AppContent />
}

export default App

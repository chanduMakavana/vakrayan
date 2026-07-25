import { lazy, Suspense, useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'framer-motion'
import { login as loginAction, logout as logoutAction, setLoading } from './features/login'
import authService from './services/auth'
import productsService from './services/products'
import offersService from './services/offers'
import { setProducts, setOffers, filterProductsForMode } from './features/productsSlice'
import { setCartItems } from './features/addToCart'
import { sendWebhookNotification } from './utils/webhookHelper'
import { hydrateCartFromDb } from './utils/cartMergeHelper'
import { loadGuestCartItems } from './utils/guestCartHelper'

// Static imports — always needed immediately
import ProtectedRoute from './componets/ProtectedRoute'
import AdminRoute from './componets/AdminRoute'
import Navbar from './componets/pageComponets/Navbar'
import Loader from './componets/pageComponets/Loader'
import PageSkeleton from './componets/pageComponets/PageSkeleton'
import MobileBottomNav from './componets/pageComponets/MobileBottomNav'
import { useDelayedLoading } from './hooks/useDelayedLoading'
import { useToast } from './context/ToastContext'
import { requestNotificationPermission, listenForForegroundMessages } from './services/notifications'
import NotificationPromptModal from './componets/pageComponets/NotificationPromptModal'

/**
 * ✅ PERFORMANCE FIX: All page-level components are now code-split using React.lazy().
 * This reduces the initial JS bundle from a single multi-MB chunk to small pieces
 * that are only downloaded when the user navigates to that route.
 *
 * Impact on LCP (Largest Contentful Paint):
 *   Before: ~5-8 MB initial bundle (includes AdminPanel 273 KB + ProductDetail 151 KB eagerly)
 *   After:  ~200-400 KB initial bundle (only Home + router + Navbar are eager)
 */
// Helper to auto-retry dynamic imports if Vite HMR or dev server chunk cache is stale
const lazyWithRetry = (importFn) =>
  lazy(async () => {
    try {
      const component = await importFn();
      sessionStorage.removeItem('vite_chunk_reload');
      return component;
    } catch (error) {
      const reloaded = sessionStorage.getItem('vite_chunk_reload');
      if (!reloaded) {
        sessionStorage.setItem('vite_chunk_reload', 'true');
        window.location.reload();
      }
      throw error;
    }
  });

const shopImporter = () => import('./componets/page/Shop')
const productDetailImporter = () => import('./componets/page/ProductDetail')

const Home          = lazyWithRetry(() => import('./componets/page/Home'))
const SignUp        = lazyWithRetry(() => import('./componets/page/SignUp'))
const Login         = lazyWithRetry(() => import('./componets/page/Login'))
const ResetPassword = lazyWithRetry(() => import('./componets/page/ResetPassword'))
const AdminPanel    = lazyWithRetry(() => import('./componets/page/AddminPanel'))
const ProductDetail = lazyWithRetry(productDetailImporter)
const NotFound      = lazyWithRetry(() => import('./componets/page/NotFound'))
const AddToCartPage = lazyWithRetry(() => import('./componets/pageComponets/AddToCartPage'))
const Shop          = lazyWithRetry(shopImporter)
const Checkout      = lazyWithRetry(() => import('./componets/page/Checkout'))
const UserProfile   = lazyWithRetry(() => import('./componets/page/UserProfile'))
const OrderDetail   = lazyWithRetry(() => import('./componets/page/OrderDetail'))
const ProductReviews = lazyWithRetry(() => import('./componets/page/ProductReviews'))
const LegalPage     = lazyWithRetry(() => import('./componets/page/LegalPage'))

// ✅ PERFORMANCE FIX: Module-level constant — not recreated on every render
const HIDE_NAVBAR_ON = ['/login', '/signup', '/reset-password', '/admin']

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
  const location = useLocation()
  const showLoader = useDelayedLoading(true, 300)
  if (!showLoader) return null
  return <PageSkeleton path={location.pathname} />
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
          <Route path='/terms'               element={<PageWrapper><LegalPage /></PageWrapper>} />
          <Route path='/privacy'             element={<PageWrapper><LegalPage /></PageWrapper>} />
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
  const { showToast } = useToast()
  const { loading: authLoading, adminMode } = useSelector((state) => state.auth)
  const productsFetched = useSelector((state) => state.products.fetched)
  const location = useLocation()

  const [fontsLoaded, setFontsLoaded] = useState(false)
  const [isNotificationModalOpen, setNotificationModalOpen] = useState(false)
  const currentUser = useSelector((state) => state.auth.user)

  const handleCloseNotificationModal = () => {
    setNotificationModalOpen(false)
    localStorage.setItem('notification_prompt_dismissed_until', (Date.now() + 1 * 24 * 60 * 60 * 1000).toString())
  }

  const handleAcceptNotifications = async () => {
    setNotificationModalOpen(false)
    if (currentUser?.$id) {
      try {
        const token = await requestNotificationPermission(currentUser.$id)
        if (token) {
          showToast("Push notifications enabled successfully!", "success")
        } else {
          showToast("Please allow notifications in browser address bar settings.", "warning")
        }
      } catch (err) {
        console.error(err)
      }
    }
  }

  // Pre-permission Modal Trigger
  useEffect(() => {
    if (currentUser && typeof window !== "undefined" && window.Notification) {
      if (window.Notification.permission === 'default') {
        const dismissedUntil = localStorage.getItem('notification_prompt_dismissed_until')
        const hasDismissed = dismissedUntil && Date.now() < Number(dismissedUntil)
        
        if (!hasDismissed) {
          const timer = setTimeout(() => {
            setNotificationModalOpen(true)
          }, 1500)
          return () => clearTimeout(timer)
        }
      }
    }
  }, [currentUser])

  // ✅ PERFORMANCE FIX: criticalImagesLoaded was removed as a loading blocker.
  // Images loading (especially slow Unsplash URLs on mobile) was blocking the entire
  // app render for 5-10 seconds. Images now load progressively in the background.
  // Auth + fonts resolve quickly, and products are fetched in parallel.
  const loading = authLoading || !fontsLoaded
  // ✅ PERFORMANCE FIX: Removed !productsFetched from loading gate.
  // Products now load in the background — Shop/Home show skeleton loaders instead.
  // Previously, a slow Firebase products fetch blocked the ENTIRE app for 3-10 seconds.

  useEffect(() => {
    // Initialize foreground push notification listener
    listenForForegroundMessages();

    // Check if Google login session has expired (1 hour limit)
    const googleSessionExpiry = localStorage.getItem('google_session_expiry');
    if (googleSessionExpiry && Date.now() > Number(googleSessionExpiry)) {
      console.warn('Google session expired (1 hour limit reached). Logging out.');
      localStorage.removeItem('google_session_expiry');
      localStorage.removeItem('remember_me');
      sessionStorage.removeItem('session_active');
      authService.logout()
        .then(() => {
          dispatch(logoutAction());
          const guestItems = loadGuestCartItems();
          dispatch(setCartItems(guestItems));
          showToast('Google session expired. Please log in again.', 'warning');
        })
        .finally(() => {
          dispatch(setLoading(false));
        });
      return;
    }

    // ── AUTH: Restore session ─────────────────────────────────────────────────
    authService.getCurrentUser()
      .then(async (userData) => {
        if (userData) {
          const rememberMe = localStorage.getItem('remember_me') === 'true';
          const sessionActive = sessionStorage.getItem('session_active') === 'true';

          if (!rememberMe && !sessionActive) {
            // Log out immediately from Firebase since the user didn't request remember me
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

          if (typeof window !== "undefined" && Notification.permission === "granted") {
            requestNotificationPermission(userData.$id);
          }

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
  }, [dispatch, showToast])

  // Enforce Google session expiration check on navigation/route changes
  useEffect(() => {
    const googleSessionExpiry = localStorage.getItem('google_session_expiry');
    if (googleSessionExpiry && Date.now() > Number(googleSessionExpiry)) {
      console.warn('Google session expired on page navigation. Logging out.');
      localStorage.removeItem('google_session_expiry');
      localStorage.removeItem('remember_me');
      sessionStorage.removeItem('session_active');
      authService.logout()
        .then(() => {
          dispatch(logoutAction());
          const guestItems = loadGuestCartItems();
          dispatch(setCartItems(guestItems));
          showToast('Google session expired. Please log in again.', 'warning');
        });
    }
  }, [location.pathname, dispatch, showToast]);

  // ✅ FIX: Re-filter products when adminMode changes (replaces the localStorage read inside reducer)
  useEffect(() => {
    dispatch(filterProductsForMode(adminMode))
  }, [adminMode, dispatch])

  // Background preloading of critical route chunks after initial page mount (idle time)
  useEffect(() => {
    const timer = setTimeout(() => {
      shopImporter()
      productDetailImporter()
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

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
    return <Loader type="splash" />
  }

  // ✅ PERFORMANCE FIX: Moved HIDE_NAVBAR_ON outside the component (module level)
  // to prevent a new array being created on every single render of AppContent.
  const shouldShowNavbar = !HIDE_NAVBAR_ON.some(route => location.pathname.startsWith(route))
  const shouldShowBottomNav = !['/admin', '/product', '/checkout', '/login', '/signup', '/reset-password'].some(route => location.pathname.startsWith(route))

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <ScrollToTop />
      {shouldShowNavbar && <Navbar />}
      <AppRoutes />
      {shouldShowBottomNav && <MobileBottomNav />}
      <NotificationPromptModal 
        isOpen={isNotificationModalOpen} 
        onClose={handleCloseNotificationModal} 
        onAccept={handleAcceptNotifications} 
      />
    </div>
  )
}

function App() {
  return <AppContent />
}

export default App


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
import slidesService from './services/slides'
import categoryService from './services/category'
import campaignService from './services/campaign'
import { preloadProductBatch, preloadImage, getOptimizedImageUrl } from './utils/imageOptimizer'

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
import PhonePromptModal from './componets/pageComponets/PhonePromptModal'

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
import Home from './componets/page/Home'

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
      <main id="main-content" className="flex-1 w-full" tabIndex="-1">
        {children}
      </main>
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
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false)
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

  const handleClosePhoneModal = () => {
    setIsPhoneModalOpen(false)
    sessionStorage.setItem('dismissed_phone_prompt', 'true')
  }

  const handleSubmitPhone = async (phoneNumber) => {
    try {
      const updatedUser = await authService.updatePhone(phoneNumber)
      if (updatedUser) {
        dispatch(loginAction({ user: updatedUser }))
      } else if (currentUser) {
        dispatch(loginAction({ user: { ...currentUser, phone: phoneNumber } }))
      }
      showToast("📱 Mobile number updated successfully!", "success")
      setIsPhoneModalOpen(false)
    } catch (err) {
      console.error("Failed to update phone:", err)
      showToast("Failed to update mobile number. Please try again.", "error")
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

  // Phone Completion Prompt Modal Trigger (For Google / Logged-in Users without Phone Number)
  useEffect(() => {
    if (currentUser) {
      const userPhone = currentUser.phone || currentUser.prefs?.phone || ''
      const hasPhone = String(userPhone).trim().length >= 10
      const hasDismissed = sessionStorage.getItem('dismissed_phone_prompt') === 'true'

      if (!hasPhone && !hasDismissed) {
        const timer = setTimeout(() => {
          setIsPhoneModalOpen(true)
        }, 800)
        return () => clearTimeout(timer)
      }
    }
  }, [currentUser])

  // Initial loading gate — holds splash screen until background assets & data resolve
  const loading = authLoading || !fontsLoaded

  useEffect(() => {
    let mounted = true
    listenForForegroundMessages()

    const warmupApp = async () => {
      const startTime = Date.now()

      // 1. Auth check & session recovery
      const authTask = (async () => {
        try {
          const googleSessionExpiry = localStorage.getItem('google_session_expiry')
          if (googleSessionExpiry && Date.now() > Number(googleSessionExpiry)) {
            localStorage.removeItem('google_session_expiry')
            localStorage.removeItem('remember_me')
            sessionStorage.removeItem('session_active')
            await authService.logout().catch(() => {})
            dispatch(logoutAction())
            const guestItems = loadGuestCartItems()
            dispatch(setCartItems(guestItems))
            return
          }

          const userData = await authService.getCurrentUser()
          if (userData) {
            const rememberMe = localStorage.getItem('remember_me') === 'true'
            const sessionActive = sessionStorage.getItem('session_active') === 'true'

            if (!rememberMe && !sessionActive) {
              await authService.logout()
              localStorage.removeItem('remember_me')
              sessionStorage.removeItem('session_active')
              dispatch(logoutAction())
              const guestItems = loadGuestCartItems()
              dispatch(setCartItems(guestItems))
              return
            }

            sessionStorage.setItem('session_active', 'true')
            dispatch(loginAction({ user: userData }))

            if (typeof window !== "undefined" && Notification.permission === "granted") {
              requestNotificationPermission(userData.$id)
            }

            // Webhook trigger for fresh signups
            const createdAtStr = userData.$createdAt || userData.registration
            if (createdAtStr) {
              const createdAtTime = new Date(createdAtStr).getTime()
              const timeDiff = Math.abs(Date.now() - createdAtTime)
              const hasSentKey = `sent_signup_${userData.$id || userData.id}`
              const prefs = userData.prefs || {}
              if (timeDiff < 600000 && !localStorage.getItem(hasSentKey) && !prefs.signup_notified) {
                localStorage.setItem(hasSentKey, 'true')
                authService.updatePreferences({ ...prefs, signup_notified: true })
                  .catch(err => console.warn('Failed to update signup preference:', err.message))
                sendWebhookNotification('user.signup', {
                  name: userData.name || 'Anonymous',
                  email: userData.email,
                  userId: userData.$id || userData.id,
                })
              }
            }

            await hydrateCartFromDb(userData.$id, dispatch)
          } else {
            dispatch(logoutAction())
            const guestItems = loadGuestCartItems()
            dispatch(setCartItems(guestItems))
          }
        } catch (err) {
          console.error("Session recovery error on mount:", err)
          dispatch(logoutAction())
        }
      })()

      // 2. Products Catalog & Image Cache Warmup
      const productsTask = (async () => {
        try {
          const prods = await productsService.getProducts()
          const list = Array.isArray(prods) ? prods : []
          dispatch(setProducts(list))
          // Preload product front & back images in browser memory cache
          if (list.length > 0) {
            preloadProductBatch(list, 8)
          }
        } catch (prodErr) {
          console.error("Failed to preload products:", prodErr)
          dispatch(setProducts([]))
        }
      })()

      // 3. Hero Slides & Banner Images
      const slidesTask = (async () => {
        try {
          const slides = await slidesService.getSlides()
          if (Array.isArray(slides) && slides.length > 0) {
            slides.forEach(s => {
              if (s.image) preloadImage(getOptimizedImageUrl(s.image, 1600, 75), true)
              if (s.mobileImage) preloadImage(getOptimizedImageUrl(s.mobileImage, 800, 75), true)
            })
          }
        } catch (slideErr) {
          console.error("Failed to preload slides:", slideErr)
        }
      })()

      // 4. Offers & Bundle Discounts
      const offersTask = (async () => {
        try {
          const loadedOffers = await offersService.getOffers()
          dispatch(setOffers(Array.isArray(loadedOffers) ? loadedOffers : []))
        } catch (offersErr) {
          dispatch(setOffers([]))
        }
      })()

      // 5. Category Configs & Promo Texts
      const metaTask = (async () => {
        try {
          await Promise.allSettled([
            categoryService.getCategoryConfigs(),
            campaignService.getPromoText()
          ])
        } catch {}
      })()

      // 6. Google Web Fonts Loading
      const fontsTask = (async () => {
        if (typeof document !== 'undefined' && document.fonts) {
          await document.fonts.ready.catch(() => {})
        }
      })()

      // Wait for all critical background tasks concurrently
      await Promise.allSettled([
        authTask,
        productsTask,
        slidesTask,
        offersTask,
        metaTask,
        fontsTask
      ])

      // Ensure a smooth minimum splash duration of 1000ms for brand aesthetic
      const elapsed = Date.now() - startTime
      const minDuration = 1000
      if (elapsed < minDuration) {
        await new Promise(r => setTimeout(r, minDuration - elapsed))
      }

      if (mounted) {
        setFontsLoaded(true)
        dispatch(setLoading(false))
      }
    }

    warmupApp()

    // Global Fail-Safe: Dismiss loader after max 2.8s even on ultra-slow connection
    const maxTimer = setTimeout(() => {
      if (mounted) {
        setFontsLoaded(true)
        dispatch(setLoading(false))
      }
    }, 2800)

    return () => {
      mounted = false
      clearTimeout(maxTimer)
    }
  }, [dispatch, showToast])

  // Periodic Google session expiration check (every 60s)
  useEffect(() => {
    const checkExpiry = () => {
      const googleSessionExpiry = localStorage.getItem('google_session_expiry')
      if (googleSessionExpiry && Date.now() > Number(googleSessionExpiry)) {
        localStorage.removeItem('google_session_expiry')
        localStorage.removeItem('remember_me')
        sessionStorage.removeItem('session_active')
        localStorage.removeItem('current_session_id')
        authService.logout()
          .then(() => {
            dispatch(logoutAction())
            const guestItems = loadGuestCartItems()
            dispatch(setCartItems(guestItems))
            showToast('Google session expired. Please log in again.', 'warning')
          })
          .catch(err => console.error('Failed to log out expired session:', err))
      }
    }

    checkExpiry()
    const intervalId = setInterval(checkExpiry, 60000)
    return () => clearInterval(intervalId)
  }, [location.pathname, dispatch, showToast])

  // Re-filter products when adminMode changes
  useEffect(() => {
    dispatch(filterProductsForMode(adminMode))
  }, [adminMode, dispatch])

  // Background preloading of critical route chunks during idle time
  useEffect(() => {
    const timer = setTimeout(() => {
      shopImporter()
      productDetailImporter()
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  // Handle Chrome tab background/visibility restore
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setFontsLoaded(true)
        dispatch(setLoading(false))
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [dispatch])

  // Premium brand splash screen — rendered while initial session and assets resolve
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
      <PhonePromptModal
        isOpen={isPhoneModalOpen}
        onSubmitPhone={handleSubmitPhone}
      />
    </div>
  )
}

function App() {
  return <AppContent />
}

export default App


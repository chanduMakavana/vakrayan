import './App.css'
import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { login as loginAction, logout as logoutAction, setLoading } from './features/login'
import authService from './appwrite/auth'
import cartService from './appwrite/cart'
import { setCartItems } from './features/addToCart'
import productsService from './appwrite/products'
import { setProducts } from './features/productsSlice'

import Home from './componets/page/Home'
import SignUp from './componets/page/SignUp'
import Login from './componets/page/Login'
import AdminPanel from './componets/page/AddminPanel'
import ProductDetail from './componets/page/ProductDetail'
import NotFound from './componets/page/NotFound'
import AddToCartPage from './componets/pageComponets/AddToCartPage'
import Shop from './componets/page/Shop'
import Checkout from './componets/page/Checkout'
import UserProfile from './componets/page/UserProfile'
import OrderDetail from './componets/page/OrderDetail'

function App() {
  const dispatch = useDispatch()
  const { loading } = useSelector((state) => state.auth)

  useEffect(() => {
    // Attempt session recovery on application startup
    authService.getCurrentUser()
      .then(async (userData) => {
        if (userData) {
          dispatch(loginAction({ user: userData }))
          try {
            const cartItems = await cartService.getCartItems(userData.$id)
            dispatch(setCartItems(cartItems))
          } catch (cartErr) {
            console.error("Cart retrieval on session recovery failed:", cartErr)
          }
        } else {
          dispatch(logoutAction())
        }
      })
      .catch((error) => {
        console.error("Session recovery failed on mount:", error)
        dispatch(logoutAction())
      })
      .finally(() => {
        dispatch(setLoading(false))
      })

    // Preload products catalog into Redux store
    productsService.getProducts()
      .then((loadedProducts) => {
        const normalized = loadedProducts?.documents || loadedProducts || []
        dispatch(setProducts(normalized))
      })
      .catch((prodError) => {
        console.error("Failed to preload products in store:", prodError)
      })
  }, [dispatch])

  // High-End Streetwear Styled Loading Page (Premium Light Theme)
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#fafafb] flex flex-col items-center justify-center p-6 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative">
        <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-10" />
        <div className="relative z-20 flex flex-col items-center">
          <h1 className="text-2xl md:text-3xl font-black tracking-[0.4em] text-neutral-900 uppercase mb-4 animate-pulse">
            STREET<span className="text-[var(--theme-primary)]">-</span>WEAR
          </h1>
          <p className="text-[10px] md:text-xs font-black tracking-[0.2em] text-[var(--theme-primary)] uppercase">
            RESTORING SESSION...
          </p>
          <div className="w-24 h-[1.5px] bg-[var(--theme-primary)]/20 mt-6 overflow-hidden relative rounded-full">
            <div className="absolute inset-0 bg-[var(--theme-primary)] w-1/2 rounded-full animate-[loading_1s_infinite_linear]" />
          </div>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <>
      <Routes>
        <Route path='/signup' element={<SignUp />} />
        <Route path='/login' element={<Login />} />
        <Route path='/' element={<Home />} />
        <Route path='/admin' element={<AdminPanel />} />
        <Route path='/cart' element={<AddToCartPage />} />
        <Route path='/product/:id' element={<ProductDetail />} />
        <Route path='/shop' element={<Shop />} />
        <Route path='/category/:category' element={<Shop />} />
        <Route path='/checkout' element={<Checkout />} />
        <Route path='/profile' element={<UserProfile />} />
        <Route path='/order/:id' element={<OrderDetail />} />
        <Route path='/*' element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App


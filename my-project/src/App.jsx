import './App.css'
import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { login as loginAction, logout as logoutAction, setLoading } from './features/login'
import authService from './appwrite/auth'

import Home from './componets/page/Home'
import SignUp from './componets/page/SignUp'
import Login from './componets/page/Login'
import AdminPanel from './componets/page/AddminPanel'
import ProductDetail from './componets/page/ProductDetail'
import NotFound from './componets/page/NotFound'
import AddToCartPage from './componets/pageComponets/AddToCartPage'

function App() {
  const dispatch = useDispatch()
  const { loading } = useSelector((state) => state.auth)

  useEffect(() => {
    // Attempt session recovery on application startup
    authService.getCurrentUser()
      .then((userData) => {
        if (userData) {
          dispatch(loginAction({ user: userData }))
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
  }, [dispatch])

  // High-End Streetwear Styled Loading Page (Premium Light Theme)
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#fafafb] flex flex-col items-center justify-center p-6 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative">
        <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-10" />
        <div className="relative z-20 flex flex-col items-center">
          <h1 className="text-2xl md:text-3xl font-black tracking-[0.4em] text-neutral-900 uppercase mb-4 animate-pulse">
            STREET<span className="text-red-500">-</span>WEAR
          </h1>
          <p className="text-[10px] md:text-xs font-black tracking-[0.2em] text-red-500 uppercase">
            RESTORING SESSION...
          </p>
          <div className="w-24 h-[1.5px] bg-red-500/20 mt-6 overflow-hidden relative rounded-full">
            <div className="absolute inset-0 bg-red-500 w-1/2 rounded-full animate-[loading_1s_infinite_linear]" />
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
        <Route path='/*' element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App


import React, { useState, useEffect } from 'react'
import { HiX, HiMinus, HiPlus } from 'react-icons/hi'
import { FiShield, FiArrowLeft } from 'react-icons/fi'
import { useNavigate, Link } from 'react-router-dom'
import cartService from '../../appwrite/cart'
import authService from '../../appwrite/auth'

function AddToCartPage() {
  const navigate = useNavigate()
  
  // Dynamic Hooks for Cloud Synchronization
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  // ➡️ 1. INITIAL FETCH: Active User details aur unka live backend cart pool fetch karo
  const fetchCartStage = async () => {
    try {
      setLoading(true)
      const user = await authService.getCurrentUser()
      if (user) {
        setUserId(user.$id)
        const items = await cartService.getCartItems(user.$id)
        setCartItems(items)
      } else {
        alert("Please session authenticate to track your cart.")
        navigate('/login')
      }
    } catch (error) {
      console.error("Cart retrieval processing failure:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCartStage()
  }, [])

  // ➡️ 2. QUANTITY OPERATORS: Real-time Cloud updates triggers
  const handleQuantityShift = async (item, operation) => {
    try {
      let targetQuantity = item.quantity
      if (operation === 'increase') targetQuantity += 1
      if (operation === 'decrease') targetQuantity -= 1

      // Security check: Minimum boundary shield logic
      if (targetQuantity < 1) {
        handleRemove(item.$id)
        return
      }

      const calculatedSubtotal = Number(item.price) * targetQuantity

      // Optimistic state manipulation (UI ko instantly update karne ke liye)
      setCartItems(prev => prev.map(c => c.$id === item.$id ? { ...c, quantity: targetQuantity, subtotal: calculatedSubtotal } : c))

      // Final Backend Sync
      await cartService.updateCartItem(item.$id, {
        quantity: targetQuantity,
        subtotal: calculatedSubtotal
      })
    } catch (error) {
      console.error("Failed to alter quantity matrix:", error)
      fetchCartStage() // Fallback rollback fetch on error breaks
    }
  }

  // ➡️ 3. REMOVE PRODUCT TRACKING ACTION
  const handleRemove = async (documentId) => {
    try {
      // Optimistic slice filter out
      setCartItems(prev => prev.filter(c => c.$id !== documentId))
      await cartService.removeFromCart(documentId)
    } catch (error) {
      console.error("Failed to extract item execution drop:", error)
      fetchCartStage()
    }
  }

  // ➡️ 4. INVENTORY MATHEMATICS MATRIX (Accumulators)
  const cartTotalAmount = cartItems.reduce((acc, item) => acc + Number(item.subtotal || 0), 0)
  const cartTotalQuantity = cartItems.reduce((acc, item) => acc + Number(item.quantity || 0), 0)

  // Page Loading Viewport State
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#fafafb] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        <div className="text-[10px] tracking-[0.5em] text-neutral-900 font-black uppercase">
          SYNCHRONIZING LOGISTICS INVENTORY...
        </div>
      </div>
    )
  }

  // Empty Inventory Base Viewport State
  if (cartItems.length === 0) {
    return (
      <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 flex flex-col items-center justify-center px-6 selection:bg-neutral-900 selection:text-white">
        <div className="text-center space-y-6 max-w-md">
          <h2 className="text-3xl font-black tracking-tighter uppercase">Your Inventory is Empty</h2>
          <p className="text-xs text-neutral-500 font-mono tracking-wide uppercase leading-relaxed">
            No dynamic streetwear drops queued inside active local cloud registers. Secure your fits before the supply chain breaks.
          </p>
          <Link 
            to="/" 
            className="inline-block bg-neutral-900 text-white font-black text-xs tracking-widest uppercase px-8 py-4 rounded-xl shadow-md hover:bg-neutral-800 transition-all transform active:scale-95"
          >
            Explore Active Drops &rarr;
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 font-sans relative selection:bg-neutral-900 selection:text-white pb-20">
      
      {/* Technical Layout Accent Lines */}
      <div className="absolute top-0 bottom-0 left-6 md:left-12 border-l border-neutral-200/30 pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-6 md:right-12 border-r border-neutral-200/30 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 relative z-20 space-y-10">
        
        {/* Navigation & Back Trigger Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200/50">
          <div className="space-y-1">
            <span className="text-[9px] tracking-[0.4em] text-red-500 font-black uppercase block">
              CHECKOUT LOGISTICS POOL
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight uppercase">
              Shopping Cart <span className="font-mono text-neutral-400 font-normal">({cartTotalQuantity})</span>
            </h1>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-black tracking-widest text-neutral-400 hover:text-neutral-950 transition-colors uppercase group cursor-pointer w-fit">
            <FiArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
            Continue Stocking
          </Link>
        </div>

        {/* 2-Column Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16 items-start">
          
          {/* COLUMN 1: ITEMS STOCK LAYOUT WITH SIZE OPTIONS (Spans 7 Columns) */}
          <div className="lg:col-span-7 space-y-4">
            
            {cartItems.map((item) => {
              const uniqueId = item.$id;
              
              return (
                <div 
                  key={uniqueId}
                  className="flex gap-4 p-4 bg-white border border-neutral-200/60 rounded-2xl shadow-xs relative group hover:border-neutral-400/40 transition-all duration-300"
                >
                  {/* Remove Single Document Button */}
                  <button 
                    onClick={() => handleRemove(uniqueId)}
                    className="absolute top-3 right-3 text-neutral-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                  >
                    <HiX className="text-base" />
                  </button>

                  {/* Garment Aspect Viewport Box */}
                  <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200/40 shrink-0">
                    <img 
                      src={item.product_Image || 'https://placehold.co/400x500?text=PRODUCT+VIEW'} 
                      alt={item.name} 
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  {/* Specs Metadata Stack */}
                  <div className="flex flex-col justify-between py-1 grow pr-6 space-y-3">
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-neutral-800 tracking-wide uppercase line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-[10px] font-mono text-neutral-400 uppercase">
                        UNIT SPEC: ₹{Number(item.price).toLocaleString('en-IN')}
                      </p>
                    </div>

                    {/* Integrated Active Size Badge (Static as per Cart mapping limits) */}
                    <div className="space-y-1.5">
                      <span className="text-[8px] font-bold text-neutral-400 tracking-widest uppercase block">
                        SECURED SPEC SIZE
                      </span>
                      <div className="flex gap-1.5">
                        <span className="text-[10px] font-mono font-black px-2.5 py-1 rounded-md bg-neutral-900 text-white border border-neutral-900 shadow-xs uppercase">
                          {item.size || 'M'}
                        </span>
                      </div>
                    </div>

                    {/* Counter & Subtotal Dock Unit */}
                    <div className="flex items-center justify-between gap-4 mt-2 flex-wrap pt-2 border-t border-neutral-100">
                      <div className="flex items-center border border-neutral-200 bg-neutral-50 rounded-lg p-1">
                        <button 
                          onClick={() => handleQuantityShift(item, 'decrease')}
                          className="p-1.5 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <HiMinus className="text-xs" />
                        </button>
                        <span className="px-3 font-mono font-black text-xs text-neutral-900 min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => handleQuantityShift(item, 'increase')}
                          className="p-1.5 hover:text-neutral-950 transition-colors cursor-pointer"
                        >
                          <HiPlus className="text-xs" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-[8px] font-bold text-neutral-400 block tracking-widest uppercase">Accumulated Value</span>
                        <span className="text-sm font-mono font-black text-neutral-900">
                          ₹{Number(item.subtotal).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

          </div>

          {/* COLUMN 2: INDUSTRIAL LOGISTICS SUMMARY PANEL (Spans 5 Columns) */}
          <div className="lg:col-span-5 bg-white border border-neutral-200/60 p-6 rounded-2xl shadow-xs space-y-6 lg:sticky lg:top-24">
            <h3 className="text-xs font-black tracking-[0.25em] uppercase text-neutral-400">
              LOGISTICS SUMMARY
            </h3>

            <div className="space-y-3.5 text-xs font-medium uppercase tracking-wide text-neutral-600">
              <div className="flex justify-between">
                <span>SUBTOTAL SPEC VAL</span>
                <span className="font-mono text-neutral-900 font-bold">
                  ₹{cartTotalAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>DOMESTIC DISPATCH PACK</span>
                <span className="font-mono text-emerald-600 font-black tracking-wider text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded">
                  FREE DISPATCH
                </span>
              </div>
              <div className="flex justify-between">
                <span>ESTIMATED TAX PIPELINE</span>
                <span className="font-mono text-neutral-400">INCLUDED</span>
              </div>

              <hr className="border-neutral-100" />

              <div className="flex justify-between items-baseline pt-2">
                <span className="text-sm font-black text-neutral-900">NET ORDER VALUE</span>
                <span className="text-2xl font-mono font-black text-neutral-950 tracking-tight">
                  ₹{cartTotalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Checkout Interface Actions */}
            <div className="space-y-3 pt-2">
              <button 
                onClick={() => navigate('/checkout')}
                className="w-full bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] transition-all text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-md cursor-pointer select-none text-center"
              >
                PROCEED TO CHECKOUT INVOICE &rarr;
              </button>
            </div>

            {/* Security Data Line */}
            <div className="flex items-center gap-3 text-[8px] font-mono text-neutral-400 border border-neutral-100 bg-neutral-50/50 p-3 rounded-xl leading-normal uppercase">
              <FiShield className="text-base text-neutral-700 shrink-0" />
              <div>
                <span className="font-bold text-neutral-700 block mb-0.5">🔒 REGULATORY SECURITY POOL ACTIVE</span>
                Fits are held inside your cached storage inventory index for a limited period. Order finalize processing ensures drops bypass stock depletion thresholds.
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}

export default AddToCartPage
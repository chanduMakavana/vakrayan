import { useState, useEffect } from 'react'
import { HiX, HiMinus, HiPlus } from 'react-icons/hi'
import { FiShield, FiArrowLeft } from 'react-icons/fi'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import cartService from '../../appwrite/cart'
import authService from '../../appwrite/auth'
import campaignService from '../../appwrite/campaign'
import { setCartItems as setCartItemsAction, removeCartItemState, updateCartItemState } from '../../features/addToCart'
import { useToast } from '../../context/ToastContext'

function AddToCartPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  
  // Dynamic Hooks for Cloud Synchronization
  const cartItems = useSelector(state => state.cart)
  const products = useSelector(state => state.products.items || [])
  const [loading, setLoading] = useState(true)

  // Dynamic Coupon State
  const [promoInput, setPromoInput] = useState('')
  const [couponApplied, setCouponApplied] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)

  // ➡️ 4. INVENTORY MATHEMATICS MATRIX (Accumulators)
  const cartTotalAmount = (cartItems || []).reduce((acc, item) => acc + Number(item.subtotal || 0), 0)
  const cartTotalQuantity = (cartItems || []).reduce((acc, item) => acc + Number(item.quantity || 0), 0)

  // Load carried coupon from sessionStorage on mount
  useEffect(() => {
    const carriedCoupon = sessionStorage.getItem('checkout_coupon');
    const carriedDiscount = sessionStorage.getItem('checkout_discount');
    if (carriedCoupon && carriedDiscount) {
      setTimeout(() => {
        setCouponApplied(carriedCoupon);
        setDiscountPercent(Number(carriedDiscount));
      }, 0);
    }
  }, []);

  const handleApplyPromo = async () => {
    try {
      const activeCoupons = await campaignService.getCoupons();
      const match = activeCoupons.find(c => String(c.code || '').trim().toUpperCase() === promoInput.trim().toUpperCase());
      if (match) {
        setDiscountPercent(match.discount);
        setCouponApplied(match.code);
        setPromoInput('');
        sessionStorage.setItem('checkout_coupon', match.code);
        sessionStorage.setItem('checkout_discount', String(match.discount));
        showToast(`Promo code ${match.code} applied. You saved ${match.discount}%.`, "success");
      } else {
        showToast("Invalid promo code.", "error");
      }
    } catch (err) {
      console.error("Promo verification issue:", err);
      showToast("Verification server connection timeout.", "error");
    }
  };

  const discountAmount = cartTotalAmount * (discountPercent / 100);
  const finalAmount = cartTotalAmount - discountAmount;

  // ➡️ 1. INITIAL FETCH: Active User details aur unka live backend cart pool fetch karo
  const fetchCartStage = async () => {
    try {
      setLoading(true)
      const user = await authService.getCurrentUser()
      if (user) {
        const items = await cartService.getCartItems(user.$id)
        dispatch(setCartItemsAction(items))
      } else {
        showToast("Please session authenticate to track your cart.", "error")
        navigate('/login')
      }
    } catch (error) {
      console.error("Cart retrieval processing failure:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setTimeout(() => fetchCartStage(), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ➡️ 2. QUANTITY OPERATORS: Real-time Cloud updates triggers
  const handleQuantityShift = async (item, operation) => {
    try {
      let targetQuantity = item.quantity
      if (operation === 'increase') {
        const prod = products.find(p => p.$id === item.product_id || p.id === item.product_id)
        if (prod) {
          let stocks = {}
          try {
            stocks = JSON.parse(prod.sizes_stock || '{}')
          } catch {
            stocks = {}
          }
          const availableStock = stocks[item.size] !== undefined ? Number(stocks[item.size]) : 10
          if (targetQuantity + 1 > availableStock) {
            showToast(`Cannot increase quantity. Only ${availableStock} items left in stock for size ${item.size}.`, "error")
            return
          }
        }
        targetQuantity += 1
      }
      if (operation === 'decrease') targetQuantity -= 1

      // Security check: Minimum boundary shield logic
      if (targetQuantity < 1) {
        handleRemove(item.$id)
        return
      }

      const calculatedSubtotal = Number(item.price) * targetQuantity

      // Optimistic state manipulation (UI ko instantly update karne ke liye)
      dispatch(updateCartItemState({ $id: item.$id, quantity: targetQuantity, subtotal: calculatedSubtotal }))

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
      dispatch(removeCartItemState(documentId))
      await cartService.removeFromCart(documentId)
    } catch (error) {
      console.error("Failed to extract item execution drop:", error)
      fetchCartStage()
    }
  }

  // Page Loading Viewport State
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#fafafb] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        <div className="text-[10px] tracking-[0.5em] text-neutral-900 font-black uppercase">
          Loading your cart...
        </div>
      </div>
    )
  }

  // Empty cart state
  if (cartItems.length === 0) {
    return (
      <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 flex flex-col items-center justify-center px-6 selection:bg-neutral-900 selection:text-white">
        <div className="text-center space-y-6 max-w-md">
          <h2 className="text-3xl font-bold tracking-tight">Your cart is empty</h2>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Add products to your cart and they will appear here before checkout.
          </p>
          <Link 
            to="/" 
            className="inline-block bg-neutral-900 text-white font-black text-xs tracking-widest uppercase px-8 py-4 rounded-xl shadow-md hover:bg-neutral-800 transition-all transform active:scale-95"
          >
            Explore Collection &rarr;
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 font-sans pb-20">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 space-y-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200/60">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Shopping Cart <span className="text-neutral-400 font-normal text-lg">({cartTotalQuantity})</span>
            </h1>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors uppercase group cursor-pointer w-fit">
            <FiArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
            Continue Shopping
          </Link>
        </div>

        {/* 2-Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUMN 1: Cart Items */}
          <div className="lg:col-span-7 space-y-4">
            
            {cartItems.map((item) => {
              const uniqueId = item.$id;
              
              return (
                <div 
                  key={uniqueId}
                  className="flex gap-4 p-4 bg-white border border-neutral-200/50 rounded-xl relative group hover:shadow-md transition-all duration-300"
                >
                  {/* Remove Button */}
                  <button 
                    onClick={() => handleRemove(uniqueId)}
                    className="absolute top-3 right-3 text-neutral-400 hover:text-neutral-900 p-1 cursor-pointer transition-colors"
                  >
                    <HiX className="text-lg" />
                  </button>

                  {/* Image */}
                  <div className="w-20 h-26 sm:w-24 sm:h-32 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200/30 shrink-0">
                    <img 
                      src={item.product_Image || 'https://placehold.co/400x500?text=No+Preview'} 
                      alt={item.name} 
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex flex-col justify-between py-0.5 grow pr-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-neutral-800 line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-neutral-500">
                        Price: ₹{Number(item.price).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Size: <span className="font-semibold text-neutral-800">{item.size || 'M'}</span>
                      </p>
                    </div>

                    {/* Quantity Controls & Subtotal */}
                    <div className="flex items-center justify-between gap-4 mt-4 flex-wrap pt-2 border-t border-neutral-100">
                      <div className="flex items-center border border-neutral-200 bg-neutral-50 rounded-lg p-0.5">
                        <button 
                          onClick={() => handleQuantityShift(item, 'decrease')}
                          className="p-1 hover:text-neutral-950 transition-colors cursor-pointer text-neutral-500"
                        >
                          <HiMinus className="text-xs" />
                        </button>
                        <span className="px-2.5 font-semibold text-xs text-neutral-900 min-w-5 text-center">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => handleQuantityShift(item, 'increase')}
                          className="p-1 hover:text-neutral-950 transition-colors cursor-pointer text-neutral-500"
                        >
                          <HiPlus className="text-xs" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 block uppercase font-medium">Subtotal</span>
                        <span className="text-xs font-semibold text-neutral-900">
                          ₹{Number(item.subtotal).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

          </div>

          {/* COLUMN 2: Order Summary */}
          <div className="lg:col-span-5 bg-white border border-neutral-200/50 p-6 rounded-xl space-y-6 lg:sticky lg:top-24">
            <h3 className="text-xs font-bold tracking-wider uppercase text-neutral-400">
              Order Summary
            </h3>

            <div className="space-y-3.5 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-neutral-900 font-semibold">
                  ₹{cartTotalAmount.toLocaleString('en-IN')}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount ({couponApplied})</span>
                  <span>
                    - ₹{discountAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="text-emerald-600 font-semibold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded">
                  FREE SHIPPING
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Tax</span>
                <span className="text-neutral-400">Included</span>
              </div>

              <hr className="border-neutral-100" />

              <div className="flex justify-between items-baseline pt-2">
                <span className="text-sm font-semibold text-neutral-800">Total</span>
                <span className="text-xl font-bold text-neutral-950">
                  ₹{finalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Apply Coupon */}
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <label className="text-[10px] font-bold text-neutral-500 uppercase block">
                Apply Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="ENTER COUPON CODE"
                  className="flex-1 bg-[#fbfbfb] border border-neutral-200 focus:border-neutral-900 rounded-lg px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 outline-hidden uppercase font-semibold transition-colors"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white font-bold text-[10px] tracking-wider uppercase px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  APPLY
                </button>
              </div>
              {couponApplied && (
                <div className="flex items-center justify-between gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-mono bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 mt-2 animate-scale-in">
                  <span>🎟️ {couponApplied} ACTIVE ({discountPercent}% OFF)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCouponApplied('');
                      setDiscountPercent(0);
                      sessionStorage.removeItem('checkout_coupon');
                      sessionStorage.removeItem('checkout_discount');
                      showToast("Coupon code removed.", "info");
                    }}
                    className="text-rose-600 hover:text-rose-800 font-black ml-2 cursor-pointer transition-colors uppercase text-[9px]"
                  >
                    ✕ Remove
                  </button>
                </div>
              )}
            </div>

            {/* Checkout CTA */}
            <div className="space-y-3 pt-2">
              <button 
                onClick={() => navigate('/checkout')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] transition-all text-white font-bold text-xs tracking-widest uppercase py-3.5 rounded-lg shadow-sm cursor-pointer select-none text-center"
              >
                Proceed to Checkout
              </button>
            </div>

            {/* Security Note */}
            <div className="flex items-start gap-3 text-[10px] text-neutral-400 border border-neutral-100 bg-neutral-50/50 p-3 rounded-lg leading-relaxed uppercase">
              <FiShield className="text-sm text-neutral-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-neutral-600 block mb-0.5">Secure Checkout</span>
                Your transactions are safe and encrypted. Items added to your cart are not reserved until purchase is complete.
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}

export default AddToCartPage

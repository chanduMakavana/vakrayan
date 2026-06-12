import { useState, useEffect } from 'react'
import { HiX, HiMinus, HiPlus } from 'react-icons/hi'
import { FiShield, FiArrowLeft } from 'react-icons/fi'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import cartService from '../../appwrite/cart'
import productsService from '../../appwrite/products'
import campaignService from '../../appwrite/campaign'
import couponUsageService from '../../appwrite/couponUsage'
import { setCartItems as setCartItemsAction, removeCartItemState, updateCartItemState } from '../../features/addToCart'
import { useToast } from '../../context/ToastContext'

const loadGuestCartItems = () => {
  try {
    const saved = localStorage.getItem('guest_cart_items');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

function AddToCartPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  
  // Dynamic Hooks for Cloud Synchronization
  const cartItems = useSelector(state => state.cart)
  const products = useSelector(state => state.products.items || [])
  const { user } = useSelector(state => state.auth)
  const [loading, setLoading] = useState(true)

  // Dynamic Coupon State
  const [promoInput, setPromoInput] = useState('')
  const [couponApplied, setCouponApplied] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)

  // Selection Checkboxes State (store deselected items to automatically select new items)
  const [deselectedItemIds, setDeselectedItemIds] = useState(() => {
    const saved = sessionStorage.getItem('deselected_cart_item_ids');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (err) {
        console.warn("Failed to parse deselected cart item IDs:", err);
      }
    }
    return [];
  });

  const selectedItemIds = cartItems.filter(item => !deselectedItemIds.includes(item.$id)).map(item => item.$id);
  const selectedCartItems = cartItems.filter(item => selectedItemIds.includes(item.$id));

  // ➡️ 4. INVENTORY MATHEMATICS MATRIX (Accumulators)
  const cartTotalAmount = selectedCartItems.reduce((acc, item) => acc + Number(item.subtotal || 0), 0)
  const cartTotalQuantity = selectedCartItems.reduce((acc, item) => acc + Number(item.quantity || 0), 0)

  // Load carried coupon from sessionStorage on mount and validate usage, expiry and min order value
  useEffect(() => {
    const carriedCoupon = sessionStorage.getItem('checkout_coupon');
    if (carriedCoupon) {
      campaignService.getCoupons()
        .then(async (activeCoupons) => {
          const match = activeCoupons.find(c => String(c.code || '').trim().toUpperCase() === carriedCoupon.trim().toUpperCase());
          if (match) {
            if (user && user.$id) {
              const alreadyUsed = await couponUsageService.checkCouponUsage(user.$id, match.code);
              if (alreadyUsed) {
                sessionStorage.removeItem('checkout_coupon');
                sessionStorage.removeItem('checkout_discount');
                setCouponApplied('');
                setDiscountPercent(0);
                showToast(`Coupon ${match.code} has already been redeemed.`, "error");
                return;
              }
            }

            let minOrder = Number(match.min_order_value || 0);
            if (match.coupon_usage) {
              try {
                const parsed = JSON.parse(match.coupon_usage);
                if (parsed && typeof parsed === 'object' && 'min_order_value' in parsed) {
                  minOrder = Number(parsed.min_order_value);
                }
              } catch (err) {
                console.warn("Could not parse coupon usage metadata:", err.message);
              }
            }

            if (match.isExpired) {
              sessionStorage.removeItem('checkout_coupon');
              sessionStorage.removeItem('checkout_discount');
              setCouponApplied('');
              setDiscountPercent(0);
              showToast(`Coupon ${match.code} has expired.`, "error");
              return;
            }

            if (cartTotalAmount > 0 && cartTotalAmount < minOrder) {
              sessionStorage.removeItem('checkout_coupon');
              sessionStorage.removeItem('checkout_discount');
              setCouponApplied('');
              setDiscountPercent(0);
              showToast(`Coupon ${match.code} requires a minimum order value of ₹${minOrder}.`, "error");
              return;
            }

            setCouponApplied(match.code);
            setDiscountPercent(Number(match.discount));
          } else {
            sessionStorage.removeItem('checkout_coupon');
            sessionStorage.removeItem('checkout_discount');
            setCouponApplied('');
            setDiscountPercent(0);
          }
        })
        .catch(err => {
          console.warn("Coupon validation failed on mount:", err);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Validate coupon min order value whenever cart total changes
  useEffect(() => {
    if (couponApplied && cartTotalAmount > 0) {
      campaignService.getCoupons()
        .then(activeCoupons => {
          const match = activeCoupons.find(c => String(c.code || '').toUpperCase() === couponApplied.toUpperCase());
          if (match) {
            let minOrder = Number(match.min_order_value || 0);
            if (match.coupon_usage) {
              try {
                const parsed = JSON.parse(match.coupon_usage);
                if (parsed && typeof parsed === 'object' && 'min_order_value' in parsed) {
                  minOrder = Number(parsed.min_order_value);
                }
              } catch (err) {
                console.warn("Failed to parse coupon usage:", err);
              }
            }
            if (cartTotalAmount < minOrder) {
              sessionStorage.removeItem('checkout_coupon');
              sessionStorage.removeItem('checkout_discount');
              setCouponApplied('');
              setDiscountPercent(0);
              showToast(`Coupon ${match.code} removed: Order value must be at least ₹${minOrder}.`, "error");
            }
          }
        })
        .catch(err => console.warn(err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartTotalAmount, couponApplied]);

  const handleApplyPromo = async () => {
    try {
      const activeCoupons = await campaignService.getCoupons();
      const match = activeCoupons.find(c => String(c.code || '').trim().toUpperCase() === promoInput.trim().toUpperCase());
      if (match) {
        if (user && user.$id) {
          const alreadyUsed = await couponUsageService.checkCouponUsage(user.$id, match.code);
          if (alreadyUsed) {
            showToast(`Coupon ${match.code} has already been redeemed. Limit: 1 use per customer.`, "error");
            setPromoInput('');
            return;
          }
        }

        let minOrder = Number(match.min_order_value || 0);
        if (match.coupon_usage) {
          try {
            const parsed = JSON.parse(match.coupon_usage);
            if (parsed && typeof parsed === 'object' && 'min_order_value' in parsed) {
              minOrder = Number(parsed.min_order_value);
            }
          } catch (err) {
            console.warn("Could not parse coupon usage metadata:", err.message);
          }
        }

        if (cartTotalAmount < minOrder) {
          showToast(`Coupon ${match.code} requires a minimum order value of ₹${minOrder}.`, "error");
          return;
        }

        if (match.isExpired) {
          showToast(`Coupon ${match.code} has expired.`, "error");
          return;
        }

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
  const baseShippingFee = selectedCartItems.length === 0 ? 0 : (finalAmount >= 999 ? 0 : 99);
  const grandTotal = selectedCartItems.length === 0 ? 0 : (finalAmount + baseShippingFee);

  // ➡️ 1. INITIAL FETCH: use Redux user directly — no redundant API call
  const fetchCartStage = async () => {
    try {
      setLoading(true)
      if (user && user.$id) {
        const items = await cartService.getCartItems(user.$id)
        dispatch(setCartItemsAction(items))
      } else {
        dispatch(setCartItemsAction(loadGuestCartItems()))
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
        let availableStock = 10;
        try {
          const liveProduct = await productsService.getProductById(item.product_id);
          if (liveProduct) {
            let stocks = {};
            try {
              stocks = JSON.parse(liveProduct.sizes_stock || '{}');
            } catch {
              stocks = {};
            }
            const baseSize = item.size ? String(item.size).split('/')[0].trim() : 'M';
            availableStock = stocks[baseSize] !== undefined ? Number(stocks[baseSize]) : 10;
          }
        } catch (err) {
          console.warn("Live stock check failed, falling back to cache:", err.message);
          const prod = products.find(p => p.$id === item.product_id || p.id === item.product_id);
          if (prod) {
            let stocks = {};
            try {
              stocks = JSON.parse(prod.sizes_stock || '{}');
            } catch {
              stocks = {};
            }
            const baseSize = item.size ? String(item.size).split('/')[0].trim() : 'M';
            availableStock = stocks[baseSize] !== undefined ? Number(stocks[baseSize]) : 10;
          }
        }

        if (targetQuantity + 1 > availableStock) {
          showToast(`Cannot increase quantity. Only ${availableStock} items left in stock for size ${item.size}.`, "error");
          return;
        }
        targetQuantity += 1;
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

      // Final Sync
      if (user && user.$id) {
        await cartService.updateCartItem(item.$id, {
          quantity: targetQuantity,
          subtotal: calculatedSubtotal
        })
      } else {
        let guestItems = loadGuestCartItems();
        const idx = guestItems.findIndex(i => i.$id === item.$id);
        if (idx !== -1) {
          guestItems[idx].quantity = targetQuantity;
          guestItems[idx].subtotal = calculatedSubtotal;
          localStorage.setItem('guest_cart_items', JSON.stringify(guestItems));
        }
      }
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
      if (user && user.$id) {
        await cartService.removeFromCart(documentId)
      } else {
        let guestItems = loadGuestCartItems();
        guestItems = guestItems.filter(i => i.$id !== documentId);
        localStorage.setItem('guest_cart_items', JSON.stringify(guestItems));
      }
    } catch (error) {
      console.error("Failed to extract item execution drop:", error)
      fetchCartStage()
    }
  }

  // ➡️ 3.5 UPDATE PRODUCT SIZE ACTION
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
        if (user && user.$id) {
          await cartService.updateCartItem(existing.$id, {
            quantity: updatedQty,
            subtotal: updatedSub
          });
        }
 
        // 2. Remove current item
        dispatch(removeCartItemState(item.$id));
        if (user && user.$id) {
          await cartService.removeFromCart(item.$id);
        } else {
          let guestItems = loadGuestCartItems();
          const existIdx = guestItems.findIndex(i => i.$id === existing.$id);
          if (existIdx !== -1) {
            guestItems[existIdx].quantity = updatedQty;
            guestItems[existIdx].subtotal = updatedSub;
          }
          guestItems = guestItems.filter(i => i.$id !== item.$id);
          localStorage.setItem('guest_cart_items', JSON.stringify(guestItems));
        }

        showToast(`Merged with existing size ${newSize} item in your cart.`, "success");
      } else {
        dispatch(updateCartItemState({ $id: item.$id, size: newSize }));
        if (user && user.$id) {
          await cartService.updateCartItem(item.$id, { size: newSize });
        } else {
          let guestItems = loadGuestCartItems();
          const idx = guestItems.findIndex(i => i.$id === item.$id);
          if (idx !== -1) {
            guestItems[idx].size = newSize;
            localStorage.setItem('guest_cart_items', JSON.stringify(guestItems));
          }
        }
        showToast(`Size updated to ${newSize}.`, "success");
      }
    } catch (err) {
      console.error("Size update failure:", err);
      showToast("Failed to update item size.", "error");
    }
  };

  // Page Loading Viewport State
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        <div className="text-[10px] tracking-[0.5em] text-[var(--color-text)] font-black uppercase">
          Loading your cart...
        </div>
      </div>
    )
  }

  // Empty cart state
  if (cartItems.length === 0) {
    return (
      <div className="w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col items-center justify-center px-6 selection:bg-[var(--color-accent)] selection:text-white">
        <div className="text-center space-y-6 max-w-md">
          <h2 className="text-3xl font-bold tracking-tight">Your cart is empty</h2>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            Add products to your cart and they will appear here before checkout.
          </p>
          <Link 
            to="/" 
            className="inline-block bg-[var(--color-accent)] text-white font-black text-xs tracking-widest uppercase px-8 py-4 rounded-xl shadow-md hover:bg-[var(--color-accent-hover)] transition-all transform active:scale-95"
          >
            Explore Collection &rarr;
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans pb-20">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 space-y-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Shopping Cart <span className="text-[var(--color-muted)] font-normal text-lg">({cartTotalQuantity})</span>
            </h1>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors uppercase group cursor-pointer w-fit">
            <FiArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
            Continue Shopping
          </Link>
        </div>

        {/* 2-Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUMN 1: Cart Items */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Select All Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-xs font-mono mb-4">
              <label className="flex items-center gap-2 cursor-pointer font-black uppercase text-[var(--color-text)]">
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
                  className="w-4 h-4 rounded text-[var(--color-accent)] focus:ring-[var(--color-accent)] accent-[var(--color-accent)] border-[var(--color-border)] cursor-pointer"
                />
                SELECT ALL ITEMS ({cartItems.length})
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
                  className="text-[10px] font-black text-rose-655 hover:text-rose-700 uppercase cursor-pointer"
                >
                  DESELECT ALL
                </button>
              )}
            </div>

            {cartItems.map((item) => {
              const uniqueId = item.$id;
              const matchingProd = products.find(p => p.$id === item.product_id || p.id === item.product_id);
              const imgUrl = item.product_Image || item.product_image || item.image || item.front_image_link || item.image_url || matchingProd?.front_image_link || matchingProd?.image_url || matchingProd?.image || 'https://placehold.co/400x500?text=No+Preview';
              const availableSizes = (matchingProd && matchingProd.sizes && matchingProd.sizes.length > 0) ? matchingProd.sizes : ['S', 'M', 'L', 'XL'];
              const isSelected = selectedItemIds.includes(uniqueId);
              
              return (
                <div 
                  key={uniqueId}
                  className={`flex gap-4 p-4 bg-[var(--color-surface)] border rounded-xl relative group hover:shadow-md transition-all duration-300 ${
                    isSelected ? 'border-[var(--color-accent)]/60 shadow-2xs' : 'border-[var(--color-border)]'
                  }`}
                >
                  {/* Item Checkbox */}
                  <div className="flex items-center justify-center shrink-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const updatedDeselected = isSelected
                          ? [...deselectedItemIds, uniqueId]
                          : deselectedItemIds.filter(id => id !== uniqueId);
                        setDeselectedItemIds(updatedDeselected);
                        sessionStorage.setItem('deselected_cart_item_ids', JSON.stringify(updatedDeselected));
                        
                        const updatedSelected = cartItems
                          .filter(item => !updatedDeselected.includes(item.$id))
                          .map(item => item.$id);
                        sessionStorage.setItem('selected_cart_item_ids', JSON.stringify(updatedSelected));
                      }}
                      className="w-4 h-4 rounded text-[var(--color-accent)] focus:ring-[var(--color-accent)] accent-[var(--color-accent)] border-[var(--color-border)] cursor-pointer"
                    />
                  </div>

                  {/* Remove Button */}
                  <button 
                    onClick={() => handleRemove(uniqueId)}
                    className="absolute top-3 right-3 text-[var(--color-muted)] hover:text-[var(--color-text)] p-1 cursor-pointer transition-colors"
                  >
                    <HiX className="text-lg" />
                  </button>

                  {/* Image */}
                  <div className="w-20 h-26 sm:w-24 sm:h-32 rounded-lg overflow-hidden bg-[var(--color-subtle)] border border-[var(--color-border)]/30 shrink-0">
                    <img 
                      src={imgUrl} 
                      alt={item.name} 
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex flex-col justify-between py-0.5 grow pr-4">
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-semibold text-[var(--color-text)] line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-[var(--color-muted)]">
                        Price: ₹{Number(item.price).toLocaleString('en-IN')}
                      </p>
                      
                      {/* Size Selection Dropdown */}
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)] pt-0.5">
                        <span>Size:</span>
                        <select
                          value={item.size || 'M'}
                          onChange={(e) => handleSizeChange(item, e.target.value)}
                          className="bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-2 py-0.5 text-xs text-[var(--color-text)] font-semibold outline-hidden cursor-pointer transition-colors"
                        >
                          {availableSizes.map((sz) => (
                            <option key={sz} value={sz}>{sz}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Quantity Controls & Subtotal */}
                    <div className="flex items-center justify-between gap-4 mt-4 flex-wrap pt-2 border-t border-[var(--color-border)]">
                      <div className="flex items-center border border-[var(--color-border)] bg-[var(--color-subtle)] rounded-lg p-0.5">
                        <button 
                          onClick={() => handleQuantityShift(item, 'decrease')}
                          className="p-1 hover:text-[var(--color-text)] transition-colors cursor-pointer text-[var(--color-muted)]"
                        >
                          <HiMinus className="text-xs" />
                        </button>
                        <span className="px-2.5 font-semibold text-xs text-[var(--color-text)] min-w-5 text-center">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => handleQuantityShift(item, 'increase')}
                          className="p-1 hover:text-[var(--color-text)] transition-colors cursor-pointer text-[var(--color-muted)]"
                        >
                          <HiPlus className="text-xs" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-[var(--color-muted)] block uppercase font-medium">Subtotal</span>
                        <span className="text-xs font-semibold text-[var(--color-text)]">
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
          <div className="lg:col-span-5 bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-xl space-y-6 lg:sticky lg:top-24">
            <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--color-muted)]">
              Order Summary
            </h3>

            <div className="space-y-3.5 text-xs text-[var(--color-muted)]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-[var(--color-text)] font-semibold">
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
                {baseShippingFee > 0 ? (
                  <span className="text-[var(--color-text)] font-semibold font-mono">
                    ₹{baseShippingFee}
                  </span>
                ) : (
                  <span className="text-emerald-600 font-semibold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded">
                    FREE SHIPPING
                  </span>
                )}
              </div>
              {baseShippingFee > 0 && (
                <div className="text-[10px] text-indigo-600 font-semibold text-right">
                  Add ₹{(999 - finalAmount).toLocaleString('en-IN')} more to unlock FREE SHIPPING!
                </div>
              )}
              <div className="flex justify-between">
                <span>Estimated Tax</span>
                <span className="text-[var(--color-muted)]">Included</span>
              </div>

              <hr className="border-[var(--color-border)]" />

              <div className="flex justify-between items-baseline pt-2">
                <span className="text-sm font-semibold text-[var(--color-text)]">Total</span>
                <span className="text-xl font-bold text-[var(--color-text)]">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Apply Coupon */}
            <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
              <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase block">
                Apply Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="ENTER COUPON CODE"
                  className="flex-1 bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden uppercase font-semibold transition-colors"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-95 text-white font-bold text-[10px] tracking-wider uppercase px-4 py-2 rounded-lg transition-all cursor-pointer"
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
                onClick={() => {
                  if (selectedItemIds.length === 0) {
                    showToast("Please select at least one item to proceed to checkout.", "error");
                    return;
                  }
                  sessionStorage.setItem('selected_cart_item_ids', JSON.stringify(selectedItemIds));
                  navigate('/checkout');
                }}
                className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.99] transition-all text-white font-bold text-xs tracking-widest uppercase py-3.5 rounded-lg shadow-sm cursor-pointer select-none text-center"
              >
                Proceed to Checkout
              </button>
            </div>

            {/* Security Note */}
            <div className="flex items-start gap-3 text-[10px] text-[var(--color-muted)] border border-[var(--color-border)] bg-[var(--color-subtle)]/50 p-3 rounded-lg leading-relaxed uppercase">
              <FiShield className="text-sm text-[var(--color-muted)] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[var(--color-muted)] block mb-0.5">Secure Checkout</span>
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

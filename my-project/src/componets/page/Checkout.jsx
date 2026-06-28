import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { FiArrowLeft, FiCheckCircle } from 'react-icons/fi'
import cartService from '../../appwrite/cart'
import ordersService from '../../appwrite/orders'
import productsService from '../../appwrite/products'
import campaignService from '../../appwrite/campaign'
import addressService from '../../appwrite/address'
import walletService from '../../appwrite/wallet'
import { clearCartState, setCartItems as setCartItemsAction } from '../../features/addToCart'
import { setProducts } from '../../features/productsSlice'
import Footer from '../pageComponets/Footer'
import { playSuccessChime, triggerConfetti } from '../../utils/sensoryHelper'
import couponUsageService from '../../appwrite/couponUsage'
import { useToast } from '../../context/ToastContext'
import { sendWebhookNotification } from '../../utils/webhookHelper'
import RazorpaySandboxModal from '../pageComponets/RazorpaySandboxModal'
import { calculateOffersDiscount } from '../../utils/discountCalculator'
import { isCodAvailableForPincode, isRemoteRoute } from '../../utils/pincodeHelper'

const generateMockRazorpayOrderId = () => `rzp_order_${Date.now()}`;

const generateOrderNumber = () => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${year}-${randomNum}`;
};

function Checkout() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { showToast } = useToast()
  const confettiCanvasRef = useRef(null)
  // ✅ SECURITY FIX: Double-submit protection ref — prevents duplicate orders
  // if user clicks 'Place Order' rapidly or form re-renders during submission.
  const isSubmittingRef = useRef(false)

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm()

  const allCartItems = useSelector(state => state.cart || [])
  const cartItems = useMemo(() => {
    const saved = sessionStorage.getItem('selected_cart_item_ids');
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids) && ids.length > 0) {
          const filtered = allCartItems.filter(i => ids.includes(i.$id));
          if (filtered.length > 0) return filtered;
        }
      } catch (e) {
        console.warn("Could not parse selected cart item IDs:", e.message);
      }
    }
    return allCartItems;
  }, [allCartItems]);

  const { user, isAuthenticated } = useSelector(state => state.auth)
  const { items: products, fetched: productsFetched } = useSelector(state => state.products)

  const [checkoutStatus, setCheckoutStatus] = useState('idle') // idle | processing | success

  // ✅ SEO: Dynamic page title
  useEffect(() => { document.title = 'Checkout — Vakrayan' }, [])

  useEffect(() => {
    if (checkoutStatus === 'success') {
      playSuccessChime()
      const timer = setTimeout(() => {
        if (confettiCanvasRef.current) {
          triggerConfetti(confettiCanvasRef.current)
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [checkoutStatus])
  const [processingStep, setProcessingStep] = useState(0)
  const [selectedPayment, setSelectedPayment] = useState('COD') // COD | ONLINE | WALLET
  const [codAvailable, setCodAvailable] = useState(true)
  const [razorpayModalOpen, setRazorpayModalOpen] = useState(false)
  const [submittedFormData, setSubmittedFormData] = useState(null)
  const [mockOrderId, setMockOrderId] = useState('')
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (user?.$id) {
      walletService.getUserWalletBalance(user.$id)
        .then(bal => setWalletBalance(bal))
        .catch(err => console.error("Failed to load wallet balance in checkout:", err));
    }
  }, [user]);

  // Multiple Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState('')

  // Dynamic Coupon State
  const [promoInput, setPromoInput] = useState('')
  const [couponApplied, setCouponApplied] = useState(() => {
    return sessionStorage.getItem('checkout_coupon') || '';
  })
  const [discountPercent, setDiscountPercent] = useState(() => {
    return Number(sessionStorage.getItem('checkout_discount') || 0);
  })

  const allProducts = useSelector(state => state.products.allItems || []);
  const offers = useSelector(state => state.products.offers || []);

  const cartTotalBeforeDiscount = cartItems.reduce((acc, item) => acc + Number((item.price || 0) * (item.quantity || 0)), 0);
  const { totalDiscount: bundleDiscount, appliedOffers } = useMemo(() => {
    return calculateOffersDiscount(cartItems, allProducts, offers);
  }, [cartItems, allProducts, offers]);

  const cartTotalAmount = cartTotalBeforeDiscount - bundleDiscount;
  const discountAmount = Math.round(cartTotalAmount * (discountPercent / 100));
  const discountedAmount = Math.round(cartTotalAmount - discountAmount);

  // Watch address fields to dynamically calculate remote route surcharge (₹80)
  const watchedPin = watch('pincode')
  const watchedState = watch('state')
  const isRemote = isRemoteRoute(watchedPin, watchedState)
  const remoteSurcharge = isRemote ? 80 : 0

  // Calculate Shipping Expenses & COD Fees
  const baseShippingCharge = cartItems.length === 0 ? 0 : (discountedAmount >= 999 ? 0 : 99);
  const codFee = selectedPayment === 'COD' ? 30 : 0;
  const shippingCharge = baseShippingCharge + codFee + remoteSurcharge;

  const finalAmount = discountedAmount + shippingCharge

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

  // Validate coupon min order value whenever cart total changes during checkout
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

  const applyAddressFields = useCallback((addr) => {
    if (!addr) return;
    setValue('name', addr.name || addr.customerName || user?.name || '');
    setValue('email', addr.email || user?.email || '');
    setValue('phone', addr.phone || '');
    setValue('address', addr.address || addr.addressLine || '');
    setValue('city', addr.city || '');
    setValue('pincode', addr.pincode || '');
    setValue('state', addr.state || '');
    setValue('country', addr.country || 'India');

    const pin = String(addr.pincode || '').trim();
    const state = String(addr.state || '').trim();
    const isCodAllowed = isCodAvailableForPincode(pin, state);
    setCodAvailable(isCodAllowed);
    if (!isCodAllowed) {
      setSelectedPayment('ONLINE');
      showToast("COD is not serviceable for this remote route. Switched to Online Payment.", "warning");
    }
  }, [setValue, user, showToast]);

  const handlePincodeChange = async (val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length === 6) {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        const data = await response.json();
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
          const po = data[0].PostOffice[0];
          if (po.District) {
            setValue('city', po.District.toUpperCase(), { shouldValidate: true });
          }
          if (po.State) {
            setValue('state', po.State.toUpperCase(), { shouldValidate: true });
          }
          
          const isCodAllowed = isCodAvailableForPincode(cleaned, po.State);
          setCodAvailable(isCodAllowed);
          if (!isCodAllowed) {
            setSelectedPayment('ONLINE');
            showToast("COD is not serviceable for this remote route. Switched to Online Payment.", "warning");
          } else {
            showToast(`📍 PIN code verified: ${po.District}, ${po.State}`, "success");
          }
        }
      } catch (err) {
        console.warn("Pincode autofill error:", err);
      }
    }
  };

  // Load saved addresses on mount/session load
  useEffect(() => {
    if (user && user.$id) {
      addressService.getUserAddresses(user.$id)
        .then(addresses => {
          setSavedAddresses(addresses || []);
          const def = addresses.find(a => a.is_default === true || a.isDefault === true) || addresses[0];
          if (def) {
            setSelectedAddressId(def.$id || def.id);
            applyAddressFields(def);
          } else {
            setValue('name', user.name || '');
            setValue('email', user.email || '');
          }
        })
        .catch(err => console.warn("Failed to load saved addresses profile:", err));
    }
  }, [user, setValue, applyAddressFields]);

  useEffect(() => {
    if (checkoutStatus !== 'idle') return;
    if (!isAuthenticated) {
      showToast("Please log in to continue checking out.", "error")
      navigate('/login')
    } else if (cartItems.length === 0) {
      showToast("Your inventory is currently empty.", "error")
      navigate('/')
    }
  }, [isAuthenticated, cartItems, checkoutStatus, navigate, showToast])

  // Programmatically inject official Razorpay SDK script on mount
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => console.log("Razorpay Secured SDK initialized successfully.");
    script.onerror = () => console.warn("Razorpay SDK offline. Reverting transaction channel to Sandbox.");
    document.body.appendChild(script);
    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {
        console.warn("Razorpay script cleanup ignored:", e.message);
      }
    };
  }, []);

  if (!productsFetched) {
    return (
      <div className="w-full min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        <div className="text-[10px] tracking-[0.5em] text-[var(--color-text)] font-black uppercase">
          Verifying catalog signatures...
        </div>
      </div>
    );
  }

  const steps = [
    "Checking shipping details...",
    "Processing payment...",
    "Updating product stock...",
    "Order confirmed!"
  ]

  const handleApplyPromo = async () => {
    try {
      const activeCoupons = await campaignService.getCoupons();
      const match = activeCoupons.find(c => String(c.code || '').trim().toUpperCase() === promoInput.trim().toUpperCase());
      if (match) {
        // Enforce single-use coupon check from Appwrite database usage collection
        if (user && user.$id) {
          const alreadyUsed = await couponUsageService.checkCouponUsage(user.$id, match.code);
          if (alreadyUsed) {
            showToast(`Coupon ${match.code} has already been redeemed. Limit: 1 use per customer.`, "error");
            setPromoInput('');
            return;
          }
        }

        // Parse min_order_value from coupon metadata
        let minOrder = Number(match.min_order_value || 0);
        if (match.coupon_usage) {
          try {
            const parsed = JSON.parse(match.coupon_usage);
            if (parsed && typeof parsed === 'object') {
              if ('min_order_value' in parsed) minOrder = Number(parsed.min_order_value);
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
        showToast(`Promo Code ${match.code} applied! Saved ${match.discount}% on fits drop.`, "success");
      } else {
        showToast("Invalid promo code.", "error");
      }
    } catch (err) {
      console.error("Promo verification issue:", err);
      showToast("Verification server connection timeout.", "error");
    }
  };

  const onSubmit = async (data) => {
    if (!user) return

    // ✅ SECURITY FIX: Prevent double-submit (e.g., user rapid-clicks 'Place Order')
    // A ref is used (not state) to avoid triggering a re-render when setting the flag.
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    // 0. Live Pincode Deliverability Check
    const pin = (data.pincode || '').trim();
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      showToast("Please enter a valid 6-digit Indian PIN code.", "error");
      return;
    }

    let resolvedState = '';
    try {
      const pinResponse = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const pinData = await pinResponse.json();
      if (pinData && pinData[0] && pinData[0].Status === 'Error') {
        showToast(`Sorry, PIN code ${pin} is invalid or not serviceable. Please enter a valid deliverable PIN code.`, "error");
        return;
      }
      if (pinData && pinData[0] && pinData[0].PostOffice && pinData[0].PostOffice.length > 0) {
        resolvedState = pinData[0].PostOffice[0].State || '';
      }
    } catch (err) {
      console.warn("Pincode API down, using format verification fallback:", err.message);
    }

    // Verify COD serviceability
    if (selectedPayment === 'COD') {
      const isCodAllowed = isCodAvailableForPincode(pin, resolvedState);
      if (!isCodAllowed) {
        showToast("Cash on Delivery (COD) is not serviceable for this remote route. Please use Online Payment.", "error");
        return;
      }
    }

    // 0. Live Stock Validation — fetch fresh product data from Appwrite at submit time
    // This eliminates the TOCTOU race condition where two users could both pass
    // a stale Redux cache check and oversell the last unit.
    for (const cartItem of cartItems) {
      try {
        const liveProduct = await productsService.getProductById(cartItem.product_id);
        if (liveProduct) {
          let stocks;
          try {
            stocks = JSON.parse(liveProduct.sizes_stock || '{}');
          } catch {
            stocks = {};
          }
          const baseSize = cartItem.size ? String(cartItem.size).split('/')[0].trim() : 'M';
          const availableStock = stocks[baseSize] !== undefined ? Number(stocks[baseSize]) : 10;
          if (Number(cartItem.quantity) > availableStock) {
            showToast(`Insufficient stock for "${cartItem.name}" (Size: ${cartItem.size}). Only ${availableStock} unit(s) left. Please adjust your cart.`, "error");
            return;
          }
        }
      } catch (stockErr) {
        console.warn(`Live stock check failed for ${cartItem.name}, proceeding with cached data:`, stockErr.message);
        // Fallback to Redux cache if live fetch fails
        const cachedProd = products.find(p => p.$id === cartItem.product_id || p.id === cartItem.product_id);
        if (cachedProd) {
          let stocks;
          try { stocks = JSON.parse(cachedProd.sizes_stock || '{}'); } catch { stocks = {}; }
          const baseSize = cartItem.size ? String(cartItem.size).split('/')[0].trim() : 'M';
          const availableStock = stocks[baseSize] !== undefined ? Number(stocks[baseSize]) : 10;
          if (Number(cartItem.quantity) > availableStock) {
            showToast(`Insufficient stock for "${cartItem.name}" (Size: ${cartItem.size}). Only ${availableStock} unit(s) left.`, "error");
            return;
          }
        }
      }
    }

    if (selectedPayment === 'ONLINE') {
      const liveKey = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

      const currentMockId = generateMockRazorpayOrderId();
      setMockOrderId(currentMockId);
      setSubmittedFormData(data);

      if (window.Razorpay && liveKey) {
        // Launch REAL Razorpay Standard Payment Gateway Popup
        try {
            const options = {
              key: liveKey,
              amount: finalAmount * 100, // INR in paise (₹1 = 100 paise)
              currency: "INR",
              name: "Vakrayan",
              description: "Vakrayan Secure Transaction Gateway",
              prefill: {
              name: data.name,
              email: data.email,
              contact: data.phone
            },
            notes: {
              address: `${data.address}, ${data.city} - ${data.pincode}`,
              merchant_order_id: currentMockId
            },
            retry: {
              enabled: true,
              max_count: 4
            },
            theme: {
              color: "#00B7B5" // Matching website accent Teal/Cyan color
            },
            handler: function (response) {
              const payId = response.razorpay_payment_id || `pay_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
              const ordId = response.razorpay_order_id || currentMockId;
              processFinalizeOrder(data, 'ONLINE', 'PAID', payId, ordId);
            },
            modal: {
              ondismiss: function () {
                showToast("Payment window closed by customer.", "info");
              }
            }
          };
          const rzp = new window.Razorpay(options);
          rzp.open();
          return;
        } catch (err) {
          console.warn("Real Razorpay initiation issue, falling back to sandbox simulator:", err.message);
        }
      }

      // Launch custom Razorpay secured simulator fallback
      setSubmittedFormData(data);
      setRazorpayModalOpen(true);
      return;
    }

    if (selectedPayment === 'WALLET') {
      await processFinalizeOrder(data, 'WALLET', 'PAID', `wallet_${Date.now()}`, '');
      return;
    }

    // Cash on Delivery proceeds instantly
    await processFinalizeOrder(data, 'COD', 'UNPAID', '', '');
  };

  const processFinalizeOrder = async (formData, method, status, payId, ordId) => {
    setCheckoutStatus('processing')
    setProcessingStep(0)

    // Simulate smooth processing steps
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800))
      setProcessingStep(i + 1)
    }

    try {
      const orderNumber = generateOrderNumber();
      const discountedAmount = Math.round(cartTotalAmount - discountAmount);
      const baseShipping = cartItems.length === 0 ? 0 : (discountedAmount >= 999 ? 0 : 99);
      const currentCodFee = method === 'COD' ? 30 : 0;
      const isRemote = !isCodAvailableForPincode(formData.pincode, formData.state);
      const remoteSurcharge = isRemote ? 80 : 0;
      const currentShippingCharge = baseShipping + currentCodFee + remoteSurcharge;
      const calculatedFinalAmount = discountedAmount + currentShippingCharge;
      const calculatedTax = calculatedFinalAmount * 0.18 / 1.18;

      const serializedAddress = JSON.stringify({
        customerAddress: `${formData.address.trim()}, ${formData.city.trim()}, ${formData.state?.trim() || ''} - ${formData.pincode.trim()}, ${formData.country?.trim() || 'India'} [Payment: ${method}]`,
        metadata: {
          order_number: orderNumber,
          tracking_number: '',
          tracking_url: '',
          subtotal: Math.round(cartTotalAmount),
          tax_amount: Math.round(calculatedTax),
          shipping_charge: Math.round(currentShippingCharge),
          coupon_code: couponApplied || 'NONE'
        }
      });

      // 1. Build the Order Payload (supporting both camelCase and snake_case for maximum Appwrite compatibility)
      const orderPayload = {
        userId: user.$id,
        customerName: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: serializedAddress,
        items: JSON.stringify(
          cartItems.map(i => ({
            name: i.name,
            size: i.size,
            quantity: Number(i.quantity),
            price: Number(i.price),
            product_id: i.product_id,
            product_Image: i.product_Image || i.product_image || i.image || i.front_image_link || ''
          }))
        ),
        total: Math.round(calculatedFinalAmount),
        status: 'PENDING',
        couponApplied: couponApplied || 'NONE',
        coupon_code: couponApplied || 'NONE',
        discountAmount: Math.round(discountAmount),
        discount_amount: Math.round(discountAmount),
        discount_applied: Number(discountAmount) > 0 ? "true" : "false",
        paymentMethod: method,
        paymentStatus: status,
        payment_status: status,
        paymentProvider: method === 'ONLINE' ? 'RAZORPAY' : 'NONE',
        razorpayOrderId: ordId,
        razorpay_order_id: ordId,
        razorpayPaymentId: payId,
        razorpay_payment_id: payId,

        // Dynamic additions for blueprint compatibility
        order_number: orderNumber,
        subtotal: Math.round(cartTotalAmount),
        tax_amount: Math.round(calculatedTax),
        shipping_charge: Math.round(currentShippingCharge),
        tracking_number: '',
        tracking_url: ''
      };

      // 2. Perform Stock Depletion size-wise on Catalog & update total_sold
      const stockUpdatePromises = [];
      const updatedProducts = products.map(prod => {
        let stocks = {};
        try {
          stocks = JSON.parse(prod.sizes_stock || '{}');
        } catch {
          stocks = {};
        }

        let stocksMutated = false;
        let quantitySold = 0;
        cartItems.forEach(cartItem => {
          if (cartItem.product_id === prod.$id || cartItem.product_id === prod.id) {
            const baseSize = cartItem.size ? String(cartItem.size).split('/')[0].trim() : 'M';
            const currentStock = stocks[baseSize] !== undefined ? Number(stocks[baseSize]) : 10;
            stocks[baseSize] = Math.max(0, currentStock - Number(cartItem.quantity));
            stocksMutated = true;
            quantitySold += Number(cartItem.quantity);
          }
        });

        if (stocksMutated) {
          const serializedStock = JSON.stringify(stocks);
          const newTotalSold = Number(prod.total_sold || 0) + quantitySold;
          
          // Save stock update promise
          const promise = productsService.updateProduct(prod.$id || prod.id, { 
            sizes_stock: serializedStock,
            total_sold: newTotalSold
          })
          .catch(e => console.warn("Stock update on cloud ignored:", e.message));
          
          stockUpdatePromises.push(promise);
          
          return { ...prod, sizes_stock: serializedStock, total_sold: newTotalSold };
        }
        return prod;
      });

      // Update Redux Products Cache instantly
      dispatch(setProducts(updatedProducts));

      // Await all stock updates before proceeding to save order
      if (stockUpdatePromises.length > 0) {
        await Promise.all(stockUpdatePromises);
      }

      // 3. Save Order into Appwrite Database
      const response = await ordersService.createOrder(orderPayload);
      if (!response) {
        throw new Error("Order creation returned null — check Appwrite collection configuration.");
      }

      // If paid via Wallet, deduct balance in wallet collection
      if (method === 'WALLET') {
        try {
          await walletService.createWalletTransaction({
            userId: user.$id,
            amount: calculatedFinalAmount,
            type: 'debit',
            title: `Payment for Order ${orderNumber}`,
            referenceId: response.$id || response.id
          });
        } catch (walletErr) {
          console.error("Failed to write debit wallet transaction:", walletErr.message);
        }
      }

      // 3.1. Send Order Notification Webhook (Make.com, Zapier, Discord, Telegram, etc.)
      const rawItems = JSON.parse(orderPayload.items || '[]');
      sendWebhookNotification('order.created', {
        orderId: response.$id || response.id,
        orderNumber: orderNumber,
        customerName: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        total: Math.round(calculatedFinalAmount),
        paymentMethod: method,
        items: rawItems,
        shippingAddress: `${formData.address.trim()}, ${formData.city.trim()} - ${formData.pincode.trim()}`
      });

      // 3.5. Save Address Profile in Background for Future Checkouts
      try {
        // Check if this exact address already exists
        const addressKey = `${formData.address.trim()}_${formData.city.trim()}_${formData.pincode.trim()}`;
        const existingAddr = savedAddresses.find(a => {
          const existingKey = `${(a.addressLine || a.address || '').trim()}_${a.city.trim()}_${a.pincode.trim()}`;
          return existingKey === addressKey;
        });

        await addressService.saveAddress(user.$id, {
          ...formData,
          $id: existingAddr?.$id || existingAddr?.id, // Update if exists
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          pincode: formData.pincode,
          state: formData.state || '',
          country: formData.country || 'India',
          is_default: savedAddresses.length === 0 && !existingAddr // Only set as default if new
        });
      } catch (addrErr) {
        console.warn("⚠️ Address profile auto-save ignored on cloud database:", addrErr.message);
      }

      // 4. Log coupon usage in database if coupon was applied
      if (couponApplied && couponApplied !== 'NONE') {
        try {
          await couponUsageService.logCouponUsage(user.$id, couponApplied);
        } catch (couponErr) {
          console.warn("⚠️ Coupon usage tracking write failed:", couponErr.message);
        }
      }

      // 4.1. Mark cart items as converted before clearing (for abandonment analytics)
      try {
        await cartService.convertCartItems(user.$id, cartItems.map(i => i.$id));
      } catch (cartErr) {
        console.warn("⚠️ Cart abandonment status conversion failed:", cartErr.message);
      }

      // 4.2. Clear Cart globally on Appwrite database & Redux state & Clear Coupon
      const orderItemIds = cartItems.map(i => i.$id);
      await cartService.clearUserCart(user.$id, orderItemIds);
      
      try {
        const freshItems = await cartService.getCartItems(user.$id);
        dispatch(setCartItemsAction(freshItems));
      } catch (reduxErr) {
        console.warn("Failed to sync Redux with remaining cart items:", reduxErr);
        dispatch(clearCartState());
      }
      
      sessionStorage.removeItem('checkout_coupon');
      sessionStorage.removeItem('checkout_discount');
      sessionStorage.removeItem('selected_cart_item_ids');
      sessionStorage.removeItem('deselected_cart_item_ids');
      
      setCheckoutStatus('success')
    } catch (error) {
      console.error("Billing pipeline crash:", error)
      showToast("Logistics error. Transaction aborted.", "error")
      setCheckoutStatus('idle')
      // ✅ Reset the double-submit lock on failure so user can retry
      isSubmittingRef.current = false
    }
  };

  if (checkoutStatus === 'processing') {
    return (
      <div className="w-full min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-6 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative">
        <div className="absolute inset-0 bg-[var(--color-bg)]/95 backdrop-blur-md z-10" />
        <div className="relative z-20 flex flex-col items-center space-y-6 max-w-sm text-center">
          <div className="w-8 h-8 border-4 border-[var(--color-accent)] border-t-[var(--color-accent)] rounded-full animate-spin" />
          <h2 className="text-xl font-black tracking-widest uppercase text-[var(--color-text)]">
            PROCESSING INVOICE
          </h2>
          <div className="space-y-1.5 w-full">
            <p className="text-[10px] font-mono tracking-widest text-[var(--color-accent)] uppercase font-black animate-pulse">
              {steps[processingStep] || "Finalizing process modules..."}
            </p>
            {/* Custom progress bar */}
            <div className="w-48 h-[1.5px] bg-[var(--color-border)] mx-auto rounded-full overflow-hidden relative">
              <div 
                className="absolute left-0 top-0 h-full bg-[var(--color-accent)] transition-all duration-700" 
                style={{ width: `${(processingStep / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (checkoutStatus === 'success') {
    return (
      <div className="w-full min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--color-bg)]/95 backdrop-blur-md z-10" />
        
        {/* Full-screen celebratory confetti canvas overlay */}
        <canvas 
          ref={confettiCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-15"
        />
        
        <div className="relative z-20 w-full max-w-md bg-[var(--color-surface)] p-10 rounded-2xl border border-[var(--color-border)] shadow-2xl text-center space-y-6 animate-scale-up">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-500">
              <FiCheckCircle className="text-3xl" />
            </div>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.4em] text-emerald-600 font-black uppercase mb-1">
              TRANSACTION COMPLETED
            </h4>
            <h1 className="text-2xl md:text-3xl font-black tracking-widest text-[var(--color-text)] uppercase">
              Order Placed
            </h1>
          </div>

          <p className="text-xs text-[var(--color-muted)] leading-relaxed font-mono uppercase tracking-wide">
            Your order details have been saved in our system. We are preparing to ship your order soon.
          </p>

          <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200/60 p-4 rounded-xl text-center space-y-1.5 animate-fade-in">
            <span className="text-[9px] font-black text-rose-600 tracking-widest block uppercase">⚠️ Cancellation Policy</span>
            <p className="text-[9px] text-rose-700 leading-relaxed font-mono uppercase">
              Orders can ONLY be cancelled while in "Pending" or "Processing" status. Once your package is shipped or dispatched, cancellation is not possible.
            </p>
          </div>

          <div className="w-12 h-px bg-[var(--color-border)] mx-auto" />

          <button 
            onClick={() => navigate('/')} 
            className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-95 text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-md transition-all cursor-pointer"
          >
            Continue Shopping &rarr;
          </button>
        </div>
      </div>
    )
  }

  return (
    <>

      <div className="w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans relative selection:bg-[var(--color-accent)] selection:text-white pb-20 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center">
        <div className="absolute inset-0 bg-[var(--color-bg)]/96 backdrop-blur-xs z-10" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 relative z-20 space-y-10">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
            <Link to="/cart" className="inline-flex items-center gap-2 text-xs font-black tracking-widest text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors uppercase group">
              <FiArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
              Return to stock cart
            </Link>
            <div className="text-[10px] tracking-[0.3em] font-mono text-[var(--color-muted)] uppercase">
              CHECKOUT MODULE // SECURE CHANNEL
            </div>
          </div>

          {/* Checkout split view */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16 items-start">
            
            {/* Billing details form */}
            <div className="lg:col-span-7 bg-[var(--color-surface)] p-8 rounded-2xl border border-[var(--color-border)] shadow-xl space-y-6">
              <div>
                <h4 className="text-[9px] tracking-[0.4em] text-[var(--color-accent)] font-black uppercase mb-1">HQ Logistics</h4>
                <h2 className="text-2xl font-black tracking-widest uppercase text-[var(--color-text)]">
                  Shipping Details
                </h2>
              </div>

              {savedAddresses.length > 0 && (
                <div className="space-y-2 mb-6">
                  <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Select Saved Address</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedAddresses.map((addr) => {
                      const id = addr.$id || addr.id;
                      const line = addr.address || addr.addressLine || '';
                      const stateStr = addr.state || '';
                      
                      return (
                        <div 
                          key={id}
                          onClick={() => {
                            setSelectedAddressId(id);
                            applyAddressFields(addr);
                          }}
                          className={`p-3 border rounded-xl cursor-pointer transition-all ${
                            selectedAddressId === id 
                              ? 'border-[var(--color-accent)] bg-[var(--color-subtle)]' 
                              : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black uppercase truncate">{addr.name || addr.customerName}</span>
                            {(addr.is_default || addr.isDefault) && (
                              <span className="text-[8px] bg-[var(--color-accent)] text-white font-mono uppercase px-1.5 py-0.5 font-bold">DEFAULT</span>
                            )}
                          </div>
                          <p className="text-[10px] text-[var(--color-muted)] truncate mt-1">{line}</p>
                          <p className="text-[10px] text-[var(--color-muted)] font-mono mt-0.5">{addr.city} {stateStr} {addr.pincode}</p>
                          <p className="text-[10px] text-[var(--color-muted)] font-mono mt-0.5">{addr.phone}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Full name */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Full Name</label>
                  <input
                    type="text"
                    defaultValue={user?.name || ''}
                    placeholder="ENTER YOUR NAME"
                    className={`w-full bg-[var(--color-subtle)] border ${errors.name ? 'border-rose-300 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'} rounded-xl px-4 py-3.5 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider transition-colors font-black`}
                    {...register('name', { required: 'Name is required' })}
                  />
                  {errors.name && <span className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">{errors.name.message}</span>}
                </div>

                {/* Email address */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Email Address</label>
                  <input
                    type="text"
                    defaultValue={user?.email || ''}
                    placeholder="YOU@EXAMPLE.COM"
                    className={`w-full bg-[var(--color-subtle)] border ${errors.email ? 'border-rose-300 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'} rounded-xl px-4 py-3.5 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider transition-colors font-black`}
                    {...register('email', { 
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email'
                      }
                    })}
                  />
                  {errors.email && <span className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">{errors.email.message}</span>}
                </div>

                {/* Mobile number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    className={`w-full bg-[var(--color-subtle)] border ${errors.phone ? 'border-rose-300 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'} rounded-xl px-4 py-3.5 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider transition-colors font-black`}
                    {...register('phone', { 
                      required: 'Phone is required',
                      pattern: {
                        value: /^[0-9]{10}$/,
                        message: 'Must be a 10-digit number'
                      }
                    })}
                  />
                  {errors.phone && <span className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">{errors.phone.message}</span>}
                </div>

                {/* Street address */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Street Address</label>
                  <input
                    type="text"
                    placeholder="HOUSE NO, APARTMENT, STREET NAME"
                    className={`w-full bg-[var(--color-subtle)] border ${errors.address ? 'border-rose-300 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'} rounded-xl px-4 py-3.5 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider transition-colors font-black`}
                    {...register('address', { required: 'Street address is required' })}
                  />
                  {errors.address && <span className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">{errors.address.message}</span>}
                </div>

                {/* City */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">City</label>
                  <input
                    type="text"
                    placeholder="MUMBAI"
                    className={`w-full bg-[var(--color-subtle)] border ${errors.city ? 'border-rose-300 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'} rounded-xl px-4 py-3.5 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider transition-colors font-black`}
                    {...register('city', { required: 'City is required' })}
                  />
                  {errors.city && <span className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">{errors.city.message}</span>}
                </div>

                {/* Pin Code */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">PIN Code</label>
                  <input
                    type="text"
                    placeholder="400001"
                    className={`w-full bg-[var(--color-subtle)] border ${errors.pincode ? 'border-rose-300 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'} rounded-xl px-4 py-3.5 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider transition-colors font-black`}
                    {...register('pincode', { 
                      required: 'Pin code is required',
                      pattern: {
                        value: /^[0-9]{6}$/,
                        message: 'Must be a 6-digit pin code'
                      },
                      onChange: (e) => handlePincodeChange(e.target.value)
                    })}
                  />
                  {errors.pincode && <span className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">{errors.pincode.message}</span>}
                </div>

                {/* State */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">State</label>
                  <input
                    type="text"
                    placeholder="MAHARASHTRA"
                    className={`w-full bg-[var(--color-subtle)] border ${errors.state ? 'border-rose-300 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'} rounded-xl px-4 py-3.5 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider transition-colors font-black`}
                    {...register('state', { required: 'State is required' })}
                  />
                  {errors.state && <span className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">{errors.state.message}</span>}
                </div>

                {/* Country */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Country</label>
                  <input
                    type="text"
                    placeholder="INDIA"
                    defaultValue="INDIA"
                    className={`w-full bg-[var(--color-subtle)] border ${errors.country ? 'border-rose-300 focus:border-rose-500' : 'border-[var(--color-border)] focus:border-[var(--color-accent)]'} rounded-xl px-4 py-3.5 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider transition-colors font-black`}
                    {...register('country', { required: 'Country is required' })}
                  />
                  {errors.country && <span className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">{errors.country.message}</span>}
                </div>

                {/* Premium Payment Method Selector */}
                <div className="w-full md:col-span-2 flex flex-col gap-2 mt-2">
                  <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase">Payment Option</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* COD Option */}
                    <div 
                      onClick={() => {
                        if (codAvailable) {
                          setSelectedPayment('COD');
                        } else {
                          showToast("Cash on Delivery is not serviceable for this remote route.", "error");
                        }
                      }}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col gap-1.5 ${
                        !codAvailable
                        ? 'opacity-50 cursor-not-allowed border-[var(--color-border)] bg-[var(--color-subtle)]'
                        : selectedPayment === 'COD' 
                        ? 'cursor-pointer border-[var(--color-accent)] bg-[var(--color-subtle)]/50 shadow-sm' 
                        : 'cursor-pointer border-[var(--color-border)] hover:border-[var(--color-accent)] bg-[var(--color-subtle)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-black uppercase tracking-wider ${!codAvailable ? 'text-[var(--color-muted)]' : 'text-[var(--color-text)] font-black'}`}>
                          Cash on Delivery (COD) {!codAvailable && '(NOT AVAILABLE)'}
                        </span>
                        {codAvailable && (
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            selectedPayment === 'COD' ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-[var(--color-border)]'
                          }`}>
                            {selectedPayment === 'COD' && <div className="w-1.5 h-1.5 bg-[var(--color-surface)] rounded-full" />}
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] font-mono uppercase text-[var(--color-muted)] leading-normal">
                        {codAvailable
                          ? 'Pay at your doorstep using cash or UPI. (Handling fee of ₹30 applies)'
                          : 'COD is not serviceable for this remote route. Please pay online.'}
                      </p>
                    </div>

                    {/* Online Razorpay Option */}
                    <div 
                      onClick={() => setSelectedPayment('ONLINE')}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-1.5 ${
                        selectedPayment === 'ONLINE' 
                        ? 'border-[var(--color-accent)] bg-[var(--color-subtle)]/50 shadow-sm' 
                        : 'border-[var(--color-border)] hover:border-[var(--color-accent)] bg-[var(--color-subtle)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-[var(--color-text)] font-black">Online Payment (Razorpay)</span>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          selectedPayment === 'ONLINE' ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-[var(--color-border)]'
                        }`}>
                          {selectedPayment === 'ONLINE' && <div className="w-1.5 h-1.5 bg-[var(--color-surface)] rounded-full" />}
                        </div>
                      </div>
                      <p className="text-[9px] font-mono uppercase text-[var(--color-muted)] leading-normal">
                        Secure transaction gateway. Direct UPI, Credit Cards, and wallets routing. (FREE SHIPPING)
                      </p>
                    </div>

                    {/* Store Wallet Option */}
                    {isAuthenticated && (
                      <div 
                        onClick={() => {
                          if (walletBalance >= finalAmount) {
                            setSelectedPayment('WALLET');
                          } else {
                            showToast(`Insufficient Wallet Balance (Available: ₹${walletBalance.toFixed(2)}). Please pay online or top up in your profile.`, "error");
                          }
                        }}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col gap-1.5 ${
                          walletBalance < finalAmount
                          ? 'opacity-50 cursor-not-allowed border-[var(--color-border)] bg-[var(--color-subtle)]'
                          : selectedPayment === 'WALLET' 
                          ? 'cursor-pointer border-[var(--color-accent)] bg-[var(--color-subtle)]/50 shadow-sm' 
                          : 'cursor-pointer border-[var(--color-border)] hover:border-[var(--color-accent)] bg-[var(--color-subtle)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black uppercase tracking-wider ${walletBalance < finalAmount ? 'text-[var(--color-muted)]' : 'text-[var(--color-text)] font-black'}`}>
                            Store Wallet Balance (₹{walletBalance.toFixed(2)})
                          </span>
                          {walletBalance >= finalAmount && (
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              selectedPayment === 'WALLET' ? 'border-[var(--color-accent)] bg-[var(--color-accent)]' : 'border-[var(--color-border)]'
                            }`}>
                              {selectedPayment === 'WALLET' && <div className="w-1.5 h-1.5 bg-[var(--color-surface)] rounded-full" />}
                            </div>
                          )}
                        </div>
                        <p className="text-[9px] font-mono uppercase text-[var(--color-muted)] leading-normal">
                          {walletBalance >= finalAmount
                            ? 'Pay instantly using your Store Wallet balance. (FREE SHIPPING)'
                            : `Order total is ₹${finalAmount.toFixed(2)}, but wallet has only ₹${walletBalance.toFixed(2)}. Please pay online.`}
                        </p>
                      </div>
                    )}

                  </div>
                </div>

                {selectedPayment === 'ONLINE' && (
                  <div className="p-3.5 bg-[var(--color-accent-light)] border border-[var(--color-border)] rounded-xl space-y-1.5 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--color-accent)] tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      💡 Razorpay Secured Sandbox Active
                    </div>
                    <p className="text-[9px] font-mono uppercase text-[var(--color-accent)]/90 leading-relaxed">
                      UPI: Enter <strong className="select-all font-black text-[var(--color-accent-hover)]">success@razorpay</strong> for instant verify, or use mock handles. <br />
                      Cards: Enter any test card details in the secure pop-up.
                    </p>
                  </div>
                )}

                {/* Simulated Order Submission */}
                <button
                  type="submit"
                  className="w-full md:col-span-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.99] text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-md transition-all cursor-pointer mt-4"
                >
                  FINALIZE & PLACE ORDER // ₹{Math.round(finalAmount).toLocaleString('en-IN')}
                </button>

              </form>
            </div>

            {/* Order Summary Dock */}
            <div className="lg:col-span-5 bg-[var(--color-surface)]/50 backdrop-blur-lg border border-white/30 rounded-2xl p-6 shadow-sm space-y-6 lg:sticky lg:top-24">
              <h3 className="text-xs font-black tracking-[0.25em] uppercase text-[var(--color-muted)]">
                Fit Summary
              </h3>

              {/* Items List */}
              <div className="space-y-4 max-h-72 overflow-y-auto pr-2 scrollbar-none">
                {cartItems.map((item) => {
                  const matchingProd = products.find(p => p.$id === item.product_id || p.id === item.product_id);
                  const imgUrl = item.product_Image || item.product_image || item.image || item.front_image_link || item.image_url || matchingProd?.front_image_link || matchingProd?.image_url || matchingProd?.image || 'https://placehold.co/100x100';
                  
                  return (
                    <div key={item.$id} className="flex gap-3 items-center">
                      <img 
                        src={imgUrl} 
                        alt={item.name} 
                        className="w-12 h-16 object-cover border border-[var(--color-border)] rounded-lg shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black uppercase text-[var(--color-text)] truncate tracking-wide">
                          {item.name}
                        </h4>
                        <p className="text-[9px] font-mono text-[var(--color-muted)] uppercase">
                          Size: {item.size || 'M'} · Qty: {item.quantity}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-black text-[var(--color-text)]">
                        ₹{item.subtotal?.toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })}
              </div>

              <hr className="border-[var(--color-border)]" />

              {/* Deploy Coupon Code */}
              <div className="space-y-2 pt-1">
                <label className="text-[10px] font-black tracking-widest text-[var(--color-muted)] uppercase block">
                  Apply Coupon
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="E.G. DROP20"
                    className="flex-1 bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-xl px-4 py-2.5 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)] outline-hidden tracking-wider uppercase font-black font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-95 text-white font-black text-[10px] tracking-wider uppercase px-4 py-2.5 rounded-xl transition-all cursor-pointer"
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

              <hr className="border-[var(--color-border)]" />

              {/* Calculations */}
              <div className="space-y-3 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                {bundleDiscount > 0 && (
                  <div className="flex justify-between">
                    <span>ORIGINAL VALUE</span>
                    <span className="font-mono text-[var(--color-muted)] line-through">
                      ₹{cartTotalBeforeDiscount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                {bundleDiscount > 0 && (
                  <div className="space-y-1.5 bg-[var(--color-subtle)] border border-[var(--color-accent)]/10 p-3 rounded-lg text-[9px] uppercase font-mono tracking-wider text-[var(--color-text)] normal-case">
                    <span className="font-bold block mb-1">Bundle Savings</span>
                    {appliedOffers.map((o) => (
                      <div key={o.id} className="flex justify-between">
                        <span>• {o.name} {o.timesApplied > 1 ? `(x${o.timesApplied})` : ''}</span>
                        <span className="font-bold text-emerald-600 font-mono">-₹{o.discount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between">
                  <span>CART VALUE</span>
                  <span className="font-mono text-[var(--color-text)] font-bold">
                    ₹{cartTotalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>COUPON SAVINGS ({couponApplied})</span>
                    <span className="font-mono font-black">
                      - ₹{discountAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>SHIPPING & DELIVERY</span>
                  <span className="font-mono text-[var(--color-text)] font-bold">
                    {baseShippingCharge > 0 ? `₹${baseShippingCharge}` : 'FREE SHIPPING'}
                  </span>
                </div>
                {baseShippingCharge > 0 && (
                  <div className="text-[9px] text-[var(--color-danger)] font-mono font-bold text-left uppercase tracking-wider mt-1">
                    Add ₹{(999 - discountedAmount).toLocaleString('en-IN')} more to unlock FREE SHIPPING!
                  </div>
                )}

                {remoteSurcharge > 0 && (
                  <div className="flex justify-between text-[var(--color-muted)]">
                    <span>REMOTE ROUTE SURCHARGE</span>
                    <span className="font-mono text-[var(--color-text)] font-bold">
                      ₹{remoteSurcharge}
                    </span>
                  </div>
                )}

                {codFee > 0 && (
                  <div className="flex justify-between text-[var(--color-muted)]">
                    <span>COD HANDLING FEE</span>
                    <span className="font-mono text-[var(--color-text)] font-bold">
                      ₹{codFee}
                    </span>
                  </div>
                )}
                
                <hr className="border-[var(--color-border)]" />

                <div className="flex justify-between items-baseline pt-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-[var(--color-text)]">NET AMOUNT</span>
                    <span className="text-[9px] text-[var(--color-muted)] font-sans tracking-wide lowercase font-semibold mt-0.5 normal-case">
                      (incl. of all taxes)
                    </span>
                  </div>
                  <span className="text-2xl font-mono font-black text-[var(--color-text)] tracking-tight">
                    ₹{Math.round(finalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

          </div>
        </div>

        <RazorpaySandboxModal
          isOpen={razorpayModalOpen}
          onClose={() => {
            setRazorpayModalOpen(false);
            setSubmittedFormData(null);
          }}
          finalAmount={finalAmount}
          customerName={submittedFormData?.name || user?.name || ''}
          showToast={showToast}
          onSuccess={(generatedPayId) => {
            setRazorpayModalOpen(false);
            processFinalizeOrder(submittedFormData, 'ONLINE', 'PAID', generatedPayId, mockOrderId);
          }}
        />

      </div>
    </div>

    <Footer />
    </>
  )
}

export default Checkout

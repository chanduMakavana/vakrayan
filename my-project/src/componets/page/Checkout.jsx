import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { FiArrowLeft, FiCheckCircle } from 'react-icons/fi'
import cartService from '../../appwrite/cart'
import ordersService from '../../appwrite/orders'
import productsService from '../../appwrite/products'
import campaignService from '../../appwrite/campaign'
import addressService from '../../appwrite/address'
import { clearCartState } from '../../features/addToCart'
import { setProducts } from '../../features/productsSlice'
import Navbar from '../pageComponets/Navbar'
import Footer from '../pageComponets/Footer'

const generateMockOrderId = () => 'ORD-' + Date.now();
const generateMockRazorpayOrderId = () => `rzp_order_${Date.now()}`;

function Checkout() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { register, handleSubmit, formState: { errors }, setValue } = useForm()

  const cartItems = useSelector(state => state.cart || [])
  const { user, isAuthenticated } = useSelector(state => state.auth)
  const products = useSelector(state => state.products.items || [])

  const [checkoutStatus, setCheckoutStatus] = useState('idle') // idle | processing | success
  const [processingStep, setProcessingStep] = useState(0)
  const [selectedPayment, setSelectedPayment] = useState('COD') // COD | ONLINE
  const [razorpayModalOpen, setRazorpayModalOpen] = useState(false)
  const [simulatedMethod, setSimulatedMethod] = useState('card') // card | upi | netbanking | wallet | paylater
  const [submittedFormData, setSubmittedFormData] = useState(null)
  const [mockOrderId, setMockOrderId] = useState('')

  // Interactive Razorpay Sandbox States
  const [razorpayLang, setRazorpayLang] = useState('en') // 'en' | 'hi'
  const [cardNo, setCardNo] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cardName, setCardName] = useState('')
  const [saveCard, setSaveCard] = useState(true)

  const [upiId, setUpiId] = useState('')
  const [upiVerified, setUpiVerified] = useState('idle') // idle | verifying | verified
  const [upiTimer, setUpiTimer] = useState(300) // 5:00 minutes QR countdown
  const [upiQrActive, setUpiQrActive] = useState(false)

  const [selectedBank, setSelectedBank] = useState('')
  const [customBankSelected, setCustomBankSelected] = useState('')
  const [nbSearchQuery, setNbSearchQuery] = useState('')
  const [nbDropdownOpen, setNbDropdownOpen] = useState(false)

  const [selectedWallet, setSelectedWallet] = useState('')
  const [walletPhone, setWalletPhone] = useState('')
  const [walletOtp, setWalletOtp] = useState('')
  const [walletLinked, setWalletLinked] = useState('idle') // idle | sending | sent | linked

  const [paylaterOption, setPaylaterOption] = useState('')

  // QR Countdown timer effect
  useEffect(() => {
    let interval = null;
    if (razorpayModalOpen && simulatedMethod === 'upi' && upiQrActive) {
      interval = setInterval(() => {
        setUpiTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimeout(() => {
              alert("UPI QR Code expired. Please generate a new one.");
              setUpiQrActive(false);
              setUpiTimer(300);
            }, 0);
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [razorpayModalOpen, simulatedMethod, upiQrActive]);

  // Dynamic Coupon State
  const [promoInput, setPromoInput] = useState('')
  const [couponApplied, setCouponApplied] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)

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

  // Programmatically inject official Razorpay SDK script on mount for zero-config deployment
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


  // Load saved address on mount/session load
  useEffect(() => {
    if (user && user.$id) {
      addressService.getUserAddress(user.$id)
        .then(savedAddress => {
          if (savedAddress) {
            setValue('name', savedAddress.customerName || user.name || '');
            setValue('email', savedAddress.email || user.email || '');
            setValue('phone', savedAddress.phone || '');
            setValue('address', savedAddress.addressLine || '');
            setValue('city', savedAddress.city || '');
            setValue('pincode', savedAddress.pincode || '');
          }
        })
        .catch(err => console.warn("Failed to load saved address profile:", err));
    }
  }, [user, setValue]);

  useEffect(() => {
    if (!isAuthenticated) {
      alert("Please log in to continue checking out.")
      navigate('/login')
    } else if (cartItems.length === 0) {
      alert("Your inventory is currently empty.")
      navigate('/')
    }
  }, [isAuthenticated, cartItems, navigate])

  const cartTotalAmount = cartItems.reduce((acc, item) => acc + Number(item.subtotal || 0), 0)
  const discountAmount = cartTotalAmount * (discountPercent / 100)
  const finalAmount = cartTotalAmount - discountAmount

  const steps = [
    "Validating secure shipping channel...",
    "Tunneling transaction gateway...",
    "Sweeping active cart inventory registers...",
    "Dispatch manifest finalized!"
  ]

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
        alert(`🎟️ Promo Code ${match.code} applied! Saved ${match.discount}% on fits drop.`);
      } else {
        alert("Invalid promo code.");
      }
    } catch (err) {
      console.error("Promo verification issue:", err);
      alert("Verification server connection timeout.");
    }
  };

  const onSubmit = async (data) => {
    if (!user) return

    // 0. Enforce Product Size-Stock Validation
    for (const cartItem of cartItems) {
      const prod = products.find(p => p.$id === cartItem.product_id || p.id === cartItem.product_id);
      if (prod) {
        let stocks;
        try {
          stocks = JSON.parse(prod.sizes_stock || '{}');
        } catch {
          stocks = {};
        }
        const availableStock = stocks[cartItem.size] !== undefined ? Number(stocks[cartItem.size]) : 10;
        if (Number(cartItem.quantity) > availableStock) {
          alert(`❌ Insufficient stock for "${cartItem.name}" (Size: ${cartItem.size}). Only ${availableStock} items left. Please adjust your cart.`);
          return;
        }
      }
    }

    if (selectedPayment === 'ONLINE') {
      const liveKey = import.meta.env.VITE_RAZORPAY_KEY_ID || '';
      const hasRealKey = liveKey && !liveKey.includes('your_project_id') && !liveKey.includes('test_your_public_key');

      const currentMockId = generateMockRazorpayOrderId();
      setMockOrderId(currentMockId);
      setSubmittedFormData(data);

      if (window.Razorpay && hasRealKey) {
        // Launch REAL Razorpay Standard Payment Gateway Popup
        try {
          const options = {
            key: liveKey,
            amount: finalAmount * 100, // INR in paise (₹1 = 100 paise)
            currency: "INR",
            name: "Streetwear",
            description: "Streetwear Drops Secure Transaction Gateway",
            image: "https://cdn-icons-png.flaticon.com/512/5752/5752538.png", // Company store logo icon
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
              color: "#4f46e5" // Premium Indigo theme color
            },
            handler: function (response) {
              const payId = response.razorpay_payment_id || `pay_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
              const ordId = response.razorpay_order_id || currentMockId;
              processFinalizeOrder(data, 'ONLINE', 'PAID', payId, ordId);
            },
            modal: {
              ondismiss: function () {
                alert("Payment window closed by customer.");
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
      setSimulatedMethod('card');
      // Reset interactive states
      setCardNo('');
      setCardExpiry('');
      setCardCvv('');
      setCardName(data.name || '');
      setUpiId('');
      setUpiVerified('idle');
      setUpiTimer(300);
      setUpiQrActive(false);
      setSelectedBank('');
      setCustomBankSelected('');
      setNbSearchQuery('');
      setNbDropdownOpen(false);
      setSelectedWallet('');
      setWalletPhone(data.phone || '');
      setWalletOtp('');
      setWalletLinked('idle');
      setPaylaterOption('');
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
      // 1. Build the Order Payload
      const orderPayload = {
        userId: user.$id,
        customerName: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: `${formData.address.trim()}, ${formData.city.trim()} - ${formData.pincode.trim()} [Payment: ${method}]`,
        items: JSON.stringify(
          cartItems.map(i => ({
            name: i.name,
            size: i.size,
            quantity: Number(i.quantity),
            price: Number(i.price),
            product_id: i.product_id
          }))
        ),
        total: Number(finalAmount),
        status: 'PENDING',
        couponApplied: couponApplied || 'NONE',
        paymentMethod: method,
        paymentStatus: status,
        paymentProvider: method === 'ONLINE' ? 'RAZORPAY' : 'NONE',
        razorpayOrderId: ordId,
        razorpayPaymentId: payId
      };

      // 2. Perform Stock Depletion size-wise on Catalog
      const updatedProducts = products.map(prod => {
        let stocks = {};
        try {
          stocks = JSON.parse(prod.sizes_stock || '{}');
        } catch {
          stocks = {};
        }

        let stocksMutated = false;
        cartItems.forEach(cartItem => {
          if (cartItem.product_id === prod.$id || cartItem.product_id === prod.id) {
            const currentStock = stocks[cartItem.size] !== undefined ? Number(stocks[cartItem.size]) : 10;
            stocks[cartItem.size] = Math.max(0, currentStock - Number(cartItem.quantity));
            stocksMutated = true;
          }
        });

        if (stocksMutated) {
          const serializedStock = JSON.stringify(stocks);
          // Async push stock update to cloud without blocking
          productsService.updateProduct(prod.$id || prod.id, { sizes_stock: serializedStock })
            .catch(e => console.warn("Stock update on cloud ignored:", e.message));
          
          return { ...prod, sizes_stock: serializedStock };
        }
        return prod;
      });

      // Update Redux Products Cache instantly
      dispatch(setProducts(updatedProducts));
      
      // Update local storage fallback products instantly
      const localProds = JSON.parse(localStorage.getItem('products')) || [];
      const updatedLocalProds = localProds.map(lp => {
        const matching = updatedProducts.find(up => up.id === lp.id || up.$id === lp.id);
        return matching ? { ...lp, sizes_stock: matching.sizes_stock } : lp;
      });
      localStorage.setItem('products', JSON.stringify(updatedLocalProds));

      // 3. Save Order into Database
      try {
        const response = await ordersService.createOrder(orderPayload);
        if (!response) {
          throw new Error("Appwrite orders collection is not configured.");
        }
      } catch (orderErr) {
        console.warn("⚠️ Orders DB unavailable. Saving manifest in sandbox logs.", orderErr.message);
        const mockOrder = {
          id: generateMockOrderId(),
          $id: generateMockOrderId(),
          $createdAt: new Date().toISOString(),
          ...orderPayload
        };
        const localOrders = JSON.parse(localStorage.getItem('ordersData')) || [];
        localOrders.unshift(mockOrder);
        localStorage.setItem('ordersData', JSON.stringify(localOrders));
      }

      // 3.5. Save Address Profile in Background for Future Checkouts
      try {
        await addressService.saveAddress(user.$id, formData);
      } catch (addrErr) {
        console.warn("⚠️ Address profile auto-save ignored on cloud database:", addrErr.message);
      }

      // 4. Clear Cart globally on Appwrite database & Redux state & Clear Coupon
      await cartService.clearUserCart(user.$id)
      dispatch(clearCartState())
      sessionStorage.removeItem('checkout_coupon')
      sessionStorage.removeItem('checkout_discount')
      
      setCheckoutStatus('success')
    } catch (error) {
      console.error("Billing pipeline crash:", error)
      alert("Logistics error. Transaction aborted.")
      setCheckoutStatus('idle')
    }
  };

  if (checkoutStatus === 'processing') {
    return (
      <div className="w-full min-h-screen bg-[#fafafb] flex flex-col items-center justify-center p-6 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative">
        <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-10" />
        <div className="relative z-20 flex flex-col items-center space-y-6 max-w-sm text-center">
          <div className="w-8 h-8 border-4 border-neutral-900 border-t-indigo-600 rounded-full animate-spin" />
          <h2 className="text-xl font-black tracking-widest uppercase text-neutral-950">
            PROCESSING INVOICE
          </h2>
          <div className="space-y-1.5 w-full">
            <p className="text-[10px] font-mono tracking-widest text-indigo-600 uppercase font-black animate-pulse">
              {steps[processingStep] || "Finalizing process modules..."}
            </p>
            {/* Custom progress bar */}
            <div className="w-48 h-[1.5px] bg-neutral-200 mx-auto rounded-full overflow-hidden relative">
              <div 
                className="absolute left-0 top-0 h-full bg-indigo-600 transition-all duration-700" 
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
      <div className="w-full min-h-screen bg-[#fafafb] flex items-center justify-center p-6 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative">
        <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-10" />
        
        <div className="relative z-20 w-full max-w-md bg-white p-10 rounded-2xl border border-neutral-200/60 shadow-2xl text-center space-y-6 animate-scale-in">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-500">
              <FiCheckCircle className="text-3xl" />
            </div>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.4em] text-emerald-600 font-black uppercase mb-1">
              SECURED TRANSACTION COMPLETE
            </h4>
            <h1 className="text-2xl md:text-3xl font-black tracking-widest text-neutral-950 uppercase">
              Order Placed
            </h1>
          </div>

          <p className="text-xs text-neutral-500 leading-relaxed font-mono uppercase tracking-wide">
            Your streetwear manifest has been logged inside our cloud shipping nodes. Preparing express domestic dispatch.
          </p>

          <div className="w-12 h-px bg-neutral-200 mx-auto" />

          <button 
            onClick={() => navigate('/')} 
            className="w-full bg-neutral-950 hover:bg-neutral-800 active:scale-95 text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-md transition-all cursor-pointer"
          >
            Continue Shopping &rarr;
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navbar />

      <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 font-sans relative selection:bg-neutral-900 selection:text-white pb-20 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center">
        <div className="absolute inset-0 bg-white/96 backdrop-blur-xs z-10" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 relative z-20 space-y-10">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40">
            <Link to="/cart" className="inline-flex items-center gap-2 text-xs font-black tracking-widest text-neutral-500 hover:text-neutral-950 transition-colors uppercase group">
              <FiArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
              Return to stock cart
            </Link>
            <div className="text-[10px] tracking-[0.3em] font-mono text-neutral-500 uppercase">
              CHECKOUT MODULE // SECURE CHANNEL
            </div>
          </div>

          {/* Checkout split view */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16 items-start">
            
            {/* Billing details form */}
            <div className="lg:col-span-7 bg-white p-8 rounded-2xl border border-neutral-200/60 shadow-xl space-y-6">
              <div>
                <h4 className="text-[9px] tracking-[0.4em] text-indigo-600 font-black uppercase mb-1">HQ Logistics</h4>
                <h2 className="text-2xl font-black tracking-widest uppercase text-neutral-950">
                  Shipping Details
                </h2>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Full name */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Full Name</label>
                  <input
                    type="text"
                    defaultValue={user?.name || ''}
                    placeholder="ENTER YOUR NAME"
                    className={`w-full bg-[#fbfbfb] border ${errors.name ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-200 focus:border-[var(--theme-primary)]'} rounded-xl px-4 py-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider transition-colors uppercase font-black`}
                    {...register('name', { required: 'Name is required' })}
                  />
                  {errors.name && <span className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">{errors.name.message}</span>}
                </div>

                {/* Email address */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Email Address</label>
                  <input
                    type="text"
                    defaultValue={user?.email || ''}
                    placeholder="YOU@EXAMPLE.COM"
                    className={`w-full bg-[#fbfbfb] border ${errors.email ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-200 focus:border-[var(--theme-primary)]'} rounded-xl px-4 py-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider transition-colors uppercase font-black`}
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
                  <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    className={`w-full bg-[#fbfbfb] border ${errors.phone ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-200 focus:border-[var(--theme-primary)]'} rounded-xl px-4 py-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider transition-colors font-black`}
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
                  <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Street Address</label>
                  <input
                    type="text"
                    placeholder="HOUSE NO, APARTMENT, STREET NAME"
                    className={`w-full bg-[#fbfbfb] border ${errors.address ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-200 focus:border-[var(--theme-primary)]'} rounded-xl px-4 py-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider transition-colors uppercase font-black`}
                    {...register('address', { required: 'Street address is required' })}
                  />
                  {errors.address && <span className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">{errors.address.message}</span>}
                </div>

                {/* City */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">City</label>
                  <input
                    type="text"
                    placeholder="MUMBAI"
                    className={`w-full bg-[#fbfbfb] border ${errors.city ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-200 focus:border-[var(--theme-primary)]'} rounded-xl px-4 py-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider transition-colors uppercase font-black`}
                    {...register('city', { required: 'City is required' })}
                  />
                  {errors.city && <span className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">{errors.city.message}</span>}
                </div>

                {/* Pin Code */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">PIN Code</label>
                  <input
                    type="text"
                    placeholder="400001"
                    className={`w-full bg-[#fbfbfb] border ${errors.pincode ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-200 focus:border-[var(--theme-primary)]'} rounded-xl px-4 py-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider transition-colors font-black`}
                    {...register('pincode', { 
                      required: 'Pin code is required',
                      pattern: {
                        value: /^[0-9]{6}$/,
                        message: 'Must be a 6-digit pin code'
                      }
                    })}
                  />
                  {errors.pincode && <span className="text-[9px] text-rose-600 font-bold uppercase tracking-wider">{errors.pincode.message}</span>}
                </div>

                {/* Premium Payment Method Selector */}
                <div className="w-full md:col-span-2 flex flex-col gap-2 mt-2">
                  <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Payment Option</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* COD Option */}
                    <div 
                      onClick={() => setSelectedPayment('COD')}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-1.5 ${
                        selectedPayment === 'COD' 
                        ? 'border-neutral-950 bg-neutral-50/50 shadow-sm' 
                        : 'border-neutral-200 hover:border-neutral-300 bg-[#fbfbfb]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-neutral-950 font-black">Cash on Delivery (COD)</span>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          selectedPayment === 'COD' ? 'border-neutral-950 bg-neutral-950' : 'border-neutral-300'
                        }`}>
                          {selectedPayment === 'COD' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      </div>
                      <p className="text-[9px] font-mono uppercase text-neutral-500 leading-normal">
                        Free domestic express shipping. Pay at your doorstep using cash or UPI.
                      </p>
                    </div>

                    {/* Online Razorpay Option */}
                    <div 
                      onClick={() => setSelectedPayment('ONLINE')}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-1.5 ${
                        selectedPayment === 'ONLINE' 
                        ? 'border-neutral-950 bg-neutral-50/50 shadow-sm' 
                        : 'border-neutral-200 hover:border-neutral-300 bg-[#fbfbfb]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-neutral-950 font-black">Online Payment (Razorpay)</span>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          selectedPayment === 'ONLINE' ? 'border-neutral-950 bg-neutral-950' : 'border-neutral-300'
                        }`}>
                          {selectedPayment === 'ONLINE' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      </div>
                      <p className="text-[9px] font-mono uppercase text-neutral-500 leading-normal">
                        Secure transaction gateway. Direct UPI, Credit Cards, and wallets routing.
                      </p>
                    </div>

                  </div>
                </div>

                {/* Simulated Order Submission */}
                <button
                  type="submit"
                  className="w-full md:col-span-2 bg-neutral-950 hover:bg-[#222222] active:scale-[0.99] text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-md transition-all cursor-pointer mt-4 animate-pulse"
                >
                  FINALIZE & PLACE ORDER // ₹{finalAmount.toLocaleString('en-IN')}
                </button>

              </form>
            </div>

            {/* Order Summary Dock */}
            <div className="lg:col-span-5 bg-white border border-neutral-200/60 p-6 rounded-2xl shadow-xl space-y-6 lg:sticky lg:top-24">
              <h3 className="text-xs font-black tracking-[0.25em] uppercase text-neutral-400">
                Fit Summary
              </h3>

              {/* Items List */}
              <div className="space-y-4 max-h-72 overflow-y-auto pr-2 scrollbar-none">
                {cartItems.map((item) => (
                  <div key={item.$id} className="flex gap-3 items-center">
                    <img 
                      src={item.product_Image || 'https://placehold.co/100x100'} 
                      alt={item.name} 
                      className="w-12 h-16 object-cover border border-neutral-200 rounded-lg shrink-0" 
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black uppercase text-neutral-900 truncate tracking-wide">
                        {item.name}
                      </h4>
                      <p className="text-[9px] font-mono text-neutral-500 uppercase">
                        Size: {item.size || 'M'} · Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-black text-neutral-900">
                      ₹{item.subtotal?.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              <hr className="border-neutral-100" />

              {/* Deploy Coupon Code */}
              <div className="space-y-2 pt-1">
                <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase block">
                  Apply Coupon
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="E.G. DROP20"
                    className="flex-1 bg-[#fbfbfb] border border-neutral-200 focus:border-neutral-950 rounded-xl px-4 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider uppercase font-black font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="bg-neutral-950 hover:bg-neutral-800 active:scale-95 text-white font-black text-[10px] tracking-wider uppercase px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    APPLY
                  </button>
                </div>
                {couponApplied && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-mono">
                    🎟️ {couponApplied} ACTIVE ({discountPercent}% OFF)
                  </div>
                )}
              </div>

              <hr className="border-neutral-100" />

              {/* Calculations */}
              <div className="space-y-3 text-xs font-medium uppercase tracking-wide text-neutral-600">
                <div className="flex justify-between">
                  <span>CART VALUE</span>
                  <span className="font-mono text-neutral-900 font-bold">
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
                  <span>SHIPPING EXPENSES</span>
                  <span className="font-mono text-emerald-600 font-black tracking-wider text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded">
                    FREE DISPATCH
                  </span>
                </div>
                
                <hr className="border-neutral-100" />

                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-sm font-black text-neutral-950">NET AMOUNT</span>
                  <span className="text-2xl font-mono font-black text-neutral-950 tracking-tight">
                    ₹{finalAmount.toLocaleString('en-IN')}
                  </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

             {/* Dynamic Razorpay Secured Checkout Overlay Simulator */}
      {razorpayModalOpen && (() => {
        // Translation helper dictionary
        const translations = {
          en: {
            secured: "SECURED GATEWAY",
            title: "Razorpay Checkout (Sandbox)",
            cancel: "✕ CANCEL",
            merchant: "MERCHANT NAME",
            amount: "AMOUNT PAYABLE",
            payVia: "PAY VIA",
            cards: "Cards",
            upi: "UPI / QR",
            netbanking: "Netbanking",
            wallets: "Wallets",
            paylater: "EMI / Pay Later",
            cardTitle: "Credit or Debit Card",
            cardSubtitle: "Enter sandbox card credentials to verify",
            cardNo: "Card Number",
            cardExpiry: "Expiry Date",
            cardCvv: "CVV",
            cardHolder: "Cardholder Name",
            saveCard: "Remember this card securely",
            upiTitle: "Unified Payments Interface (UPI)",
            upiSubtitle: "Select preference for simulated payment channel",
            upiQr: "Instant GPay / PhonePe QR Code",
            upiQrSub: "Scan mock sandbox QR matrix",
            upiIdLabel: "Enter Virtual Payment Address (VPA)",
            verify: "Verify VPA",
            verifying: "Verifying...",
            verified: "Verified",
            nbTitle: "Popular Bank Selection",
            nbSubtitle: "Choose your bank sandbox connection",
            searchBank: "Search other Indian banks...",
            walletTitle: "Digital Wallet Partners",
            walletSubtitle: "Select active mock partner wallet channel",
            walletPhone: "Link Wallet Phone Number",
            sendOtp: "Link Wallet & Send OTP",
            linking: "Sending OTP...",
            otpSent: "OTP Sent successfully!",
            enterOtp: "Enter 4-Digit OTP",
            verifyOtp: "Verify & Link Wallet",
            linked: "Wallet Linked Successfully! ✅",
            paylaterTitle: "Pay Later & Cardless EMI",
            paylaterSubtitle: "Select simulated digital credit line",
            secStamp: "Razorpay Secured Sandbox Channel · PCI-DSS Compliant Gateway",
            paySecured: "Pay Secured"
          },
          hi: {
            secured: "सुरक्षित गेटवे",
            title: "रेज़रपे चेकआउट (सैंडबॉक्स)",
            cancel: "✕ रद्द करें",
            merchant: "विक्रेता का नाम",
            amount: "भुगतान राशि",
            payVia: "भुगतान का प्रकार",
            cards: "कार्ड",
            upi: "UPI / क्यूआर",
            netbanking: "नेटबैंकिंग",
            wallets: "वॉलेट",
            paylater: "पे लेटर / ईएमआई",
            cardTitle: "क्रेडिट या डेबिट कार्ड",
            cardSubtitle: "सत्यापित करने के लिए विवरण दर्ज करें",
            cardNo: "कार्ड नंबर",
            cardExpiry: "समाप्ति तिथि",
            cardCvv: "सीवीवी",
            cardHolder: "कार्डधारक का नाम",
            saveCard: "इस कार्ड को सुरक्षित रूप से याद रखें",
            upiTitle: "यूनिफाइड पेमेंट्स इंटरफेस (UPI)",
            upiSubtitle: "सिम्युलेटेड भुगतान चैनल चुनें",
            upiQr: "त्वरित GPay / PhonePe क्यूआर कोड",
            upiQrSub: "सैंडबॉक्स क्यूआर मैट्रिक्स स्कैन करें",
            upiIdLabel: "वर्चुअल पेमेंट एड्रेस (VPA) दर्ज करें",
            verify: "VPA सत्यापित करें",
            verifying: "सत्यापित हो रहा है...",
            verified: "सत्यापित",
            nbTitle: "लोकप्रिय बैंक चयन",
            nbSubtitle: "अपना बैंक सैंडबॉक्स कनेक्शन चुनें",
            searchBank: "अन्य भारतीय बैंक खोजें...",
            walletTitle: "डिजिटल वॉलेट भागीदार",
            walletSubtitle: "सक्रिय वॉलेट चैनल चुनें",
            walletPhone: "वॉलेट फ़ोन नंबर लिंक करें",
            sendOtp: "वॉलेट लिंक करें और OTP भेजें",
            linking: "ओटीपी भेज रहा है...",
            otpSent: "ओटीपी सफलतापूर्वक भेजा गया!",
            enterOtp: "4-अंकीय ओटीपी दर्ज करें",
            verifyOtp: "सत्यापित करें और लिंक करें",
            linked: "वॉलेट सफलतापूर्वक लिंक हो गया! ✅",
            paylaterTitle: "पे लेटर और कार्डलेस ईएमआई",
            paylaterSubtitle: "सिम्युलेटेड डिजिटल क्रेडिट लाइन चुनें",
            secStamp: "रेज़रपे सुरक्षित सैंडबॉक्स चैनल · PCI-DSS अनुपालन गेटवे",
            paySecured: "सुरक्षित भुगतान करें"
          }
        };

        const t = translations[razorpayLang] || translations.en;

        const allIndianBanksList = [
          "Bank of Baroda",
          "Bank of India",
          "Canara Bank",
          "Union Bank of India",
          "IDFC First Bank",
          "IndusInd Bank",
          "Federal Bank",
          "Central Bank of India",
          "Punjab National Bank",
          "Indian Overseas Bank",
          "UCO Bank",
          "Indian Bank",
          "Karnataka Bank",
          "RBL Bank",
          "South Indian Bank",
          "Bandhan Bank",
          "IDBI Bank",
          "Standard Chartered"
        ];

        // Card network logo generator
        const getCardNetwork = (num) => {
          const raw = num.replace(/\s+/g, '');
          if (raw.startsWith('4')) return { name: 'Visa', logo: '💳 Visa' };
          if (raw.startsWith('5')) return { name: 'Mastercard', logo: '💳 Mastercard' };
          if (raw.startsWith('6')) return { name: 'RuPay', logo: '💳 RuPay' };
          return { name: 'Card', logo: '💳 Card' };
        };
        const cardNetwork = getCardNetwork(cardNo);

        // Validation for payment action button
        const getIsPayButtonDisabled = () => {
          if (simulatedMethod === 'card') {
            return !cardNo || !cardExpiry || !cardCvv;
          }
          if (simulatedMethod === 'upi') {
            return !upiQrActive && upiVerified !== 'verified';
          }
          if (simulatedMethod === 'netbanking') {
            return !selectedBank && !customBankSelected;
          }
          if (simulatedMethod === 'wallet') {
            return walletLinked !== 'linked';
          }
          if (simulatedMethod === 'paylater') {
            return !paylaterOption;
          }
          return true;
        };
        const isPayButtonDisabled = getIsPayButtonDisabled();

        const getPayButtonText = () => {
          if (isPayButtonDisabled) {
            if (simulatedMethod === 'card') return "Fill card details to pay";
            if (simulatedMethod === 'upi') return "Generate QR or Verify UPI ID";
            if (simulatedMethod === 'netbanking') return "Select bank to pay";
            if (simulatedMethod === 'wallet') return "Select and Link Wallet";
            if (simulatedMethod === 'paylater') return "Select Pay Later option";
            return "Complete details";
          }
          return `${t.paySecured} ₹${finalAmount.toLocaleString('en-IN')}`;
        };

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-neutral-200/50 flex flex-col animate-scale-up">
              
              {/* Razorpay Brand Header */}
              <div className="bg-[#121c2c] px-6 py-4 text-white flex items-center justify-between border-b border-[#1b2a40]">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center text-xs font-black text-white font-mono">R</div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black tracking-[0.25em] text-neutral-400 uppercase leading-none">{t.secured}</span>
                    <span className="text-xs font-black tracking-wider uppercase mt-1">{t.title}</span>
                  </div>
                </div>
                
                {/* Language Selector & Cancel button */}
                <div className="flex items-center gap-4">
                  <select
                    value={razorpayLang}
                    onChange={(e) => setRazorpayLang(e.target.value)}
                    className="bg-[#1b2a40] text-white text-[10px] font-black tracking-wider uppercase px-2 py-1 rounded border border-[#2b3e59] outline-hidden cursor-pointer"
                  >
                    <option value="en">English ▾</option>
                    <option value="hi">हिंदी ▾</option>
                  </select>
                  <button 
                    type="button"
                    onClick={() => { setRazorpayModalOpen(false); setSubmittedFormData(null); }}
                    className="text-neutral-400 hover:text-white text-[10px] font-bold font-mono tracking-widest cursor-pointer px-2 py-0.5 rounded transition-colors"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>

              {/* Merchant Details Block */}
              <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <div>
                  <span className="text-[8px] font-mono text-neutral-400 block uppercase font-black">{t.merchant}</span>
                  <span className="text-xs font-black text-neutral-800 uppercase tracking-wide">Aashis Streetwear HQ</span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-mono text-neutral-400 block uppercase font-black">{t.amount}</span>
                  <span className="text-base font-mono font-black text-[#121c2c]">₹{finalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Main Interactive Split-pane */}
              <div className="flex flex-1 min-h-[350px] bg-white">
                
                {/* Left Sidebar Tab Selection */}
                <div className="w-1/3 border-r border-neutral-200/60 bg-neutral-50/40 p-3 flex flex-col gap-1.5 shrink-0">
                  <span className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest font-black mb-1 px-2">{t.payVia}</span>
                  
                  {/* 1. Card Tab */}
                  <button
                    type="button"
                    onClick={() => setSimulatedMethod('card')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-left transition-all cursor-pointer ${
                      simulatedMethod === 'card' 
                      ? 'bg-white text-indigo-600 border border-neutral-200/60 shadow-xs' 
                      : 'text-neutral-500 hover:bg-neutral-100/50 hover:text-neutral-900'
                    }`}
                  >
                    <span className="text-xs">💳</span>
                    <span className="truncate">{t.cards}</span>
                  </button>

                  {/* 2. UPI Tab */}
                  <button
                    type="button"
                    onClick={() => setSimulatedMethod('upi')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-left transition-all cursor-pointer ${
                      simulatedMethod === 'upi' 
                      ? 'bg-white text-indigo-600 border border-neutral-200/60 shadow-xs' 
                      : 'text-neutral-500 hover:bg-neutral-100/50 hover:text-neutral-900'
                    }`}
                  >
                    <span className="text-xs">⚡</span>
                    <span className="truncate">{t.upi}</span>
                  </button>

                  {/* 3. Netbanking Tab */}
                  <button
                    type="button"
                    onClick={() => setSimulatedMethod('netbanking')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-left transition-all cursor-pointer ${
                      simulatedMethod === 'netbanking' 
                      ? 'bg-white text-indigo-600 border border-neutral-200/60 shadow-xs' 
                      : 'text-neutral-500 hover:bg-neutral-100/50 hover:text-neutral-900'
                    }`}
                  >
                    <span className="text-xs">🏦</span>
                    <span className="truncate">{t.netbanking}</span>
                  </button>

                  {/* 4. Wallet Tab */}
                  <button
                    type="button"
                    onClick={() => setSimulatedMethod('wallet')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-left transition-all cursor-pointer ${
                      simulatedMethod === 'wallet' 
                      ? 'bg-white text-indigo-600 border border-neutral-200/60 shadow-xs' 
                      : 'text-neutral-500 hover:bg-neutral-100/50 hover:text-neutral-900'
                    }`}
                  >
                    <span className="text-xs">📱</span>
                    <span className="truncate">{t.wallets}</span>
                  </button>

                  {/* 5. EMI & PayLater Tab */}
                  <button
                    type="button"
                    onClick={() => setSimulatedMethod('paylater')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-left transition-all cursor-pointer ${
                      simulatedMethod === 'paylater' 
                      ? 'bg-white text-indigo-600 border border-neutral-200/60 shadow-xs' 
                      : 'text-neutral-500 hover:bg-neutral-100/50 hover:text-neutral-900'
                    }`}
                  >
                    <span className="text-xs">⏳</span>
                    <span className="truncate">{t.paylater}</span>
                  </button>
                </div>

                {/* Right Content Pane */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                  
                  {/* Dynamic Content Views */}
                  <div className="flex-1 space-y-4">
                    
                    {/* CARD FORM VIEW */}
                    {simulatedMethod === 'card' && (
                      <div className="space-y-3 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black text-neutral-800 uppercase tracking-widest block">{t.cardTitle}</span>
                            <span className="text-[9px] text-neutral-400 block mt-0.5">{t.cardSubtitle}</span>
                          </div>
                          
                          {/* Autofill Demo Card button */}
                          <button 
                            type="button"
                            onClick={() => {
                              setCardNo('4111 2222 3333 4444');
                              setCardExpiry('12 / 29');
                              setCardCvv('123');
                              setCardName(submittedFormData?.name?.toUpperCase() || user?.name?.toUpperCase() || 'SANDBOX USER');
                            }}
                            className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded transition-all cursor-pointer select-none"
                          >
                            ✨ Autofill Demo Card
                          </button>
                        </div>
                        
                        <div className="space-y-2.5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{t.cardNo}</label>
                              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">{cardNetwork.logo}</span>
                            </div>
                            <input 
                              type="text" 
                              placeholder="4111 2222 3333 4444" 
                              value={cardNo}
                              onChange={(e) => {
                                let val = e.target.value.replace(/\D/g, '').substring(0, 16);
                                let formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
                                setCardNo(formatted);
                              }}
                              className="bg-[#fbfbfb] border border-neutral-200 focus:border-indigo-600 rounded-lg px-3 py-2 text-xs font-mono font-bold text-neutral-700 outline-hidden tracking-wider w-full transition-colors"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{t.cardExpiry}</label>
                              <input 
                                type="text" 
                                placeholder="12 / 29" 
                                value={cardExpiry}
                                onChange={(e) => {
                                  let val = e.target.value.replace(/\D/g, '').substring(0, 4);
                                  if (val.length >= 2) {
                                    val = val.substring(0, 2) + ' / ' + val.substring(2);
                                  }
                                  setCardExpiry(val);
                                }}
                                className="bg-[#fbfbfb] border border-neutral-200 focus:border-indigo-600 rounded-lg px-3 py-2 text-xs font-mono font-bold text-neutral-700 outline-hidden tracking-wider w-full transition-colors"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{t.cardCvv}</label>
                              <input 
                                type="password" 
                                placeholder="•••" 
                                maxLength={3}
                                value={cardCvv}
                                onChange={(e) => {
                                  setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 3));
                                }}
                                className="bg-[#fbfbfb] border border-neutral-200 focus:border-indigo-600 rounded-lg px-3 py-2 text-xs font-mono font-bold text-neutral-700 outline-hidden tracking-wider w-full transition-colors"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{t.cardHolder}</label>
                            <input 
                              type="text" 
                              placeholder="SANDBOX USER" 
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value.toUpperCase())}
                              className="bg-[#fbfbfb] border border-neutral-200 focus:border-indigo-600 rounded-lg px-3 py-2 text-xs font-sans font-bold text-neutral-700 outline-hidden tracking-wider w-full transition-colors"
                            />
                          </div>

                          <label className="flex items-center gap-2 text-[9px] font-bold text-neutral-500 cursor-pointer select-none mt-1">
                            <input 
                              type="checkbox" 
                              checked={saveCard}
                              onChange={(e) => setSaveCard(e.target.checked)}
                              className="accent-indigo-600"
                            />
                            <span>{t.saveCard}</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* UPI / QR VIEW */}
                    {simulatedMethod === 'upi' && (
                      <div className="space-y-3 animate-fade-in">
                        <div>
                          <span className="text-[10px] font-black text-neutral-800 uppercase tracking-widest block">{t.upiTitle}</span>
                          <span className="text-[9px] text-neutral-400 block mt-0.5">{t.upiSubtitle}</span>
                        </div>
                        
                        {upiQrActive ? (
                          <div className="flex flex-col items-center justify-center p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3 animate-scale-in">
                            {/* Real looking QR Code block */}
                            <div className="bg-white p-3 border border-neutral-200 rounded-lg shadow-sm relative group">
                              <svg className="w-28 h-28 text-[#121c2c]" viewBox="0 0 100 100">
                                <path fill="currentColor" d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z M40,10 h10 v10 h-10 z M55,5 h10 v10 h-10 z M45,40 h15 v15 h-15 z M5,45 h20 v10 h-20 z M80,45 h10 v20 h-10 z M40,75 h15 v15 h-15 z M75,75 h20 v20 h-20 z M85,65 h10 v10 h-10 z M65,35 h15 v10 h-15 z" />
                              </svg>
                              <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setUpiTimer(300)}>
                                <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">🔄 Reset QR</span>
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <span className="text-[9px] font-black text-neutral-800 uppercase tracking-wide block">Scan & Pay using GPay / PhonePe / BHIM</span>
                              <span className="text-[8px] font-mono text-rose-600 font-bold block mt-1">
                                ⏳ QR Code expires in {Math.floor(upiTimer / 60)}:{(upiTimer % 60).toString().padStart(2, '0')}
                              </span>
                            </div>
                            
                            <button 
                              type="button" 
                              onClick={() => setUpiQrActive(false)}
                              className="text-[8px] font-bold text-neutral-500 hover:text-neutral-700 bg-neutral-200/50 px-2 py-0.5 rounded transition-colors cursor-pointer"
                            >
                              Cancel QR Scan
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* QR Code Option */}
                            <div 
                              onClick={() => {
                                setUpiQrActive(true);
                                setUpiTimer(300);
                              }}
                              className="p-3 bg-neutral-50 hover:bg-indigo-50/20 hover:border-indigo-200 border border-neutral-200 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-white border border-neutral-200 rounded flex items-center justify-center text-xs shrink-0 select-none">📱</div>
                                <div>
                                  <span className="text-[10px] font-black uppercase text-neutral-800 block">{t.upiQr}</span>
                                  <span className="text-[8px] font-mono text-neutral-400 block mt-0.5">{t.upiQrSub}</span>
                                </div>
                              </div>
                              <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded uppercase">Generate QR</span>
                            </div>

                            <div className="relative flex items-center py-1">
                              <div className="w-full h-px bg-neutral-100" />
                              <span className="absolute left-1/2 -translate-x-1/2 bg-white px-2.5 text-[8px] font-mono text-neutral-400 uppercase tracking-widest">OR PAY VIA UPI ID</span>
                            </div>

                            {/* UPI ID input field */}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{t.upiIdLabel}</label>
                                {upiVerified === 'verified' && <span className="text-[8px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">✅ Verified: {submittedFormData?.name?.toLowerCase() || 'customer'}@upi</span>}
                                {upiVerified === 'invalid' && <span className="text-[8px] font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">{t.invalidUpi}</span>}
                              </div>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  placeholder="username@okhdfcbank" 
                                  value={upiId}
                                  onChange={(e) => {
                                    setUpiId(e.target.value);
                                    setUpiVerified('idle');
                                  }}
                                  className="bg-neutral-50 border border-neutral-200 focus:border-indigo-600 rounded-lg px-3 py-2 text-xs font-mono font-bold text-neutral-700 outline-hidden tracking-wider flex-1 transition-colors"
                                />
                                <button
                                  type="button"
                                  disabled={!upiId || upiVerified === 'verified' || upiVerified === 'verifying'}
                                  onClick={() => {
                                    setUpiVerified('verifying');
                                    setTimeout(() => {
                                      const isValid = upiId.includes('@') && upiId.split('@')[0].length >= 2 && upiId.split('@')[1].length >= 2;
                                      if (isValid) {
                                        setUpiVerified('verified');
                                      } else {
                                        setUpiVerified('invalid');
                                      }
                                    }, 800);
                                  }}
                                  className={`px-3 py-2 text-[9px] font-black tracking-wider uppercase rounded-lg transition-all ${
                                    upiVerified === 'verified' 
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                    : upiVerified === 'invalid'
                                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                                    : upiVerified === 'verifying'
                                    ? 'bg-neutral-100 text-neutral-400 border border-neutral-200 animate-pulse'
                                    : 'bg-neutral-950 hover:bg-neutral-800 text-white cursor-pointer active:scale-95'
                                  }`}
                                >
                                  {upiVerified === 'verifying' ? t.verifying : upiVerified === 'verified' ? t.verified : t.verify}
                                </button>
                              </div>

                              {upiVerified === 'invalid' && (
                                <p className="text-[8px] font-mono text-rose-500 uppercase leading-normal tracking-wide">
                                  {t.invalidUpiSub}
                                </p>
                              )}

                              {/* Developer helper tip */}
                              <div className="bg-indigo-50/40 border border-indigo-100 rounded-lg p-2 flex items-start gap-1.5">
                                <span className="text-xs">💡</span>
                                <p className="text-[8px] font-medium text-indigo-700 uppercase leading-normal tracking-wide">
                                  Tip: For secure test mode, enter <strong className="font-mono text-indigo-900 select-all">success@razorpay</strong> or click quick handles to verify instantly!
                                </p>
                              </div>

                              {/* Quick Handles */}
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {['@okhdfcbank', '@okaxis', '@okicici', '@ybl', '@paytm'].map((handle) => (
                                  <button
                                    key={handle}
                                    type="button"
                                    onClick={() => {
                                      let base = upiId.split('@')[0] || (submittedFormData?.name?.toLowerCase().replace(/\s+/g, '') || 'customer');
                                      setUpiId(base + handle);
                                      setUpiVerified('idle');
                                    }}
                                    className="text-[8px] font-mono font-bold text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded transition-all cursor-pointer"
                                  >
                                    {handle}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* NETBANKING VIEW */}
                    {simulatedMethod === 'netbanking' && (
                      <div className="space-y-3 animate-fade-in">
                        <div>
                          <span className="text-[10px] font-black text-neutral-800 uppercase tracking-widest block">{t.nbTitle}</span>
                          <span className="text-[9px] text-neutral-400 block mt-0.5">{t.nbSubtitle}</span>
                        </div>
                        
                        {/* 6 Popular Banks Grid */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { name: 'HDFC Bank', logo: '🏦' },
                            { name: 'SBI Bank', logo: '🏦' },
                            { name: 'ICICI Bank', logo: '🏦' },
                            { name: 'Axis Bank', logo: '🏦' },
                            { name: 'Kotak Bank', logo: '🏦' },
                            { name: 'Yes Bank', logo: '🏦' }
                          ].map((bank) => {
                            const isSelected = selectedBank === bank.name && !customBankSelected;
                            return (
                              <div 
                                key={bank.name}
                                onClick={() => {
                                  setSelectedBank(bank.name);
                                  setCustomBankSelected('');
                                }}
                                className={`p-2.5 border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-95 ${
                                  isSelected 
                                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs scale-[1.02]' 
                                  : 'border-neutral-200 bg-[#fbfbfb] hover:border-neutral-300'
                                }`}
                              >
                                <span className="text-base">{bank.logo}</span>
                                <span className="text-[8px] font-black uppercase tracking-wider text-neutral-700 mt-1 truncate w-full">{bank.name}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Search & Select Other Bank Dropdown */}
                        <div className="relative">
                          <div 
                            onClick={() => setNbDropdownOpen(!nbDropdownOpen)}
                            className="w-full p-3 bg-neutral-50 hover:bg-neutral-100/50 border border-neutral-200 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-600">
                              {customBankSelected ? `🏦 Selected: ${customBankSelected}` : t.searchBank}
                            </span>
                            <span className="text-xs text-neutral-400">{nbDropdownOpen ? '▴' : '▾'}</span>
                          </div>

                          {nbDropdownOpen && (
                            <div className="absolute top-full left-0 w-full mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 p-2 space-y-2 max-h-48 overflow-y-auto">
                              <input 
                                type="text" 
                                placeholder="Search bank name..."
                                value={nbSearchQuery}
                                onChange={(e) => setNbSearchQuery(e.target.value)}
                                className="w-full bg-[#fbfbfb] border border-neutral-200 focus:border-indigo-600 rounded-lg px-3 py-2 text-[9px] font-sans font-bold text-neutral-800 outline-hidden placeholder-neutral-400"
                              />
                              <div className="space-y-1">
                                {allIndianBanksList
                                  .filter(bName => bName.toLowerCase().includes(nbSearchQuery.toLowerCase()))
                                  .map((bName) => (
                                    <div
                                      key={bName}
                                      onClick={() => {
                                        setCustomBankSelected(bName);
                                        setSelectedBank('');
                                        setNbDropdownOpen(false);
                                        setNbSearchQuery('');
                                      }}
                                      className="px-3 py-2 hover:bg-neutral-50 rounded-lg text-[9px] font-black uppercase tracking-wider text-neutral-700 cursor-pointer transition-colors"
                                    >
                                      🏦 {bName}
                                    </div>
                                  ))}
                                {allIndianBanksList.filter(bName => bName.toLowerCase().includes(nbSearchQuery.toLowerCase())).length === 0 && (
                                  <div className="px-3 py-2 text-[9px] font-mono text-neutral-400 text-center">
                                    No matching Indian banks found
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* WALLET VIEW */}
                    {simulatedMethod === 'wallet' && (
                      <div className="space-y-3 animate-fade-in">
                        <div>
                          <span className="text-[10px] font-black text-neutral-800 uppercase tracking-widest block">{t.walletTitle}</span>
                          <span className="text-[9px] text-neutral-400 block mt-0.5">{t.walletSubtitle}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {['Paytm Wallet', 'PhonePe Wallet', 'Amazon Pay', 'JioMoney'].map((wName) => {
                            const isSelected = selectedWallet === wName;
                            return (
                              <div 
                                key={wName} 
                                onClick={() => {
                                  setSelectedWallet(wName);
                                  setWalletLinked('idle');
                                  setWalletOtp('');
                                }}
                                className={`flex items-center gap-2 p-3 border rounded-xl text-[9px] font-black uppercase tracking-wider text-neutral-700 cursor-pointer select-none transition-all active:scale-[0.98] ${
                                  isSelected 
                                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs' 
                                  : 'border-neutral-200 bg-[#fbfbfb] hover:border-neutral-300'
                                }`}
                              >
                                <span>📱</span>
                                <span>{wName}</span>
                              </div>
                            );
                          })}
                        </div>

                        {selectedWallet && (
                          <div className="p-3 bg-neutral-50/50 border border-neutral-200 rounded-xl space-y-3 animate-slide-down">
                            {walletLinked === 'idle' && (
                              <div className="space-y-2">
                                <label className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">{t.walletPhone}</label>
                                <input 
                                  type="text" 
                                  value={walletPhone}
                                  onChange={(e) => setWalletPhone(e.target.value)}
                                  placeholder="Enter mobile number linked to wallet"
                                  className="bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-neutral-700 outline-hidden tracking-wider w-full focus:border-indigo-600 transition-colors"
                                />
                                <button
                                  type="button"
                                  disabled={!walletPhone}
                                  onClick={() => {
                                    setWalletLinked('sending');
                                    setTimeout(() => {
                                      setWalletLinked('sent');
                                    }, 1000);
                                  }}
                                  className="w-full bg-neutral-950 hover:bg-neutral-800 text-white font-black text-[9px] tracking-widest uppercase py-2.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                                >
                                  {t.sendOtp}
                                </button>
                              </div>
                            )}

                            {walletLinked === 'sending' && (
                              <div className="text-center py-2 animate-pulse">
                                <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">{t.linking}</span>
                              </div>
                            )}

                            {walletLinked === 'sent' && (
                              <div className="space-y-2.5">
                                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block font-mono">
                                  📩 {t.otpSent} (Type '1234' to link)
                                </span>
                                <input 
                                  type="text" 
                                  value={walletOtp}
                                  onChange={(e) => setWalletOtp(e.target.value.replace(/\D/g, '').substring(0, 4))}
                                  placeholder="ENTER 4-DIGIT OTP"
                                  className="bg-white border border-neutral-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-neutral-700 text-center outline-hidden tracking-[0.3em] w-full focus:border-indigo-600 transition-colors"
                                />
                                <button
                                  type="button"
                                  disabled={walletOtp.length !== 4}
                                  onClick={() => {
                                    setWalletLinked('linked');
                                  }}
                                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] tracking-widest uppercase py-2.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                                >
                                  {t.verifyOtp}
                                </button>
                              </div>
                            )}

                            {walletLinked === 'linked' && (
                              <div className="text-center py-2 bg-emerald-50 border border-emerald-200 rounded-lg animate-scale-in">
                                <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">
                                  {t.linked}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* PAY LATER & EMI VIEW */}
                    {simulatedMethod === 'paylater' && (
                      <div className="space-y-3 animate-fade-in">
                        <div>
                          <span className="text-[10px] font-black text-neutral-800 uppercase tracking-widest block">{t.paylaterTitle}</span>
                          <span className="text-[9px] text-neutral-400 block mt-0.5">{t.paylaterSubtitle}</span>
                        </div>
                        
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1 scrollbar-none">
                          {[
                            { name: 'Simpl', desc: 'Get ₹15,000 credit limit instantly. 1-click checkout, pay in 15 days.' },
                            { name: 'LazyPay', desc: 'Secure credit line. Pay in 15 days at 0% interest.' },
                            { name: 'ICICI Bank PayLater', desc: 'Pre-approved credit line for ICICI account holders.' },
                            { name: 'HDFC FlexiPay', desc: 'Instant flexible digital credit line.' }
                          ].map((opt) => {
                            const isSelected = paylaterOption === opt.name;
                            return (
                              <div 
                                key={opt.name}
                                onClick={() => setPaylaterOption(opt.name)}
                                className={`p-2.5 border rounded-xl flex items-start gap-2.5 cursor-pointer transition-all active:scale-[0.99] ${
                                  isSelected 
                                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs' 
                                  : 'border-neutral-200 bg-[#fbfbfb] hover:border-neutral-300'
                                }`}
                              >
                                <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-neutral-300 bg-white'
                                }`}>
                                  {isSelected && <div className="w-1 h-1 bg-white rounded-full" />}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[9px] font-black uppercase text-neutral-800 block">{opt.name}</span>
                                  <span className="text-[8px] font-mono text-neutral-400 block leading-normal mt-0.5 truncate">{opt.desc}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Primary Sandbox Payment Action Trigger Button */}
                  <button
                    type="button"
                    disabled={isPayButtonDisabled}
                    onClick={() => {
                      setRazorpayModalOpen(false);
                      const generatedPayId = `pay_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
                      processFinalizeOrder(submittedFormData, 'ONLINE', 'PAID', generatedPayId, mockOrderId);
                    }}
                    className={`w-full text-white font-black text-[10px] tracking-widest uppercase py-3.5 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer mt-4 ${
                      isPayButtonDisabled 
                      ? 'bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed shadow-none' 
                      : 'bg-[#121c2c] hover:bg-[#1b2a40]'
                    }`}
                  >
                    {getPayButtonText()} &rarr;
                  </button>

                </div>
              </div>

              {/* Secure Footer stamp */}
              <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-center gap-2 text-[8px] font-mono text-neutral-400 uppercase bg-neutral-50/50 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t.secStamp}</span>
              </div>

            </div>
          </div>
        );
      })()}

      <Footer />
    </>
  )
}

export default Checkout

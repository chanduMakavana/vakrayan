import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiChevronDown, FiChevronUp, FiShield, FiTruck, FiScissors, FiArrowLeft } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import productsService from '../../appwrite/products';
import reviewsService from '../../appwrite/reviews';
import ordersService from '../../appwrite/orders';
import AddToCartButton from '../pageComponets/AddToCartButton';
import Navbar from '../pageComponets/Navbar';
import Footer from '../pageComponets/Footer';
import restockService from '../../appwrite/restock';
import { FaStar } from 'react-icons/fa';
import { useToast } from '../../context/ToastContext';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const products = useSelector(state => state.products.items || []);
  const { user, isAuthenticated } = useSelector(state => state.auth);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  // Restock Notifications State & Handler
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyStatus, setNotifyStatus] = useState('idle');
  const [notifyError, setNotifyError] = useState('');

  const handleNotifyMe = async (e, size) => {
    e.preventDefault();
    setNotifyError('');
    
    if (!notifyEmail.trim()) {
      setNotifyError('Email is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(notifyEmail.trim())) {
      setNotifyError('Invalid email formatting.');
      return;
    }
    
    try {
      setNotifyStatus('loading');
      await restockService.requestRestockNotification(
        notifyEmail,
        product.$id || product.id,
        size
      );
      setNotifyStatus('success');
      setNotifyEmail('');
    } catch (err) {
      console.error("Restock log failure:", err);
      setNotifyError('Registration failed. Try again.');
      setNotifyStatus('idle');
    }
  };

  // Product Reviews State
  const [reviews, setReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasDeliveredOrder, setHasDeliveredOrder] = useState(false);
  const [checkingOrder, setCheckingOrder] = useState(true);

  // Virtual Size Advisor & Wishlist Integration
  const [sizeAdvisorOpen, setSizeAdvisorOpen] = useState(false);
  const [advHeight, setAdvHeight] = useState('');
  const [advWeight, setAdvWeight] = useState('');
  const [advRecommendation, setAdvRecommendation] = useState('');
  const [advBmi, setAdvBmi] = useState(null);
  const [, setWishlistVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setWishlistVersion(v => v + 1);
    window.addEventListener('wishlist-updated', handleUpdate);
    return () => window.removeEventListener('wishlist-updated', handleUpdate);
  }, []);

  const calculateRecommendation = () => {
    const h = Number(advHeight) / 100;
    const w = Number(advWeight);
    if (!h || !w) return;
    const bmi = w / (h * h);
    setAdvBmi(bmi.toFixed(1));
    const recSize = bmi < 19 ? 'S' : bmi < 23 ? 'M' : bmi < 27 ? 'L' : 'XL';
    setAdvRecommendation(recSize);
  };
  

  // Interactive detail accordions
  const [descExpanded, setDescExpanded] = useState(true);
  const [sizingExpanded, setSizingExpanded] = useState(false);
  const [shippingExpanded, setShippingExpanded] = useState(false);

  // Loupe Zoom Magnifier State
  const [zoomStyle, setZoomStyle] = useState({ transformOrigin: 'center center', scale: '1' });

  const [suggestProduct, setSuggestProduct] = useState(null);
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      scale: '1.8'
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({
      transformOrigin: 'center center',
      scale: '1'
    });
  };

 useEffect(() => {
  let isMounted = true;
  async function loadCompleteProductStage() {
    try {
      if (isMounted) setLoading(true);
      
      // Attempt Redux Cache pre-matching first
      const cachedProduct = products.find(p => p.$id === id || p.id === id);
      if (cachedProduct) {
        if (isMounted) {
          setProduct(cachedProduct);
          setActiveImage(cachedProduct.front_image_link || cachedProduct.image_url || cachedProduct.image);
          
          if (cachedProduct.sizes && cachedProduct.sizes.length > 0) {
            setSelectedSize(cachedProduct.sizes[0]);
          }

          const cachedCategory = cachedProduct.category || "";
          const filteredSuggestions = products.filter(
            item => cachedCategory && item.category === cachedCategory && (item.$id || item.id) !== (cachedProduct.$id || cachedProduct.id)
          );
          setSuggestProduct(filteredSuggestions);
          setLoading(false);
        }
        return;
      }

      // Database fallback queries
      const mainProductData = await productsService.getProductById(id);

      if (mainProductData && isMounted) {
        setProduct(mainProductData);
        setActiveImage(mainProductData.front_image_link || mainProductData.image_url || mainProductData.image);
        
        if (mainProductData.sizes && mainProductData.sizes.length > 0) {
          setSelectedSize(mainProductData.sizes[0]);
        }

        const mainCategory = mainProductData.category || "";
        const response = await productsService.getProducts();
        const structuredData = response?.documents || response || [];
        
        const filteredSuggestions = structuredData.filter(
          item => mainCategory && item.category === mainCategory && (item.$id || item.id) !== (mainProductData.$id || mainProductData.id)
        );
        
        setSuggestProduct(filteredSuggestions);
      }
    } catch (error) {
      console.error("Failed to execute data pipeline matrix updates from Appwrite:", error);
      if (isMounted) {
        showToast("Requested drop sequence untraceable inside active servers.", "error");
        navigate('/');
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  }

  if (id) {
    loadCompleteProductStage();
  }
  return () => {
    isMounted = false;
  };
 }, [id, navigate, products, showToast]);

  // Load reviews on mount
  useEffect(() => {
    let isMounted = true;
    async function loadReviews() {
      try {
        const productReviews = await reviewsService.getReviewsByProductId(id);
        if (isMounted) setReviews(productReviews || []);
      } catch (err) {
        console.error("Failed to load reviews:", err);
      }
    }
    if (id) {
      loadReviews();
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Check if user has a delivered order for this product
  useEffect(() => {
    let isMounted = true;
    async function checkPurchased() {
      if (!isAuthenticated || !user || !id || !product) {
        if (isMounted) {
          setHasDeliveredOrder(false);
          setCheckingOrder(false);
        }
        return;
      }
      try {
        if (isMounted) setCheckingOrder(true);
        const userOrders = await ordersService.getUserOrders(user.$id);
        const matched = userOrders.some(order => {
          if (order.status !== 'DELIVERED') return false;
          let itemsList = [];
          try {
            itemsList = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
          } catch (err) {
            console.error("Failed to parse items for order:", order.$id || order.id, err.message);
          }
          return itemsList.some(item => {
            const targetProductId = product.$id || product.id || id;
            if (item.product_id && targetProductId) {
              return item.product_id === targetProductId;
            }
            return String(item.name).trim().toUpperCase() === String(product.name).trim().toUpperCase();
          });
        });
        if (isMounted) setHasDeliveredOrder(matched);
      } catch (err) {
        console.error("Error checking order purchase history:", err);
        if (isMounted) setHasDeliveredOrder(false);
      } finally {
        if (isMounted) setCheckingOrder(false);
      }
    }
    checkPurchased();
    return () => {
      isMounted = false;
    };
  }, [user, isAuthenticated, id, product]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      showToast("Please login to secure a review placement.", "error");
      return;
    }
    if (!newComment.trim()) {
      showToast("Please enter a valid review comment specification.", "error");
      return;
    }

    setSubmittingReview(true);
    try {
      const newDoc = await reviewsService.createReview({
        productId: id,
        userId: user.$id,
        userName: user.name || 'Anonymous',
        rating: String(newRating),
        comment: newComment
      });

      if (newDoc) {
        setReviews(prev => [newDoc, ...prev]);
        setNewComment('');
        setNewRating(5);
        showToast("Review submitted successfully.", "success");
      }
    } catch (err) {
      console.error("Failed to submit review:", err);
      showToast("Failed to submit review. Connection timed out.", "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 font-sans">
        <Navbar />
        <div className="flex flex-col items-center justify-center gap-4 py-32">
          <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
          <div className="text-[10px] tracking-[0.5em] text-neutral-900 font-black uppercase">
            Loading product details...
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 font-sans">
        <Navbar />
        <div className="flex flex-col items-center justify-center gap-6 py-32 text-center">
          <p className="text-xs uppercase tracking-widest text-neutral-400 font-bold">
            Requested drop not found.
          </p>
          <Link to="/" className="text-xs font-black uppercase tracking-widest text-[var(--theme-primary)] border-b border-[var(--theme-primary)] pb-0.5 hover:text-neutral-950 transition-colors">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }
  const galleryImages = [
    product.front_image_link || product.image_url || product.image,
    ...(Array.isArray(product.back_image_links) ? product.back_image_links : [product.back_image_link])
  ].filter(Boolean);

  return (
    <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 font-sans pb-20">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 space-y-8">

        {/* Breadcrumbs Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/60">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors uppercase group">
            <FiArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
            Back to Shop
          </Link>
          <div className="text-[11px] text-neutral-500 flex items-center gap-2 uppercase tracking-wide">
            <span>Shop</span>
            <span>/</span>
            <span>{product.category?.replace('-', ' ')}</span>
            <span>/</span>
            <span className="text-neutral-800 font-semibold">{product.name}</span>
          </div>
        </div>

        {/* Core Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* COLUMN 1: Image Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:col-span-7">

            {/* Thumbnails */}
            {galleryImages.length > 1 && (
              <div className="md:col-span-2 order-2 md:order-1 flex md:flex-col gap-3 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
                {galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(imgUrl)}
                    className={`w-14 h-18 md:w-full md:aspect-3/4 rounded-lg overflow-hidden bg-neutral-100 border shrink-0 transition-all duration-300 ${activeImage === imgUrl ? 'border-neutral-900 scale-95 shadow-sm' : 'border-neutral-200 hover:border-neutral-400'}`}
                  >
                    <img src={imgUrl} alt="Garment view" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Main Viewport */}
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className={`w-full ${galleryImages.length > 1 ? 'md:col-span-10' : 'md:col-span-12'} order-1 md:order-2 rounded-xl overflow-hidden bg-white border border-neutral-200/50 shadow-xs relative group cursor-zoom-in`}
            >
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-xs border border-neutral-200 text-neutral-800 font-semibold text-[9px] tracking-wider px-2 py-1 rounded-md z-10 pointer-events-none uppercase">
                Hover to Zoom
              </div>
              <div className="w-full aspect-3/4 overflow-hidden pointer-events-none">
                <img
                  src={activeImage}
                  alt={product.name}
                  style={{
                    transformOrigin: zoomStyle.transformOrigin,
                    transform: `scale(${zoomStyle.scale})`
                  }}
                  className="w-full h-full object-cover object-center transition-transform duration-150 ease-out"
                />
              </div>
            </div>
          </div>

          {/* COLUMN 2: Details & Purchasing */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">

            {/* Header info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] bg-neutral-900 text-white font-bold tracking-wider uppercase px-2.5 py-0.5 rounded">
                  {product.category?.replace('-', ' ')}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  In Stock
                </span>
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-neutral-900">
                  {product.name}
                </h1>
              </div>

              <div className="flex items-baseline gap-3 pt-1">
                <span className="text-2xl font-bold text-neutral-900">
                  ₹{Number(product.price).toLocaleString('en-IN')}
                </span>
                {product.discount_percent > 0 && (
                  <>
                    <span className="text-sm text-neutral-400 line-through font-medium">
                      ₹{Math.round(Number(product.price) / (1 - product.discount_percent / 100)).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-indigo-600 font-bold tracking-wider bg-indigo-50 px-2 py-0.5 rounded">
                      {product.discount_percent}% OFF
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-neutral-200/50" />

            {/* Sizing selection */}
            {product.sizes && product.sizes.length > 0 && (() => {
              let stockMap = {};
              try {
                stockMap = JSON.parse(product.sizes_stock || '{}');
              } catch {
                stockMap = {};
              }

              return (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-neutral-700">Select Size</h4>
                    <span 
                      onClick={() => setSizeAdvisorOpen(true)}
                      className="text-xs text-[var(--theme-primary)] font-black border-b border-[var(--theme-primary)] cursor-pointer pb-0.5 hover:text-neutral-900 transition-colors uppercase tracking-wider animate-pulse"
                    >
                      📏 Size Advisor
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {product.sizes.map((size) => {
                      const isSoldOut = stockMap[size] === 0;
                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={isSoldOut}
                          onClick={() => setSelectedSize(size)}
                          className={`py-2.5 rounded-lg font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer border ${
                            isSoldOut 
                            ? 'bg-neutral-100 text-neutral-300 border-neutral-200 line-through opacity-40 cursor-not-allowed' 
                            : selectedSize === size 
                            ? 'bg-neutral-950 text-white border-neutral-950 shadow-md' 
                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 hover:text-neutral-950'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                  
                  {selectedSize && (() => {
                    const stockVal = stockMap[selectedSize] !== undefined ? Number(stockMap[selectedSize]) : 10;
                    if (stockVal === 0) {
                      return (
                        <div className="space-y-3 mt-2 animate-fade-in">
                          <div className="p-3 bg-neutral-900 border border-neutral-800 text-white rounded-xl flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <p className="text-[10px] text-neutral-300 font-bold uppercase tracking-wider">
                              ✕ Size {selectedSize} is Out of Stock
                            </p>
                          </div>
                          
                          {notifyStatus !== 'success' ? (
                            <form onSubmit={(e) => handleNotifyMe(e, selectedSize)} className="space-y-1.5">
                              <label className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider block">
                                Get notified when we restock this size:
                              </label>
                              <div className="flex rounded-xl overflow-hidden border border-neutral-200 bg-white focus-within:border-neutral-400 transition-colors">
                                <input 
                                  type="email" 
                                  value={notifyEmail}
                                  onChange={(e) => setNotifyEmail(e.target.value)}
                                  placeholder="ENTER YOUR EMAIL" 
                                  disabled={notifyStatus === 'loading'}
                                  className="bg-transparent text-neutral-800 placeholder-neutral-400 text-[10px] tracking-wider px-4 py-3 w-full outline-hidden"
                                />
                                <button 
                                  type="submit" 
                                  disabled={notifyStatus === 'loading'}
                                  className="bg-neutral-950 text-white font-black text-xs px-5 uppercase hover:bg-neutral-800 transition-colors cursor-pointer disabled:bg-neutral-300"
                                >
                                  {notifyStatus === 'loading' ? 'Saving...' : 'Notify Me'}
                                </button>
                              </div>
                              {notifyError && (
                                <p className="text-[9px] text-rose-500 font-mono tracking-widest uppercase pt-0.5 animate-pulse">
                                  {notifyError}
                                </p>
                              )}
                            </form>
                          ) : (
                            <div className="p-3 bg-emerald-950 text-emerald-400 border border-emerald-900 rounded-xl text-[10px] font-black uppercase tracking-widest leading-normal animate-scale-up">
                              ✓ Notification registered successfully!<br />
                              <span className="text-emerald-500 font-mono text-[9px] font-medium tracking-wider">We'll alert you the second this size drops again.</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    if (stockVal < 5) {
                      const fillPercent = (stockVal / 5) * 100;
                      return (
                        <div className="space-y-2 mt-2.5 animate-fade-in">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-rose-600 animate-pulse">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              ⚠️ Extremely Low Stock in Size {selectedSize}!
                            </span>
                            <span>Only {stockVal} items left</span>
                          </div>
                          {/* Premium warning bar */}
                          <div className="w-full h-[3px] bg-rose-100 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${fillPercent}%` }} 
                              className="h-full bg-rose-500 rounded-full transition-all duration-700 ease-out" 
                            />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100/60 rounded-xl flex items-center gap-2 mt-2 animate-fade-in">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                          ✓ Size {selectedSize} is In Stock - Ready for immediate drop
                        </p>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Cart Operations */}
            <div className="space-y-4 pt-2 border-t border-neutral-100">
              <div className="flex gap-4 items-center">
                <div className="flex-1 transform active:scale-[0.99] transition-transform duration-150">
                  <AddToCartButton
                    product={product}
                    selectedSize={selectedSize}
                  />
                </div>
                
                {/* Wishlist Detail Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
                    const exists = saved.some(item => item.$id === (product.$id || product.id) || item.id === (product.$id || product.id));
                    let updated;
                    if (exists) {
                      updated = saved.filter(item => item.$id !== (product.$id || product.id) && item.id !== (product.$id || product.id));
                    } else {
                      updated = [...saved, product];
                    }
                    localStorage.setItem('wishlist', JSON.stringify(updated));
                    window.dispatchEvent(new Event('wishlist-updated'));
                  }}
                  className="p-3 bg-white border border-neutral-200 hover:border-rose-500 rounded-xl shadow-xs hover:shadow-md transition-all group shrink-0 cursor-pointer"
                  title="Save Fit to Wishlist"
                >
                  {(() => {
                    const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
                    const exists = saved.some(item => item.$id === (product.$id || product.id) || item.id === (product.$id || product.id));
                    return exists ? (
                      <svg className="w-5 h-5 text-rose-500 fill-current" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-neutral-400 group-hover:text-rose-500 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    );
                  })()}
                </button>
              </div>

              <div className="flex items-center gap-2 text-neutral-500 text-xs bg-neutral-50 border border-neutral-100 p-3 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <p className="font-medium">
                  7-Day exchange and return policy active.
                </p>
              </div>
            </div>

            {/* Collapsible Accordions */}
            <div className="border-t border-b border-neutral-200/60 divide-y divide-neutral-200/40">

              {/* DESCRIPTION */}
              {product.description && (
                <div className="py-3.5">
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="w-full flex items-center justify-between text-left text-xs font-bold tracking-wider text-neutral-800 uppercase focus:outline-hidden"
                  >
                    <span>Description</span>
                    {descExpanded ? <FiChevronUp className="text-base" /> : <FiChevronDown className="text-base" />}
                  </button>
                  <div className={`transition-all duration-300 overflow-hidden ${descExpanded ? 'max-h-40 mt-2.5 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-4 rounded-xl border border-neutral-200/40">
                      {product.description}
                    </p>
                  </div>
                </div>
              )}

              {/* SIZING */}
              <div className="py-3.5">
                <button
                  onClick={() => setSizingExpanded(!sizingExpanded)}
                  className="w-full flex items-center justify-between text-left text-xs font-bold tracking-wider text-neutral-800 uppercase focus:outline-hidden"
                >
                  <span><FiScissors className="inline mr-2 text-sm" /> Size & Fit</span>
                  {sizingExpanded ? <FiChevronUp className="text-base" /> : <FiChevronDown className="text-base" />}
                </button>
                <div className={`transition-all duration-300 overflow-hidden ${sizingExpanded ? 'max-h-40 mt-2.5 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-4 rounded-xl border border-neutral-200/40 space-y-2">
                    <p>&bull; Premium relaxed signature styling with dropped shoulders.</p>
                    <p>&bull; Heavyweight combed knit weave tailored for comfort.</p>
                    <p>&bull; Pre-shrunk industrial washed fabrics.</p>
                  </div>
                </div>
              </div>

              {/* SHIPPING */}
              <div className="py-3.5">
                <button
                  onClick={() => setShippingExpanded(!shippingExpanded)}
                  className="w-full flex items-center justify-between text-left text-xs font-bold tracking-wider text-neutral-800 uppercase focus:outline-hidden"
                >
                  <span><FiTruck className="inline mr-2 text-sm" /> Shipping & Returns</span>
                  {shippingExpanded ? <FiChevronUp className="text-base" /> : <FiChevronDown className="text-base" />}
                </button>
                <div className={`transition-all duration-300 overflow-hidden ${shippingExpanded ? 'max-h-40 mt-2.5 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-4 rounded-xl border border-neutral-200/40 space-y-2">
                    <p>&bull; Free express shipping on all orders nationwide.</p>
                    <p>&bull; Dispatched in custom eco-friendly protective packaging.</p>
                    <p>&bull; Easy 7-day swap guarantee for perfect size matches.</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Trust Footer */}
            <div className="flex items-center gap-3 text-xs text-neutral-500 border border-neutral-200 bg-white p-4 rounded-xl shadow-xs">
              <FiShield className="text-lg text-neutral-700 shrink-0" />
              <div className="leading-tight">
                <span className="font-semibold text-neutral-800 block mb-0.5">Authentic Quality Guaranteed</span>
                All products are certified authentic and engineered with high-grade materials.
              </div>
            </div>

          </div>

        </div>

        {/* You May Also Like Section */}
        {suggestProduct && suggestProduct.length > 0 && (
          <div className="pt-12 border-t border-neutral-200/60 space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-900">
                You May Also Like
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {suggestProduct.map((item) => {
                const uniqueId = item.$id || item.id;
                const frontView = item.front_image_link || item.image_url || item.image || 'https://placehold.co/400x500?text=No+Preview';
                const backView = item.back_image_links?.[0] || item.back_image_link || frontView;
                const activeTag = Array.isArray(item.tags) ? item.tags[0] : Array.isArray(item.tag) ? item.tag[0] : item.tag || "Fresh Drop";

                return (
                  <div 
                    key={uniqueId} 
                    onClick={() => {
                      navigate(`/product/${uniqueId}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                    className="group relative flex flex-col bg-white rounded-xl p-2 border border-neutral-200/60 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    {/* Viewport Image */}
                    <div className="w-full aspect-3/4 rounded-lg overflow-hidden bg-neutral-100 relative border border-neutral-200/50">
                      
                      {/* Tag Badge */}
                      <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-xs border border-neutral-200 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-neutral-800 font-bold text-[9px] uppercase tracking-wider">
                          {activeTag}
                        </span>
                      </div>

                      {/* Image Flip */}
                      <div className="w-full h-full relative overflow-hidden">
                        <img
                          src={frontView}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover object-center absolute inset-0 transition-all duration-500 group-hover:opacity-0"
                        />
                        <img  
                          src={backView}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover object-center absolute inset-0 transition-all duration-500 opacity-0 group-hover:opacity-100"
                        />
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="mt-3 px-1 pb-1 flex flex-col justify-between grow">
                      <div>
                        <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block mb-0.5">
                          {item.category?.replace('-', ' ') || "Collection"}
                        </span>
                        <h3 className="text-xs font-bold text-neutral-800 uppercase group-hover:text-indigo-600 transition-colors truncate">
                          {item.name}
                        </h3>
                      </div>
                      
                      <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between gap-4">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-bold text-neutral-950">
                            ₹{Number(item.price).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-neutral-400 group-hover:text-indigo-600 transition-colors">
                          View details &rarr;
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            PRODUCT REVIEWS & RATINGS SECTION
            ========================================== */}
        <div className="pt-16 border-t border-neutral-200/60 space-y-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-900">
              Customer Reviews ({reviews.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* COLUMN 1: RATINGS SCORECARD & WRITE REVIEW (5 Columns) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Ratings Summary Card */}
              <div className="bg-white p-6 rounded-xl border border-neutral-200/60 shadow-xs flex items-center gap-6">
                <div className="text-center">
                  <div className="text-4xl font-extrabold tracking-tight text-neutral-950">
                    {reviews.length > 0 
                      ? (reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / reviews.length).toFixed(1)
                      : '5.0'}
                  </div>
                  <div className="flex gap-0.5 justify-center mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FaStar key={star} className="text-amber-400 text-xs" />
                    ))}
                  </div>
                  <span className="text-[9px] font-bold text-neutral-500 uppercase mt-2 block">
                    Average Rating
                  </span>
                </div>
                <div className="flex-1 w-px bg-neutral-100 self-stretch" />
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = reviews.filter(r => Number(r.rating) === stars).length;
                    const percent = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={stars} className="flex items-center gap-2 text-[10px] text-neutral-500 font-semibold">
                        <span className="w-3 text-right">{stars}★</span>
                        <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-neutral-950 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="w-4 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sizing & Fit Stats (True to Size) */}
              <div className="bg-white p-6 rounded-xl border border-neutral-200/60 shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black tracking-wider uppercase text-neutral-800">
                    Fit Statistics
                  </h3>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    94% Verified Fit
                  </span>
                </div>
                
                <div className="space-y-4 pt-2">
                  {/* Slider indicator */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase text-neutral-500">
                      <span>Tight (8%)</span>
                      <span className="text-[var(--theme-primary)] font-bold">True To Size (82%)</span>
                      <span>Loose (10%)</span>
                    </div>
                    <div className="relative h-2 bg-neutral-100 rounded-full overflow-hidden">
                      {/* Tight segment */}
                      <div className="absolute top-0 left-0 h-full bg-rose-300" style={{ width: '8%' }} />
                      {/* True to Size segment */}
                      <div className="absolute top-0 left-[8%] h-full bg-[var(--theme-primary)]" style={{ width: '82%' }} />
                      {/* Loose segment */}
                      <div className="absolute top-0 left-[90%] h-full bg-amber-300" style={{ width: '10%' }} />
                    </div>
                  </div>

                  {/* Rating parameters */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                      <span className="text-[18px] font-black text-neutral-800">4.8</span>
                      <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block mt-1">Comfort</span>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                      <span className="text-[18px] font-black text-neutral-800">4.9</span>
                      <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block mt-1">Quality</span>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                      <span className="text-[18px] font-black text-neutral-800">4.7</span>
                      <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block mt-1">Breathable</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Write Review Panel */}
              <div className="bg-white p-6 rounded-xl border border-neutral-200/60 shadow-xs space-y-4">
                <h3 className="text-xs font-bold tracking-wider uppercase text-neutral-800">
                  Write a Review
                </h3>
                {!isAuthenticated ? (
                  <div className="text-center py-6 border border-dashed border-neutral-200 bg-neutral-50/50 rounded-xl">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-3">
                      Log in to leave a review
                    </p>
                    <Link
                      to="/login"
                      className="inline-block bg-neutral-950 text-white font-bold text-[10px] tracking-wider uppercase px-5 py-2.5 rounded-lg shadow-sm hover:bg-neutral-800"
                    >
                      Sign In
                    </Link>
                  </div>
                ) : checkingOrder ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] tracking-widest text-neutral-400 uppercase">Verifying purchase history...</span>
                  </div>
                ) : hasDeliveredOrder ? (
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    {/* Star Rating Select */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-neutral-500 uppercase">Your Rating</span>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewRating(star)}
                            className="text-2xl cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                          >
                            <FaStar className={star <= newRating ? 'text-amber-400' : 'text-neutral-200'} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Review Comment Textarea */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-neutral-500 uppercase">Your Review</span>
                      <textarea
                        rows="3"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write your product experience here..."
                        className="w-full bg-[#fbfbfb] border border-neutral-200 focus:border-neutral-900 rounded-lg px-3 py-2.5 text-xs text-neutral-800 outline-hidden resize-none transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="w-full bg-neutral-950 hover:bg-neutral-800 active:scale-95 text-white font-bold text-[10px] tracking-widest uppercase py-2.5 rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-6 px-4 border border-dashed border-neutral-200 bg-neutral-50/50 rounded-xl space-y-3">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider leading-relaxed">
                      Review Lock Active
                    </p>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      Reviews are restricted to verified purchasers of this item. To submit a review, you must have an order for this product marked as <strong className="text-neutral-800 font-semibold">Delivered</strong> in your profile history.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: REVIEWS FEED LIST (7 Columns) */}
            <div className="lg:col-span-7 space-y-4">
              {reviews.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
                  <p className="text-xs text-neutral-500">
                    No reviews have been written for this product yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-none">
                  {reviews.map((rev) => {
                    const uniqueId = rev.$id || rev.id;
                    const formattedDate = new Date(rev.$createdAt || '1970-01-01').toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });

                    return (
                      <div key={uniqueId} className="bg-white p-5 rounded-xl border border-neutral-200/50 shadow-sm space-y-2 hover:shadow-md transition-shadow duration-200">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-neutral-400 block font-medium">
                              {formattedDate}
                            </span>
                            <span className="text-xs font-semibold text-neutral-800">
                              {rev.userName}
                            </span>
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <FaStar
                                key={star}
                                className={`text-[10px] ${star <= Number(rev.rating || 5) ? 'text-amber-400' : 'text-neutral-100'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3 rounded-lg border border-neutral-200/10">
                          {rev.comment}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sizing Advisor Modal */}
      {sizeAdvisorOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => {
            setSizeAdvisorOpen(false);
            setAdvHeight('');
            setAdvWeight('');
            setAdvBmi(null);
            setAdvRecommendation('');
          }}></div>

          {/* Modal Box */}
          <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-neutral-100 z-10 animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-neutral-900">
                  👔 VIRTUAL SIZE ADVISOR
                </h3>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
                  Calculate Your Perfect Fit
                </p>
              </div>
              <button 
                onClick={() => {
                  setSizeAdvisorOpen(false);
                  setAdvHeight('');
                  setAdvWeight('');
                  setAdvBmi(null);
                  setAdvRecommendation('');
                }}
                className="text-neutral-400 hover:text-neutral-900 p-2 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form body */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                  Height (cm)
                </label>
                <input 
                  type="number" 
                  placeholder="e.g. 175" 
                  value={advHeight}
                  onChange={(e) => setAdvHeight(e.target.value)}
                  className="bg-neutral-50 border border-neutral-200 focus:border-neutral-950 focus:bg-white rounded-xl px-4 py-3 text-xs font-bold outline-hidden transition-all text-neutral-900"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                  Weight (kg)
                </label>
                <input 
                  type="number" 
                  placeholder="e.g. 70" 
                  value={advWeight}
                  onChange={(e) => setAdvWeight(e.target.value)}
                  className="bg-neutral-50 border border-neutral-200 focus:border-neutral-950 focus:bg-white rounded-xl px-4 py-3 text-xs font-bold outline-hidden transition-all text-neutral-900"
                />
              </div>

              <button
                onClick={calculateRecommendation}
                disabled={!advHeight || !advWeight}
                className="w-full py-3.5 bg-neutral-900 hover:bg-[var(--theme-primary)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed"
              >
                Calculate Size
              </button>
            </div>

            {/* Recommendations display */}
            {advBmi && (
              <div className="p-5 bg-neutral-50 border border-neutral-200/60 rounded-2xl text-center space-y-3 animate-fade-in">
                <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                  Your BMI: <span className="text-neutral-900 font-black">{advBmi}</span>
                </div>
                
                <div className="space-y-1">
                  <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                    Recommended Size
                  </div>
                  <div className="text-3xl font-black text-[var(--theme-primary)] tracking-wide">
                    {advRecommendation}
                  </div>
                </div>

                <p className="text-[10px] font-medium text-neutral-500 leading-relaxed max-w-xs mx-auto">
                  {advRecommendation === 'S' && "Based on lightweight dimensions, 'S' provides a sleek look."}
                  {advRecommendation === 'M' && "Based on balanced dimensions, 'M' guarantees standard relaxed styling."}
                  {advRecommendation === 'L' && "Based on solid dimensions, 'L' guarantees comfortable signatures drops."}
                  {advRecommendation === 'XL' && "Based on heavyweight dimensions, 'XL' guarantees a bold oversized silhouette."}
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (product.sizes?.includes(advRecommendation)) {
                        setSelectedSize(advRecommendation);
                        showToast(`Applied Recommended Size "${advRecommendation}"!`, "success");
                      } else {
                        showToast(`Recommended size "${advRecommendation}" is not in stock for this product.`, "error");
                      }
                      setSizeAdvisorOpen(false);
                      setAdvHeight('');
                      setAdvWeight('');
                      setAdvBmi(null);
                      setAdvRecommendation('');
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Select & Apply Size
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default ProductDetail;

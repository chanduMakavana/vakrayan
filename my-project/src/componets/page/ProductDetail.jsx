import { useState, useEffect, useCallback, useRef } from 'react';
import { isCodAvailableForPincode, calculateDeliveryDetails } from '../../utils/pincodeHelper';
import { useParams, useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { FiChevronDown, FiChevronUp, FiTruck, FiArrowLeft, FiMapPin, FiX, FiChevronLeft, FiChevronRight, FiPlus, FiMinus, FiAlertCircle, FiVideo, FiPackage, FiRefreshCw, FiTag, FiSlash, FiCheckCircle, FiZap, FiCheck, FiCopy, FiShare2, FiCamera, FiImage } from 'react-icons/fi';

const RulerIcon = ({ className = "w-4 h-4 text-zinc-500 shrink-0 mt-0.5" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.3 15.3l-7.6-7.6c-.4-.4-1-.4-1.4 0l-7 7c-.4.4-.4 1 0 1.4l7.6 7.6c.4.4 1 .4 1.4 0l7-7c.4-.4.4-1 0-1.4z"/>
    <line x1="14.5" y1="9.5" x2="16" y2="11"/>
    <line x1="11.5" y1="12.5" x2="14" y2="15"/>
    <line x1="8.5" y1="15.5" x2="10" y2="17"/>
  </svg>
);

const ShieldCheckIcon = ({ className = "w-4 h-4 text-zinc-500 shrink-0 mt-0.5" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
);
import { useSelector, useDispatch } from 'react-redux';
import productsService from '../../services/products';
import reviewsService from '../../services/reviews';
import ordersService from '../../services/orders';
import wishlistService from '../../services/wishlist';
import { addWishlistItemState, removeWishlistItemState } from '../../features/wishlistSlice';
import AddToCartButton from '../pageComponets/AddToCartButton';
import Footer from '../pageComponets/Footer';
import restockService from '../../services/restock';
import { FaStar, FaWhatsapp } from 'react-icons/fa';
import { useToast } from '../../context/ToastContext';
import storageService, { compressImage } from '../../services/storage';
import { sendWebhookNotification } from '../../utils/webhookHelper';
import cartService from '../../services/cart';
import { addCartItemState } from '../../features/addToCart';
import Loader from '../pageComponets/Loader';
import { getOptimizedImageUrl, preloadImage } from '../../utils/imageOptimizer';


function ProductDetail() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const colorParam = searchParams.get('color');
  const products = useSelector(state => state.products.items || []);
  const wishlist = useSelector(state => state.wishlist || []);
  const { user, isAuthenticated, adminMode } = useSelector(state => state.auth);
  const cartItems = useSelector(state => state.cart || []);

  const [product, setProduct] = useState(null);
  const id = product?.$id || product?.id;

  // ✅ SEO: Dynamic page title + JSON-LD Product schema
  // Fires whenever product loads (cached or API). Each product gets a unique <title>.
  useEffect(() => {
    if (!product) {
      document.title = 'Loading... | Vakrayan';
      return;
    }
    const productName = product.name || 'Product';
    document.title = `${productName} | Vakrayan`;

    // Remove any existing product schema
    const existing = document.getElementById('product-jsonld');
    if (existing) existing.remove();

    // Add JSON-LD Product schema for Google rich snippets (price, availability, reviews)
    const schema = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: productName,
      description: product.description || `${productName} by Vakrayan`,
      brand: { '@type': 'Brand', name: 'Vakrayan' },
      image: product.front_image_link || product.image_url || product.image,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: String(product.price || ''),
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: 'Vakrayan' },
      },
    };
    const script = document.createElement('script');
    script.id = 'product-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      const s = document.getElementById('product-jsonld');
      if (s) s.remove();
    };
  }, [product]);

  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeVariant, setActiveVariant] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setQuantity(1);
  }, [selectedSize, selectedColor, idOrSlug]);
  const [groupProducts, setGroupProducts] = useState([]);
  const [activeReviewImage, setActiveReviewImage] = useState(null);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxOffset, setLightboxOffset] = useState({ x: 0, y: 0 });
  const [lightboxImageLoaded, setLightboxImageLoaded] = useState(true);
  const touchStartRef = useRef(null);

  const [mainPhotoZoom, setMainPhotoZoom] = useState(1);
  const [mainPhotoOffset, setMainPhotoOffset] = useState({ x: 0, y: 0 });

  const mainTouchStartRef = useRef({ x: 0, y: 0 });
  const mainInitialDistRef = useRef(0);
  const mainInitialZoomRef = useRef(1);
  const mainIsPinchingRef = useRef(false);
  const mainIsDraggingRef = useRef(false);
  const mainPreventClickRef = useRef(false);

  const mainImageRef = useRef(null);
  const mainPhotoZoomRef = useRef(1);
  const mainPhotoOffsetRef = useRef({ x: 0, y: 0 });

  const lightboxImageRef = useRef(null);
  const lightboxZoomRef = useRef(1);
  const lightboxOffsetRef = useRef({ x: 0, y: 0 });

  const mainContainerRef = useRef(null);
  const lightboxContainerRef = useRef(null);
  const lightboxModalRef = useRef(null);
  const galleryImagesRef = useRef([]);

  // Touch and wheel event handler for main photo container (blocking viewport zoom & reload)
  useEffect(() => {
    const container = mainContainerRef.current;
    if (!container) return;

    let ticking = false;

    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeEndX = 0;
    let swipeEndY = 0;

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        if (mainPhotoZoomRef.current <= 1) {
          swipeStartX = t.clientX;
          swipeStartY = t.clientY;
          swipeEndX = t.clientX;
          swipeEndY = t.clientY;
        } else {
          mainTouchStartRef.current = {
            x: t.clientX - mainPhotoOffsetRef.current.x,
            y: t.clientY - mainPhotoOffsetRef.current.y
          };
          mainIsDraggingRef.current = true;
        }
      } else if (e.touches.length === 2) {
        e.preventDefault();
        mainIsPinchingRef.current = true;
        mainPreventClickRef.current = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        mainInitialDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        mainInitialZoomRef.current = mainPhotoZoomRef.current;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        if (mainPhotoZoomRef.current <= 1) {
          swipeEndX = t.clientX;
          swipeEndY = t.clientY;
        } else if (mainIsDraggingRef.current) {
          e.preventDefault(); // Blocks browser scrolling and page pull-to-refresh
          const dx = t.clientX - mainTouchStartRef.current.x;
          const dy = t.clientY - mainTouchStartRef.current.y;
          mainPhotoOffsetRef.current = { x: dx, y: dy };
          mainPreventClickRef.current = true;
          
          if (!ticking) {
            window.requestAnimationFrame(() => {
              if (mainImageRef.current) {
                mainImageRef.current.style.transform = `translate(${mainPhotoOffsetRef.current.x}px, ${mainPhotoOffsetRef.current.y}px) scale(${mainPhotoZoomRef.current})`;
              }
              ticking = false;
            });
            ticking = true;
          }
        }
      } else if (e.touches.length === 2 && mainIsPinchingRef.current) {
        e.preventDefault(); // Blocks default browser zoom
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const factor = dist / (mainInitialDistRef.current || 1);
        const newZoom = Math.min(Math.max(mainInitialZoomRef.current * factor, 1), 5.5);
        mainPhotoZoomRef.current = newZoom;
        if (newZoom === 1) {
          mainPhotoOffsetRef.current = { x: 0, y: 0 };
        }
        
        if (!ticking) {
          window.requestAnimationFrame(() => {
            if (mainImageRef.current) {
              mainImageRef.current.style.transform = `translate(${mainPhotoOffsetRef.current.x}px, ${mainPhotoOffsetRef.current.y}px) scale(${mainPhotoZoomRef.current})`;
            }
            ticking = false;
          });
          ticking = true;
        }
      }
    };

    const handleTouchEnd = (e) => {
      mainIsDraggingRef.current = false;
      if (e.touches.length === 0) {
        mainIsPinchingRef.current = false;
        if (mainPhotoZoomRef.current > 1) {
          setMainPhotoZoom(mainPhotoZoomRef.current);
          setMainPhotoOffset(mainPhotoOffsetRef.current);
        }
      }
    };

    const handleWheel = (e) => {
      // If ctrlKey is true, it is trackpad pinch zoom
      if (e.ctrlKey) {
        e.preventDefault();
        mainPreventClickRef.current = true;
        const zoomFactor = -e.deltaY * 0.015;
        const newZoom = Math.min(Math.max(mainPhotoZoomRef.current + zoomFactor, 1), 5.5);
        mainPhotoZoomRef.current = newZoom;
        if (newZoom === 1) {
          mainPhotoOffsetRef.current = { x: 0, y: 0 };
        }
        setMainPhotoZoom(newZoom);
        if (newZoom === 1) {
          setMainPhotoOffset({ x: 0, y: 0 });
        }

        if (!ticking) {
          window.requestAnimationFrame(() => {
            if (mainImageRef.current) {
              mainImageRef.current.style.transform = `translate(${mainPhotoOffsetRef.current.x}px, ${mainPhotoOffsetRef.current.y}px) scale(${mainPhotoZoomRef.current})`;
            }
            ticking = false;
          });
          ticking = true;
        }
      } else if (mainPhotoZoomRef.current > 1) {
        // If zoomed in, mouse wheel/trackpad scroll pans the main image
        e.preventDefault();
        mainPreventClickRef.current = true;
        mainPhotoOffsetRef.current = {
          x: mainPhotoOffsetRef.current.x - e.deltaX,
          y: mainPhotoOffsetRef.current.y - e.deltaY
        };
        setMainPhotoOffset({ ...mainPhotoOffsetRef.current });

        if (!ticking) {
          window.requestAnimationFrame(() => {
            if (mainImageRef.current) {
              mainImageRef.current.style.transform = `translate(${mainPhotoOffsetRef.current.x}px, ${mainPhotoOffsetRef.current.y}px) scale(${mainPhotoZoomRef.current})`;
            }
            ticking = false;
          });
          ticking = true;
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [activeImageIdx]);

  // Auto-sync imageLoaded state if active image is already cached / completed
  useEffect(() => {
    if (mainImageRef.current && mainImageRef.current.complete) {
      setImageLoaded(true);
    }
  }, [activeImageIdx]);

  // Touch and wheel event handler for lightbox modal (blocking viewport zoom & reload)
  useEffect(() => {
    if (!isLightboxOpen) return;
    const container = lightboxModalRef.current;
    if (!container) return;

    let ticking = false;

    // Block ALL background scrolling & pull-to-refresh inside full-screen lightbox
    const handleGlobalTouchMove = (e) => {
      e.preventDefault();
    };

    const handleWheel = (e) => {
      e.preventDefault(); // Stop webpage from scrolling or zooming
      
      // Every wheel event (both trackpad pinch and normal mouse wheel scroll) zooms the image
      // Pinch zoom has ctrlKey = true (finer control), mouse wheel scroll has ctrlKey = false (larger/fixed steps)
      const zoomFactor = e.ctrlKey ? -e.deltaY * 0.015 : (e.deltaY < 0 ? 0.25 : -0.25);
      const newZoom = Math.min(Math.max(lightboxZoomRef.current + zoomFactor, 1), 4);
      lightboxZoomRef.current = newZoom;
      if (newZoom === 1) {
        lightboxOffsetRef.current = { x: 0, y: 0 };
      }
      setLightboxZoom(newZoom);
      if (newZoom === 1) {
        setLightboxOffset({ x: 0, y: 0 });
      }

      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (lightboxImageRef.current) {
            lightboxImageRef.current.style.transform = `translate(${lightboxOffsetRef.current.x}px, ${lightboxOffsetRef.current.y}px) scale(${lightboxZoomRef.current})`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        const startX = e.touches[0].clientX - lightboxOffsetRef.current.x;
        const startY = e.touches[0].clientY - lightboxOffsetRef.current.y;
        
        const handleTouchMove = (moveEvent) => {
          moveEvent.preventDefault();
          
          if (lightboxZoomRef.current > 1) {
            const dx = moveEvent.touches[0].clientX - startX;
            const dy = moveEvent.touches[0].clientY - startY;
            lightboxOffsetRef.current = { x: dx, y: dy };
            
            if (!ticking) {
              window.requestAnimationFrame(() => {
                if (lightboxImageRef.current) {
                  lightboxImageRef.current.style.transform = `translate(${lightboxOffsetRef.current.x}px, ${lightboxOffsetRef.current.y}px) scale(${lightboxZoomRef.current})`;
                }
                ticking = false;
              });
              ticking = true;
            }
          }
        };
        
        const handleTouchEnd = () => {
          window.removeEventListener('touchmove', handleTouchMove);
          window.removeEventListener('touchend', handleTouchEnd);
          setLightboxOffset(lightboxOffsetRef.current);
        };
        
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const initialDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const initialZoom = lightboxZoomRef.current;
        
        const handleTouchMovePinch = (moveEvent) => {
          moveEvent.preventDefault();
          if (moveEvent.touches.length === 2) {
            const mt1 = moveEvent.touches[0];
            const mt2 = moveEvent.touches[1];
            const currentDist = Math.hypot(mt1.clientX - mt2.clientX, mt1.clientY - mt2.clientY);
            const factor = currentDist / (initialDist || 1);
            const newZoom = Math.min(Math.max(initialZoom * factor, 1), 4);
            lightboxZoomRef.current = newZoom;
            if (newZoom === 1) {
              lightboxOffsetRef.current = { x: 0, y: 0 };
            }
            
            if (!ticking) {
              window.requestAnimationFrame(() => {
                if (lightboxImageRef.current) {
                  lightboxImageRef.current.style.transform = `translate(${lightboxOffsetRef.current.x}px, ${lightboxOffsetRef.current.y}px) scale(${lightboxZoomRef.current})`;
                }
                ticking = false;
              });
              ticking = true;
            }
          }
        };
        
        const handleTouchEndPinch = () => {
          window.removeEventListener('touchmove', handleTouchMovePinch);
          window.removeEventListener('touchend', handleTouchEndPinch);
          setLightboxZoom(lightboxZoomRef.current);
          setLightboxOffset(lightboxOffsetRef.current);
        };
        
        window.addEventListener('touchmove', handleTouchMovePinch, { passive: false });
        window.addEventListener('touchend', handleTouchEndPinch);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleGlobalTouchMove);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isLightboxOpen]);

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
      
      // Dispatch restock.requested webhook notification
      sendWebhookNotification('restock.requested', {
        email: notifyEmail.trim(),
        productId: product.$id || product.id,
        productName: product.name,
        size: size
      });
      
      setNotifyEmail('');
    } catch (err) {
      console.error("Restock log failure:", err);
      setNotifyError(err.message || 'Registration failed. Try again.');
      setNotifyStatus('idle');
    }
  };

  const [reviews, setReviews] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(10);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [newReviewTitle, setNewReviewTitle] = useState('');
  const [newReviewImages, setNewReviewImages] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasDeliveredOrder, setHasDeliveredOrder] = useState(false);
  const [checkingOrder, setCheckingOrder] = useState(true);

  const [newFit, setNewFit] = useState('true');
  const [newComfort, setNewComfort] = useState(5);
  const [newQuality, setNewQuality] = useState(5);
  const [newBreathable, setNewBreathable] = useState(5);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [sizeAdvisorOpen, setSizeAdvisorOpen] = useState(false);
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
  const [sizeUnit, setSizeUnit] = useState('IN'); // 'IN' | 'CM'
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

  // Reset and prefill restock notification form when size or product changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifyStatus('idle');
      setNotifyError('');
      if (isAuthenticated && user && user.email) {
        setNotifyEmail(user.email);
      } else {
        setNotifyEmail('');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedSize, id, isAuthenticated, user]);

  const calculateRecommendation = () => {
    const h = Number(advHeight) / 100;
    const w = Number(advWeight);
    if (!h || !w) return;
    const bmi = w / (h * h);
    setAdvBmi(bmi.toFixed(1));
    const recSize = bmi < 19 ? 'S' : bmi < 23 ? 'M' : bmi < 27 ? 'L' : 'XL';
    setAdvRecommendation(recSize);
  };
  

  const [descExpanded, setDescExpanded] = useState(true);
  const [shippingExpanded, setShippingExpanded] = useState(false);

  const [pincodeInput, setPincodeInput] = useState(() => localStorage.getItem('checked_pincode') || '');
  const [pinChecking, setPinChecking] = useState(false);
  const [pinResult, setPinResult] = useState(null);
  const [pinError, setPinError] = useState('');

  const performPincodeCheck = useCallback(async (pin) => {
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setPinError('Please enter a valid 6-digit Indian pincode.');
      setPinResult(null);
      return;
    }
    setPinChecking(true);
    setPinError('');
    setPinResult(null);
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await response.json();
      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const po = data[0].PostOffice[0];
        const details = calculateDeliveryDetails(pin, po.State);
        const isCodAllowed = isCodAvailableForPincode(pin, po.State);
        setPinResult({
          pincode: pin,
          location: `${po.District}, ${po.State}`,
          days: details.days,
          dateRange: details.dateRange,
          desc: details.desc,
          carrier: details.carrier,
          codAvailable: isCodAllowed,
          status: 'success'
        });
        localStorage.setItem('checked_pincode', pin);
      } else {
        const details = calculateDeliveryDetails(pin);
        const isCodAllowed = isCodAvailableForPincode(pin);
        setPinResult({
          pincode: pin,
          location: 'Nationwide Delivery Route',
          days: details.days,
          dateRange: details.dateRange,
          desc: `${details.desc} (Pincode verified via offline check)`,
          carrier: details.carrier,
          codAvailable: isCodAllowed,
          status: 'warning'
        });
        localStorage.setItem('checked_pincode', pin);
      }
    } catch (err) {
      console.warn("Pincode API down, using offline verification:", err);
      const details = calculateDeliveryDetails(pin);
      const isCodAllowed = isCodAvailableForPincode(pin);
      setPinResult({
        pincode: pin,
        location: 'Nationwide Delivery Route',
        days: details.days,
        dateRange: details.dateRange,
        desc: `${details.desc} (Pincode verified offline)`,
        carrier: details.carrier,
        codAvailable: isCodAllowed,
        status: 'warning'
      });
      localStorage.setItem('checked_pincode', pin);
    } finally {
      setPinChecking(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('checked_pincode');
    if (stored && /^[1-9][0-9]{5}$/.test(stored)) {
      const timer = setTimeout(() => {
        performPincodeCheck(stored);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [performPincodeCheck]);

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

       const cachedProduct = products.find(p => p.slug === idOrSlug || p.$id === idOrSlug || p.id === idOrSlug);
       if (cachedProduct) {
         const isProductLive = cachedProduct.is_live === true || cachedProduct.is_live === 'true' || cachedProduct.is_live === 1 || cachedProduct.is_live === '1';
         if (!adminMode && !isProductLive) {
           if (isMounted) {
             showToast("Requested drop sequence untraceable inside active servers.", "error");
             navigate('/');
           }
           return;
         }
         if (isMounted) {
           setProduct(cachedProduct);
           const isSameProduct = product && (product.$id === cachedProduct.$id || product.id === cachedProduct.id);
           if (!isSameProduct) {
             setActiveImageIdx(0);
             
             let stockMap = {};
             try {
               stockMap = JSON.parse(cachedProduct.sizes_stock || '{}');
             } catch {
               stockMap = {};
             }
             const unionSizes = Array.from(new Set([
               ...(cachedProduct.sizes || []),
               ...Object.keys(stockMap)
             ])).filter(sz => ['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(sz));

             const firstInStockSize = unionSizes.find(sz => stockMap[sz] > 0);
             setSelectedSize(firstInStockSize || unionSizes[0] || '');

             setSelectedColor(cachedProduct.color_name || '');
             setActiveVariant(null);
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

       const mainProductData = await productsService.getProductBySlugOrId(idOrSlug);

       if (mainProductData && isMounted) {
         const isProductLive = mainProductData.is_live === true || mainProductData.is_live === 'true' || mainProductData.is_live === 1 || mainProductData.is_live === '1';
         if (!adminMode && !isProductLive) {
           showToast("Requested drop sequence untraceable inside active servers.", "error");
           navigate('/');
           return;
         }
         setProduct(mainProductData);
         const isSameProduct = product && (product.$id === mainProductData.$id || product.id === mainProductData.id);
         if (!isSameProduct) {
           setActiveImageIdx(0);
           
           let stockMap = {};
           try {
             stockMap = JSON.parse(mainProductData.sizes_stock || '{}');
           } catch {
             stockMap = {};
           }
           const unionSizes = Array.from(new Set([
             ...(mainProductData.sizes || []),
             ...Object.keys(stockMap)
           ])).filter(sz => ['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(sz));

           const firstInStockSize = unionSizes.find(sz => stockMap[sz] > 0);
           setSelectedSize(firstInStockSize || unionSizes[0] || '');

          setSelectedColor(mainProductData.color_name || '');
          setActiveVariant(null);
         }

          const mainCategory = mainProductData.category || "";
          const filteredSuggestions = products.filter(
            item => mainCategory && item.category === mainCategory && (item.$id || item.id) !== (mainProductData.$id || mainProductData.id)
          );
          
          setSuggestProduct(filteredSuggestions);
       }
     } catch (error) {
       console.error("Failed to execute data pipeline matrix updates from Firebase:", error);
       if (isMounted) {
         showToast("Requested drop sequence untraceable inside active servers.", "error");
         navigate('/');
       }
     } finally {
       if (isMounted) setLoading(false);
     }
   }

   if (idOrSlug) {
     loadCompleteProductStage();
   }
   return () => {
     isMounted = false;
   };
  }, [idOrSlug, products, navigate, showToast, colorParam]);

  useEffect(() => {
    if (product && product.color_group_id && products.length > 0) {
      const siblings = products.filter(
        p => p.color_group_id === product.color_group_id
      );
      const timer = setTimeout(() => {
        setGroupProducts(siblings);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setGroupProducts([]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [product, products]);

  useEffect(() => {
    if (!product) return;
    const rawImgs = [
      product.front_image_link || product.image_url || product.image,
      ...(Array.isArray(product.back_image_links) ? product.back_image_links : product.back_image_link ? [product.back_image_link] : [])
    ].filter(Boolean);
    rawImgs.forEach((imgUrl, idx) => {
      preloadImage(getOptimizedImageUrl(imgUrl, 1000, 80), idx === 0);
    });
  }, [product]);

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

  // Recently Viewed logging on product load
  useEffect(() => {
    if (product) {
      const productId = product.$id || product.id;
      if (productId) {
        let viewed;
        try {
          const saved = localStorage.getItem('recently_viewed');
          viewed = saved ? JSON.parse(saved) : [];
        } catch {
          viewed = [];
        }
        viewed = viewed.filter(vId => vId !== productId);
        viewed.unshift(productId);
        viewed = viewed.slice(0, 8); // Track top 8 products
        localStorage.setItem('recently_viewed', JSON.stringify(viewed));
      }
    }
  }, [product]);

  // Handle auto-checkout from pending guest Buy Now post-login
  useEffect(() => {
    if (isAuthenticated && user && product) {
      const pendingStr = sessionStorage.getItem('buy_now_pending');
      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr);
          const currentId = product.$id || product.id;
          if (pending && pending.productId === currentId) {
            sessionStorage.removeItem('buy_now_pending');
            setTimeout(() => {
              if (pending.size) setSelectedSize(pending.size);
              if (pending.color) setSelectedColor(pending.color);
            }, 0);
            
            const targetProductId = currentId;
            const baseSizeVal = pending.size || 'M';
            let targetSize = baseSizeVal;
            if (pending.color) {
              targetSize = `${baseSizeVal} / ${pending.color.toUpperCase()}`;
            }

            const executePendingBuyNow = async () => {
              try {
                const existingCartItem = cartItems.find(
                  item => item.product_id === targetProductId && item.size === targetSize
                );
                
                const pendingQty = Number(pending.quantity) || 1;

                let response;
                if (existingCartItem) {
                  response = await cartService.addToCart({
                    name: product.name,
                    size: targetSize,
                    price: product.price,
                    product_id: targetProductId,
                    product_Image: product.front_image_link || product.image_url || product.image,
                    userId: user.$id,
                    existingCartItem,
                    quantity: pendingQty
                  });
                } else {
                  response = await cartService.addToCart({
                    name: product.name,
                    size: targetSize,
                    price: product.price,
                    product_id: targetProductId,
                    product_Image: product.front_image_link || product.image_url || product.image,
                    userId: user.$id,
                    existingCartItem: null,
                    quantity: pendingQty
                  });
                  if (response) {
                    dispatch(addCartItemState(response));
                  }
                }

                if (response?.$id) {
                  sessionStorage.setItem('selected_cart_item_ids', JSON.stringify([response.$id]));
                  navigate('/checkout');
                }
              } catch (e) {
                console.error("Failed to execute pending Buy Now:", e);
              }
            };
            
            executePendingBuyNow();
          }
        } catch (e) {
          console.warn("Could not process pending Buy Now:", e);
        }
      }
    }
  }, [isAuthenticated, user, product, cartItems, dispatch, navigate]);

  const handleBuyNow = async () => {
    if (!product) return;
    
    if (!isAuthenticated || !user) {
      sessionStorage.setItem('buy_now_pending', JSON.stringify({
        productId: product.$id || product.id,
        size: selectedSize || product.sizes?.[0] || 'M',
        color: selectedColor || '',
        quantity: quantity
      }));
      showToast("Please sign in to complete your checkout.", "info");
      navigate('/login', { state: { from: location } });
      return;
    }

    const baseSizeVal = selectedSize || product.sizes?.[0] || 'M';
    let targetSize = baseSizeVal;
    if (selectedColor) {
      targetSize = `${baseSizeVal} / ${selectedColor.toUpperCase()}`;
    }
    
    try {
      const targetProductId = product.$id || product.id;
      
      const existingCartItem = cartItems.find(
        item => item.product_id === targetProductId && item.size === targetSize
      );

      let response;
      if (existingCartItem) {
        response = await cartService.addToCart({
          name: product.name,
          size: targetSize,
          price: product.price,
          product_id: targetProductId,
          product_Image: product.front_image_link || product.image_url || product.image,
          userId: user.$id,
          existingCartItem,
          quantity: quantity
        });
      } else {
        response = await cartService.addToCart({
          name: product.name,
          size: targetSize,
          price: product.price,
          product_id: targetProductId,
          product_Image: product.front_image_link || product.image_url || product.image,
          userId: user.$id,
          existingCartItem: null,
          quantity: quantity
        });
        
        if (response) {
          dispatch(addCartItemState(response));
        }
      }

      if (response?.$id) {
        sessionStorage.setItem('selected_cart_item_ids', JSON.stringify([response.$id]));
        navigate('/checkout');
      }
    } catch (error) {
      console.error("Buy now failure:", error);
      showToast(error.message || "Failed to process Buy Now.", "error");
    }
  };

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
      showToast("Please write a review comment.", "error");
      return;
    }

    const imageLinks = newReviewImages.split(',')
      .map(url => url.trim())
      .filter(url => url.startsWith('http://') || url.startsWith('https://'));

    setSubmittingReview(true);
    try {
      const newDoc = await reviewsService.createReview({
        productId: id,
        userId: user.$id,
        userName: user.name || 'Anonymous',
        rating: String(newRating),
        comment: newComment,
        title: newReviewTitle,
        images: imageLinks,
        is_verified_purchase: hasDeliveredOrder,
        fit: '',
        comfort: 0,
        quality: 0,
        breathable: 0
      });

      if (newDoc) {
        setReviews(prev => [newDoc, ...prev]);
        setNewComment('');
        setNewRating(5);
        setNewReviewTitle('');
        setNewReviewImages('');
        showToast("Review submitted successfully.", "success");
      }
    } catch (err) {
      console.error("Failed to submit review:", err);
      showToast("Failed to submit review. Connection timed out.", "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleImageUpload = async (e, setImagesValue, currentImages) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const compressedFile = await compressImage(file, 800, 800, 0.7);

      const response = await storageService.uploadFile(compressedFile);
      if (response?.$id) {
        const fileUrl = storageService.getFileView(response.$id);
        const newUrlList = currentImages.trim() 
          ? `${currentImages.trim()}, ${fileUrl}` 
          : fileUrl;
        setImagesValue(newUrlList);
        showToast("✓ Image uploaded successfully to Firebase Storage!", "success");
      } else {
        throw new Error("Failed to upload image file");
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      showToast("Firebase Storage upload failed. Ensure bucket ID 'images' exists, or paste a URL.", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const backImagesList = Array.isArray(product?.back_image_links)
    ? product.back_image_links
    : product?.back_image_link
    ? [product.back_image_link]
    : [];

  const rawGalleryImages = activeVariant
    ? [activeVariant.front, activeVariant.back].filter(Boolean)
    : [
        product?.front_image_link || product?.image_url || product?.image,
        ...backImagesList
      ].filter(Boolean);

  const galleryImages = Array.from(new Set(rawGalleryImages));

  // Background preload all product gallery images into browser RAM cache for 0ms instant lightbox switching
  useEffect(() => {
    galleryImagesRef.current = galleryImages;
    if (galleryImages && galleryImages.length > 0) {
      galleryImages.forEach(imgUrl => {
        if (imgUrl) {
          const img = new Image();
          img.src = getOptimizedImageUrl(imgUrl, 1200, 80);
        }
      });
    }
  }, [galleryImages]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans pb-20 select-none">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
          {/* Top Header Bar: Back to Shop + Breadcrumb */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200/80 pb-4">
            <div className="w-32 h-5 skeleton rounded-none" />
            <div className="w-64 h-5 skeleton rounded-none" />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Desktop 2-Column Product Image Grid Skeleton */}
            <div className="hidden lg:grid grid-cols-2 gap-3.5 lg:col-span-7 items-start">
              <div className="aspect-3/4 w-full skeleton rounded-none border border-neutral-200/80" />
              <div className="aspect-3/4 w-full skeleton rounded-none border border-neutral-200/80" />
              <div className="aspect-3/4 w-full skeleton rounded-none border border-neutral-200/80" />
              <div className="aspect-3/4 w-full skeleton rounded-none border border-neutral-200/80" />
            </div>

            {/* Mobile Single Photo Skeleton */}
            <div className="lg:hidden col-span-1">
              <div className="w-full aspect-3/4 skeleton rounded-none border border-neutral-200/80" />
            </div>

            {/* Right Column: Product Detail Form Skeleton */}
            <div className="lg:col-span-5 space-y-6">
              {/* Badges & Title */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="w-28 h-6 skeleton rounded-none" />
                  <div className="w-20 h-6 skeleton rounded-none" />
                </div>
                <div className="w-4/5 h-9 skeleton rounded-none" />
                <div className="w-40 h-5 skeleton rounded-none" />
                <div className="w-32 h-7 skeleton rounded-none" />
              </div>

              {/* Share buttons line */}
              <div className="flex items-center gap-3 pt-1">
                <div className="w-24 h-5 skeleton rounded-none" />
                <div className="w-24 h-8 skeleton rounded-none" />
                <div className="w-36 h-8 skeleton rounded-none" />
              </div>

              <div className="h-[1px] bg-neutral-200/80 w-full" />

              {/* Color Section */}
              <div className="space-y-2">
                <div className="w-28 h-4 skeleton rounded-none" />
                <div className="w-14 h-14 skeleton rounded-none" />
              </div>

              {/* Size Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="w-24 h-4 skeleton rounded-none" />
                  <div className="w-20 h-4 skeleton rounded-none" />
                </div>
                <div className="flex gap-2">
                  <div className="w-14 h-12 skeleton rounded-none" />
                  <div className="w-14 h-12 skeleton rounded-none" />
                  <div className="w-14 h-12 skeleton rounded-none" />
                  <div className="w-14 h-12 skeleton rounded-none" />
                  <div className="w-14 h-12 skeleton rounded-none" />
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3 pt-2">
                <div className="w-full h-12 skeleton rounded-none" />
                <div className="w-full h-12 skeleton rounded-none" />
              </div>

              {/* Description Accordion */}
              <div className="pt-4 border-t border-neutral-200/80">
                <div className="w-full h-12 skeleton rounded-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans">
        <div className="flex flex-col items-center justify-center gap-6 py-32 text-center">
          <p className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-mono font-bold">
            Requested drop not found.
          </p>
          <Link to="/" className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-text)] border-b border-[var(--color-text)] pb-0.5 hover:text-[var(--color-muted)] transition-colors">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }
  const fitStats = (() => {
    let fitTightCount = 0;
    let fitTrueCount = 0;
    let fitLooseCount = 0;
    let comfortSum = 0;
    let qualitySum = 0;
    let breathableSum = 0;
    let comfortCount = 0;
    let qualityCount = 0;
    let breathableCount = 0;

    reviews.forEach(r => {
      let fitVal = '';
      let comVal = 0;
      let qualVal = 0;
      let breathVal = 0;

      try {
        const parsed = JSON.parse(r.comment);
        if (parsed && typeof parsed === 'object') {
          fitVal = parsed.fit || '';
          comVal = Number(parsed.comfort);
          qualVal = Number(parsed.quality);
          breathVal = Number(parsed.breathable);
        }
      } catch {
        // ignore legacy structure
      }

      if (fitVal === 'tight') fitTightCount++;
      else if (fitVal === 'loose') fitLooseCount++;
      else if (fitVal === 'true') fitTrueCount++;

      if (comVal > 0 && !isNaN(comVal)) {
        comfortSum += comVal;
        comfortCount++;
      }
      if (qualVal > 0 && !isNaN(qualVal)) {
        qualitySum += qualVal;
        qualityCount++;
      }
      if (breathVal > 0 && !isNaN(breathVal)) {
        breathableSum += breathVal;
        breathableCount++;
      }
    });

    const totalFitCount = fitTightCount + fitTrueCount + fitLooseCount;
    const fitTightPercent = totalFitCount > 0 ? Math.round((fitTightCount / totalFitCount) * 100) : 8;
    const fitTruePercent = totalFitCount > 0 ? Math.round((fitTrueCount / totalFitCount) * 100) : 82;
    const fitLoosePercent = totalFitCount > 0 ? Math.round((fitLooseCount / totalFitCount) * 100) : 10;
    const verifiedFitPercent = totalFitCount > 0 
      ? Math.round(((fitTrueCount + (totalFitCount - fitTrueCount) * 0.6) / totalFitCount) * 100)
      : 94;

    const avgComfort = comfortCount > 0 ? (comfortSum / comfortCount).toFixed(1) : '4.8';
    const avgQuality = qualityCount > 0 ? (qualitySum / qualityCount).toFixed(1) : '4.9';
    const avgBreathable = breathableCount > 0 ? (breathableSum / breathableCount).toFixed(1) : '4.7';

    return {
      fitTightPercent,
      fitTruePercent,
      fitLoosePercent,
      verifiedFitPercent,
      avgComfort,
      avgQuality,
      avgBreathable
    };
  })();

  let stocks = {};
  try {
    stocks = JSON.parse(product?.sizes_stock || '{}');
  } catch {
    stocks = {};
  }

  const displaySizes = (() => {
    if (!product) return [];
    const union = new Set([
      ...(product.sizes || []),
      ...Object.keys(stocks)
    ]);
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    return sizeOrder.filter(size => union.has(size));
  })();

  let isAllOutOfStock = false;
  if (displaySizes.length > 0) {
    const totalStock = displaySizes.reduce((acc, size) => acc + (stocks[size] !== undefined ? Number(stocks[size]) : 0), 0);
    isAllOutOfStock = totalStock === 0;
  }

  const activeImageIndex = activeImageIdx < galleryImages.length ? activeImageIdx : 0;
  const activeImage = galleryImages[activeImageIndex] || '';

  const handleLightboxNext = () => {
    if (galleryImages.length <= 1) return;
    setImageLoaded(false);
    setLightboxImageLoaded(false);
    setActiveImageIdx((prevIdx) => (prevIdx + 1) % galleryImages.length);
    setLightboxZoom(1);
    setLightboxOffset({ x: 0, y: 0 });
    setMainPhotoZoom(1);
    setMainPhotoOffset({ x: 0, y: 0 });
    
    mainPhotoZoomRef.current = 1;
    mainPhotoOffsetRef.current = { x: 0, y: 0 };
    lightboxZoomRef.current = 1;
    lightboxOffsetRef.current = { x: 0, y: 0 };
    
    if (mainImageRef.current) {
      mainImageRef.current.style.transform = 'translate(0px, 0px) scale(1)';
    }
    if (lightboxImageRef.current) {
      lightboxImageRef.current.style.transform = 'translate(0px, 0px) scale(1)';
    }
  };

  const handleLightboxPrev = () => {
    if (galleryImages.length <= 1) return;
    setImageLoaded(false);
    setLightboxImageLoaded(false);
    setActiveImageIdx((prevIdx) => (prevIdx - 1 + galleryImages.length) % galleryImages.length);
    setLightboxZoom(1);
    setLightboxOffset({ x: 0, y: 0 });
    setMainPhotoZoom(1);
    setMainPhotoOffset({ x: 0, y: 0 });
    
    mainPhotoZoomRef.current = 1;
    mainPhotoOffsetRef.current = { x: 0, y: 0 };
    lightboxZoomRef.current = 1;
    lightboxOffsetRef.current = { x: 0, y: 0 };
    
    if (mainImageRef.current) {
      mainImageRef.current.style.transform = 'translate(0px, 0px) scale(1)';
    }
    if (lightboxImageRef.current) {
      lightboxImageRef.current.style.transform = 'translate(0px, 0px) scale(1)';
    }
  };

  // Image Component with Smooth Surface Placeholder
  const ImageWithSkeleton = ({ src, alt, className = "", loading = "lazy", onClick }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
      <div
        onClick={onClick}
        className={`relative overflow-hidden bg-[var(--color-surface)] border border-neutral-200/80 aspect-3/4 rounded-none cursor-default group transition-all duration-300 hover:border-neutral-900 ${className}`}
      >
        {/* Subtle Surface Loading Pulse */}
        {!isLoaded && (
          <div className="absolute inset-0 z-10 skeleton flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-neutral-300 border-t-neutral-800 animate-spin opacity-40" />
          </div>
        )}

        <img
          src={src}
          alt={alt}
          loading={loading}
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
          className={`w-full h-full object-cover object-center transition-opacity duration-300 ease-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    );
  };

  // 100% Full Markdown & GFM Parser Component
  const RenderMarkdown = ({ content }) => {
    if (!content) return null;

    const rawText = String(content);

    // Helper to parse inline markdown (bold, italic, strikethrough, inline code, links, images)
    const parseInlineMarkdown = (text) => {
      if (!text) return null;

      const regex = /(!\[.*?\]\(.*?\)|\[.*?\]\(.*?\)|`[^`]+`|\*\*.*?\*\*|__.*?__|~~.*?~~|\*.*?\*|_.*?_)/g;
      const parts = text.split(regex);

      return parts.map((part, index) => {
        if (!part) return null;

        // Image: ![alt](url)
        if (part.startsWith('![') && part.includes('](') && part.endsWith(')')) {
          const alt = part.slice(2, part.indexOf(']('));
          const url = part.slice(part.indexOf('](') + 2, -1);
          return (
            <img
              key={index}
              src={url}
              alt={alt}
              className="max-w-full h-auto rounded-lg my-2 border border-zinc-200 shadow-xs block"
            />
          );
        }

        // Link: [text](url)
        if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
          const linkText = part.slice(1, part.indexOf(']('));
          const rawUrl = part.slice(part.indexOf('](') + 2, -1).trim();
          const isSafeUrl = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(rawUrl);
          const safeUrl = isSafeUrl ? rawUrl : '#';
          return (
            <a
              key={index}
              href={safeUrl}
              target={safeUrl.startsWith('http') ? "_blank" : undefined}
              rel={safeUrl.startsWith('http') ? "noopener noreferrer" : undefined}
              className="text-[#059669] font-bold underline hover:text-[#047857] transition-colors"
            >
              {linkText}
            </a>
          );
        }

        // Inline Code: `code`
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code key={index} className="bg-zinc-100 text-zinc-900 px-1.5 py-0.5 rounded font-mono text-[11px] border border-zinc-200 font-bold">
              {part.slice(1, -1)}
            </code>
          );
        }

        // Bold: **text** or __text__
        if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
          return <strong key={index} className="font-extrabold text-[var(--color-text)]">{part.slice(2, -2)}</strong>;
        }

        // Strikethrough: ~~text~~
        if (part.startsWith('~~') && part.endsWith('~~')) {
          return <del key={index} className="line-through text-zinc-400">{part.slice(2, -2)}</del>;
        }

        // Italic: *text* or _text_
        if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
          return <em key={index} className="italic text-zinc-800">{part.slice(1, -1)}</em>;
        }

        return part;
      });
    };

    const lines = rawText.split(/\r?\n/);
    const elements = [];

    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockLines = [];

    let currentList = [];
    let currentListType = null; // 'ul' | 'ol' | 'task'

    const flushList = () => {
      if (currentList.length > 0) {
        const listKey = `list-${elements.length}`;
        if (currentListType === 'task') {
          elements.push(
            <ul key={listKey} className="space-y-1.5 my-2 pl-1 font-medium text-[var(--color-text)]">
              {currentList.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    readOnly
                    className="w-3.5 h-3.5 rounded border-zinc-300 accent-[#059669] cursor-pointer"
                  />
                  <span className={item.checked ? 'line-through text-zinc-400' : ''}>
                    {parseInlineMarkdown(item.text)}
                  </span>
                </li>
              ))}
            </ul>
          );
        } else if (currentListType === 'ul') {
          elements.push(
            <ul key={listKey} className="list-disc list-inside space-y-1 my-2 pl-1 font-medium text-[var(--color-text)]">
              {currentList.map((item, i) => (
                <li key={i}>{parseInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
        } else if (currentListType === 'ol') {
          elements.push(
            <ol key={listKey} className="list-decimal list-inside space-y-1 my-2 pl-1 font-medium text-[var(--color-text)]">
              {currentList.map((item, i) => (
                <li key={i}>{parseInlineMarkdown(item)}</li>
              ))}
            </ol>
          );
        }
        currentList = [];
        currentListType = null;
      }
    };

    lines.forEach((line, idx) => {
      // 1. Code block handling: ```javascript or ```
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          elements.push(
            <div key={`code-${idx}`} className="my-3 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 text-emerald-400 font-mono text-xs">
              {codeBlockLang && (
                <div className="bg-zinc-900 text-zinc-400 px-3 py-1 text-[10px] uppercase font-bold tracking-wider border-b border-zinc-800">
                  {codeBlockLang}
                </div>
              )}
              <pre className="p-3.5 overflow-x-auto leading-relaxed">
                <code>{codeBlockLines.join('\n')}</code>
              </pre>
            </div>
          );
          inCodeBlock = false;
          codeBlockLang = '';
          codeBlockLines = [];
        } else {
          // Start of code block
          flushList();
          inCodeBlock = true;
          codeBlockLang = line.trim().slice(3).trim();
          codeBlockLines = [];
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        return;
      }

      const trimmed = line.trim();

      // 2. Empty line
      if (!trimmed) {
        flushList();
        return;
      }

      // 3. Horizontal Rule: --- or *** or ___
      if (/^([*_-]\s*){3,}$/.test(trimmed)) {
        flushList();
        elements.push(<hr key={`hr-${idx}`} className="my-4 border-t border-zinc-200 dark:border-zinc-800" />);
        return;
      }

      // 4. Headings H1 to H6
      if (/^#{1,6}\s+/.test(trimmed)) {
        flushList();
        const level = trimmed.match(/^#{1,6}/)[0].length;
        const text = trimmed.replace(/^#{1,6}\s+/, '');
        const inline = parseInlineMarkdown(text);

        if (level === 1) {
          elements.push(<h1 key={`h1-${idx}`} className="text-base md:text-lg font-mono font-black uppercase tracking-wider text-[var(--color-text)] mt-4 mb-2 border-b pb-1 border-zinc-200">{inline}</h1>);
        } else if (level === 2) {
          elements.push(<h2 key={`h2-${idx}`} className="text-sm md:text-base font-mono font-black uppercase tracking-wider text-[var(--color-text)] mt-3.5 mb-1.5">{inline}</h2>);
        } else if (level === 3) {
          elements.push(<h3 key={`h3-${idx}`} className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text)] mt-3 mb-1">{inline}</h3>);
        } else {
          elements.push(<h4 key={`h4-${idx}`} className="text-xs font-mono font-bold uppercase tracking-wide text-[var(--color-text)] mt-2.5 mb-1">{inline}</h4>);
        }
        return;
      }

      // 5. Task List: - [x] task or - [ ] task
      if (/^[-*•]\s+\[([ xX])\]\s+/.test(trimmed)) {
        const match = trimmed.match(/^[-*•]\s+\[([ xX])\]\s+(.+)/);
        if (match) {
          if (currentListType && currentListType !== 'task') flushList();
          currentListType = 'task';
          const isChecked = match[1].toLowerCase() === 'x';
          currentList.push({ checked: isChecked, text: match[2] });
          return;
        }
      }

      // 6. Unordered List Bullet: - Item or * Item or • Item
      if (/^[-*•]\s+/.test(trimmed)) {
        if (currentListType && currentListType !== 'ul') flushList();
        currentListType = 'ul';
        currentList.push(trimmed.replace(/^[-*•]\s+/, ''));
        return;
      }

      // 7. Ordered List: 1. Item
      if (/^\d+\.\s+/.test(trimmed)) {
        if (currentListType && currentListType !== 'ol') flushList();
        currentListType = 'ol';
        currentList.push(trimmed.replace(/^\d+\.\s+/, ''));
        return;
      }

      // 8. Regular paragraph
      flushList();
      elements.push(
        <p key={`p-${idx}`} className="leading-relaxed text-[var(--color-muted)] my-1 font-medium">
          {parseInlineMarkdown(trimmed)}
        </p>
      );
    });

    flushList();

    return <div className="space-y-1 text-xs font-mono">{elements}</div>;
  };

  const rawDescription = product?.description || "";
  const returnPolicyMatch = rawDescription.match(/\[RETURN_POLICY\]:\s*(.+)/);
  const returnPolicy = product?.return_policy || (returnPolicyMatch ? returnPolicyMatch[1].trim() : "7 Day Return");
  const sizeChartMatch = rawDescription.match(/\[SIZE_CHART\]:\s*(.+)/);
  const customSizeChartImage = product?.size_chart_image || product?.size_chart || (sizeChartMatch ? sizeChartMatch[1].trim() : "");
  const displayDescription = rawDescription
    .replace(/\[RETURN_POLICY\]:\s*(.+)/, "")
    .replace(/\[SIZE_CHART\]:\s*(.+)/, "")
    .trim();

  return (
    <>
      <div className="w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans pb-20">

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-10 space-y-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors uppercase group">
            <FiArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
            Back to Shop
          </Link>
          <div className="text-[11px] text-[var(--color-muted)] flex items-center gap-2 uppercase tracking-wide overflow-x-auto scrollbar-none w-full sm:w-auto whitespace-nowrap">
            <Link to="/shop" className="hover:text-[var(--color-accent)] transition-colors font-bold shrink-0">Shop</Link>
            <span className="shrink-0">/</span>
            {product.category && (
              <>
                <Link to={`/category/${product.category}`} className="hover:text-[var(--color-accent)] transition-colors font-bold shrink-0">
                  {product.category.replace(/-/g, ' ')}
                </Link>
                <span className="shrink-0">/</span>
              </>
            )}
            <span className="text-[var(--color-text)] font-semibold truncate shrink-0 max-w-[150px] sm:max-w-xs" title={product.name}>
              {product.name}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Desktop 2-Column Product Image Grid Gallery (Matching Luxury E-Commerce Layout with Skeletons) */}
          <div className="hidden lg:grid grid-cols-2 gap-3.5 lg:col-span-7 items-start">
            {galleryImages.map((imgUrl, idx) => (
              <ImageWithSkeleton
                key={idx}
                src={imgUrl}
                alt={`${product.name} view ${idx + 1}`}
                loading={idx < 2 ? "eager" : "lazy"}
                onClick={() => {
                  setActiveImageIdx(idx);
                  setIsLightboxOpen(true);
                  setLightboxZoom(1);
                  setLightboxOffset({ x: 0, y: 0 });
                }}
              />
            ))}
          </div>

          {/* Mobile & Tablet Product Image Gallery Viewer */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:hidden col-span-1">

             {galleryImages.length > 1 && (
              <div className="md:col-span-2 order-2 md:order-1 flex md:flex-col gap-3 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
                {galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (activeImageIdx !== idx) {
                        setImageLoaded(false);
                        setActiveImageIdx(idx);
                      } else {
                        setImageLoaded(true);
                      }
                      mainPhotoZoomRef.current = 1;
                      mainPhotoOffsetRef.current = { x: 0, y: 0 };
                      setMainPhotoZoom(1);
                      setMainPhotoOffset({ x: 0, y: 0 });
                      if (mainImageRef.current) {
                        mainImageRef.current.style.transform = 'translate(0px, 0px) scale(1)';
                      }
                    }}
                    className={`w-14 h-18 md:w-full md:aspect-3/4 rounded-none overflow-hidden bg-neutral-100 border shrink-0 transition-all duration-300 ${activeImageIndex === idx ? 'border-neutral-950 scale-95 shadow-sm' : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'}`}
                  >
                    <img src={getOptimizedImageUrl(imgUrl, 160, 75)} alt="Garment view" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div
              ref={mainContainerRef}
              onMouseDown={(e) => {
                if (e.button !== 0) return; // Only left click
                if (mainPhotoZoomRef.current <= 1) return; // Only drag when zoomed
                e.preventDefault();
                mainIsDraggingRef.current = true;
                const startX = e.clientX - mainPhotoOffsetRef.current.x;
                const startY = e.clientY - mainPhotoOffsetRef.current.y;
                
                const handleMouseMoveDrag = (moveEvent) => {
                  mainPreventClickRef.current = true;
                  const dx = moveEvent.clientX - startX;
                  const dy = moveEvent.clientY - startY;
                  mainPhotoOffsetRef.current = { x: dx, y: dy };
                  if (mainImageRef.current) {
                    mainImageRef.current.style.transform = `translate(${dx}px, ${dy}px) scale(${mainPhotoZoomRef.current})`;
                  }
                };
                
                const handleMouseUpDrag = () => {
                  mainIsDraggingRef.current = false;
                  window.removeEventListener('mousemove', handleMouseMoveDrag);
                  window.removeEventListener('mouseup', handleMouseUpDrag);
                  setMainPhotoOffset(mainPhotoOffsetRef.current);
                };
                
                window.addEventListener('mousemove', handleMouseMoveDrag);
                window.addEventListener('mouseup', handleMouseUpDrag);
              }}
              onTouchStart={(e) => {
                if (e.target.closest('button')) return;
                touchStartRef.current = {
                  x: e.touches[0].clientX,
                  y: e.touches[0].clientY,
                  time: Date.now()
                };
              }}
              onTouchEnd={(e) => {
                if (e.target.closest('button')) return;
                if (!touchStartRef.current) return;
                const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
                const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
                const dt = Date.now() - touchStartRef.current.time;
                touchStartRef.current = null;
                
                // Swipe detection
                if (Math.abs(dx) > 30 && Math.abs(dy) < 60 && dt < 400) {
                  e.preventDefault();
                  if (dx < 0) {
                    // Swipe Left: Next Image
                    handleLightboxNext();
                  } else {
                    // Swipe Right: Prev Image
                    handleLightboxPrev();
                  }
                } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 250) {
                  // Fast Tap on image container: Open Lightbox instantly
                  e.preventDefault();
                  mainPhotoZoomRef.current = 1;
                  mainPhotoOffsetRef.current = { x: 0, y: 0 };
                  setMainPhotoZoom(1);
                  setMainPhotoOffset({ x: 0, y: 0 });
                  if (mainImageRef.current) {
                    mainImageRef.current.style.transform = 'translate(0px, 0px) scale(1)';
                  }
                  setIsLightboxOpen(true);
                  setLightboxZoom(1);
                  setLightboxOffset({ x: 0, y: 0 });
                }
              }}
              onDoubleClick={(e) => {
                if (e.target.closest('button')) return;
                e.preventDefault();
                e.stopPropagation();
                mainPreventClickRef.current = true;
                if (mainPhotoZoomRef.current > 1) {
                  mainPhotoZoomRef.current = 1;
                  mainPhotoOffsetRef.current = { x: 0, y: 0 };
                  setMainPhotoZoom(1);
                  setMainPhotoOffset({ x: 0, y: 0 });
                  if (mainImageRef.current) {
                    mainImageRef.current.style.transform = 'translate(0px, 0px) scale(1)';
                  }
                } else {
                  mainPhotoZoomRef.current = 4.0;
                  mainPhotoOffsetRef.current = { x: 0, y: 0 };
                  setMainPhotoZoom(4.0);
                  setMainPhotoOffset({ x: 0, y: 0 });
                  if (mainImageRef.current) {
                    mainImageRef.current.style.transform = 'translate(0px, 0px) scale(4.0)';
                  }
                }
              }}
              onClick={(e) => {
                if (e.target.closest('button')) return;
                if (mainPreventClickRef.current) {
                  mainPreventClickRef.current = false;
                  return;
                }
                mainPhotoZoomRef.current = 1;
                mainPhotoOffsetRef.current = { x: 0, y: 0 };
                setMainPhotoZoom(1);
                setMainPhotoOffset({ x: 0, y: 0 });
                if (mainImageRef.current) {
                  mainImageRef.current.style.transform = 'translate(0px, 0px) scale(1)';
                }
                setIsLightboxOpen(true);
                setLightboxZoom(1);
                setLightboxOffset({ x: 0, y: 0 });
              }}
              className={`w-full ${galleryImages.length > 1 ? 'md:col-span-10' : 'md:col-span-12'} order-1 md:order-2 rounded-none overflow-hidden bg-[var(--color-surface)] border border-neutral-950/10 relative group ${mainPhotoZoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
            >

              {/* Navigation Chevron Buttons overlay */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleLightboxPrev();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLightboxPrev();
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 backdrop-blur-xs flex items-center justify-center text-neutral-900 border border-neutral-200/50 shadow-xs active:scale-90 transition-transform cursor-pointer"
                  >
                    <FiChevronLeft className="text-base" />
                  </button>
                  <button
                    type="button"
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleLightboxNext();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLightboxNext();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 backdrop-blur-xs flex items-center justify-center text-neutral-900 border border-neutral-200/50 shadow-xs active:scale-90 transition-transform cursor-pointer"
                  >
                    <FiChevronRight className="text-base" />
                  </button>
                </>
              )}

              <div className="w-full aspect-3/4 overflow-hidden pointer-events-none">
                <img
                  ref={mainImageRef}
                  src={getOptimizedImageUrl(activeImage, 1000, 80)}
                  alt={product.name}
                  fetchPriority="high"
                  decoding="sync"
                  onLoad={() => setImageLoaded(true)}
                  style={{
                    transformOrigin: 'center center',
                    transform: mainPhotoZoom > 1 
                      ? `translate(${mainPhotoOffset.x}px, ${mainPhotoOffset.y}px) scale(${mainPhotoZoom})`
                      : 'none'
                  }}
                  className={`w-full h-full object-cover object-center transition-all duration-200 ease-out ${imageLoaded ? 'opacity-100' : 'opacity-40'}`}
                />
              </div>

              {/* Mobile Slide Position Dots Indicator */}
              {galleryImages.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/20">
                  {galleryImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setImageLoaded(false);
                        setActiveImageIdx(idx);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageLoaded(false);
                        setActiveImageIdx(idx);
                      }}
                      className={`h-1.5 rounded-full transition-all duration-300 ${activeImageIndex === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] bg-neutral-950 text-white font-mono font-bold tracking-wider uppercase px-3 py-1 rounded-none whitespace-nowrap">
                  {product.category?.replace('-', ' ')}
                </span>
                {product.tag && (
                  <span className="text-[10px] bg-neutral-950 text-white font-mono font-bold tracking-wider uppercase px-3 py-1 rounded-none border border-neutral-950 whitespace-nowrap">
                    {product.tag}
                  </span>
                )}
                {isAllOutOfStock ? (
                  <span className="flex items-center gap-1.5 text-[10px] text-rose-600 font-mono font-semibold uppercase tracking-wider bg-rose-50 px-3 py-1 rounded-none border border-rose-100 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-rose-500 animate-pulse" />
                    SOLD OUT
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-mono font-semibold uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-none whitespace-nowrap">
                    <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-emerald-500 animate-ping" />
                    IN STOCK
                  </span>
                )}
                {adminMode && (
                  <button
                    onClick={() => {
                      const targetId = product.$id || product.id;
                      navigate(`/admin?edit=${targetId}`, { state: { editProductId: targetId } });
                    }}
                    className="flex items-center gap-1 text-[10px] text-neutral-950 font-mono font-bold uppercase tracking-wider bg-yellow-450 hover:bg-yellow-500 px-3 py-1 rounded-none border border-neutral-950 cursor-pointer shadow-xs transition-all whitespace-nowrap shrink-0"
                  >
                    Edit Drop
                  </button>
                )}
              </div>

              <div className="space-y-0.5">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-950 uppercase">
                  {product.name}
                </h1>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const sum = reviews.reduce((acc, r) => {
                      const val = Number(r.rating);
                      return acc + (isNaN(val) ? 5 : val);
                    }, 0);
                    const avg = reviews.length > 0 ? sum / reviews.length : 5.0;
                    const isFilled = star <= Math.round(avg);
                    return (
                      <FaStar key={star} className={`text-[11px] ${isFilled ? 'text-amber-400' : 'text-neutral-200'}`} />
                    );
                  })}
                </div>
                <a 
                  href="#reviews-section" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-[10px] font-mono font-bold text-[var(--color-muted)] hover:text-neutral-950 hover:underline transition-colors uppercase tracking-wider"
                >
                  ({reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'})
                </a>
              </div>

              {(() => {
                const priceNum = Number(product.price || 0);
                const compareNum = Number(product.compare_at_price || 0);
                const showCompare = compareNum > priceNum;
                const compareDisplay = showCompare 
                  ? compareNum 
                  : (product.discount_percent > 0 
                      ? Math.round(priceNum / (1 - product.discount_percent / 100)) 
                      : null);
                const discountDisplay = showCompare
                  ? Math.round(((compareNum - priceNum) / compareNum) * 100)
                  : product.discount_percent;

                return (
                  <div className="flex items-baseline gap-3 pt-0.5 flex-wrap">
                    <span className="text-2xl font-mono font-bold text-neutral-950">
                      ₹{priceNum.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-[var(--color-muted)] font-sans tracking-wide uppercase font-bold">
                      incl. of all taxes
                    </span>
                    {compareDisplay && (
                      <>
                        <span className="text-sm text-[var(--color-muted)] line-through font-mono font-medium">
                          ₹{compareDisplay.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-rose-600 font-mono font-bold tracking-wider bg-rose-50 px-2.5 py-0.5 rounded-none border border-rose-100">
                          {discountDisplay}% OFF
                        </span>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center gap-2.5 pt-1 pb-1 flex-wrap">
              <span className="text-[9px] font-mono text-[var(--color-muted)] uppercase tracking-widest font-bold">Share Drop:</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopiedLink(true);
                  showToast("Link copied to clipboard!", "success");
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className={`inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider border px-2.5 py-1 transition-all cursor-pointer rounded-xs ${
                  copiedLink
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                    : 'text-[var(--color-text)] border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
                }`}
              >
                {copiedLink ? <FiCheck className="text-xs text-emerald-600" /> : <FiCopy className="text-xs" />}
                <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
              </button>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this vakrayan fit drop: ${product.name} at ${window.location.href}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-700 border border-emerald-300/80 bg-emerald-50 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 px-2.5 py-1 transition-all cursor-pointer rounded-xs no-underline group"
              >
                <FaWhatsapp className="text-xs text-[#25D366] group-hover:text-white transition-colors" />
                <span>Share to WhatsApp</span>
              </a>
            </div>

            {(() => {

              if (product.color_group_id && groupProducts.length > 1) {
                return (
                  <div className="space-y-2 pb-1">
                    <h4 className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest">
                      COLOR: <span className="text-neutral-950 font-sans font-extrabold">{product.color_name || 'ORIGINAL'}</span>
                    </h4>
                    <div className="flex gap-2.5 flex-wrap">
                      {groupProducts.map((sibling) => {
                        const siblingId = sibling.$id || sibling.id;
                        const isCurrent = siblingId === (product.$id || product.id);
                        const siblingImage = sibling.front_image_link || sibling.image_url || sibling.image || 'https://placehold.co/100x125';
                        return (
                          <button
                            key={siblingId}
                            type="button"
                            onClick={() => {
                              if (!isCurrent) {
                                navigate(`/product/${sibling.slug || siblingId}`, { replace: true });
                              }
                            }}
                            className={`w-14 h-18 rounded-lg border-2 overflow-hidden transition-all flex items-center justify-center cursor-pointer ${
                              isCurrent
                                ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20 scale-105 shadow-md'
                                : 'border-[var(--color-border)] hover:border-neutral-400 hover:scale-102'
                            }`}
                            title={sibling.color_name}
                          >
                            <img 
                              src={getOptimizedImageUrl(siblingImage, 120, 75)} 
                              alt={sibling.color_name} 
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (product.color_name) {
                const img = product.front_image_link || product.image_url || product.image || 'https://placehold.co/100x125';
                return (
                  <div className="space-y-2 pb-1">
                    <h4 className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest">
                      COLOR: <span className="text-neutral-950 font-sans font-extrabold">{product.color_name}</span>
                    </h4>
                    <div className="flex gap-2.5">
                      <div className="w-14 h-18 rounded-lg border-2 border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20 overflow-hidden shadow-md">
                        <img
                          src={getOptimizedImageUrl(img, 120, 75)}
                          alt={product.color_name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                          title={product.color_name}
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })()}

            {displaySizes && displaySizes.length > 0 && (() => {

              let stockMap = {};
              try {
                stockMap = JSON.parse(product.sizes_stock || '{}');
              } catch {
                stockMap = {};
              }

              return (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-[var(--color-text)]">Select Size</h4>
                    <div className="flex gap-4">
                      <span 
                        onClick={() => setIsSizeChartOpen(true)}
                        className="text-xs text-neutral-950 font-mono font-bold border-b border-neutral-950 cursor-pointer pb-0.5 hover:text-[var(--color-muted)] transition-colors uppercase tracking-wider"
                      >
                        Size Guide
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {displaySizes.map((size) => {
                      const isSoldOut = stockMap[size] === 0;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`py-2 rounded-none font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer border ${
                            isSoldOut && selectedSize === size
                            ? 'bg-neutral-200 text-[var(--color-muted)] border-neutral-400 line-through font-extrabold'
                            : isSoldOut 
                            ? 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] line-through hover:border-neutral-400' 
                            : selectedSize === size 
                            ? 'bg-neutral-950 text-white border-neutral-950 shadow-md' 
                            : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-neutral-400 hover:text-neutral-950'
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
                      return null; // Rendered below Add to Cart instead
                    }
                    if (stockVal < 5) {
                      const fillPercent = (stockVal / 5) * 100;
                      return (
                        <div className="space-y-1.5 mt-1.5 animate-fade-in">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 animate-pulse">
                            <span className="flex items-center gap-1.5">
                              <svg className="w-3 h-3 fill-rose-500" viewBox="0 0 24 24"><path d="M12 2l11 19H1L12 2zM12 6l-7 12h14L12 6zm0 2l5.5 9.5H6.5L12 8z"/></svg>
                              <span>Low Stock in Size {selectedSize}!</span>
                            </span>
                            <span>Only {stockVal} items left</span>
                          </div>
                          <div className="w-full h-[3px] bg-rose-100 rounded-none overflow-hidden">
                            <div 
                              style={{ width: `${fillPercent}%` }} 
                              className="h-full bg-rose-500 rounded-none transition-all duration-700 ease-out" 
                            />
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="p-2.5 bg-emerald-50/50 border border-emerald-100/60 rounded-none flex items-center gap-2 mt-1.5 animate-fade-in">
                        <svg className="w-3 h-3 fill-emerald-500 animate-pulse" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        <p className="text-[10px] text-emerald-700 font-mono font-bold uppercase tracking-wider">
                          Size {selectedSize} is In Stock - Ready for immediate drop
                        </p>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

             {/* Quantity Selector Section — Always Visible */}
             <div className="space-y-1.5 mt-2 pt-2 border-t border-[var(--color-border)]/40">
               <div className="flex justify-between items-center">
                 <h4 className="text-xs font-bold text-[var(--color-text)] uppercase tracking-wider">
                   Quantity
                 </h4>
                 {selectedSize && (() => {
                   const baseSizeVal = selectedSize || 'M';
                   const availableStock = stocks[baseSizeVal] !== undefined ? Number(stocks[baseSizeVal]) : 10;
                   return (
                     <span className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">
                       {availableStock} items left in size {baseSizeVal}
                     </span>
                   );
                 })()}
               </div>
               <div className="flex items-center gap-3">
                 <div className="inline-flex items-center border border-[var(--color-border)] bg-[var(--color-surface)] rounded-none overflow-hidden shadow-2xs">
                   <button
                     type="button"
                     disabled={quantity <= 1}
                     onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                     className="w-8 h-8 flex items-center justify-center font-bold text-sm hover:bg-neutral-100 disabled:opacity-30 cursor-pointer select-none transition-colors text-neutral-950 border-r border-[var(--color-border)]"
                   >
                     <FiMinus size={13} strokeWidth={2.5} />
                   </button>
                   <span className="w-10 text-center font-mono font-bold text-xs select-none text-neutral-950 border-r border-[var(--color-border)] py-1">
                     {quantity}
                   </span>
                   <button
                     type="button"
                     onClick={() => {
                       const baseSizeVal = selectedSize || product.sizes?.[0] || 'M';
                       const availableStock = stocks[baseSizeVal] !== undefined ? Number(stocks[baseSizeVal]) : 10;
                       if (quantity >= availableStock) {
                         showToast(`Only ${availableStock} items left in stock for size ${baseSizeVal}.`, "warning");
                         return;
                       }
                       setQuantity(prev => prev + 1);
                     }}
                     className="w-8 h-8 flex items-center justify-center font-bold text-sm hover:bg-neutral-100 cursor-pointer select-none transition-colors text-neutral-950"
                   >
                     <FiPlus size={13} strokeWidth={2.5} />
                   </button>
                 </div>
               </div>
             </div>


            {/* Return Policy Banner (Mobile Only - Compact flow) */}
            <div className="md:hidden flex items-center gap-2 text-[var(--color-muted)] text-xs bg-[var(--color-surface)] border border-[var(--color-border)] p-2.5 rounded-none mt-1.5">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${
                returnPolicy === "No Return" ? "bg-rose-500" :
                returnPolicy === "Exchange Only" ? "bg-amber-500" :
                returnPolicy === "Return Only" ? "bg-blue-500" : "bg-emerald-500"
              }`} />
              <p className="font-mono text-[10px] uppercase tracking-wide">
                {returnPolicy === "No Return" ? "No return or exchange active." :
                 returnPolicy === "Exchange Only" ? "7-Day exchange only active." :
                 returnPolicy === "Return Only" ? "7-Day return only active." :
                 "7-Day returns & exchanges active."}
              </p>
            </div>

            {/* Desktop Action Buttons (Hidden on mobile where sticky bottom bar handles actions) */}
            <div className="hidden md:block space-y-2.5 pt-2 border-t border-neutral-150">

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-3 w-full sm:w-auto sm:flex-1">
                    <div className="flex-1 transform active:scale-[0.99] transition-transform duration-150">
                      <AddToCartButton
                        product={product}
                        selectedSize={selectedSize}
                        selectedColor={selectedColor}
                        quantity={quantity}
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        const productId = product.$id || product.id;
                        const exists = wishlist.some(item => item.$id === productId || item.id === productId);
                        let updated;
                        if (exists) {
                          dispatch(removeWishlistItemState(productId));
                          const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
                          updated = saved.filter(item => item.$id !== productId && item.id !== productId);
                          localStorage.setItem('wishlist', JSON.stringify(updated));
                          if (isAuthenticated && user) {
                            try {
                              await wishlistService.removeFromWishlist(user.$id, productId);
                            } catch (e) {
                              console.warn("⚠️ Firebase wishlist cloud sync failed:", e.message);
                            }
                          }
                        } else {
                          dispatch(addWishlistItemState(product));
                          const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
                          updated = [...saved, product];
                          localStorage.setItem('wishlist', JSON.stringify(updated));
                          if (isAuthenticated && user) {
                            try {
                              await wishlistService.addToWishlist(user.$id, productId);
                            } catch (e) {
                              console.warn("⚠️ Firebase wishlist cloud sync failed:", e.message);
                            }
                          }
                        }
                      }}
                      className="w-[50px] shrink-0 bg-[var(--color-surface)] border border-neutral-950 hover:bg-[var(--color-surface)] rounded-none shadow-xs transition-all group cursor-pointer text-center flex items-center justify-center"
                      title="Save Fit to Wishlist"
                    >
                      {wishlist.some(item => item.$id === (product.$id || product.id) || item.id === (product.$id || product.id)) ? (
                        <svg className="w-5 h-5 text-rose-500 fill-current" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-[var(--color-muted)] group-hover:text-neutral-950 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  {/* One-Click Buy Now Button */}
                  <div className="w-full sm:flex-1 transform active:scale-[0.99] transition-transform duration-150">
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={isAllOutOfStock || (selectedSize && stocks[selectedSize] === 0)}
                      className="w-full flex items-center justify-center gap-2 font-bold text-xs tracking-widest uppercase py-4 px-2 sm:px-4 md:px-6 rounded-none transition-all select-none cursor-pointer bg-neutral-950 hover:bg-neutral-800 text-white border border-neutral-950 disabled:bg-neutral-200 disabled:text-[var(--color-muted)] disabled:border-neutral-300 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isAllOutOfStock || (selectedSize && stocks[selectedSize] === 0) ? 'Sold Out' : (
                        <span className="flex items-center gap-1.5 justify-center">
                          <FiZap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" /> Buy Now
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-2 text-[var(--color-muted)] text-xs bg-[var(--color-surface)] border border-[var(--color-border)] p-3 rounded-none">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${
                    returnPolicy === "No Return" ? "bg-rose-500" :
                    returnPolicy === "Exchange Only" ? "bg-amber-500" :
                    returnPolicy === "Return Only" ? "bg-blue-500" : "bg-emerald-500"
                  }`} />
                  <p className="font-mono text-[10px] uppercase tracking-wide">
                    {returnPolicy === "No Return" ? "No return or exchange active." :
                     returnPolicy === "Exchange Only" ? "7-Day exchange only active." :
                     returnPolicy === "Return Only" ? "7-Day return only active." :
                     "7-Day returns & exchanges active."}
                  </p>
                </div>
              </div>

              {/* OUT OF STOCK RESTOCK ALERTS FORM - Rendered on both mobile & desktop */}
              {((selectedSize && stocks[selectedSize] === 0) || isAllOutOfStock) && (
                <div className="p-4 bg-neutral-900 border border-neutral-850 text-white rounded-none space-y-3 mt-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <p className="text-[10px] text-neutral-300 font-bold uppercase tracking-wider font-mono">
                      {isAllOutOfStock ? 'This product is Sold Out' : `Size ${selectedSize} is Out of Stock`}
                    </p>
                  </div>
                  
                  {notifyStatus !== 'success' ? (
                    <form onSubmit={(e) => handleNotifyMe(e, selectedSize || 'ALL')} className="space-y-1.5">
                      <label className="text-[9px] text-neutral-455 font-mono font-bold uppercase tracking-wider block">
                        Get notified when we restock:
                      </label>
                      <div className="flex rounded-none overflow-hidden border border-neutral-700 bg-neutral-950 focus-within:border-white transition-colors">
                        <input 
                          type="email" 
                          value={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.value)}
                          placeholder="ENTER YOUR EMAIL" 
                          disabled={notifyStatus === 'loading'}
                          className="bg-transparent text-white placeholder-neutral-500 text-[10px] tracking-wider px-4 py-3 w-full outline-none font-mono"
                        />
                        <button 
                          type="submit" 
                          disabled={notifyStatus === 'loading'}
                          className="bg-white text-black font-mono font-bold text-xs px-5 uppercase hover:bg-neutral-200 transition-colors cursor-pointer disabled:bg-neutral-800 disabled:text-neutral-500 rounded-none"
                        >
                          {notifyStatus === 'loading' ? 'Saving...' : 'Notify Me'}
                        </button>
                      </div>
                      {notifyError && (
                        <p className="text-[9px] text-rose-400 font-mono tracking-widest uppercase pt-0.5 animate-pulse">
                          {notifyError}
                        </p>
                      )}
                    </form>
                  ) : (
                    <div className="p-3 bg-emerald-950 text-emerald-400 border border-emerald-900 rounded-none text-[10px] font-mono font-bold uppercase tracking-widest leading-normal animate-scale-up">
                      ✓ Notification registered successfully!<br />
                      <span className="text-emerald-500 font-mono text-[9px] font-medium tracking-wider">We'll alert you the second this size drops again.</span>
                    </div>
                  )}
                </div>
              )}

            <div className="pt-4 pb-2 border-t border-neutral-150 space-y-3">
              <span className="text-[8px] font-bold text-[var(--color-muted)] block tracking-widest uppercase">CHECK DELIVERY AVAILABILITY</span>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-muted)]">
                    <FiMapPin className="text-xs" />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincodeInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPincodeInput(val);
                      if (val.length === 6) {
                        performPincodeCheck(val);
                      }
                    }}
                    placeholder="ENTER 6-DIGIT PINCODE"
                    className="w-full bg-white border border-zinc-300 focus:border-zinc-900 rounded-none pl-8 pr-4 py-2 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 outline-none tracking-widest transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => performPincodeCheck(pincodeInput)}
                  disabled={pinChecking || pincodeInput.length !== 6}
                  className="bg-neutral-950 hover:bg-neutral-850 text-white font-mono font-bold text-[10px] px-5 py-2 uppercase transition-all tracking-wider disabled:bg-neutral-200 disabled:text-[var(--color-muted)] cursor-pointer shrink-0 rounded-none border border-neutral-950 disabled:border-[var(--color-border)]"
                >
                  {pinChecking ? 'CHECKING...' : 'CHECK'}
                </button>
              </div>

              {pinError && (
                <p className="text-[9px] text-rose-500 font-mono tracking-widest uppercase animate-pulse">
                  {pinError}
                </p>
              )}

              {pinResult && (
                <div className="p-4 bg-[var(--color-surface)]/40 backdrop-blur-md border border-white/20 rounded-2xl text-xs space-y-1.5 animate-fade-in shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] tracking-wider text-[var(--color-muted)] uppercase">DELIVERY FOR:</span>
                    <span className="font-mono text-[9px] font-black text-[var(--color-text)] uppercase bg-neutral-100 px-1.5 py-0.5 rounded-sm">
                      {pinResult.pincode}
                    </span>
                  </div>
                  
                  {pinResult.location && (
                    <div className="text-[10px] font-black text-[var(--color-text)] uppercase">
                      📍 {pinResult.location}
                    </div>
                  )}

                  <div className="flex items-start gap-1.5 pt-1 text-[var(--color-muted)]">
                    <FiTruck className="text-xs shrink-0 mt-0.5 text-[var(--color-text)]" />
                    <div>
                      <p className="text-[var(--color-text)] font-black text-[11px] uppercase tracking-wide">
                        ESTIMATED ARRIVAL: {pinResult.dateRange}
                      </p>
                      <p className="text-[9px] font-mono text-[var(--color-muted)] uppercase tracking-widest mt-0.5">
                        {pinResult.desc} (dispatched in 1-2 days) · via {pinResult.carrier}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-1.5 border-t border-dashed border-[var(--color-border)] space-y-1">
                    {pinResult.codAvailable ? (
                      <div className="text-[9px] text-emerald-600 font-black uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        ✓ Cash on Delivery (COD) Available
                      </div>
                    ) : (
                      <div className="text-[9px] text-amber-600 font-black uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        ⚠️ Cash on Delivery (COD) Not Available (Prepaid Only)
                      </div>
                    )}
                    
                    <div className="text-[9px] text-[var(--color-muted)] font-black uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                      Free delivery on orders ₹999 & above (else ₹99)
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-b border-[var(--color-border)] divide-y divide-neutral-200 mt-4">

              {displayDescription && (
                <div className="py-3.5">
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="w-full flex items-center justify-between text-left text-xs font-mono font-bold tracking-wider text-[var(--color-text)] uppercase focus:outline-none cursor-pointer"
                  >
                    <span>DESCRIPTION & SPECIFICATIONS</span>
                    {descExpanded ? <FiChevronUp className="text-base" /> : <FiChevronDown className="text-base" />}
                  </button>
                  <div className={`transition-all duration-300 overflow-hidden ${descExpanded ? 'max-h-[800px] mt-2.5 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="text-xs text-[var(--color-muted)] leading-relaxed bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-xl">
                      <RenderMarkdown content={displayDescription} />
                    </div>
                  </div>
                </div>
              )}

              <div className="py-3.5">
                <button
                  onClick={() => setShippingExpanded(!shippingExpanded)}
                  className="w-full flex items-center justify-between text-left text-xs font-mono font-bold tracking-wider text-[var(--color-text)] uppercase focus:outline-none cursor-pointer"
                >
                  <span>RETURNS & EXCHANGES</span>
                  {shippingExpanded ? <FiChevronUp className="text-base" /> : <FiChevronDown className="text-base" />}
                </button>
                <div className={`transition-all duration-300 overflow-hidden ${shippingExpanded ? 'max-h-[400px] mt-2.5 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="text-xs text-[var(--color-muted)] leading-relaxed bg-[var(--color-surface)] border border-[var(--color-border)] p-4 space-y-3 font-medium">
                    {returnPolicy === "No Return" || returnPolicy.toLowerCase().includes("no return") ? (
                      <>
                        <p className="text-rose-600 font-bold flex items-start gap-2">
                          <FiAlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span><strong>Non-Returnable Item Policy:</strong> Final sale — standard returns or size exchanges are not accepted for this item.</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <RulerIcon className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                          <span>Please check the size chart carefully before placing your order.</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <FiVideo className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                          <span><strong>Damaged or Wrong Item:</strong> Replacement is only provided if you receive a damaged or incorrect product (unboxing video proof required).</span>
                        </p>
                      </>
                    ) : returnPolicy === "Return Only" || returnPolicy.toLowerCase().includes("return only") || returnPolicy.toLowerCase().includes("no exchange") ? (
                      <>
                        <p className="text-amber-700 dark:text-amber-400 font-bold flex items-start gap-2">
                          <FiPackage className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span><strong>Return Only Policy:</strong> Easy 7-day return guarantee for refund.</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <FiRefreshCw className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                          <span>Direct size exchanges are not offered for this product; please return for a refund and place a new order.</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <FiTag className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                          <span>Items must be unused, unwashed, and with all original brand tags intact.</span>
                        </p>
                      </>
                    ) : returnPolicy === "Exchange Only" || returnPolicy.toLowerCase().includes("exchange only") ? (
                      <>
                        <p className="text-amber-700 dark:text-amber-400 font-bold flex items-start gap-2">
                          <FiRefreshCw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span><strong>Exchange Only Policy:</strong> Easy 7-day size or defect exchange available.</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <FiSlash className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                          <span>Monetary refunds are not processed for this item; only size/color replacements are accepted.</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <FiTag className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                          <span>Request an exchange within 7 days of delivery with original tags intact.</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-emerald-600 dark:text-emerald-400 font-bold flex items-start gap-2">
                          <FiCheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span><strong>7-Day Return & Exchange Policy:</strong> Easy 7-day hassle-free returns and size exchanges.</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <ShieldCheckIcon className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                          <span>In case of sizing issues or defects, request a return or size exchange within 7 days of delivery.</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <FiTag className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                          <span>Items must be unused, unwashed, and with all original brand tags intact.</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

        {suggestProduct && suggestProduct.length > 0 && (
          <div className="pt-12 border-t border-[var(--color-border)] space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--color-text)]">
                You May Also Like
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {suggestProduct.map((item) => {
                const uniqueId = item.$id || item.id;
                const frontView = item.front_image_link || item.image_url || item.image || 'https://placehold.co/400x500?text=No+Preview';
                const backView = item.back_image_links?.[0] || item.back_image_link || frontView;
                const activeTag = item.tag || (item.category === 'oversized-tshirt' ? 'OVERSIZED FIT' : "");

                return (
                  <div 
                    key={uniqueId} 
                    onClick={() => {
                      navigate(`/product/${item.slug || uniqueId}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                    className="group relative flex flex-col bg-[var(--color-surface)] rounded-none p-2 border border-neutral-950/10 hover:border-[var(--color-accent)] transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    <div className="w-full aspect-3/4 rounded-none overflow-hidden bg-neutral-100 relative border border-[var(--color-border)]/50">
                      
                      {activeTag && (
                        <div className="absolute top-2 left-2 z-20 flex items-center bg-white/95 backdrop-blur-md px-2 py-1 rounded-sm shadow-sm select-none">
                          <span className="text-neutral-900 font-sans text-[8px] md:text-[9px] tracking-widest uppercase font-bold">
                            {activeTag}
                          </span>
                        </div>
                      )}

                      <div className="w-full h-full relative overflow-hidden">
                        <img
                          src={getOptimizedImageUrl(frontView, 500, 75)}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover object-center absolute inset-0 transition-all duration-500 group-hover:opacity-0"
                        />
                        <img  
                          src={getOptimizedImageUrl(backView, 500, 75)}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover object-center absolute inset-0 transition-all duration-500 opacity-0 group-hover:opacity-100"
                        />
                      </div>
                    </div>

                    <div className="mt-3 px-1 pb-1 flex flex-col justify-between grow">
                      <div>
                        <span className="text-[10px] text-[var(--color-muted)] font-mono font-bold uppercase tracking-wider block mb-0.5">
                          {item.category?.replace('-', ' ') || "Collection"}
                        </span>
                        <h3 className="text-xs font-bold text-neutral-950 uppercase group-hover:text-[var(--color-muted)] transition-colors truncate">
                          {item.name}
                        </h3>
                      </div>
                      
                      <div className="mt-3 pt-2 border-t border-neutral-950/10 flex items-center justify-between gap-4">
                        <div className="flex items-baseline gap-1.5 font-mono">
                          <span className="text-sm font-bold text-neutral-950">
                            ₹{Number(item.price).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span className="text-[9px] font-sans font-bold uppercase tracking-wide text-[var(--color-muted)] whitespace-nowrap">
                          INCL. TAXES
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div id="reviews-section" className="pt-16 border-t border-[var(--color-border)] space-y-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[var(--color-text)]">
              Customer Reviews ({reviews.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-6">
              {reviews.length > 0 && (
                <div className="bg-[var(--color-surface)]/40 backdrop-blur-md border border-white/20 p-6 rounded-2xl flex items-center gap-6 shadow-sm">
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold tracking-tight text-neutral-950">
                      {(() => {
                        if (reviews.length === 0) return '5.0';
                        const sum = reviews.reduce((acc, r) => {
                          const val = Number(r.rating);
                          return acc + (isNaN(val) ? 5 : val);
                        }, 0);
                        return (sum / reviews.length).toFixed(1);
                      })()}
                    </div>
                    <div className="flex gap-0.5 justify-center mt-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const sum = reviews.reduce((acc, r) => {
                          const val = Number(r.rating);
                          return acc + (isNaN(val) ? 5 : val);
                        }, 0);
                        const avg = reviews.length > 0 ? sum / reviews.length : 5.0;
                        const isFilled = star <= Math.round(avg);
                        return (
                          <FaStar key={star} className={`text-xs ${isFilled ? 'text-amber-400' : 'text-neutral-200'}`} />
                        );
                      })}
                    </div>
                    <span className="text-[9px] font-mono font-bold text-[var(--color-muted)] uppercase mt-2 block">
                      Average Rating
                    </span>
                  </div>
                  <div className="w-px bg-neutral-950/10 self-stretch" />
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = reviews.filter(r => {
                        const val = Number(r.rating);
                        const ratingClean = isNaN(val) ? 5 : Math.round(val);
                        return ratingClean === stars;
                      }).length;
                      const percent = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={stars} className="flex items-center gap-2 text-[10px] text-[var(--color-muted)] font-mono font-bold">
                          <span className="w-3 text-right">{stars}★</span>
                          <div className="flex-1 h-1.5 bg-neutral-100 rounded-none overflow-hidden">
                            <div className="h-full bg-neutral-950 rounded-none" style={{ width: `${percent}%` }} />
                          </div>
                          <span className="w-4 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}



              <div className="bg-[var(--color-surface)]/40 backdrop-blur-md border border-white/20 p-6 rounded-2xl space-y-4 shadow-sm">
                <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-[var(--color-text)]">
                  Write a Review
                </h3>
                {!isAuthenticated ? (
                  <div className="text-center py-6 border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 rounded-none">
                    <p className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest mb-3">
                      Log in to leave a review
                    </p>
                    <Link
                      to="/login"
                      className="inline-block bg-neutral-950 text-white font-mono font-bold text-[10px] tracking-wider uppercase px-5 py-2.5 rounded-none hover:bg-neutral-800"
                    >
                      Sign In
                    </Link>
                  </div>
                ) : checkingOrder ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-none animate-spin" />
                    <span className="text-[10px] tracking-widest font-mono text-[var(--color-muted)] uppercase">Verifying purchase history...</span>
                  </div>
                ) : hasDeliveredOrder ? (
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase">Your Rating</span>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewRating(star)}
                            className="text-2xl cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                          >
                            <FaStar className={star <= newRating ? 'text-amber-400' : 'text-neutral-250'} />
                          </button>
                        ))}
                      </div>
                    </div>





                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase">Review Title</span>
                      <input
                        type="text"
                        value={newReviewTitle}
                        onChange={(e) => setNewReviewTitle(e.target.value)}
                        placeholder="Summarize your experience..."
                        className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-none px-3 py-2 text-xs text-[var(--color-text)] outline-hidden transition-colors font-sans"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase">Your Review</span>
                      <textarea
                        rows="3"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write your product experience here..."
                        className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-none px-3 py-2.5 text-xs text-[var(--color-text)] outline-hidden resize-none transition-colors font-sans"
                      />
                    </div>

                    {/* Review Image Upload Section */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase flex items-center gap-1.5">
                          <FiCamera className="text-sm text-[var(--color-accent)] shrink-0" />
                          Product Photos (Optional)
                        </span>
                        <span className="text-[9px] font-mono text-[var(--color-muted)] uppercase tracking-wider">
                          {newReviewImages.split(',').filter(Boolean).length} / 5 Uploaded
                        </span>
                      </div>

                      {/* Thumbnail grid */}
                      <div className="flex flex-wrap gap-2.5 min-h-[40px] p-2 border border-dashed border-[var(--color-border)] bg-[var(--color-subtle)]/40 rounded-lg">
                        {newReviewImages.split(',').map(url => url.trim()).filter(Boolean).map((url, idx) => (
                          <div key={idx} className="relative w-16 h-16 bg-white shrink-0">
                            <img src={url} alt="Review Preview" className="w-full h-full object-cover border border-[var(--color-border)] rounded-md" />
                            <button
                              type="button"
                              onClick={() => {
                                const remaining = newReviewImages.split(',')
                                  .map(u => u.trim())
                                  .filter(Boolean)
                                  .filter((_, i) => i !== idx)
                                  .join(', ');
                                setNewReviewImages(remaining);
                              }}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold shadow-md cursor-pointer z-10 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {uploadingImage && (
                          <div className="w-16 h-16 border border-[var(--color-border)] rounded-md flex items-center justify-center bg-white/50 animate-pulse">
                            <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {!uploadingImage && newReviewImages.split(',').filter(Boolean).length === 0 && (
                          <div className="flex-1 flex items-center justify-center py-2 text-[10px] font-mono text-[var(--color-muted)] uppercase select-none">
                            No photos attached. Click below to add.
                          </div>
                        )}
                      </div>

                      <label className="w-full bg-neutral-950 hover:bg-neutral-850 text-white font-mono font-bold text-[10px] tracking-wider py-3 rounded-none uppercase transition-all cursor-pointer border border-neutral-950 text-center select-none flex items-center justify-center gap-2">
                        {uploadingImage ? (
                          'Uploading image...'
                        ) : (
                          <>
                            <FiImage className="text-sm shrink-0" />
                            Add Photo / Upload File
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const currentCount = newReviewImages.split(',').filter(Boolean).length;
                            if (currentCount >= 5) {
                              showToast("You can upload a maximum of 5 photos.", "error");
                              return;
                            }
                            handleImageUpload(e, setNewReviewImages, newReviewImages);
                          }}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="w-full bg-neutral-950 hover:bg-neutral-800 active:scale-95 text-white font-mono font-bold text-[10px] tracking-widest uppercase py-2.5 rounded-none transition-all cursor-pointer border border-neutral-950"
                    >
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                ) : (
                  <div className="p-5 border border-dashed border-amber-500/30 bg-amber-500/5 rounded-xl space-y-2 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
                      <span className="text-base">🔒</span>
                      <span>Verified Buyers Only</span>
                    </div>
                    <p className="text-xs text-[var(--color-muted)] leading-relaxed font-medium">
                      Reviews can only be submitted by customers who have purchased and received this product. Once your order status is marked as <strong className="text-[var(--color-text)] font-bold uppercase">Delivered</strong> in your profile history, the review form will unlock automatically!
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              {reviews.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-[var(--color-border)] rounded-none bg-[var(--color-surface)]/50">
                  <p className="text-xs text-[var(--color-muted)] font-mono font-bold">
                    No reviews have been written for this product yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-4">
                    {reviews.slice(0, 3).map((rev) => {
                      const uniqueId = rev.$id || rev.id;
                      const formattedDate = new Date(rev.$createdAt || '1970-01-01').toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });

                      let titleText = rev.title || "";
                      let commentText = rev.comment || "";
                      let imagesList = [];
                      let verifiedPurchase = !!rev.is_verified_purchase;
                      let fitPreference = "";
                      let comfortRating = 0;
                      let qualityRating = 0;
                      let breathableRating = 0;

                      try {
                        const parsed = JSON.parse(rev.comment);
                        if (parsed && typeof parsed === 'object') {
                          titleText = parsed.title || rev.title || "";
                          commentText = parsed.comment || "";
                          imagesList = parsed.images || [];
                          if (parsed.is_verified_purchase !== undefined) {
                            verifiedPurchase = !!parsed.is_verified_purchase;
                          }
                          fitPreference = parsed.fit || "";
                          comfortRating = Number(parsed.comfort) || 0;
                          qualityRating = Number(parsed.quality) || 0;
                          breathableRating = Number(parsed.breathable) || 0;
                        }
                      } catch (e) {
                        console.warn("Could not parse review comment JSON, using fallback parsing:", e.message);
                        commentText = rev.comment || "";
                        if (rev.images) {
                          try {
                            imagesList = JSON.parse(rev.images);
                          } catch (err) {
                            console.warn("Could not parse review images JSON, using fallback splitting:", err.message);
                            imagesList = typeof rev.images === 'string' ? rev.images.split(',').filter(Boolean) : (Array.isArray(rev.images) ? rev.images : []);
                          }
                        }
                      }

                      return (
                        <div key={uniqueId} className="bg-[var(--color-surface)]/60 backdrop-blur-md border border-[var(--color-border)] p-6 rounded-2xl space-y-4 hover:border-[var(--color-accent)] hover:shadow-md transition-all duration-300">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-mono text-[var(--color-muted)] block font-bold">
                                {formattedDate}
                              </span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-[var(--color-text)] uppercase font-sans">
                                  {rev.userName}
                                </span>
                                {verifiedPurchase && (
                                  <span className="inline-flex items-center text-[8px] text-emerald-700 font-mono font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 tracking-widest uppercase">
                                    ✓ Verified Buyer
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <FaStar
                                  key={star}
                                  className={`text-[10px] ${star <= (isNaN(Number(rev.rating)) ? 5 : Number(rev.rating)) ? 'text-amber-400' : 'text-neutral-200'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {titleText && (
                              <h4 className="text-xs font-mono font-bold text-[var(--color-text)] uppercase tracking-wide">
                                &ldquo;{titleText}&rdquo;
                              </h4>
                            )}



                            <p className="text-xs text-[var(--color-text)]/90 leading-relaxed font-sans whitespace-pre-wrap pl-0.5">
                              {commentText}
                            </p>
                          </div>
                          {imagesList && imagesList.length > 0 && (
                            <div className="flex flex-wrap gap-2.5 pt-1">
                              {imagesList.map((img, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setActiveReviewImage(img)}
                                  className="group relative w-20 h-20 overflow-hidden rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-xs bg-[var(--color-surface)]/20"
                                >
                                  <img
                                    src={getOptimizedImageUrl(img, 180, 75)}
                                    alt={`Customer image ${idx + 1}`}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md text-xs font-mono">🔍</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {reviews.length > 3 && (
                    <Link
                      to={`/product/${idOrSlug}/reviews`}
                      className="w-full mt-6 py-3 border border-[var(--color-border)] rounded-xl text-xs font-bold text-[var(--color-text)] uppercase tracking-widest hover:bg-[var(--color-surface)] hover:border-[var(--color-accent)] transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                    >
                      View All Reviews ({reviews.length}) &rarr;
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isSizeChartOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsSizeChartOpen(false)}
          />

          <div className="relative bg-[var(--color-surface)] rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-[var(--color-border)] z-10 animate-scale-up space-y-5 text-[var(--color-text)] max-h-[90vh] overflow-y-auto scrollbar-none">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text)] flex items-center gap-2">
                  <span>📏</span>
                  <span>VAKRAYAN SIZE GUIDE</span>
                </h3>
                <p className="text-[11px] text-[var(--color-muted)] tracking-wide mt-0.5">
                  Measurements for boxy & oversized fits
                </p>
              </div>
              <button 
                onClick={() => setIsSizeChartOpen(false)}
                className="text-[var(--color-muted)] hover:text-[var(--color-text)] p-2 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Custom Uploaded Size Chart Image (If Available) */}
            {customSizeChartImage && (
              <div className="space-y-2 border border-[var(--color-border)] p-2 rounded-xl bg-[var(--color-bg)]">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] block px-1">
                  Product Specific Size Chart:
                </span>
                <img 
                  src={getOptimizedImageUrl(customSizeChartImage, 800, 80)} 
                  alt="Product Size Chart" 
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto rounded-lg object-contain max-h-72 border border-[var(--color-border)]/50"
                />
              </div>
            )}

            {/* Unit Toggle Switcher (IN vs CM) */}
            <div className="flex items-center justify-between bg-[var(--color-bg)] p-2.5 rounded-xl border border-[var(--color-border)]">
              <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">
                MEASUREMENT UNIT:
              </span>
              <div className="inline-flex rounded-lg p-0.5 bg-[var(--color-surface)] border border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setSizeUnit('IN')}
                  className={`px-3 py-1 text-[11px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                    sizeUnit === 'IN' 
                      ? 'bg-neutral-900 text-white shadow-xs' 
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  INCHES (IN)
                </button>
                <button
                  type="button"
                  onClick={() => setSizeUnit('CM')}
                  className={`px-3 py-1 text-[11px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                    sizeUnit === 'CM' 
                      ? 'bg-neutral-900 text-white shadow-xs' 
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  CENTIMETERS (CM)
                </button>
              </div>
            </div>

            {/* Size Table */}
            <div className="overflow-x-auto border border-[var(--color-border)] rounded-xl">
              <table className="w-full text-left text-xs font-mono uppercase font-bold">
                <thead>
                  <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)] text-[10px] font-black text-[var(--color-muted)]">
                    <th className="p-3">SIZE</th>
                    <th className="p-3">CHEST ({sizeUnit})</th>
                    <th className="p-3">SHOULDER ({sizeUnit})</th>
                    <th className="p-3">LENGTH ({sizeUnit})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] font-bold text-[var(--color-text)]">
                  {[
                    { size: 'XS', chest: 42, shoulder: 19, length: 27.5 },
                    { size: 'S', chest: 44, shoulder: 20, length: 28 },
                    { size: 'M', chest: 46, shoulder: 21, length: 29 },
                    { size: 'L', chest: 48, shoulder: 22, length: 30 },
                    { size: 'XL', chest: 50, shoulder: 23, length: 31 },
                    { size: 'XXL', chest: 52, shoulder: 24, length: 32 }
                  ].map((row) => {
                    const formatVal = (val) => sizeUnit === 'CM' ? (val * 2.54).toFixed(1) : val.toString();
                    return (
                      <tr 
                        key={row.size} 
                        className={`hover:bg-[var(--color-bg)] transition-colors ${
                          selectedSize === row.size ? 'bg-amber-500/10 font-black text-amber-900 dark:text-amber-300' : ''
                        }`}
                      >
                        <td className="p-3 font-sans font-black">{row.size} {selectedSize === row.size && '•'}</td>
                        <td className="p-3">{formatVal(row.chest)}</td>
                        <td className="p-3">{formatVal(row.shoulder)}</td>
                        <td className="p-3">{formatVal(row.length)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-amber-50 border border-amber-200/80 p-3.5 rounded-xl text-xs font-medium text-amber-900 leading-relaxed">
              <span className="font-bold block mb-0.5 text-amber-950">💡 Fit Recommendation:</span>
              Our cuts are designed for a relaxed, slightly boxy drop-shoulder aesthetic. If you prefer a regular fitted silhouette, select one size smaller.
            </div>

            <button
              type="button"
              onClick={() => setIsSizeChartOpen(false)}
              className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 transition-all text-xs font-semibold uppercase tracking-wider text-white rounded-xl cursor-pointer text-center shadow-xs"
            >
              Close Size Guide
            </button>
          </div>
        </div>
      )}

      {sizeAdvisorOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => {
            setSizeAdvisorOpen(false);
            setAdvHeight('');
            setAdvWeight('');
            setAdvBmi(null);
            setAdvRecommendation('');
          }}></div>

          <div className="relative bg-[var(--color-surface)] rounded-none max-w-md w-full shadow-2xl p-6 border border-neutral-950 z-10 animate-fade-in space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-950/10 pb-4">
              <div>
                <h3 className="text-sm font-mono font-bold uppercase tracking-[0.2em] text-neutral-950">
                  👔 VIRTUAL SIZE ADVISOR
                </h3>
                <p className="text-[10px] text-[var(--color-muted)] font-mono font-bold uppercase tracking-wider mt-0.5">
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
                className="text-[var(--color-muted)] hover:text-neutral-950 p-2 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Height (cm)
                </label>
                <input 
                  type="number" 
                  placeholder="e.g. 175" 
                  value={advHeight}
                  onChange={(e) => setAdvHeight(e.target.value)}
                  className="bg-[var(--color-surface)] border border-neutral-950/15 focus:border-[var(--color-accent)] focus:bg-[var(--color-surface)] rounded-none px-4 py-3 text-xs font-mono font-bold outline-none transition-all text-neutral-950"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)]">
                  Weight (kg)
                </label>
                <input 
                  type="number" 
                  placeholder="e.g. 70" 
                  value={advWeight}
                  onChange={(e) => setAdvWeight(e.target.value)}
                  className="bg-[var(--color-surface)] border border-neutral-950/15 focus:border-[var(--color-accent)] focus:bg-[var(--color-surface)] rounded-none px-4 py-3 text-xs font-mono font-bold outline-none transition-all text-neutral-950"
                />
              </div>

              <button
                onClick={calculateRecommendation}
                disabled={!advHeight || !advWeight}
                className="w-full py-3.5 bg-neutral-950 hover:bg-neutral-800 text-white text-[10px] font-mono font-bold uppercase tracking-widest rounded-none transition-all cursor-pointer disabled:bg-neutral-100 disabled:text-[var(--color-muted)] disabled:cursor-not-allowed border border-neutral-950"
              >
                Calculate Size
              </button>
            </div>

            {advBmi && (
              <div className="p-5 bg-[var(--color-surface)]/40 backdrop-blur-md border border-white/20 rounded-2xl text-center space-y-3 animate-fade-in shadow-sm">
                <div className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest">
                  Your BMI: <span className="text-neutral-950 font-bold">{advBmi}</span>
                </div>
                
                <div className="space-y-1">
                  <div className="text-[10px] text-[var(--color-muted)] font-mono font-bold uppercase tracking-wider">
                    Recommended Size
                  </div>
                  <div className="text-3xl font-mono font-black text-neutral-950 tracking-wide">
                    {advRecommendation}
                  </div>
                </div>

                <p className="text-[10px] font-medium text-[var(--color-muted)] leading-relaxed max-w-xs mx-auto">
                  {advRecommendation === 'S' && "Based on lightweight dimensions, 'S' provides a sleek look."}
                  {advRecommendation === 'M' && "Based on balanced dimensions, 'M' guarantees standard relaxed styling."}
                  {advRecommendation === 'L' && "Based on solid dimensions, 'L' guarantees comfortable signatures drops."}
                  {advRecommendation === 'XL' && "Based on heavyweight dimensions, 'XL' guarantees a bold oversized silhouette."}
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      let stockMap;
                      try {
                        stockMap = JSON.parse(product.sizes_stock || '{}');
                      } catch {
                        stockMap = {};
                      }
                      if (product.sizes?.includes(advRecommendation) && stockMap[advRecommendation] > 0) {
                        setSelectedSize(advRecommendation);
                        showToast(`Applied Recommended Size "${advRecommendation}"!`, "success");
                      } else {
                        showToast(`Recommended size "${advRecommendation}" is out of stock.`, "error");
                      }
                      setSizeAdvisorOpen(false);
                      setAdvHeight('');
                      setAdvWeight('');
                      setAdvBmi(null);
                      setAdvRecommendation('');
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-mono font-bold uppercase tracking-wider rounded-none transition-all cursor-pointer"
                  >
                    Select & Apply Size
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Premium Glassmorphic Review Image Lightbox Modal */}
      {activeReviewImage && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity cursor-zoom-out" 
            onClick={() => setActiveReviewImage(null)}
          />
          <div className="relative max-w-3xl w-full max-h-[85vh] flex items-center justify-center z-10 animate-scale-up p-2 bg-[var(--color-surface)]/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl">
            <button 
              type="button"
              className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-colors cursor-pointer border border-white/10 backdrop-blur-xs"
              onClick={() => setActiveReviewImage(null)}
            >
              <FiX className="text-lg" />
            </button>
            <img 
              src={activeReviewImage} 
              alt="High-resolution review zoom" 
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-lg"
            />
          </div>
        </div>
      )}

      {/* Sticky Bottom Actions Bar for Mobile */}
      {!adminMode && !loading && product && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)] border-t border-neutral-200 p-3 flex gap-3 md:hidden shadow-[0_-8px_30px_rgb(0,0,0,0.08)] backdrop-blur-md pb-safe">
          {/* Wishlist Button */}
          <button
            type="button"
            onClick={async () => {
              const productId = product.$id || product.id;
              const exists = wishlist.some(item => item.$id === productId || item.id === productId);
              let updated;
              if (exists) {
                dispatch(removeWishlistItemState(productId));
                const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
                updated = saved.filter(item => item.$id !== productId && item.id !== productId);
                localStorage.setItem('wishlist', JSON.stringify(updated));
                if (isAuthenticated && user) {
                  try {
                    await wishlistService.removeFromWishlist(user.$id, productId);
                  } catch (e) {
                    console.warn("⚠️ Firebase wishlist cloud sync failed:", e.message);
                  }
                }
              } else {
                dispatch(addWishlistItemState(product));
                const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
                updated = [...saved, product];
                localStorage.setItem('wishlist', JSON.stringify(updated));
                if (isAuthenticated && user) {
                  try {
                    await wishlistService.addToWishlist(user.$id, productId);
                  } catch (e) {
                    console.warn("⚠️ Firebase wishlist cloud sync failed:", e.message);
                  }
                }
              }
            }}
            className="w-14 shrink-0 bg-[var(--color-surface)] border border-neutral-950 hover:bg-[var(--color-surface)] rounded-none transition-all flex items-center justify-center cursor-pointer"
            title="Save to Wishlist"
          >
            {wishlist.some(item => item.$id === (product.$id || product.id) || item.id === (product.$id || product.id)) ? (
              <svg className="w-5 h-5 text-rose-500 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[var(--color-muted)] stroke-current fill-none stroke-2" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            )}
          </button>

          {/* Add to Cart Button */}
          <div className="flex-1 min-w-0">
            <AddToCartButton
              product={product}
              selectedSize={selectedSize}
              selectedColor={selectedColor}
              quantity={quantity}
            />
          </div>

          {/* Buy Now Button */}
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={isAllOutOfStock || (selectedSize && stocks[selectedSize] === 0)}
              className="w-full h-full flex items-center justify-center gap-2 font-bold text-xs tracking-widest uppercase py-4 rounded-none transition-all select-none cursor-pointer bg-neutral-950 hover:bg-neutral-800 text-white border border-neutral-950 disabled:bg-neutral-200 disabled:text-[var(--color-muted)] disabled:border-neutral-300 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isAllOutOfStock || (selectedSize && stocks[selectedSize] === 0) ? 'Sold Out' : (
                <span className="flex items-center gap-1.5">
                  <FiZap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Buy Now
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Premium Product Image Lightbox Modal with Gestures & Zoom Controls */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[200] flex flex-col justify-between bg-black/95 backdrop-blur-md select-none animate-fade-in outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsLightboxOpen(false);
            if (e.key === 'ArrowRight' && galleryImages.length > 1) handleLightboxNext();
            if (e.key === 'ArrowLeft' && galleryImages.length > 1) handleLightboxPrev();
          }}
          tabIndex={0}
          ref={(el) => {
            if (el) {
              lightboxModalRef.current = el;
              el.focus();
            }
          }}
          onMouseDown={(e) => {
            if (e.button !== 0) return; // Only left click
            if (e.target.closest('button')) return; // Ignore button clicks
            e.preventDefault();
            lightboxOffsetRef.current = lightboxOffset;
            lightboxZoomRef.current = lightboxZoom;
            const startX = e.clientX - lightboxOffsetRef.current.x;
            const startY = e.clientY - lightboxOffsetRef.current.y;
            
            const handleMouseMove = (moveEvent) => {
              if (lightboxZoomRef.current > 1) {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;
                lightboxOffsetRef.current = { x: dx, y: dy };
                if (lightboxImageRef.current) {
                  lightboxImageRef.current.style.transform = `translate(${dx}px, ${dy}px) scale(${lightboxZoomRef.current})`;
                }
              }
            };
            
            const handleMouseUp = () => {
              window.removeEventListener('mousemove', handleMouseMove);
              window.removeEventListener('mouseup', handleMouseUp);
              setLightboxOffset(lightboxOffsetRef.current);
            };
            
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
          }}
          onDoubleClick={(e) => {
            if (e.target.closest('button')) return; // Ignore buttons
            e.preventDefault();
            if (lightboxZoom > 1) {
              lightboxZoomRef.current = 1;
              lightboxOffsetRef.current = { x: 0, y: 0 };
              setLightboxZoom(1);
              setLightboxOffset({ x: 0, y: 0 });
              if (lightboxImageRef.current) {
                lightboxImageRef.current.style.transform = 'translate(0px, 0px) scale(1)';
              }
            } else {
              lightboxZoomRef.current = 2.5;
              lightboxOffsetRef.current = { x: 0, y: 0 };
              setLightboxZoom(2.5);
              setLightboxOffset({ x: 0, y: 0 });
              if (lightboxImageRef.current) {
                lightboxImageRef.current.style.transform = 'translate(0px, 0px) scale(2.5)';
              }
            }
          }}
        >
          {/* Top Bar */}
          <div className="w-full flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent text-white z-10">
            <div className="font-mono text-xs tracking-wider uppercase bg-black/40 px-3 py-1.5 border border-white/10 backdrop-blur-xs">
              {galleryImages.length > 1 ? `${activeImageIndex + 1} / ${galleryImages.length}` : '1 / 1'}
              {lightboxZoom > 1 && ` • ${Math.round(lightboxZoom * 100)}% Zoom`}
            </div>
            
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
                {lightboxZoom > 1 ? 'Drag to Pan • Double-tap to Reset' : 'Pinch or double-tap to zoom'}
              </span>
              <button
                type="button"
                className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-none border border-white/10 backdrop-blur-xs transition-colors cursor-pointer"
                onClick={() => setIsLightboxOpen(false)}
                title="Close Lightbox"
              >
                <FiX className="text-xl" />
              </button>
            </div>
          </div>

          {/* Central Image Viewer */}
          <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
            {/* Left Nav */}
            {galleryImages.length > 1 && (
              <button
                type="button"
                className="absolute left-4 z-25 bg-black/40 hover:bg-black/60 text-white p-3 border border-white/10 backdrop-blur-xs transition-all hover:scale-105 active:scale-95 cursor-pointer rounded-none"
                onClick={handleLightboxPrev}
                title="Previous Image"
              >
                <FiChevronLeft className="text-2xl" />
              </button>
            )}

            {/* Interactive Image Container */}
            <div 
              ref={lightboxContainerRef}
              className={`relative max-w-full max-h-[75vh] w-auto h-auto flex items-center justify-center ${lightboxZoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
            >
              {/* Spinner while high-res image resolves */}
              {!lightboxImageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-9 h-9 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              )}
              <img
                ref={lightboxImageRef}
                src={getOptimizedImageUrl(activeImage, 1200, 80)}
                alt="Product Detail Expanded"
                onLoad={() => setLightboxImageLoaded(true)}
                className={`max-w-full max-h-[75vh] object-contain transition-opacity duration-150 select-none pointer-events-none ${lightboxImageLoaded ? 'opacity-100' : 'opacity-30'}`}
                style={{
                  transform: `translate(${lightboxOffset.x}px, ${lightboxOffset.y}px) scale(${lightboxZoom})`,
                }}
              />
            </div>

            {/* Right Nav */}
            {galleryImages.length > 1 && (
              <button
                type="button"
                className="absolute right-4 z-25 bg-black/40 hover:bg-black/60 text-white p-3 border border-white/10 backdrop-blur-xs transition-all hover:scale-105 active:scale-95 cursor-pointer rounded-none"
                onClick={handleLightboxNext}
                title="Next Image"
              >
                <FiChevronRight className="text-2xl" />
              </button>
            )}
          </div>

          {/* Bottom Bar Controls */}
          <div className="w-full flex flex-col items-center gap-4 p-4 bg-gradient-to-t from-black/80 to-transparent text-white z-10">


            {/* Thumbnail previews */}
            {galleryImages.length > 1 && (
              <div className="flex gap-2 max-w-full overflow-x-auto pb-1 scrollbar-none">
                {galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (activeImageIndex !== idx) {
                        setLightboxImageLoaded(false);
                      }
                      setActiveImageIdx(idx);
                      setLightboxZoom(1);
                      setLightboxOffset({ x: 0, y: 0 });
                      setMainPhotoZoom(1);
                      setMainPhotoOffset({ x: 0, y: 0 });
                      
                      mainPhotoZoomRef.current = 1;
                      mainPhotoOffsetRef.current = { x: 0, y: 0 };
                      lightboxZoomRef.current = 1;
                      lightboxOffsetRef.current = { x: 0, y: 0 };
                      
                      if (mainImageRef.current) {
                        mainImageRef.current.style.transform = 'translate(0px, 0px) scale(1)';
                      }
                      if (lightboxImageRef.current) {
                        lightboxImageRef.current.style.transform = 'translate(0px, 0px) scale(1)';
                      }
                    }}
                    className={`w-10 h-12 border transition-all duration-300 shrink-0 ${activeImageIndex === idx ? 'border-white scale-95 shadow-lg' : 'border-white/25 opacity-60 hover:opacity-100'}`}
                  >
                    <img 
                      src={getOptimizedImageUrl(imgUrl, 100, 75)} 
                      alt="Thumbnail preview" 
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover" 
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      </div>
      <Footer />
    </>
  );
}

export default ProductDetail;

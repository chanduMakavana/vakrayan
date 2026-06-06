import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiChevronDown, FiChevronUp, FiShield, FiTruck, FiScissors, FiArrowLeft, FiMapPin } from 'react-icons/fi';
import { useSelector, useDispatch } from 'react-redux';
import productsService from '../../appwrite/products';
import reviewsService from '../../appwrite/reviews';
import ordersService from '../../appwrite/orders';
import wishlistService from '../../appwrite/wishlist';
import { addWishlistItemState, removeWishlistItemState } from '../../features/wishlistSlice';
import AddToCartButton from '../pageComponets/AddToCartButton';
import Navbar from '../pageComponets/Navbar';
import Footer from '../pageComponets/Footer';
import restockService from '../../appwrite/restock';
import { FaStar } from 'react-icons/fa';
import { useToast } from '../../context/ToastContext';
import storageService, { compressImage } from '../../appwrite/storage';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const dispatch = useDispatch();
  const products = useSelector(state => state.products.items || []);
  const wishlist = useSelector(state => state.wishlist || []);
  const { user, isAuthenticated, adminMode } = useSelector(state => state.auth);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [activeVariant, setActiveVariant] = useState(null);
  const [groupProducts, setGroupProducts] = useState([]);

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
  const [newReviewTitle, setNewReviewTitle] = useState('');
  const [newReviewImages, setNewReviewImages] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasDeliveredOrder, setHasDeliveredOrder] = useState(false);
  const [checkingOrder, setCheckingOrder] = useState(true);

  // Fit & characteristic rating inputs states
  const [newFit, setNewFit] = useState('true'); // 'tight', 'true', or 'loose'
  const [newComfort, setNewComfort] = useState(5);
  const [newQuality, setNewQuality] = useState(5);
  const [newBreathable, setNewBreathable] = useState(5);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Virtual Size Advisor & Wishlist Integration
  const [sizeAdvisorOpen, setSizeAdvisorOpen] = useState(false);
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
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

  // Pincode Checker States
  const [pincodeInput, setPincodeInput] = useState(() => localStorage.getItem('checked_pincode') || '');
  const [pinChecking, setPinChecking] = useState(false);
  const [pinResult, setPinResult] = useState(null);
  const [pinError, setPinError] = useState('');

  const isCodAvailableForPincode = (pin, stateName = '') => {
    if (!pin) return true;
    const state = stateName.toUpperCase().trim();
    if (pin.startsWith('19') || pin.startsWith('79') || pin.startsWith('744')) {
      return false;
    }
    if (['JAMMU & KASHMIR', 'JAMMU AND KASHMIR', 'ANDAMAN & NICOBAR ISLANDS', 'ANDAMAN AND NICOBAR ISLANDS', 'LAKSHADWEEP'].includes(state)) {
      return false;
    }
    return true;
  };

  const calculateDeliveryDetails = (pin, stateName = '', districtName = '') => {
    const state = stateName.toUpperCase().trim();
    const firstDigit = pin[0];

    let minTransit = 3;
    let maxTransit = 5;
    let desc = 'Standard Dispatch';
    let carrier = 'Bluedart Express';

    if (pin === '395006') {
      minTransit = 0;
      maxTransit = 1;
      desc = 'Surat Warehouse Local Dispatch';
      carrier = 'Surat Local Express / Self Pickup';
    } else if (state === 'GUJARAT' || pin.startsWith('39')) {
      minTransit = 1;
      maxTransit = 2;
      desc = 'Gujarat Regional Delivery';
      carrier = 'Delhivery Express';
    } else if (state === 'MAHARASHTRA' || state === 'RAJASTHAN' || state === 'MADHYA PRADESH' || firstDigit === '4' || pin.startsWith('30') || pin.startsWith('31') || pin.startsWith('32') || pin.startsWith('33') || pin.startsWith('34')) {
      minTransit = 2;
      maxTransit = 3;
      desc = 'West/Central India Express Shipping';
      carrier = 'Delhivery Air';
    } else if (['DELHI', 'HARYANA', 'PUNJAB', 'UTTAR PRADESH', 'KARNATAKA', 'TELANGANA', 'ANDHRA PRADESH', 'TAMIL NADU'].includes(state) || ['1', '2', '5'].includes(firstDigit)) {
      minTransit = 3;
      maxTransit = 4;
      desc = 'Metro Connect Express Delivery';
      carrier = 'Bluedart Air';
    } else if (['7', '8'].includes(firstDigit)) {
      minTransit = 4;
      maxTransit = 5;
      desc = 'East India Connect';
      carrier = 'Xpressbees Courier';
    } else {
      minTransit = 5;
      maxTransit = 7;
      desc = 'National Connect Remote Delivery';
      carrier = 'India Post Speed Post';
    }

    // Today is order placement date.
    // Dispatch delay: 1 day minimum, 2 days maximum.
    const today = new Date();
    const minDeliveryDate = new Date();
    minDeliveryDate.setDate(today.getDate() + 1 + minTransit);

    const maxDeliveryDate = new Date();
    maxDeliveryDate.setDate(today.getDate() + 2 + maxTransit);

    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    const dateRange = `${minDeliveryDate.toLocaleDateString('en-IN', options)} - ${maxDeliveryDate.toLocaleDateString('en-IN', options)}`;

    return { days: `${minTransit + 1}-${maxTransit + 2} Days`, dateRange, desc, carrier };
  };

  const performPincodeCheck = async (pin) => {
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
        const details = calculateDeliveryDetails(pin, po.State, po.District);
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
  };

  useEffect(() => {
    const stored = localStorage.getItem('checked_pincode');
    if (stored && /^[1-9][0-9]{5}$/.test(stored)) {
      performPincodeCheck(stored);
    }
  }, []);

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
              let stockMap = {};
              try {
                stockMap = JSON.parse(cachedProduct.sizes_stock || '{}');
              } catch {
                stockMap = {};
              }
              const firstInStockSize = cachedProduct.sizes.find(sz => stockMap[sz] > 0);
              setSelectedSize(firstInStockSize || cachedProduct.sizes[0]);
            }

           // Initialize selectedColor if Option B JSON exists
           if (cachedProduct.color_hex && cachedProduct.color_hex.startsWith('[')) {
             try {
               const parsed = JSON.parse(cachedProduct.color_hex);
               if (Array.isArray(parsed) && parsed.length > 0) {
                 setSelectedColor(parsed[0].name);
                 setActiveVariant(parsed[0]);
                 setActiveImage(parsed[0].front || cachedProduct.front_image_link || cachedProduct.image_url || cachedProduct.image);
               }
             } catch (e) {
               console.warn("Error parsing color_hex:", e);
             }
           } else {
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

       // Database fallback queries
       const mainProductData = await productsService.getProductById(id);

       if (mainProductData && isMounted) {
         setProduct(mainProductData);
         setActiveImage(mainProductData.front_image_link || mainProductData.image_url || mainProductData.image);
         
          if (mainProductData.sizes && mainProductData.sizes.length > 0) {
            let stockMap = {};
            try {
              stockMap = JSON.parse(mainProductData.sizes_stock || '{}');
            } catch {
              stockMap = {};
            }
            const firstInStockSize = mainProductData.sizes.find(sz => stockMap[sz] > 0);
            setSelectedSize(firstInStockSize || mainProductData.sizes[0]);
          }

         // Initialize selectedColor if Option B JSON exists
         if (mainProductData.color_hex && mainProductData.color_hex.startsWith('[')) {
           try {
             const parsed = JSON.parse(mainProductData.color_hex);
             if (Array.isArray(parsed) && parsed.length > 0) {
               setSelectedColor(parsed[0].name);
               setActiveVariant(parsed[0]);
               setActiveImage(parsed[0].front || mainProductData.front_image_link || mainProductData.image_url || mainProductData.image);
             }
           } catch (e) {
             console.warn("Error parsing color_hex:", e);
           }
         } else {
           setSelectedColor(mainProductData.color_name || '');
           setActiveVariant(null);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (product && product.color_group_id && products.length > 0) {
      const siblings = products.filter(
        p => p.color_group_id === product.color_group_id
      );
      setGroupProducts(siblings);
    } else {
      setGroupProducts([]);
    }
  }, [product, products]);

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
        fit: newFit,
        comfort: newComfort,
        quality: newQuality,
        breathable: newBreathable
      });

      if (newDoc) {
        setReviews(prev => [newDoc, ...prev]);
        setNewComment('');
        setNewRating(5);
        setNewReviewTitle('');
        setNewReviewImages('');
        setNewFit('true');
        setNewComfort(5);
        setNewQuality(5);
        setNewBreathable(5);
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
      // Compress reviews images to save storage and improve loading speed
      const compressedFile = await compressImage(file, 800, 800, 0.7);

      const response = await storageService.uploadFile(compressedFile);
      if (response?.$id) {
        const fileUrl = storageService.getFileView(response.$id);
        const newUrlList = currentImages.trim() 
          ? `${currentImages.trim()}, ${fileUrl}` 
          : fileUrl;
        setImagesValue(newUrlList);
        showToast("✓ Image uploaded successfully to Appwrite Storage!", "success");
      } else {
        throw new Error("Failed to upload image file");
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      showToast("Appwrite Storage upload failed. Ensure bucket ID 'images' exists, or paste a URL.", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white text-neutral-900 font-sans">
        <Navbar />
        <div className="flex flex-col items-center justify-center gap-4 py-32">
          <div className="w-6 h-6 border-2 border-neutral-950 border-t-transparent rounded-none animate-spin" />
          <div className="text-[10px] tracking-[0.5em] text-neutral-900 font-mono font-bold uppercase">
            Loading product details...
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full min-h-screen bg-white text-neutral-900 font-sans">
        <Navbar />
        <div className="flex flex-col items-center justify-center gap-6 py-32 text-center">
          <p className="text-xs uppercase tracking-widest text-neutral-400 font-mono font-bold">
            Requested drop not found.
          </p>
          <Link to="/" className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-950 border-b border-neutral-950 pb-0.5 hover:text-neutral-600 transition-colors">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }
  // Dynamic Fit Statistics & Characteristics Calculation
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
        // legacy review comment
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

  // Parse stocks mapping
  let stocks = {};
  try {
    stocks = JSON.parse(product?.sizes_stock || '{}');
  } catch {
    stocks = {};
  }

  // Check if completely out of stock across all defined sizes
  let isAllOutOfStock = false;
  if (product && product.sizes && product.sizes.length > 0) {
    const totalStock = product.sizes.reduce((acc, size) => acc + (stocks[size] !== undefined ? Number(stocks[size]) : 0), 0);
    isAllOutOfStock = totalStock === 0;
  }

  const galleryImages = activeVariant
    ? [activeVariant.front, activeVariant.back].filter(Boolean)
    : [
        product.front_image_link || product.image_url || product.image,
        ...(Array.isArray(product.back_image_links) ? product.back_image_links : [product.back_image_link])
      ].filter(Boolean);

  return (
    <div className="w-full min-h-screen bg-white text-neutral-900 font-sans pb-20">
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
                    className={`w-14 h-18 md:w-full md:aspect-3/4 rounded-none overflow-hidden bg-neutral-100 border shrink-0 transition-all duration-300 ${activeImage === imgUrl ? 'border-neutral-950 scale-95 shadow-sm' : 'border-neutral-200 hover:border-neutral-950'}`}
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
              className={`w-full ${galleryImages.length > 1 ? 'md:col-span-10' : 'md:col-span-12'} order-1 md:order-2 rounded-none overflow-hidden bg-white border border-neutral-950/10 relative group cursor-zoom-in`}
            >
              <div className="absolute top-4 right-4 bg-white border border-neutral-950/15 text-neutral-800 font-mono text-[9px] tracking-wider px-2 py-1 rounded-none z-10 pointer-events-none uppercase">
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
                <span className="text-[10px] bg-neutral-950 text-white font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-none">
                  {product.category?.replace('-', ' ')}
                </span>
                {product.tag && (
                  <span className="text-[10px] bg-neutral-950 text-white font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-none border border-neutral-950">
                    {product.tag}
                  </span>
                )}
                {isAllOutOfStock ? (
                  <span className="flex items-center gap-1.5 text-[10px] text-rose-600 font-mono font-semibold uppercase tracking-wider bg-rose-50 px-2.5 py-0.5 rounded-none border border-rose-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    SOLD OUT
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-mono font-semibold uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    In Stock
                  </span>
                )}
                {adminMode && (
                  <button
                    onClick={() => navigate('/admin', { state: { editProductId: product.$id || product.id } })}
                    className="flex items-center gap-1 text-[10px] text-neutral-950 font-mono font-bold uppercase tracking-wider bg-yellow-450 hover:bg-yellow-500 px-2.5 py-1 rounded-none border border-neutral-950 cursor-pointer shadow-xs transition-all"
                  >
                    ✏️ Edit Drop
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-950 uppercase">
                  {product.name}
                </h1>
              </div>

              {/* Product Star Summary Row */}
              <div className="flex items-center gap-2 pt-1">
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
                  className="text-[10px] font-mono font-bold text-neutral-500 hover:text-neutral-950 hover:underline transition-colors uppercase tracking-wider"
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
                  <div className="flex items-baseline gap-3 pt-1 flex-wrap">
                    <span className="text-2xl font-mono font-bold text-neutral-950">
                      ₹{priceNum.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[9px] text-neutral-450 font-sans tracking-wide uppercase font-bold">
                      incl. of all taxes
                    </span>
                    {compareDisplay && (
                      <>
                        <span className="text-sm text-neutral-400 line-through font-mono font-medium">
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

            {/* Share and Copy Utilities */}
            <div className="flex items-center gap-3 pt-2 pb-4">
              <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest font-bold">Share Drop:</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast("📋 Drop link copied to clipboard!", "success");
                }}
                className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-800 border border-neutral-200 bg-white hover:border-neutral-950 hover:bg-neutral-50 px-2.5 py-1 transition-all cursor-pointer font-sans"
              >
                Copy Link
              </button>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this streetwear fit drop: ${product.name} at ${window.location.href}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-700 border border-emerald-200 bg-emerald-50 hover:border-emerald-600 hover:bg-emerald-100/50 px-2.5 py-1 transition-all cursor-pointer font-sans no-underline"
              >
                Share to WhatsApp
              </a>
            </div>

            <div className="border-t border-neutral-200/50" />

            {/* Color Swatch Selection */}
            {(() => {
              let isOptionB = false;
              let optionBVariants = [];
              if (product.color_hex && product.color_hex.startsWith('[')) {
                try {
                  const parsed = JSON.parse(product.color_hex);
                  if (Array.isArray(parsed)) {
                    isOptionB = true;
                    optionBVariants = parsed;
                  }
                } catch (e) {
                  console.warn("Failed parsing Option B variants:", e);
                }
              }

              if (isOptionB && optionBVariants.length > 0) {
                return (
                  <div className="space-y-3 pb-4">
                    <h4 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                      COLOR: <span className="text-neutral-950 font-sans font-extrabold">{selectedColor || 'SELECT COLOR'}</span>
                    </h4>
                    <div className="flex gap-2.5 flex-wrap">
                      {optionBVariants.map((variant, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedColor(variant.name);
                            setActiveVariant(variant);
                            if (variant.front) {
                              setActiveImage(variant.front);
                            }
                          }}
                          className={`w-10 h-12 rounded-none border flex items-center justify-center p-0.5 cursor-pointer transition-all ${
                            selectedColor === variant.name
                              ? 'border-neutral-950 scale-110 shadow-sm'
                              : 'border-neutral-200 hover:border-neutral-400'
                          }`}
                          title={variant.name}
                        >
                          <img
                            src={variant.front || 'https://placehold.co/100x120?text=Color'}
                            alt={variant.name}
                            className="w-full h-full object-cover object-center"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              if (product.color_group_id && groupProducts.length > 1) {
                return (
                  <div className="space-y-3 pb-4">
                    <h4 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                      COLOR ARCHIVE: <span className="text-neutral-950 font-sans font-extrabold">{product.color_name || 'ORIGINAL'}</span>
                    </h4>
                    <div className="flex gap-2.5 flex-wrap">
                      {groupProducts.map((sibling) => {
                        const siblingId = sibling.$id || sibling.id;
                        const isCurrent = siblingId === (product.$id || product.id);
                        return (
                          <button
                            key={siblingId}
                            type="button"
                            onClick={() => {
                              if (!isCurrent) {
                                navigate(`/product/${siblingId}`);
                              }
                            }}
                            className={`w-10 h-12 rounded-none border flex items-center justify-center p-0.5 cursor-pointer transition-all ${
                              isCurrent
                                ? 'border-neutral-950 scale-110 shadow-sm'
                                : 'border-neutral-200 hover:border-neutral-400'
                            }`}
                            title={sibling.color_name}
                          >
                            <img
                              src={sibling.front_image_link || sibling.image_url || sibling.image || 'https://placehold.co/100x120?text=Color'}
                              alt={sibling.color_name}
                              className="w-full h-full object-cover object-center"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (product.color_name) {
                return (
                  <div className="space-y-1.5 pb-4">
                    <h4 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                      COLOR: <span className="text-neutral-950 font-sans font-extrabold">{product.color_name}</span>
                    </h4>
                  </div>
                );
              }

              return null;
            })()}

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
                    <div className="flex gap-4">
                      <span 
                        onClick={() => setIsSizeChartOpen(true)}
                        className="text-xs text-neutral-950 font-mono font-bold border-b border-neutral-950 cursor-pointer pb-0.5 hover:text-neutral-600 transition-colors uppercase tracking-wider"
                      >
                        Size Guide
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {product.sizes.map((size) => {
                      const isSoldOut = stockMap[size] === 0;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`py-2.5 rounded-none font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer border ${
                            isSoldOut && selectedSize === size
                            ? 'bg-neutral-200 text-neutral-600 border-neutral-400 line-through font-extrabold'
                            : isSoldOut 
                            ? 'bg-neutral-50 text-neutral-400 border-neutral-200 line-through hover:border-neutral-400' 
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
                          <div className="p-3 bg-neutral-900 border border-neutral-800 text-white rounded-none flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <p className="text-[10px] text-neutral-300 font-bold uppercase tracking-wider font-mono">
                              ✕ Size {selectedSize} is Out of Stock
                            </p>
                          </div>
                          
                          {notifyStatus !== 'success' ? (
                            <form onSubmit={(e) => handleNotifyMe(e, selectedSize)} className="space-y-1.5">
                              <label className="text-[9px] text-neutral-500 font-mono font-bold uppercase tracking-wider block">
                                Get notified when we restock this size:
                              </label>
                              <div className="flex rounded-none overflow-hidden border border-neutral-950/20 bg-white focus-within:border-neutral-950 transition-colors">
                                <input 
                                  type="email" 
                                  value={notifyEmail}
                                  onChange={(e) => setNotifyEmail(e.target.value)}
                                  placeholder="ENTER YOUR EMAIL" 
                                  disabled={notifyStatus === 'loading'}
                                  className="bg-transparent text-neutral-800 placeholder-neutral-400 text-[10px] tracking-wider px-4 py-3 w-full outline-none font-mono"
                                />
                                <button 
                                  type="submit" 
                                  disabled={notifyStatus === 'loading'}
                                  className="bg-neutral-950 text-white font-mono font-bold text-xs px-5 uppercase hover:bg-neutral-850 transition-colors cursor-pointer disabled:bg-neutral-300 rounded-none"
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
                            <div className="p-3 bg-emerald-950 text-emerald-400 border border-emerald-900 rounded-none text-[10px] font-mono font-bold uppercase tracking-widest leading-normal animate-scale-up">
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
                          <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 animate-pulse">
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              ⚠️ Extremely Low Stock in Size {selectedSize}!
                            </span>
                            <span>Only {stockVal} items left</span>
                          </div>
                          {/* Premium warning bar */}
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
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100/60 rounded-none flex items-center gap-2 mt-2 animate-fade-in">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <p className="text-[10px] text-emerald-700 font-mono font-bold uppercase tracking-wider">
                          ✓ Size {selectedSize} is In Stock - Ready for immediate drop
                        </p>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Cart Operations */}
            <div className="space-y-4 pt-2 border-t border-neutral-150">
              <div className="flex gap-4 items-center">
                <div className="flex-1 transform active:scale-[0.99] transition-transform duration-150">
                  <AddToCartButton
                    product={product}
                    selectedSize={selectedSize}
                    selectedColor={selectedColor}
                  />
                </div>
                
                {/* Wishlist Detail Toggle */}
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
                          console.warn("⚠️ Appwrite wishlist cloud sync failed:", e.message);
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
                          console.warn("⚠️ Appwrite wishlist cloud sync failed:", e.message);
                        }
                      }
                    }
                  }}
                  className="p-3 bg-white border border-neutral-950 hover:bg-neutral-50 rounded-none shadow-xs transition-all group shrink-0 cursor-pointer"
                  title="Save Fit to Wishlist"
                >
                  {wishlist.some(item => item.$id === (product.$id || product.id) || item.id === (product.$id || product.id)) ? (
                    <svg className="w-5 h-5 text-rose-500 fill-current" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-neutral-400 group-hover:text-neutral-950 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 text-neutral-500 text-xs bg-neutral-50 border border-neutral-100 p-3 rounded-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <p className="font-mono text-[10px] uppercase tracking-wide">
                  7-Day exchange and return policy active.
                </p>
              </div>
            </div>

            {/* Pincode Checker Component */}
            <div className="pt-4 pb-2 border-t border-neutral-150 space-y-3">
              <span className="text-[8px] font-bold text-neutral-400 block tracking-widest uppercase">CHECK DELIVERY AVAILABILITY</span>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
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
                    className="w-full bg-[#fbfbfb] border border-neutral-200 focus:border-neutral-950 focus:bg-white rounded-none pl-8 pr-4 py-2 text-xs font-mono text-neutral-900 placeholder-neutral-400 outline-none tracking-widest transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => performPincodeCheck(pincodeInput)}
                  disabled={pinChecking || pincodeInput.length !== 6}
                  className="bg-neutral-950 hover:bg-neutral-850 text-white font-mono font-bold text-[10px] px-5 py-2 uppercase transition-all tracking-wider disabled:bg-neutral-200 disabled:text-neutral-400 cursor-pointer shrink-0 rounded-none border border-neutral-950 disabled:border-neutral-200"
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
                <div className="p-3 bg-neutral-50/70 border border-neutral-200/50 rounded-none text-xs space-y-1.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] tracking-wider text-neutral-400 uppercase">DELIVERY FOR:</span>
                    <span className="font-mono text-[9px] font-black text-neutral-800 uppercase bg-neutral-100 px-1.5 py-0.5 rounded-sm">
                      {pinResult.pincode}
                    </span>
                  </div>
                  
                  {pinResult.location && (
                    <div className="text-[10px] font-black text-neutral-800 uppercase">
                      📍 {pinResult.location}
                    </div>
                  )}

                  <div className="flex items-start gap-1.5 pt-1 text-neutral-600">
                    <FiTruck className="text-xs shrink-0 mt-0.5 text-neutral-800" />
                    <div>
                      <p className="text-neutral-900 font-black text-[11px] uppercase tracking-wide">
                        ESTIMATED ARRIVAL: {pinResult.dateRange}
                      </p>
                      <p className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest mt-0.5">
                        {pinResult.desc} (dispatched in 1-2 days) · via {pinResult.carrier}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-1.5 border-t border-dashed border-neutral-200 space-y-1">
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
                    
                    <div className="text-[9px] text-neutral-500 font-black uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                      Free delivery on orders ₹999 & above (else ₹99)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Accordions */}
            <div className="border-t border-b border-neutral-200 divide-y divide-neutral-200">

              {/* DESCRIPTION */}
              {product.description && (
                <div className="py-3.5">
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="w-full flex items-center justify-between text-left text-xs font-mono font-bold tracking-wider text-neutral-800 uppercase focus:outline-none"
                  >
                    <span>Description</span>
                    {descExpanded ? <FiChevronUp className="text-base" /> : <FiChevronDown className="text-base" />}
                  </button>
                  <div className={`transition-all duration-300 overflow-hidden ${descExpanded ? 'max-h-40 mt-2.5 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-4 rounded-none border border-neutral-950/10">
                      {product.description}
                    </p>
                  </div>
                </div>
              )}

              {/* SIZING */}
              <div className="py-3.5">
                <button
                  onClick={() => setSizingExpanded(!sizingExpanded)}
                  className="w-full flex items-center justify-between text-left text-xs font-mono font-bold tracking-wider text-neutral-800 uppercase focus:outline-none"
                >
                  <span><FiScissors className="inline mr-2 text-sm" /> Size & Fit Details</span>
                  {sizingExpanded ? <FiChevronUp className="text-base" /> : <FiChevronDown className="text-base" />}
                </button>
                <div className={`transition-all duration-300 overflow-hidden ${sizingExpanded ? 'max-h-60 mt-2.5 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-4 rounded-none border border-neutral-950/15 space-y-2">
                    {product.fit_type && (
                      <p className="font-mono text-[10px] tracking-wide uppercase"><strong className="text-neutral-900 font-sans text-xs">SILHOUETTE / FIT:</strong> {product.fit_type}</p>
                    )}
                    {product.fabric_gsm && (
                      <p className="font-mono text-[10px] tracking-wide uppercase"><strong className="text-neutral-900 font-sans text-xs">FABRIC WEIGHT / GSM:</strong> {product.fabric_gsm}</p>
                    )}
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
                  className="w-full flex items-center justify-between text-left text-xs font-mono font-bold tracking-wider text-neutral-800 uppercase focus:outline-none"
                >
                  <span><FiTruck className="inline mr-2 text-sm" /> Shipping & Returns</span>
                  {shippingExpanded ? <FiChevronUp className="text-base" /> : <FiChevronDown className="text-base" />}
                </button>
                <div className={`transition-all duration-300 overflow-hidden ${shippingExpanded ? 'max-h-40 mt-2.5 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-4 rounded-none border border-neutral-950/10 space-y-2">
                    <p>&bull; Free express shipping on all orders nationwide.</p>
                    <p>&bull; Dispatched in custom protective packaging.</p>
                    <p>&bull; Easy 7-day swap guarantee for perfect size matches.</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Trust Footer */}
            <div className="flex items-center gap-3 text-xs text-neutral-500 border border-neutral-950/15 bg-white p-4 rounded-none">
              <FiShield className="text-lg text-neutral-700 shrink-0" />
              <div className="leading-tight">
                <span className="font-bold font-sans text-neutral-800 block mb-0.5">Authentic Quality Guaranteed</span>
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
                const activeTag = item.tag || "";

                return (
                  <div 
                    key={uniqueId} 
                    onClick={() => {
                      navigate(`/product/${uniqueId}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} 
                    className="group relative flex flex-col bg-white rounded-none p-2 border border-neutral-950/10 hover:border-neutral-950 transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    {/* Viewport Image */}
                    <div className="w-full aspect-3/4 rounded-none overflow-hidden bg-neutral-100 relative border border-neutral-200/50">
                      
                      {/* Tag Badge */}
                      {activeTag && (
                        <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 bg-white border border-neutral-950 px-2 py-0.5 rounded-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-950 animate-pulse animate-duration-1000" />
                          <span className="text-neutral-950 font-mono font-bold text-[9px] uppercase tracking-wider">
                            {activeTag}
                          </span>
                        </div>
                      )}

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
                        <span className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider block mb-0.5">
                          {item.category?.replace('-', ' ') || "Collection"}
                        </span>
                        <h3 className="text-xs font-bold text-neutral-950 uppercase group-hover:text-neutral-600 transition-colors truncate">
                          {item.name}
                        </h3>
                      </div>
                      
                      <div className="mt-3 pt-2 border-t border-neutral-950/10 flex items-center justify-between gap-4">
                        <div className="flex items-baseline gap-1.5 font-mono">
                          <span className="text-sm font-bold text-neutral-950">
                            ₹{Number(item.price).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-neutral-400 group-hover:text-neutral-950 transition-colors">
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
        <div id="reviews-section" className="pt-16 border-t border-neutral-200/60 space-y-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-neutral-900">
              Customer Reviews ({reviews.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* COLUMN 1: RATINGS SCORECARD & WRITE REVIEW (5 Columns) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Ratings Summary Card */}
              {reviews.length > 0 && (
                <div className="bg-white p-6 rounded-none border border-neutral-950/15 flex items-center gap-6">
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
                    <span className="text-[9px] font-mono font-bold text-neutral-500 uppercase mt-2 block">
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
                        <div key={stars} className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono font-bold">
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

              {/* Sizing & Fit Stats (True to Size) */}
              {reviews.length > 0 && (
                <div className="bg-white p-6 rounded-none border border-neutral-950/15 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-neutral-855">
                      Fit Statistics
                    </h3>
                    <span className="text-[9px] text-emerald-600 font-mono font-bold bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded-none">
                      {fitStats.verifiedFitPercent}% Verified Fit
                    </span>
                  </div>
                  
                  <div className="space-y-4 pt-2">
                    {/* Slider indicator */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono font-bold uppercase text-neutral-500">
                        <span>Tight ({fitStats.fitTightPercent}%)</span>
                        <span className="text-neutral-950 font-bold">True To Size ({fitStats.fitTruePercent}%)</span>
                        <span>Loose ({fitStats.fitLoosePercent}%)</span>
                      </div>
                      <div className="relative h-2 bg-neutral-100 rounded-none overflow-hidden flex">
                        {/* Tight segment */}
                        <div className="h-full bg-rose-300 transition-all duration-550" style={{ width: `${fitStats.fitTightPercent}%` }} />
                        {/* True to Size segment */}
                        <div className="h-full bg-neutral-950 transition-all duration-550" style={{ width: `${fitStats.fitTruePercent}%` }} />
                        {/* Loose segment */}
                        <div className="h-full bg-amber-300 transition-all duration-550" style={{ width: `${fitStats.fitLoosePercent}%` }} />
                      </div>
                    </div>

                    {/* Rating parameters */}
                    <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                      <div className="p-3 bg-neutral-50 rounded-none border border-neutral-950/10">
                        <span className="text-[18px] font-mono font-bold text-neutral-950">{fitStats.avgComfort}</span>
                        <span className="text-[9px] text-neutral-455 font-mono font-bold uppercase tracking-wider block mt-1">Comfort</span>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-none border border-neutral-950/10">
                        <span className="text-[18px] font-mono font-bold text-neutral-950">{fitStats.avgQuality}</span>
                        <span className="text-[9px] text-neutral-455 font-mono font-bold uppercase tracking-wider block mt-1">Quality</span>
                      </div>
                      <div className="p-3 bg-neutral-50 rounded-none border border-neutral-950/10">
                        <span className="text-[18px] font-mono font-bold text-neutral-950">{fitStats.avgBreathable}</span>
                        <span className="text-[9px] text-neutral-455 font-mono font-bold uppercase tracking-wider block mt-1">Breathable</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Write Review Panel */}
              <div className="bg-white p-6 rounded-none border border-neutral-950/15 space-y-4">
                <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-neutral-850">
                  Write a Review
                </h3>
                {!isAuthenticated ? (
                  <div className="text-center py-6 border border-dashed border-neutral-200 bg-neutral-50/50 rounded-none">
                    <p className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-widest mb-3">
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
                    <span className="text-[10px] tracking-widest font-mono text-neutral-400 uppercase">Verifying purchase history...</span>
                  </div>
                ) : hasDeliveredOrder ? (
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    {/* Star Rating Select */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-mono font-bold text-neutral-500 uppercase">Your Rating</span>
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

                    {/* Fit Selection */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-mono font-bold text-neutral-500 uppercase">Size Fit Preference</span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'tight', label: 'TIGHT' },
                          { key: 'true', label: 'TRUE TO SIZE' },
                          { key: 'loose', label: 'LOOSE' }
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setNewFit(item.key)}
                            className={`py-2 rounded-none font-bold text-[10px] tracking-wider transition-all cursor-pointer border uppercase font-mono ${
                              newFit === item.key
                                ? 'bg-neutral-950 text-white border-neutral-950'
                                : 'bg-[#fbfbfb] text-neutral-500 border-neutral-200 hover:border-neutral-950 hover:text-neutral-950'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Characteristic Metrics (Comfort, Quality, Breathable) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Comfort */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">Comfort Rating</span>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setNewComfort(val)}
                              className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-[9px] border transition-all cursor-pointer rounded-none ${
                                newComfort === val
                                  ? 'bg-neutral-950 text-white border-neutral-950'
                                  : 'bg-[#fbfbfb] text-neutral-500 border-neutral-200 hover:border-neutral-950 hover:text-neutral-950'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Quality */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">Quality Rating</span>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setNewQuality(val)}
                              className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-[9px] border transition-all cursor-pointer rounded-none ${
                                newQuality === val
                                  ? 'bg-neutral-950 text-white border-neutral-950'
                                  : 'bg-[#fbfbfb] text-neutral-500 border-neutral-200 hover:border-neutral-950 hover:text-neutral-950'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Breathable */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">Breathable Rating</span>
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setNewBreathable(val)}
                              className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-[9px] border transition-all cursor-pointer rounded-none ${
                                newBreathable === val
                                  ? 'bg-neutral-950 text-white border-neutral-950'
                                  : 'bg-[#fbfbfb] text-neutral-500 border-neutral-200 hover:border-neutral-950 hover:text-neutral-950'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Review Title Input */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-mono font-bold text-neutral-500 uppercase">Review Title</span>
                      <input
                        type="text"
                        value={newReviewTitle}
                        onChange={(e) => setNewReviewTitle(e.target.value)}
                        placeholder="Summarize your experience..."
                        className="w-full bg-[#fbfbfb] border border-neutral-950/20 focus:border-neutral-950 rounded-none px-3 py-2 text-xs text-neutral-850 outline-hidden transition-colors font-sans"
                      />
                    </div>

                    {/* Review Comment Textarea */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-mono font-bold text-neutral-500 uppercase">Your Review</span>
                      <textarea
                        rows="3"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write your product experience here..."
                        className="w-full bg-[#fbfbfb] border border-neutral-950/20 focus:border-neutral-950 rounded-none px-3 py-2.5 text-xs text-neutral-850 outline-hidden resize-none transition-colors font-sans"
                      />
                    </div>

                    {/* Review Image URLs */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-mono font-bold text-neutral-500 uppercase">Customer Image URLs (comma-separated, optional)</span>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={newReviewImages}
                          onChange={(e) => setNewReviewImages(e.target.value)}
                          placeholder="https://example.com/pic1.jpg, https://example.com/pic2.jpg"
                          className="flex-1 bg-[#fbfbfb] border border-neutral-950/20 focus:border-neutral-950 rounded-none px-3 py-2 text-xs text-neutral-850 outline-hidden transition-colors font-sans"
                        />
                        <label className="shrink-0 bg-neutral-950 hover:bg-neutral-850 text-white font-mono font-bold text-[10px] tracking-wider px-3 py-2.5 rounded-none uppercase transition-all cursor-pointer border border-neutral-950 text-center">
                          {uploadingImage ? 'Uploading...' : 'Upload File'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, setNewReviewImages, newReviewImages)}
                            disabled={uploadingImage}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <span className="text-[8px] font-mono text-neutral-450 uppercase tracking-wide">
                        TIP: PASTE DIRECT HTTPS LINKS OR CHOOSE A LOCAL IMAGE TO UPLOAD TEMPORARILY.
                      </span>
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
                  <div className="text-center py-6 px-4 border border-dashed border-neutral-200 bg-neutral-50/50 rounded-none space-y-3">
                    <p className="text-[10px] font-mono font-bold text-rose-600 uppercase tracking-wider leading-relaxed">
                      Review Lock Active
                    </p>
                    <p className="text-xs text-neutral-500 leading-relaxed font-sans">
                      Reviews are restricted to verified purchasers of this item. To submit a review, you must have an order for this product marked as <strong className="text-neutral-950 font-bold">Delivered</strong> in your profile history.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: REVIEWS FEED LIST (7 Columns) */}
            <div className="lg:col-span-7 space-y-4">
              {reviews.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-neutral-200 rounded-none bg-neutral-50/50">
                  <p className="text-xs text-neutral-500 font-mono font-bold">
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
                      <div key={uniqueId} className="bg-white p-5 rounded-none border border-neutral-950/10 space-y-2 hover:border-neutral-950 transition-colors duration-200">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono text-neutral-400 block font-bold">
                              {formattedDate}
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-neutral-950 uppercase font-sans">
                                {rev.userName}
                              </span>
                              {verifiedPurchase && (
                                <span className="inline-flex items-center gap-0.5 text-[8px] text-emerald-600 font-mono font-bold bg-emerald-50 border border-emerald-250 px-1 py-0.2 uppercase">
                                  ✓ VERIFIED BUYER
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <FaStar
                                key={star}
                                className={`text-[10px] ${star <= (isNaN(Number(rev.rating)) ? 5 : Number(rev.rating)) ? 'text-amber-400' : 'text-neutral-100'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {titleText && (
                            <h4 className="text-xs font-mono font-bold text-neutral-950 uppercase tracking-wider">
                              {titleText}
                            </h4>
                          )}

                          {/* Fit & Characteristics Rating Badges */}
                          {(fitPreference || comfortRating > 0 || qualityRating > 0 || breathableRating > 0) && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5 pb-1">
                              {fitPreference && (
                                <span className="text-[8px] font-mono font-bold uppercase bg-neutral-50 text-neutral-500 border border-neutral-200 px-2 py-0.5 rounded-none">
                                  Fit: {fitPreference === 'true' ? 'True to Size' : fitPreference}
                                </span>
                              )}
                              {comfortRating > 0 && (
                                <span className="text-[8px] font-mono font-bold uppercase bg-neutral-50 text-neutral-500 border border-neutral-200 px-2 py-0.5 rounded-none">
                                  Comfort: {comfortRating}/5
                                </span>
                              )}
                              {qualityRating > 0 && (
                                <span className="text-[8px] font-mono font-bold uppercase bg-neutral-50 text-neutral-500 border border-neutral-200 px-2 py-0.5 rounded-none">
                                  Quality: {qualityRating}/5
                                </span>
                              )}
                              {breathableRating > 0 && (
                                <span className="text-[8px] font-mono font-bold uppercase bg-neutral-50 text-neutral-500 border border-neutral-200 px-2 py-0.5 rounded-none">
                                  Breathable: {breathableRating}/5
                                </span>
                              )}
                            </div>
                          )}

                          <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3 rounded-none border border-neutral-950/5 whitespace-pre-wrap">
                            {commentText}
                          </p>
                        </div>
                        {imagesList && imagesList.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {imagesList.map((img, idx) => (
                              <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="block border border-neutral-950/10 hover:border-neutral-950 transition-colors">
                                <img
                                  src={img}
                                  alt={`Customer image ${idx + 1}`}
                                  className="w-12 h-12 object-cover"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Size Chart Guide Modal */}
      {isSizeChartOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsSizeChartOpen(false)}
          />

          {/* Modal Box */}
          <div className="relative bg-white rounded-none max-w-md w-full shadow-2xl p-6 border border-neutral-950 z-10 animate-scale-up space-y-6 text-neutral-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
              <div>
                <h3 className="text-sm font-mono font-bold uppercase tracking-[0.2em] text-neutral-950">
                  📏 STREETWEAR SIZE GUIDE
                </h3>
                <p className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider mt-0.5">
                  Size chart for boxy and oversized fits
                </p>
              </div>
              <button 
                onClick={() => setIsSizeChartOpen(false)}
                className="text-neutral-400 hover:text-neutral-950 p-2 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Table Spec list */}
            <div className="overflow-hidden border border-neutral-950">
              <table className="w-full text-left text-xs font-mono uppercase font-bold">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-955 text-[10px] font-black text-neutral-500">
                    <th className="p-3">SIZE</th>
                    <th className="p-3">CHEST (IN)</th>
                    <th className="p-3">SHOULDER (IN)</th>
                    <th className="p-3">LENGTH (IN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-bold text-neutral-850">
                  {[
                    { size: 'XS', chest: '42', shoulder: '19', length: '27.5' },
                    { size: 'S', chest: '44', shoulder: '20', length: '28' },
                    { size: 'M', chest: '46', shoulder: '21', length: '29' },
                    { size: 'L', chest: '48', shoulder: '22', length: '30' },
                    { size: 'XL', chest: '50', shoulder: '23', length: '31' },
                    { size: 'XXL', chest: '52', shoulder: '24', length: '32' }
                  ].map((row) => (
                    <tr 
                      key={row.size} 
                      className={`hover:bg-neutral-50 transition-colors ${
                        selectedSize === row.size ? 'bg-neutral-50 font-black text-neutral-950' : ''
                      }`}
                    >
                      <td className="p-3 font-sans font-black">{row.size} {selectedSize === row.size && '•'}</td>
                      <td className="p-3">{row.chest}</td>
                      <td className="p-3">{row.shoulder}</td>
                      <td className="p-3">{row.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pro Tip Alert */}
            <div className="bg-neutral-50 border border-neutral-200 p-4 text-[10px] uppercase font-bold text-neutral-500 tracking-wide leading-relaxed">
              <span className="font-black text-neutral-900 block mb-0.5">💡 STREETWEAR FIT MEMENTO</span>
              Our cuts are designed for a relaxed, slightly boxy drop-shoulder aesthetic. For a fitted standard silhouette, we recommend choosing one size smaller.
            </div>

            <button
              type="button"
              onClick={() => setIsSizeChartOpen(false)}
              className="w-full py-3 bg-neutral-950 hover:bg-neutral-850 transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-none cursor-pointer text-center"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}

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
          <div className="relative bg-white rounded-none max-w-md w-full shadow-2xl p-6 border border-neutral-950 z-10 animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-950/10 pb-4">
              <div>
                <h3 className="text-sm font-mono font-bold uppercase tracking-[0.2em] text-neutral-950">
                  👔 VIRTUAL SIZE ADVISOR
                </h3>
                <p className="text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider mt-0.5">
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
                className="text-neutral-400 hover:text-neutral-950 p-2 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form body */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                  Height (cm)
                </label>
                <input 
                  type="number" 
                  placeholder="e.g. 175" 
                  value={advHeight}
                  onChange={(e) => setAdvHeight(e.target.value)}
                  className="bg-neutral-50 border border-neutral-950/15 focus:border-neutral-950 focus:bg-white rounded-none px-4 py-3 text-xs font-mono font-bold outline-none transition-all text-neutral-950"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                  Weight (kg)
                </label>
                <input 
                  type="number" 
                  placeholder="e.g. 70" 
                  value={advWeight}
                  onChange={(e) => setAdvWeight(e.target.value)}
                  className="bg-neutral-50 border border-neutral-950/15 focus:border-neutral-950 focus:bg-white rounded-none px-4 py-3 text-xs font-mono font-bold outline-none transition-all text-neutral-950"
                />
              </div>

              <button
                onClick={calculateRecommendation}
                disabled={!advHeight || !advWeight}
                className="w-full py-3.5 bg-neutral-950 hover:bg-neutral-800 text-white text-[10px] font-mono font-bold uppercase tracking-widest rounded-none transition-all cursor-pointer disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed border border-neutral-950"
              >
                Calculate Size
              </button>
            </div>

            {/* Recommendations display */}
            {advBmi && (
              <div className="p-5 bg-neutral-50 border border-neutral-950/15 rounded-none text-center space-y-3 animate-fade-in">
                <div className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                  Your BMI: <span className="text-neutral-950 font-bold">{advBmi}</span>
                </div>
                
                <div className="space-y-1">
                  <div className="text-[10px] text-neutral-450 font-mono font-bold uppercase tracking-wider">
                    Recommended Size
                  </div>
                  <div className="text-3xl font-mono font-black text-neutral-950 tracking-wide">
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
                      let stockMap = {};
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

      <Footer />
    </div>
  );
}

export default ProductDetail;

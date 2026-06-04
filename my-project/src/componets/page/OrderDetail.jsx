import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiArrowLeft, FiTruck, FiCheckCircle, FiShield, FiFileText } from 'react-icons/fi';
import ordersService from '../../appwrite/orders';
import productsService from '../../appwrite/products';
import reviewsService from '../../appwrite/reviews';
import Navbar from '../pageComponets/Navbar';
import { useToast } from '../../context/ToastContext';
import Footer from '../pageComponets/Footer';
import { FaStar } from 'react-icons/fa';
import storageService, { compressImage } from '../../appwrite/storage';

function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { user, isAuthenticated } = useSelector(state => state.auth);
  const products = useSelector(state => state.products.items || []);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Review submission state for the order details write-review modal
  const [reviewModalItem, setReviewModalItem] = useState(null); // stores { name: '...', productId: '...' }
  const [modalRating, setModalRating] = useState(5);
  const [modalComment, setModalComment] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalSuccessMsg, setModalSuccessMsg] = useState('');

  // Fit & characteristic rating modal states
  const [modalFit, setModalFit] = useState('true'); // 'tight', 'true', or 'loose'
  const [modalComfort, setModalComfort] = useState(5);
  const [modalQuality, setModalQuality] = useState(5);
  const [modalBreathable, setModalBreathable] = useState(5);

  const [modalImages, setModalImages] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

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

  // Cancellation reasons modal states
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReasonOption, setCancellationReasonOption] = useState("Ordered wrong size / color details");
  const [customCancellationText, setCustomCancellationText] = useState("");

  const handleModalReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || !user) {
      showToast("Please login to secure a review placement.", "error");
      return;
    }
    if (!reviewModalItem || !reviewModalItem.productId) {
      showToast("Error resolving product mapping registry.", "error");
      return;
    }
    if (!modalComment.trim()) {
      showToast("Please write a review comment.", "error");
      return;
    }

    const imageLinks = modalImages.split(',')
      .map(url => url.trim())
      .filter(url => url.startsWith('http://') || url.startsWith('https://'));

    setModalSubmitting(true);
    try {
      await reviewsService.createReview({
        productId: reviewModalItem.productId,
        userId: user.$id,
        userName: user.name || 'Anonymous',
        rating: String(modalRating),
        comment: modalComment,
        images: imageLinks,
        fit: modalFit,
        comfort: modalComfort,
        quality: modalQuality,
        breathable: modalBreathable
      });

      setModalSuccessMsg("Review posted successfully! Thank you for the fit feedback.");
      showToast("Review submitted successfully!", "success");
      setModalComment('');
      setModalImages('');
      setModalRating(5);
      setModalFit('true');
      setModalComfort(5);
      setModalQuality(5);
      setModalBreathable(5);
      setTimeout(() => {
        setReviewModalItem(null);
        setModalSuccessMsg('');
      }, 2000);
    } catch (err) {
      console.error("Review submission error:", err.message);
      showToast("Failed to submit review. Try again.", "error");
    } finally {
      setModalSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    async function loadOrderSpec() {
      try {
        setLoading(true);
        const orderData = await ordersService.getOrderById(id);
        if (orderData) {
          // Security lock: Ensure users can only view their own orders
          if (orderData.userId !== user.$id && user.email !== import.meta.env.VITE_ADMIN_EMAIL) {
            showToast("Security Clearance Required. Access Aborted.", "error");
            navigate('/profile');
            return;
          }
          setOrder(orderData);
        } else {
          showToast("Order details not found.", "error");
          navigate('/profile');
        }
      } catch (err) {
        console.error("Failed to load order details:", err);
        navigate('/profile');
      } finally {
        setLoading(false);
      }
    }

    if (id && user) {
      loadOrderSpec();
    }
  }, [id, user, isAuthenticated, navigate, showToast]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#fafafb] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        <div className="text-[10px] tracking-[0.5em] text-neutral-900 font-black uppercase">
          LOADING ORDER DETAILS...
        </div>
      </div>
    );
  }

  if (!order) return null;

  const orderDate = new Date(order.$createdAt || order.createdAt || '1970-01-01').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let parsedItems;
  try {
    parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
  } catch {
    parsedItems = [];
  }

  // Parse order number, state, tax, etc.
  const parseOrderAddressAndMetadata = (ord) => {
    let addressText = ord.address || '';
    let metadata = {
      order_number: ord.order_number || `ORD-${new Date(ord.$createdAt || '2026-01-01').getFullYear()}-${ord.$id?.substring(0, 6).toUpperCase() || 'UNKNOWN'}`,
      tracking_number: ord.tracking_number || '',
      tracking_url: ord.tracking_url || '',
      subtotal: ord.subtotal || ord.total,
      tax_amount: ord.tax_amount || 0,
      shipping_charge: ord.shipping_charge || 0,
      coupon_code: ord.coupon_code || ord.couponApplied || 'NONE'
    };

    try {
      const parsed = JSON.parse(ord.address);
      if (parsed && typeof parsed === 'object' && 'customerAddress' in parsed) {
        let rawAddr = parsed.customerAddress;
        // Handle if customerAddress is itself a JSON string (old nested format)
        if (typeof rawAddr === 'string' && rawAddr.trim().startsWith('{')) {
          try {
            const innerParsed = JSON.parse(rawAddr);
            if (innerParsed && typeof innerParsed === 'object') {
              const line = innerParsed.line || '';
              const city = innerParsed.city || '';
              const state = innerParsed.state || '';
              const pincode = innerParsed.pincode || '';
              const country = innerParsed.country || 'India';
              rawAddr = [line, city, state, pincode, country].filter(Boolean).join(', ');
            }
          } catch (innerErr) {
            console.warn("Could not parse nested customer address:", innerErr.message);
          }
        }
        addressText = rawAddr;
        if (parsed.metadata) {
          metadata = { ...metadata, ...parsed.metadata };
        }
      }
    } catch (outerErr) {
      console.warn("Could not parse order address or metadata JSON:", outerErr.message);
    }

    return { addressText, metadata };
  };

  const { addressText, metadata } = parseOrderAddressAndMetadata(order);

  const handleCancelOrder = () => {
    setIsCancelModalOpen(true);
  };

  const submitCancelOrder = async () => {
    let finalReason = cancellationReasonOption;
    if (cancellationReasonOption === "Other (Explain in box below)") {
      finalReason = customCancellationText.trim() || "Other reason unspecified";
    } else if (customCancellationText.trim()) {
      finalReason = `${cancellationReasonOption} - ${customCancellationText.trim()}`;
    }

    try {
      setIsCancelModalOpen(false);
      // 1. Update order status to CANCELLED in Appwrite with metadata reason
      const updatedOrder = await ordersService.updateOrderStatus(order.$id || order.id, 'CANCELLED', { cancel_reason: finalReason });
      if (updatedOrder) {
        setOrder(updatedOrder);
        showToast("Order cancelled successfully.", "success");
        
        // 2. Restore Stock in the Background
        let items = [];
        try {
          items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
        } catch (err) {
          console.warn("Could not parse items for stock restoration:", err.message);
        }
        
        for (const item of items) {
          if (item.product_id) {
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
                const currentStock = stocks[baseSize] !== undefined ? Number(stocks[baseSize]) : 10;
                stocks[baseSize] = currentStock + Number(item.quantity);
                
                await productsService.updateProduct(item.product_id, {
                  sizes_stock: JSON.stringify(stocks)
                });
                console.log(`Stock restored for product ${item.name} (${baseSize}): +${item.quantity}`);
              }
            } catch (stockErr) {
              console.warn("Could not restore stock for item:", item.name, stockErr.message);
            }
          }
        }
      }
    } catch (err) {
      console.error("Order cancellation failed:", err);
      showToast("Failed to cancel order. Please try again.", "error");
    }
  };

  // Calculate order metrics
  const totalItemsCount = parsedItems.reduce((acc, i) => acc + Number(i.quantity || 1), 0);

  // Status index for visual track
  const statusSteps = [
    { key: 'PENDING', label: 'Order Confirmed', desc: 'Order placed successfully.' },
    { key: 'PROCESSING', label: 'Processed & Packed', desc: 'Packed and ready for dispatch.' },
    { key: 'SHIPPED', label: 'Shipped & Outward', desc: 'Order handed over to courier partner.' },
    { key: 'IN_TRANSIT', label: 'In Transit', desc: 'In transit to delivery address.' },
    { key: 'DELIVERED', label: 'Delivered Fits', desc: 'Order delivered successfully.' }
  ];

  const foundIdx = statusSteps.findIndex(s => s.key === order.status);
  const currentStepIdx = foundIdx !== -1 ? foundIdx : 0;


  return (
    <>
      <Navbar />

      <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 font-sans relative selection:bg-neutral-900 selection:text-white pb-20 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center">
        <div className="absolute inset-0 bg-white/96 backdrop-blur-xs z-10" />

        <div className="max-w-4xl mx-auto px-6 md:px-12 py-10 relative z-20 space-y-8">
          
          {/* Header Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40">
            <Link to="/profile" className="inline-flex items-center gap-2 text-xs font-black tracking-widest text-neutral-400 hover:text-neutral-950 transition-colors uppercase group">
              <FiArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
              Back to Profile
            </Link>
            <div className="text-[9px] tracking-[0.3em] font-mono text-neutral-400 uppercase">
              ORDER INFORMATION
            </div>
          </div>

          {/* Core Invoice Summary Card */}
          <div className="bg-white p-8 rounded-2xl border border-neutral-200/60 shadow-2xl space-y-6">
            
            {/* ID & Date */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
              <div className="space-y-1">
                <span className="text-[8px] font-mono text-neutral-400 block uppercase">ORDER ID</span>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl md:text-2xl font-black tracking-wide text-neutral-950 uppercase">
                    {metadata.order_number}
                  </h1>
                  {order.status === 'PENDING' && (
                    <button
                      onClick={handleCancelOrder}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-250 font-bold text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
                <span className="text-[9px] font-mono text-neutral-400 block uppercase">Database ID: {order.$id || order.id}</span>
              </div>
              <div className="text-left md:text-right">
                <span className="text-[8px] font-mono text-neutral-400 block uppercase">TRANSACTION TIMESTAMP</span>
                <span className="text-xs font-mono font-bold text-neutral-600 block mt-0.5 uppercase">
                  {orderDate}
                </span>
              </div>
            </div>

            {/* Industrial Fulfillment Status Track / Cancellation Alert */}
            {order.status === 'CANCELLED' ? (
              <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 space-y-3">
                <div className="space-y-1">
                  <h3 className="text-xs font-black tracking-widest text-rose-700 uppercase flex items-center gap-2">
                    <span>🚫 ORDER CANCELLED</span>
                  </h3>
                  <p className="text-[11px] text-rose-600 font-medium leading-relaxed uppercase">
                    This order was cancelled successfully. Any online payment will be refunded to your account within 5-7 business days.
                  </p>
                </div>
                {metadata.cancel_reason && (
                  <div className="border-t border-rose-200/50 pt-2.5">
                    <span className="text-[8px] font-mono text-rose-450 block uppercase tracking-wider">REASON FOR CANCELLATION</span>
                    <span className="text-xs font-mono font-bold text-rose-800 block mt-0.5 uppercase">
                      &ldquo;{metadata.cancel_reason}&rdquo;
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-neutral-50 p-8 rounded-2xl border border-neutral-200 space-y-6">
                <h3 className="text-[10px] font-black tracking-[0.25em] text-neutral-400 uppercase">
                  🚚 SHIPMENT STATUS
                </h3>
                
                <div className="relative pl-6 space-y-8">
                  {/* Vertical Line */}
                  <div className="absolute left-[35px] top-4 bottom-4 w-1 bg-neutral-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--theme-primary)] transition-all duration-1000 ease-out" 
                      style={{ height: `${(currentStepIdx / 4) * 100}%` }}
                    />
                  </div>

                  {statusSteps.map((step, idx) => {
                    const isActive = idx <= currentStepIdx;
                    const isCurrent = idx === currentStepIdx;
                    return (
                      <div key={step.key} className="flex gap-6 items-start relative z-10">
                        {/* Checkpoint Dot */}
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-all duration-500 ${
                          isCurrent 
                          ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white shadow-lg scale-110 animate-pulse' 
                          : isActive 
                          ? 'bg-neutral-900 border-neutral-900 text-white' 
                          : 'bg-white border-neutral-200 text-neutral-400'
                        }`}>
                          {idx === 4 ? (
                            <FiCheckCircle className="text-sm" />
                          ) : idx === 2 ? (
                            <FiTruck className="text-sm" />
                          ) : (
                            <FiFileText className="text-sm" />
                          )}
                        </div>

                        {/* Content block */}
                        <div className="space-y-1 pt-1">
                          <h4 className={`text-xs font-black uppercase tracking-wide ${isActive ? 'text-neutral-950 font-black' : 'text-neutral-400'}`}>
                            {step.label}
                          </h4>
                          <p className="text-[10px] text-neutral-500 max-w-lg leading-relaxed">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tracking details */}
            {metadata.tracking_number && (
              <div className="bg-indigo-50 border border-indigo-100/60 p-6 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <FiTruck className="text-indigo-600 text-lg" />
                  <h3 className="text-xs font-black tracking-widest text-indigo-900 uppercase">
                    SHIPMENT DISPATCH METRICS
                  </h3>
                </div>
                <div className="text-xs font-mono uppercase text-indigo-800 space-y-1">
                  <div>Tracking Number: <strong className="font-black select-all text-neutral-900">{metadata.tracking_number}</strong></div>
                  <div>Carrier Channel: <span className="font-black">Delhivery/DTDC Express</span></div>
                  {metadata.tracking_url && (
                    <div className="pt-2">
                      <a 
                        href={metadata.tracking_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block bg-indigo-600 hover:bg-indigo-750 text-white font-sans font-black text-[10px] tracking-widest uppercase px-4 py-2 rounded-lg transition-all"
                      >
                        Track Package Live &rarr;
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Itemized Garments Specification List */}
            <div className="space-y-4">
              <h3 className="text-[9px] font-black tracking-[0.25em] text-neutral-400 uppercase">
                Claimed Garments specification
              </h3>

              <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-2xl overflow-hidden bg-neutral-50/20 p-4 space-y-4">
                {parsedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 text-xs pt-4 first:pt-0">
                    <div className="space-y-1">
                      <h4 className="font-black text-neutral-950 uppercase tracking-wide">
                        {item.name}
                      </h4>
                      <p className="text-[9px] font-mono text-neutral-500 uppercase">
                        Size: {item.size || 'M'} · Quantity: {item.quantity} · Price: ₹{item.price}
                      </p>
                      {order.status === 'DELIVERED' && (() => {
                        let productId = item.product_id;
                        if (!productId) {
                          const matchingProd = products.find(p => p.name.trim().toUpperCase() === item.name.trim().toUpperCase());
                          productId = matchingProd ? (matchingProd.$id || matchingProd.id) : null;
                        }

                        return (
                          <button
                            type="button"
                            onClick={() => {
                              if (productId) {
                                setReviewModalItem({ name: item.name, productId });
                                setModalRating(5);
                                setModalComment('');
                                setModalFit('true');
                                setModalComfort(5);
                                setModalQuality(5);
                                setModalBreathable(5);
                              } else {
                                showToast("Failed to locate product in current catalog.", "error");
                              }
                            }}
                            className="mt-1.5 inline-flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-white font-mono font-bold text-[9px] tracking-wider px-2.5 py-1 rounded-none uppercase transition-all cursor-pointer border border-neutral-950"
                          >
                            Write Review
                          </button>
                        );
                      })()}
                    </div>
                    <span className="font-mono font-black text-neutral-950 text-sm shrink-0">
                      ₹{Number(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations & Total Invoice */}
            <div className="space-y-3.5 text-xs font-mono font-medium uppercase text-neutral-600 pt-4 border-t border-neutral-100">
              <div className="flex justify-between">
                <span>Gross catalog Value ({totalItemsCount} items)</span>
                <span className="text-neutral-950 font-bold">
                  ₹{Number(metadata.subtotal || parsedItems.reduce((acc, i) => acc + Number(i.price * i.quantity), 0)).toLocaleString('en-IN')}
                </span>
              </div>
              {order.couponApplied !== 'NONE' && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>PROMO SAVINGS ({metadata.coupon_code})</span>
                  <span className="font-black">
                    - ₹{Number(order.discountAmount || order.discount_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST (18% EXCLUSIVE)</span>
                <span className="text-neutral-950 font-bold">
                  ₹{Math.round(Number(metadata.tax_amount || 0)).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>DISPATCH EXPRESS</span>
                <span className="text-emerald-600 font-black tracking-wider text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded">
                  FREE DISPATCH
                </span>
              </div>
              <div className="flex justify-between">
                <span>PAYMENT METHOD</span>
                <span className="text-neutral-950 font-bold tracking-wide">
                  {order.paymentMethod || (order.address?.includes('[Payment: ONLINE]') ? 'ONLINE' : 'COD')}
                </span>
              </div>
              {order.paymentProvider && order.paymentProvider !== 'NONE' && (
                <div className="flex justify-between">
                  <span>PAYMENT PROVIDER</span>
                  <span className="text-indigo-600 font-black tracking-wide bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                    {order.paymentProvider}
                  </span>
                </div>
              )}
              {order.paymentStatus && (
                <div className="flex justify-between">
                  <span>PAYMENT STATUS</span>
                  <span className={`font-black tracking-wider text-[10px] px-1.5 py-0.5 rounded ${
                    order.paymentStatus === 'PAID' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-rose-600 bg-rose-50 border border-rose-150'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </div>
              )}
              {order.razorpayPaymentId && (
                <div className="flex justify-between">
                  <span>TRANSACTION ID</span>
                  <span className="text-neutral-600 font-mono text-[10px]">
                    {order.razorpayPaymentId}
                  </span>
                </div>
              )}
              <hr className="border-neutral-100" />
              <div className="flex justify-between items-baseline pt-2">
                <span className="text-sm font-black text-neutral-950 uppercase tracking-wide">Net deposited amount</span>
                <span className="text-2xl font-black text-neutral-950 tracking-tight">
                  ₹{Number(order.total || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Shipping Logistics Coordinates */}
            <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs uppercase tracking-wide">
              <div>
                <span className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest">CUSTOMER DETAILS</span>
                <span className="text-neutral-950 font-bold block mt-1">{order.customerName}</span>
                <span className="text-neutral-500 font-mono text-[10px] block mt-0.5">{order.phone}</span>
                <span className="text-neutral-500 font-mono text-[10px] block lowercase mt-0.5">{order.email}</span>
              </div>
              <div>
                <span className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest">SHIPPING ADDRESS</span>
                <span className="text-neutral-950 font-bold block mt-1 leading-relaxed">
                  {addressText}
                </span>
              </div>
            </div>

            {/* Security Shield */}
            <div className="flex items-center gap-3 text-[8px] font-mono text-neutral-500 border border-neutral-100 bg-neutral-50/50 p-4 rounded-xl leading-normal uppercase">
              <FiShield className="text-base text-neutral-800 shrink-0" />
              <div>
                <span className="font-bold text-neutral-800 block mb-0.5">🔒 SECURE TRANSACTION DETAILS</span>
                Order details verified and safely stored in our database.
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Cancellation Reason Modal Popup */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-neutral-950/60 backdrop-blur-xs" 
            onClick={() => setIsCancelModalOpen(false)}
          />
          
          {/* Modal Container */}
          <div className="relative z-50 w-full max-w-md bg-white p-8 border border-neutral-950 shadow-2xl space-y-6 text-neutral-900 animate-scale-up">
            <div>
              <span className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest">CANCEL ORDER</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-neutral-950 mt-1">
                Cancel Order
              </h2>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mt-0.5 leading-relaxed">
                Please select a reason for cancelling order {metadata.order_number || order.$id}. The stock will be returned to the store.
              </p>
            </div>
            
            {/* Options List */}
            <div className="space-y-2.5">
              {[
                "Ordered wrong size / color details",
                "Shipping and delivery window too long",
                "Found alternative street fits elsewhere",
                "Incorrect pricing/checkout parameters",
                "Other (Explain in box below)"
              ].map((opt) => (
                <label 
                  key={opt} 
                  className={`flex items-start gap-3 p-3.5 border cursor-pointer transition-all ${
                    cancellationReasonOption === opt
                    ? 'border-neutral-950 bg-neutral-50/50'
                    : 'border-neutral-200/60 hover:border-neutral-400'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="cancel_option"
                    checked={cancellationReasonOption === opt}
                    onChange={() => setCancellationReasonOption(opt)}
                    className="mt-0.5 accent-neutral-950"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-800 leading-normal select-none">
                    {opt}
                  </span>
                </label>
              ))}
            </div>

            {/* Custom Explanation Textarea */}
            <div className="space-y-2">
              <label className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest">
                ADDITIONAL SPEC DETAIL / CUSTOM REASON
              </label>
              <textarea
                value={customCancellationText}
                onChange={(e) => setCustomCancellationText(e.target.value)}
                placeholder="ENTER CUSTOM SPEC REASON DETAILS..."
                rows={3}
                className="w-full bg-[#fafafb] border border-neutral-200 hover:border-neutral-450 focus:border-neutral-950 text-xs font-semibold p-3 outline-hidden placeholder-neutral-400 font-sans tracking-wide resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="w-full py-3 border border-neutral-200 hover:bg-neutral-50 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600 rounded-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCancelOrder}
                className="w-full py-3 bg-neutral-950 hover:bg-neutral-855 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-none cursor-pointer shadow-md"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal Overlay */}
      {reviewModalItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-none border border-neutral-950 shadow-2xl p-6 relative space-y-6 animate-scale-up text-neutral-900">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setReviewModalItem(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-955 font-bold text-sm p-1 cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div>
              <span className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest">PRODUCT FIT FEEDBACK</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-neutral-950 mt-1">
                Review {reviewModalItem.name}
              </h2>
            </div>

            <hr className="border-neutral-100" />

            {modalSuccessMsg ? (
              <div className="py-8 text-center space-y-3 font-mono">
                <div className="w-12 h-12 rounded-none border border-emerald-500 bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xs font-bold uppercase tracking-wider animate-bounce">
                  Done
                </div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-relaxed px-4">
                  {modalSuccessMsg}
                </p>
              </div>
            ) : (
              <form onSubmit={handleModalReviewSubmit} className="space-y-4 font-sans text-neutral-900">
                {/* Star Rating Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-mono font-bold text-neutral-500 uppercase">Your Rating</span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setModalRating(star)}
                        className="text-2xl cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                      >
                        <FaStar className={star <= modalRating ? 'text-amber-400' : 'text-neutral-200'} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size Fit Preference Selector */}
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
                        onClick={() => setModalFit(item.key)}
                        className={`py-2 rounded-none font-bold text-[10px] tracking-wider transition-all cursor-pointer border uppercase font-mono ${
                          modalFit === item.key
                            ? 'bg-neutral-950 text-white border-neutral-950'
                            : 'bg-[#fbfbfb] text-neutral-500 border-neutral-200 hover:border-neutral-950 hover:text-neutral-950'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Characteristics Rating Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Comfort */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">Comfort</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setModalComfort(val)}
                          className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-[9px] border transition-all cursor-pointer rounded-none ${
                            modalComfort === val
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
                    <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">Quality</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setModalQuality(val)}
                          className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-[9px] border transition-all cursor-pointer rounded-none ${
                            modalQuality === val
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
                    <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">Breathable</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setModalBreathable(val)}
                          className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-[9px] border transition-all cursor-pointer rounded-none ${
                            modalBreathable === val
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

                {/* Review comment */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-mono font-bold text-neutral-500 uppercase">Your Review</span>
                  <textarea
                    rows="3"
                    required
                    value={modalComment}
                    onChange={(e) => setModalComment(e.target.value)}
                    placeholder="Write your product experience here..."
                    className="w-full bg-[#fbfbfb] border border-neutral-950/20 focus:border-neutral-950 rounded-none px-3 py-2 text-xs text-neutral-850 outline-hidden resize-none transition-colors"
                  />
                </div>

                {/* Review Image URLs */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">Customer Image URLs (comma-separated, optional)</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={modalImages}
                      onChange={(e) => setModalImages(e.target.value)}
                      placeholder="https://example.com/pic1.jpg, https://example.com/pic2.jpg"
                      className="flex-1 bg-[#fbfbfb] border border-neutral-950/20 focus:border-neutral-950 rounded-none px-3 py-2 text-xs text-neutral-850 outline-hidden transition-colors"
                    />
                    <label className="shrink-0 bg-neutral-950 hover:bg-neutral-850 text-white font-mono font-bold text-[10px] tracking-wider px-3 py-2 rounded-none uppercase transition-all cursor-pointer border border-neutral-950 text-center select-none">
                      {uploadingImage ? 'Uploading...' : 'Upload File'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setModalImages, modalImages)}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <span className="text-[8px] font-mono text-neutral-450 uppercase tracking-wide">
                    TIP: PASTE DIRECT HTTPS LINKS OR CHOOSE A LOCAL IMAGE TO UPLOAD TEMPORARILY.
                  </span>
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="flex-1 bg-neutral-950 hover:bg-neutral-800 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-none cursor-pointer text-center py-2.5 shadow-md"
                  >
                    {modalSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewModalItem(null)}
                    className="px-4 border border-neutral-250 hover:bg-neutral-50 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600 rounded-none cursor-pointer py-2.5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

export default OrderDetail;

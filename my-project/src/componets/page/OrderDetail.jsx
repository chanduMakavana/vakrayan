import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiArrowLeft, FiTruck, FiCheckCircle, FiShield, FiFileText } from 'react-icons/fi';
import ordersService from '../../appwrite/orders';
import reviewsService from '../../appwrite/reviews';
import { useToast } from '../../context/ToastContext';
import Footer from '../pageComponets/Footer';
import { FaStar } from 'react-icons/fa';
import storageService, { compressImage } from '../../appwrite/storage';
import { sendWebhookNotification } from '../../utils/webhookHelper';

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

  // Return / Exchange modal states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestItem, setRequestItem] = useState(null);
  const [requestReason, setRequestReason] = useState("Wrong size received");
  const [customRequestText, setCustomRequestText] = useState("");
  const [exchangeTargetSize, setExchangeTargetSize] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestFrontImage, setRequestFrontImage] = useState('');
  const [requestBackImage, setRequestBackImage] = useState('');
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  const handleRequestImageUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'front') setUploadingFront(true);
    else setUploadingBack(true);

    try {
      const compressedFile = await compressImage(file, 850, 850, 0.7);
      const response = await storageService.uploadFile(compressedFile);
      if (response?.$id) {
        const fileUrl = storageService.getFileView(response.$id);
        if (type === 'front') {
          setRequestFrontImage(fileUrl);
          showToast("✓ Front product image uploaded successfully!", "success");
        } else {
          setRequestBackImage(fileUrl);
          showToast("✓ Back product image uploaded successfully!", "success");
        }
      } else {
        throw new Error("Failed to upload image file");
      }
    } catch (err) {
      console.error("Return image upload failed:", err);
      showToast("Appwrite Storage upload failed.", "error");
    } finally {
      if (type === 'front') setUploadingFront(false);
      else setUploadingBack(false);
    }
  };

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
    window.scrollTo(0, 0);

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
      <div className="w-full min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        <div className="text-[10px] tracking-[0.5em] text-[var(--color-text)] font-black uppercase">
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

    if (typeof addressText === 'string') {
      addressText = addressText.replace(/\[Payment:\s*\w+\]/i, '').trim();
      if (addressText.endsWith(',')) {
        addressText = addressText.slice(0, -1).trim();
      }
    }

    return { addressText, metadata };
  };

  const { addressText, metadata } = parseOrderAddressAndMetadata(order);

  // Extract base shipping, remote route surcharge, and COD handling fee from the stored total shipping charge
  const totalShipping = Number(metadata.shipping_charge || order.shipping_charge || 0);
  const isCod = order.paymentMethod === 'COD';
  const codFee = isCod ? 30 : 0;
  const remainingShipping = Math.max(0, totalShipping - codFee);
  const remoteSurcharge = (remainingShipping === 80 || remainingShipping === 179) ? 80 : 0;
  const baseShippingCharge = Math.max(0, remainingShipping - remoteSurcharge);

  const isReturnExchangeEligible = () => {
    if (order.status !== 'DELIVERED') return false;
    const updateTime = order.$updatedAt || order.$createdAt || order.createdAt;
    if (!updateTime) return false;
    const deliveryDate = new Date(updateTime);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate - deliveryDate);
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  };

  const getReturnExchangeDaysLeft = () => {
    const updateTime = order.$updatedAt || order.$createdAt || order.createdAt;
    if (!updateTime) return 0;
    const deliveryDate = new Date(updateTime);
    const currentDate = new Date();
    const diffTime = currentDate - deliveryDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const daysLeft = Math.max(0, Math.ceil(7 - diffDays));
    return daysLeft;
  };

  const submitReturnExchangeRequest = async () => {
    if (!requestItem) return;
    if (requestItem.type === 'EXCHANGE' && !exchangeTargetSize) {
      showToast("Please select a target size for exchange.", "error");
      return;
    }
    if (!requestFrontImage.trim() || !requestBackImage.trim()) {
      showToast("Please upload both front and back photos to verify item condition.", "error");
      return;
    }
    
    let finalReason = requestReason;
    if (requestReason === "Other (Explain in box below)") {
      finalReason = customRequestText.trim() || "Other reason unspecified";
    } else if (customRequestText.trim()) {
      finalReason = `${requestReason} - ${customRequestText.trim()}`;
    }
    
    setSubmittingRequest(true);
    try {
      let currentRequests = [];
      if (metadata.return_requests) {
        currentRequests = Array.isArray(metadata.return_requests) 
          ? [...metadata.return_requests] 
          : [];
      }
      
      currentRequests = currentRequests.filter(r => r.itemIndex !== requestItem.index);
      
      const newRequest = {
        itemIndex: requestItem.index,
        productId: requestItem.product_id,
        productName: requestItem.name,
        originalSize: requestItem.size,
        type: requestItem.type,
        reason: finalReason,
        exchangeTargetSize: requestItem.type === 'EXCHANGE' ? exchangeTargetSize : "",
        images: [requestFrontImage.trim(), requestBackImage.trim()].filter(Boolean),
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      
      currentRequests.push(newRequest);
      const targetStatus = requestItem.type === 'RETURN' ? 'RETURN_REQUESTED' : 'EXCHANGE_REQUESTED';
      const response = await ordersService.updateOrderStatus(order.$id || order.id, targetStatus, {
        return_requests: currentRequests
      });
      
      if (response) {
        showToast(`${requestItem.type === 'RETURN' ? 'Return' : 'Exchange'} request submitted successfully!`, 'success');
        
        // Dispatch return.requested webhook notification
        sendWebhookNotification('return.requested', {
          orderId: order.$id || order.id,
          orderNumber: metadata.order_number,
          type: requestItem.type,
          reason: finalReason,
          email: user?.email || order.email || ''
        });

        setIsRequestModalOpen(false);
        const orderData = await ordersService.getOrderById(id);
        if (orderData) {
          setOrder(orderData);
        }
      }
    } catch (err) {
      console.error("Return/Exchange request failed:", err);
      showToast("Failed to submit request. Please try again.", "error");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCancelOrder = () => {
    setIsCancelModalOpen(true);
  };

  const handlePrintInvoice = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast("Pop-up blocker is preventing invoice opening.", "error");
      return;
    }

    const itemsHtml = parsedItems.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px 0; font-weight: bold; text-transform: uppercase;">${item.name}</td>
        <td style="padding: 12px 0; font-family: monospace; text-align: center;">${(item.size || 'M').toUpperCase()}</td>
        <td style="padding: 12px 0; font-family: monospace; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 0; font-family: monospace; text-align: right;">₹${Number(item.price).toLocaleString('en-IN')}</td>
        <td style="padding: 12px 0; font-family: monospace; text-align: right; font-weight: bold;">₹${Number(item.price * item.quantity).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const orderDate = order.$createdAt || order.createdAt || new Date().toISOString();
    const subtotal = Number(metadata.subtotal || order.subtotal || parsedItems.reduce((acc, i) => acc + Number(i.price * i.quantity), 0));
    const discountVal = Number(order.discountAmount || order.discount_amount || metadata.discount || 0);

    const discountRow = (order.couponApplied && order.couponApplied !== 'NONE' && discountVal > 0) ? `
      <div class="total-row" style="color: #059669; font-weight: bold;">
        <span>COUPON SAVINGS (${order.couponApplied})</span>
        <span style="font-family: monospace;">- ₹${discountVal.toLocaleString('en-IN')}</span>
      </div>
    ` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${metadata.order_number}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; color: #000; padding: 20px 0; margin: 0; line-height: 1.4; font-size: 11.5px; }
            .header { border-bottom: 2.5px solid #000; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
            .logo { font-size: 22px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; line-height: 1; }
            .invoice-title { font-size: 15px; font-weight: 900; letter-spacing: 1px; text-align: right; text-transform: uppercase; line-height: 1.2; }
            .details { display: grid; grid-template-columns: 1.2fr 1.2fr 1fr; gap: 16px; margin-bottom: 30px; }
            .details h3 { font-size: 9px; font-weight: 900; letter-spacing: 1px; color: #555; text-transform: uppercase; margin: 0 0 6px 0; border-bottom: 1px solid #eee; padding-bottom: 4px; }
            .details p { font-size: 11px; font-weight: 600; margin: 0 0 3px 0; text-transform: uppercase; color: #111; word-break: break-word; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { border-bottom: 2px solid #000; padding: 10px 0; text-align: left; font-size: 9px; font-weight: 900; color: #000; text-transform: uppercase; }
            td { padding: 10px 0; font-size: 11px; }
            .totals { font-size: 11px; font-weight: bold; border-top: 2px solid #000; padding-top: 15px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; text-transform: uppercase; }
            .grand-total { font-size: 16px; font-weight: 900; border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; color: #000; }
            @media print {
              body { padding: 0; margin: 0; width: 100%; font-size: 11px; }
              .details p { font-size: 10px; }
              td { padding: 8px 0; font-size: 10px; }
              .grand-total { font-size: 15px; }
            }
          </style>
        </head>
        <body>
          <div style="max-width: 680px; margin: 0 auto; width: 100%;">
            <div class="header">
              <div>
                <div class="logo">AASHIS</div>
                <div style="font-size: 10px; color: #666; font-weight: bold; margin-top: 5px; text-transform: uppercase;">Premium Drop & Boutique</div>
              </div>
              <div class="invoice-title">
                TAX INVOICE<br/>
                <span style="font-family: monospace; font-size: 12px; font-weight: normal; color: #666;"># ${metadata.order_number}</span>
              </div>
            </div>

            <div class="details">
              <div>
                <h3>Sold By</h3>
                <p style="font-weight: 800; color: #000;">AASHIS</p>
                <p>Surat, Gujarat, India</p>
                <p>Pincode: 395006</p>
                <p>GSTIN: 24AASHIS1234F1Z0</p>
              </div>
              <div>
                <h3>Billed To</h3>
                <p style="font-weight: 800; color: #000;">${metadata.customer_name || 'Customer'}</p>
                <p style="text-transform: lowercase;">${metadata.customer_email || order.email || ''}</p>
                <p>${addressText || ''}</p>
                <p>Phone: ${metadata.customer_phone || ''}</p>
              </div>
              <div style="text-align: right;">
                <h3>Invoice Details</h3>
                <p>Date: ${new Date(orderDate).toLocaleDateString('en-IN')}</p>
                <p>Payment Mode: ${order.paymentMethod === 'COD' ? 'CASH ON DELIVERY (COD)' : order.paymentMethod === 'WALLET' ? 'STORE WALLET' : 'RAZORPAY ONLINE'}</p>
                ${order.paymentMethod !== 'COD' ? `<p>Transaction ID: ${metadata.razorpay_payment_id || order.razorpayPaymentId || 'N/A'}</p>` : ''}
                <p>Order Status: ${(order.status || 'PENDING').toUpperCase()}</p>
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="text-align: left;">Item Description</th>
                  <th style="text-align: center; width: 60px;">Size</th>
                  <th style="text-align: center; width: 60px;">Qty</th>
                  <th style="text-align: right; width: 120px;">Unit Price</th>
                  <th style="text-align: right; width: 120px;">Amount</th>
                </tr>
              </thead>
              <tbody style="font-size: 12px; font-weight: 600;">
                ${itemsHtml}
              </tbody>
            </table>

            <div style="width: 350px; margin-left: auto;" class="totals">
              <div class="total-row">
                <span style="color: #666;">Cart Value</span>
                <span style="font-family: monospace;">₹${subtotal.toLocaleString('en-IN')}</span>
              </div>
              ${discountRow}

              <div class="total-row">
                <span style="color: #666;">Shipping & Delivery</span>
                <span style="font-family: monospace; font-weight: bold;">${baseShippingCharge > 0 ? `₹${baseShippingCharge}` : 'FREE SHIPPING'}</span>
              </div>
              ${remoteSurcharge > 0 ? `
              <div class="total-row">
                <span style="color: #666;">Remote Route Surcharge</span>
                <span style="font-family: monospace; font-weight: bold;">₹${remoteSurcharge}</span>
              </div>
              ` : ''}
              ${isCod ? `
              <div class="total-row">
                <span style="color: #666;">COD Handling Fee</span>
                <span style="font-family: monospace; font-weight: bold;">₹${codFee}</span>
              </div>
              ` : ''}

              <div class="total-row grand-total">
                <span>Net Amount Paid <span style="font-size: 10px; font-weight: normal; color: #555; text-transform: none;">(incl. GST)</span></span>
                <span style="font-family: monospace; font-size: 20px; font-weight: 900;">₹${Number(order.total).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div style="margin-top: 80px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; font-size: 10px; color: #888; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
              Thank you for shopping with AASHIS!<br/>
              This is a system generated tax invoice. No signature is required.
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      // 1. Update order status to CANCELLATION_REQUESTED in Appwrite with metadata reason
      const updatedOrder = await ordersService.updateOrderStatus(order.$id || order.id, 'CANCELLATION_REQUESTED', { cancel_reason: finalReason });
      if (updatedOrder) {
        setOrder(updatedOrder);
        showToast("Cancellation request submitted successfully. Awaiting admin approval.", "success");
      }
    } catch (err) {
      console.error("Order cancellation request failed:", err);
      showToast("Failed to request order cancellation. Please try again.", "error");
    }
  };

  // Calculate order metrics
  const totalItemsCount = parsedItems.reduce((acc, i) => acc + Number(i.quantity || 1), 0);

  // Status index for visual track
  let statusSteps = [
    { key: 'PENDING', label: 'Order Confirmed', desc: 'Order placed successfully.', icon: 'file' },
    { key: 'PROCESSING', label: 'Processed & Packed', desc: 'Packed and ready for dispatch.', icon: 'file' },
    { key: 'SHIPPED', label: 'Shipped & Outward', desc: 'Order handed over to courier partner.', icon: 'truck' },
    { key: 'IN_TRANSIT', label: 'In Transit', desc: 'In transit to delivery address.', icon: 'truck' },
    { key: 'DELIVERED', label: 'Delivered Fits', desc: 'Order delivered successfully.', icon: 'check' }
  ];

  if (order.status === 'RETURN_REQUESTED' || order.status === 'RETURNED') {
    statusSteps = [
      { key: 'DELIVERED', label: 'Fits Delivered', desc: 'Order delivered successfully.', icon: 'check' },
      { key: 'RETURN_REQUESTED', label: 'Return Requested', desc: 'Return request submitted with condition photos.', icon: 'file' },
      { key: 'RETURNED', label: 'Return Approved & Refunded', desc: 'Admin approved the return. Refund or reverse pickup complete.', icon: 'check' }
    ];
  } else if (order.status === 'EXCHANGE_REQUESTED' || order.status === 'EXCHANGED') {
    statusSteps = [
      { key: 'DELIVERED', label: 'Fits Delivered', desc: 'Order delivered successfully.', icon: 'check' },
      { key: 'EXCHANGE_REQUESTED', label: 'Exchange Requested', desc: 'Exchange request submitted for desired size.', icon: 'file' },
      { key: 'EXCHANGED', label: 'Exchange Approved', desc: 'Admin approved the exchange. Exchange product dispatched.', icon: 'truck' }
    ];
  }

  const foundIdx = statusSteps.findIndex(s => s.key === order.status);
  const currentStepIdx = foundIdx !== -1 ? foundIdx : 0;


  return (
    <>

      <div className="w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans relative selection:bg-[var(--color-accent)] selection:text-white pb-20 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center">
        <div className="absolute inset-0 bg-[var(--color-surface)]/96 backdrop-blur-xs z-10" />

        <div className="max-w-4xl mx-auto px-6 md:px-12 py-10 relative z-20 space-y-8">
          
          {/* Header Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]/40">
            <Link to="/profile" className="inline-flex items-center gap-2 text-xs font-black tracking-widest text-[var(--color-muted)] hover:text-neutral-950 transition-colors uppercase group">
              <FiArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
              Back to Profile
            </Link>
            <div className="text-[9px] tracking-[0.3em] font-mono text-[var(--color-muted)] uppercase">
              ORDER INFORMATION
            </div>
          </div>

          {/* Core Invoice Summary Card */}
          <div className="bg-[var(--color-surface)] p-8 rounded-2xl border border-[var(--color-border)] shadow-2xl space-y-6">
            
            {/* ID & Date */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--color-border)]">
              <div className="space-y-1">
                <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase">ORDER ID</span>
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
                  {order.status === 'DELIVERED' && (
                    <button
                      onClick={handlePrintInvoice}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-250 font-bold text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <FiFileText className="text-xs" /> Download Invoice
                    </button>
                  )}
                </div>
                <span className="text-[9px] font-mono text-[var(--color-muted)] block uppercase">Database ID: {order.$id || order.id}</span>
              </div>
              <div className="text-left md:text-right">
                <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase">TRANSACTION TIMESTAMP</span>
                <span className="text-xs font-mono font-bold text-[var(--color-muted)] block mt-0.5 uppercase">
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
                    {order.paymentMethod === 'ONLINE' || order.paymentMethod === 'WALLET'
                      ? "This order was cancelled successfully. Your payment has been refunded to your Store Wallet."
                      : "This order was cancelled successfully."}
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
            ) : order.status === 'CANCELLATION_REQUESTED' ? (
              <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 space-y-3">
                <div className="space-y-1">
                  <h3 className="text-xs font-black tracking-widest text-amber-700 uppercase flex items-center gap-2">
                    <span>⏳ CANCELLATION AWAITING APPROVAL</span>
                  </h3>
                  <p className="text-[11px] text-amber-600 font-medium leading-relaxed uppercase">
                    Your request to cancel this order is pending admin approval. Once approved, any online or wallet payment will be refunded to your Store Wallet.
                  </p>
                </div>
                {metadata.cancel_reason && (
                  <div className="border-t border-amber-200/50 pt-2.5">
                    <span className="text-[8px] font-mono text-amber-500 block uppercase tracking-wider">REASON FOR CANCELLATION</span>
                    <span className="text-xs font-mono font-bold text-amber-800 block mt-0.5 uppercase">
                      &ldquo;{metadata.cancel_reason}&rdquo;
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[var(--color-surface)] p-8 rounded-2xl border border-[var(--color-border)] space-y-6">
                <h3 className="text-[10px] font-black tracking-[0.25em] text-[var(--color-muted)] uppercase">
                  🚚 SHIPMENT STATUS
                </h3>
                
                <div className="relative pl-6 space-y-8">
                  {/* Vertical Line */}
                  <div className="absolute left-[35px] top-4 bottom-4 w-1 bg-neutral-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--color-accent)] transition-all duration-1000 ease-out" 
                      style={{ height: `${(currentStepIdx / (statusSteps.length - 1)) * 100}%` }}
                    />
                  </div>

                  {statusSteps.map((step, idx) => {
                    const isActive = idx <= currentStepIdx;
                    const isCurrent = idx === currentStepIdx;
                    const isFinalStep = step.key === 'DELIVERED' || step.key === 'RETURNED' || step.key === 'EXCHANGED';
                    return (
                      <div key={step.key} className="flex gap-6 items-start relative z-10">
                        {/* Checkpoint Dot */}
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-all duration-500 ${
                          isCurrent 
                          ? `bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-lg scale-110 ${isFinalStep ? '' : 'animate-pulse'}` 
                          : isActive 
                          ? 'bg-neutral-900 border-neutral-900 text-white' 
                          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-muted)]'
                        }`}>
                          {step.icon === 'check' ? (
                            <FiCheckCircle className="text-sm" />
                          ) : step.icon === 'truck' ? (
                            <FiTruck className="text-sm" />
                          ) : (
                            <FiFileText className="text-sm" />
                          )}
                        </div>

                        {/* Content block */}
                        <div className="space-y-1 pt-1">
                          <h4 className={`text-xs font-black uppercase tracking-wide ${isActive ? 'text-neutral-950 font-black' : 'text-[var(--color-muted)]'}`}>
                            {step.label}
                          </h4>
                          <p className="text-[10px] text-[var(--color-muted)] max-w-lg leading-relaxed">
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
            {(order.tracking_number || metadata.tracking_number) && (
              <div className="bg-indigo-50 border border-indigo-100/60 p-6 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <FiTruck className="text-indigo-600 text-lg" />
                  <h3 className="text-xs font-black tracking-widest text-indigo-900 uppercase">
                    SHIPMENT DISPATCH METRICS
                  </h3>
                </div>
                <div className="text-xs font-mono uppercase text-indigo-800 space-y-1">
                  <div>Tracking Number: <strong className="font-black select-all text-[var(--color-text)]">{order.tracking_number || metadata.tracking_number}</strong></div>
                  <div>Carrier Channel: <span className="font-black">Delhivery/DTDC Express</span></div>
                  {(order.tracking_url || metadata.tracking_url) && (
                    <div className="pt-2">
                      <a 
                        href={order.tracking_url || metadata.tracking_url} 
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
              <h3 className="text-[9px] font-black tracking-[0.25em] text-[var(--color-muted)] uppercase">
                Claimed Garments specification
              </h3>

              <div className="divide-y divide-neutral-100 border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface)]/20 p-4 space-y-4">
                {parsedItems.map((item, idx) => {
                  const matchingProd = products.find(p => p.$id === item.product_id || p.id === item.product_id || p.name.trim().toUpperCase() === item.name.trim().toUpperCase());
                  const img = item.product_Image || item.product_image || item.image || matchingProd?.front_image_link || matchingProd?.image_url || matchingProd?.image;

                  return (
                    <div key={idx} className="flex justify-between items-center py-4 text-xs first:pt-0 last:pb-0">
                      <div className="flex gap-4 items-center">
                        {img ? (
                          <img 
                            src={img} 
                            alt={item.name} 
                            className="w-12 h-16 object-cover border border-[var(--color-border)] shrink-0 bg-[var(--color-surface)]"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-neutral-100 border border-[var(--color-border)] shrink-0 flex items-center justify-center text-[8px] font-bold text-[var(--color-muted)]">
                            NO IMG
                          </div>
                        )}
                        <div className="space-y-1">
                          <h4 className="font-black text-neutral-950 uppercase tracking-wide">
                            {item.name}
                          </h4>
                          <p className="text-[9px] font-mono text-[var(--color-muted)] uppercase">
                            Size: {item.size || 'M'} · Quantity: {item.quantity} · Price: ₹{item.price}
                          </p>
                           {order.status === 'DELIVERED' && (() => {
                            let productId = item.product_id;
                            if (!productId) {
                              productId = matchingProd ? (matchingProd.$id || matchingProd.id) : null;
                            }
                            
                            const itemPolicy = matchingProd?.return_policy || "7 Day Return";
                            const existingRequest = Array.isArray(metadata.return_requests)
                              ? metadata.return_requests.find(r => r.itemIndex === idx)
                              : null;
                            const eligible = isReturnExchangeEligible();
                            const daysLeft = getReturnExchangeDaysLeft();

                            return (
                              <div className="space-y-2 pt-1.5">
                                <div className="flex flex-wrap gap-2 items-center">
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
                                    className="inline-flex items-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-white font-mono font-bold text-[9px] tracking-wider px-2.5 py-1 rounded-none uppercase transition-all cursor-pointer border border-neutral-950"
                                  >
                                    Write Review
                                  </button>

                                  {!existingRequest && eligible && (
                                    <>
                                      {(itemPolicy === "7 Day Return" || itemPolicy === "default") && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setRequestItem({ ...item, index: idx, type: 'RETURN', sizes: matchingProd?.sizes || ['S', 'M', 'L', 'XL'] });
                                            setRequestReason("Wrong size received");
                                            setCustomRequestText("");
                                            setExchangeTargetSize("");
                                            setRequestFrontImage("");
                                            setRequestBackImage("");
                                            setIsRequestModalOpen(true);
                                          }}
                                          className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-250 font-mono font-bold text-[9px] tracking-wider px-2.5 py-1 rounded-none uppercase transition-all cursor-pointer"
                                        >
                                          ↩️ Return
                                        </button>
                                      )}
                                      {(itemPolicy === "7 Day Return" || itemPolicy === "default" || itemPolicy === "Exchange Only") && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setRequestItem({ ...item, index: idx, type: 'EXCHANGE', sizes: matchingProd?.sizes || ['S', 'M', 'L', 'XL'] });
                                            setRequestReason("Wrong size received");
                                            setCustomRequestText("");
                                            setExchangeTargetSize("");
                                            setRequestFrontImage("");
                                            setRequestBackImage("");
                                            setIsRequestModalOpen(true);
                                          }}
                                          className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-250 font-mono font-bold text-[9px] tracking-wider px-2.5 py-1 rounded-none uppercase transition-all cursor-pointer"
                                        >
                                          🔄 Exchange
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>

                                {existingRequest && (
                                  <div className="pt-1.5">
                                    <span className={`inline-block font-mono text-[9px] font-bold px-2 py-0.5 border ${
                                      existingRequest.status === 'PENDING'
                                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                                      : existingRequest.status === 'APPROVED'
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                      : 'bg-rose-50 text-rose-600 border-rose-200'
                                    } uppercase`}>
                                      {existingRequest.type === 'RETURN' ? 'Return' : 'Exchange'} Request - {existingRequest.status}
                                      {existingRequest.exchangeTargetSize && ` to Size ${existingRequest.exchangeTargetSize}`}
                                    </span>
                                    {existingRequest.adminComment && (
                                      <p className="text-[9px] font-sans text-[var(--color-muted)] mt-1 font-semibold normal-case">
                                        Admin note: {existingRequest.adminComment}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {!existingRequest && !eligible && (
                                  <div className="pt-1">
                                    {itemPolicy === "No Return" ? (
                                      <span className="text-[9px] font-mono font-semibold text-[var(--color-muted)] uppercase">🔒 Non-Returnable Item</span>
                                    ) : (
                                      <span className="text-[9px] font-mono font-semibold text-[var(--color-muted)] uppercase">Return window expired</span>
                                    )}
                                  </div>
                                )}

                                {!existingRequest && eligible && itemPolicy !== "No Return" && (
                                  <p className="text-[8px] font-mono text-[var(--color-muted)] uppercase">
                                    Window active (ends in {daysLeft} {daysLeft === 1 ? 'day' : 'days'})
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <span className="font-mono font-black text-neutral-950 text-sm shrink-0">
                        ₹{Number(item.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calculations & Total Invoice */}
            <div className="space-y-3.5 text-xs font-mono font-medium uppercase text-[var(--color-muted)] pt-4 border-t border-[var(--color-border)]">
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
                <span>SHIPPING & DELIVERY</span>
                {baseShippingCharge > 0 ? (
                  <span className="text-neutral-950 font-bold font-mono">
                    ₹{baseShippingCharge}
                  </span>
                ) : (
                  <span className="text-emerald-600 font-black tracking-wider text-[9px] bg-emerald-50 px-1.5 py-0.5 rounded animate-scale-up">
                    FREE SHIPPING
                  </span>
                )}
              </div>
              {remoteSurcharge > 0 && (
                <div className="flex justify-between">
                  <span>REMOTE ROUTE SURCHARGE</span>
                  <span className="text-neutral-950 font-bold font-mono">
                    ₹{remoteSurcharge}
                  </span>
                </div>
              )}
              {isCod && (
                <div className="flex justify-between">
                  <span>COD HANDLING FEE</span>
                  <span className="text-neutral-950 font-bold font-mono">
                    ₹{codFee}
                  </span>
                </div>
              )}
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
                  <span className="text-[var(--color-muted)] font-mono text-[10px]">
                    {order.razorpayPaymentId}
                  </span>
                </div>
              )}
              <hr className="border-[var(--color-border)]" />
              <div className="flex justify-between items-baseline pt-2">
                <div className="flex flex-col">
                  <span className="text-sm font-black text-neutral-950 uppercase tracking-wide">Net deposited amount</span>
                  <span className="text-[9px] text-[var(--color-muted)] font-sans tracking-wide lowercase font-semibold mt-0.5 normal-case">
                    (incl. of all taxes)
                  </span>
                </div>
                <span className="text-2xl font-black text-neutral-950 tracking-tight font-mono">
                  ₹{Number(order.total || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Shipping Logistics Coordinates */}
            <div className="bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-border)] grid grid-cols-1 md:grid-cols-2 gap-6 text-xs uppercase tracking-wide">
              <div>
                <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">CUSTOMER DETAILS</span>
                <span className="text-neutral-950 font-bold block mt-1">{order.customerName}</span>
                <span className="text-[var(--color-muted)] font-mono text-[10px] block mt-0.5">{order.phone}</span>
                <span className="text-[var(--color-muted)] font-mono text-[10px] block lowercase mt-0.5">{order.email}</span>
              </div>
              <div>
                <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">SHIPPING ADDRESS</span>
                <span className="text-neutral-950 font-bold block mt-1 leading-relaxed">
                  {addressText}
                </span>
              </div>
            </div>

            {/* Security Shield */}
            <div className="flex items-center gap-3 text-[8px] font-mono text-[var(--color-muted)] border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-4 rounded-xl leading-normal uppercase">
              <FiShield className="text-base text-[var(--color-text)] shrink-0" />
              <div>
                <span className="font-bold text-[var(--color-text)] block mb-0.5">🔒 SECURE TRANSACTION DETAILS</span>
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
          <div className="relative z-50 w-full max-w-md bg-[var(--color-surface)] p-5 sm:p-8 border border-neutral-950 shadow-2xl space-y-5 sm:space-y-6 text-[var(--color-text)] animate-scale-up max-h-[90vh] overflow-y-auto scrollbar-none">
            <div>
              <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">CANCEL ORDER</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-neutral-950 mt-1">
                Cancel Order
              </h2>
              <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider mt-0.5 leading-relaxed">
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
                    ? 'border-neutral-950 bg-[var(--color-surface)]/50'
                    : 'border-[var(--color-border)] hover:border-neutral-400'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="cancel_option"
                    checked={cancellationReasonOption === opt}
                    onChange={() => setCancellationReasonOption(opt)}
                    className="mt-0.5 accent-neutral-950"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text)] leading-normal select-none">
                    {opt}
                  </span>
                </label>
              ))}
            </div>

            {/* Custom Explanation Textarea */}
            <div className="space-y-2">
              <label className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">
                ADDITIONAL SPEC DETAIL / CUSTOM REASON
              </label>
              <textarea
                value={customCancellationText}
                onChange={(e) => setCustomCancellationText(e.target.value)}
                placeholder="ENTER CUSTOM SPEC REASON DETAILS..."
                rows={3}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-neutral-450 focus:border-[var(--color-accent)] text-xs font-semibold p-3 outline-hidden placeholder-[var(--color-muted)] font-sans tracking-wide resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="w-full py-3 border border-[var(--color-border)] hover:bg-[var(--color-surface)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] rounded-none cursor-pointer"
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
          <div className="bg-[var(--color-surface)] w-full max-w-md rounded-none border border-neutral-950 shadow-2xl p-6 relative space-y-6 animate-scale-up text-[var(--color-text)] max-h-[90vh] overflow-y-auto scrollbar-none">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setReviewModalItem(null)}
              className="absolute top-4 right-4 text-[var(--color-muted)] hover:text-neutral-955 font-bold text-sm p-1 cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div>
              <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">PRODUCT FIT FEEDBACK</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-neutral-950 mt-1">
                Review {reviewModalItem.name}
              </h2>
            </div>

            <hr className="border-[var(--color-border)]" />

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
              <form onSubmit={handleModalReviewSubmit} className="space-y-4 font-sans text-[var(--color-text)]">
                {/* Star Rating Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase">Your Rating</span>
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
                  <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase">Size Fit Preference</span>
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
                            : 'bg-[var(--color-subtle)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-neutral-950'
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
                    <span className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase">Comfort</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setModalComfort(val)}
                          className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-[9px] border transition-all cursor-pointer rounded-none ${
                            modalComfort === val
                              ? 'bg-neutral-950 text-white border-neutral-950'
                              : 'bg-[var(--color-subtle)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-neutral-950'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase">Quality</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setModalQuality(val)}
                          className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-[9px] border transition-all cursor-pointer rounded-none ${
                            modalQuality === val
                              ? 'bg-neutral-950 text-white border-neutral-950'
                              : 'bg-[var(--color-subtle)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-neutral-950'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Breathable */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase">Breathable</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setModalBreathable(val)}
                          className={`w-6 h-6 flex items-center justify-center font-mono font-bold text-[9px] border transition-all cursor-pointer rounded-none ${
                            modalBreathable === val
                              ? 'bg-neutral-950 text-white border-neutral-950'
                              : 'bg-[var(--color-subtle)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-neutral-950'
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
                  <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase">Your Review</span>
                  <textarea
                    rows="3"
                    required
                    value={modalComment}
                    onChange={(e) => setModalComment(e.target.value)}
                    placeholder="Write your product experience here..."
                    className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-none px-3 py-2 text-xs text-[var(--color-text)] outline-hidden resize-none transition-colors"
                  />
                </div>

                {/* Review Image URLs */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase">Customer Image URLs (comma-separated, optional)</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={modalImages}
                      onChange={(e) => setModalImages(e.target.value)}
                      placeholder="https://example.com/pic1.jpg, https://example.com/pic2.jpg"
                      className="flex-1 bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-none px-3 py-2 text-xs text-[var(--color-text)] outline-hidden transition-colors"
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
                  <span className="text-[8px] font-mono text-[var(--color-muted)] uppercase tracking-wide">
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
                    className="px-4 border border-neutral-250 hover:bg-[var(--color-surface)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] rounded-none cursor-pointer py-2.5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Return / Exchange Request Modal */}
      {isRequestModalOpen && requestItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-[var(--color-surface)] w-full max-w-md rounded-none border border-neutral-950 shadow-2xl p-6 relative space-y-4 animate-scale-up text-[var(--color-text)] max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(false)}
              className="absolute top-4 right-4 text-[var(--color-muted)] hover:text-neutral-955 font-bold text-sm p-1 cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div>
              <span className="text-[8px] font-mono text-[var(--color-muted)] block uppercase tracking-widest">
                {requestItem.type} REQUEST PANEL
              </span>
              <h2 className="text-sm font-black tracking-wider uppercase text-neutral-950 mt-1">
                {requestItem.type === 'RETURN' ? 'Return' : 'Exchange'} {requestItem.name}
              </h2>
              <span className="text-xs font-mono text-[var(--color-muted)] uppercase block mt-0.5">
                Current Size: {requestItem.size} · Price: ₹{requestItem.price}
              </span>
            </div>

            <hr className="border-[var(--color-border)]" />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitReturnExchangeRequest();
              }}
              className="space-y-4 font-sans text-[var(--color-text)]"
            >
              {/* Reason Selector */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase">Reason for {requestItem.type === 'RETURN' ? 'Return' : 'Exchange'}</span>
                <select
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-none px-3 py-2 text-xs text-[var(--color-text)] outline-hidden font-medium"
                >
                  <option value="Wrong size received">Wrong size received</option>
                  <option value="Defective / Damaged product">Defective / Damaged product</option>
                  <option value="Incorrect product delivered">Incorrect product delivered</option>
                  <option value="Quality not up to standard">Quality not up to standard</option>
                  <option value="Other (Explain in box below)">Other (Explain in box below)</option>
                </select>
              </div>

              {/* Target Size (For Exchange Only) */}
              {requestItem.type === 'EXCHANGE' && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase">Select Desired Size</span>
                  <select
                    value={exchangeTargetSize}
                    onChange={(e) => setExchangeTargetSize(e.target.value)}
                    required
                    className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-none px-3 py-2 text-xs text-[var(--color-text)] outline-hidden font-medium"
                  >
                    <option value="">-- Choose New Size --</option>
                    {requestItem.sizes && requestItem.sizes
                      .filter(s => s !== requestItem.size)
                      .map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))
                    }
                  </select>
                  <span className="text-[8px] font-mono text-[var(--color-muted)] uppercase">
                    Exchange is subject to catalog inventory availability during approval.
                  </span>
                </div>
              )}

              {/* Detailed Notes */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase">Additional Comments (Optional)</span>
                <textarea
                  value={customRequestText}
                  onChange={(e) => setCustomRequestText(e.target.value)}
                  placeholder="Explain any details here..."
                  rows={3}
                  className="w-full bg-[var(--color-subtle)] border border-[var(--color-border)] focus:border-[var(--color-accent)] rounded-none px-3 py-2 text-xs text-[var(--color-text)] outline-hidden resize-none transition-colors"
                />
              </div>

              {/* Product Photos Upload Verification (Required) */}
              <div className="space-y-4">
                <span className="text-xs font-mono font-bold text-[var(--color-muted)] uppercase block">
                  Upload Product Photos <span className="text-rose-500 font-sans font-bold">*</span> (Required)
                </span>
                
                {/* Front Image Upload */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase">Front View Photo</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={requestFrontImage}
                      readOnly
                      placeholder={uploadingFront ? "Uploading front view..." : "No front photo selected"}
                      className="flex-1 bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-none px-3 py-2 text-xs text-[var(--color-text)] outline-hidden truncate"
                    />
                    <label className="shrink-0 bg-neutral-950 hover:bg-neutral-800 text-white font-mono font-bold text-[10px] tracking-wider px-3 py-2.5 rounded-none uppercase transition-all cursor-pointer border border-neutral-950 text-center select-none">
                      {uploadingFront ? 'Uploading...' : 'Choose Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleRequestImageUpload(e, 'front')}
                        disabled={uploadingFront}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {requestFrontImage && (
                    <div className="relative group w-12 h-16 mt-1">
                      <img 
                        src={requestFrontImage} 
                        alt="Front verification proof" 
                        className="w-full h-full object-cover border border-[var(--color-border)]" 
                      />
                      <button
                        type="button"
                        onClick={() => setRequestFrontImage("")}
                        className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold cursor-pointer transition-colors shadow-sm"
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Back Image Upload */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase">Back View Photo</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={requestBackImage}
                      readOnly
                      placeholder={uploadingBack ? "Uploading back view..." : "No back photo selected"}
                      className="flex-1 bg-[var(--color-subtle)] border border-[var(--color-border)] rounded-none px-3 py-2 text-xs text-[var(--color-text)] outline-hidden truncate"
                    />
                    <label className="shrink-0 bg-neutral-950 hover:bg-neutral-800 text-white font-mono font-bold text-[10px] tracking-wider px-3 py-2.5 rounded-none uppercase transition-all cursor-pointer border border-neutral-950 text-center select-none">
                      {uploadingBack ? 'Uploading...' : 'Choose Photo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleRequestImageUpload(e, 'back')}
                        disabled={uploadingBack}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {requestBackImage && (
                    <div className="relative group w-12 h-16 mt-1">
                      <img 
                        src={requestBackImage} 
                        alt="Back verification proof" 
                        className="w-full h-full object-cover border border-[var(--color-border)]" 
                      />
                      <button
                        type="button"
                        onClick={() => setRequestBackImage("")}
                        className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-bold cursor-pointer transition-colors shadow-sm"
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-[9px] text-neutral-455 font-medium">
                  Select from Camera or Gallery. Photos will be compressed automatically. Both front and back views are required.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="flex-1 bg-neutral-950 hover:bg-neutral-800 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-none cursor-pointer text-center py-2.5 shadow-md"
                >
                  {submittingRequest ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 border border-neutral-250 hover:bg-[var(--color-surface)] active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] rounded-none cursor-pointer py-2.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

export default OrderDetail;

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import productsService from '../../appwrite/products';
import ordersService from '../../appwrite/orders';
import campaignService from '../../appwrite/campaign';
import { useToast } from '../../context/ToastContext';
import restockService from '../../appwrite/restock';
import couponUsageService from '../../appwrite/couponUsage';
import cartService from '../../appwrite/cart';
import storageService from '../../appwrite/storage';

const TAG_OPTIONS = ['NEW DROP', 'BEST SELLER', 'FEW LEFT', 'LIMITED ITEM'];
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const BACK_IMAGE_FIELDS = ['back_image_link_1', 'back_image_link_2', 'back_image_link_3', 'back_image_link_4'];

function AdminPanel() {
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm();
  const { showToast } = useToast();
  const [editingId, setEditingId] = useState(null);
  const [products, setProducts] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Tab Manager State
  const [activeTab, setActiveTab] = useState('products'); // products | orders | campaigns

  // Orders State (Fulfillment)
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('ALL');

  // Admin Order Cancellation Modal States
  const [isAdminCancelModalOpen, setIsAdminCancelModalOpen] = useState(false);
  const [cancelTargetOrder, setCancelTargetOrder] = useState(null);
  const [adminCancelReason, setAdminCancelReason] = useState('Out of Stock / Inventory Error');
  const [adminCancelCustomText, setAdminCancelCustomText] = useState('');

  // Admin Shipped Modal States
  const [isShippedModalOpen, setIsShippedModalOpen] = useState(false);
  const [shippedTargetOrder, setShippedTargetOrder] = useState(null);
  const [adminTrackingNumber, setAdminTrackingNumber] = useState('');
  const [adminTrackingUrl, setAdminTrackingUrl] = useState('');

  // Admin Search & Custom Dialog States
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [isSweepProductModalOpen, setIsSweepProductModalOpen] = useState(false);
  const [sweepTargetProductId, setSweepTargetProductId] = useState(null);

  // Drops Manager Search & Filter States
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [productTagFilter, setProductTagFilter] = useState('ALL');
  const [productStockFilter, setProductStockFilter] = useState('ALL');
  const [productsSubTab, setProductsSubTab] = useState('list'); // 'list' or 'form'

  // Campaign State
  const [campaignPromoText, setCampaignPromoText] = useState('');
  const [campaignCoupons, setCampaignCoupons] = useState([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(10);
  const [newCouponMinOrderValue, setNewCouponMinOrderValue] = useState('');
  const [newCouponValidUntil, setNewCouponValidUntil] = useState('');

  // Store Database Telemetry States
  const [restockNotifications, setRestockNotifications] = useState([]);
  const [couponUsages, setCouponUsages] = useState([]);
  const [activeCarts, setActiveCarts] = useState([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  // Multi-color dynamic variants state
  const [colorVariants, setColorVariants] = useState([]);
  const [vName, setVName] = useState('');
  const [vHex, setVHex] = useState('');
  const [vFront, setVFront] = useState('');
  const [vBack, setVBack] = useState('');

  const [uploadingFields, setUploadingFields] = useState({});

  const handleProductImageUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFields(prev => ({ ...prev, [fieldName]: true }));
    try {
      // Upload the original (uncompressed) product image
      const response = await storageService.uploadFile(file);
      if (response?.$id) {
        const fileUrl = storageService.getFileView(response.$id);
        setValue(fieldName, fileUrl);
        showToast("✓ Image uploaded successfully to Appwrite Storage!", "success");
      } else {
        throw new Error("Failed to upload image file");
      }
    } catch (err) {
      console.error("Product image upload failed:", err);
      showToast("Appwrite Storage upload failed. Ensure bucket ID 'images' exists, or paste a URL.", "error");
    } finally {
      setUploadingFields(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const addColorVariant = () => {
    if (!vName.trim() || !vHex.trim() || !vFront.trim()) {
      showToast("Color Name, Hex Code, and Front Image Link are required for variant.", "error");
      return;
    }
    const hexVal = vHex.trim();
    if (!hexVal.startsWith('#') || hexVal.length < 4) {
      showToast("Hex code must start with # (e.g. #000000).", "error");
      return;
    }
    const newVariant = {
      name: vName.trim().toUpperCase(),
      hex: hexVal,
      front: vFront.trim(),
      back: vBack.trim()
    };
    setColorVariants(prev => [...prev, newVariant]);
    setVName('');
    setVHex('');
    setVFront('');
    setVBack('');
    showToast("Variant added locally.", "success");
  };

  const removeColorVariant = (idx) => {
    setColorVariants(prev => prev.filter((_, i) => i !== idx));
  };

  const loadStoreTelemetry = async () => {
    try {
      setTelemetryLoading(true);
      const restocks = await restockService.getRestockNotifications();
      const usages = await couponUsageService.getCouponUsages();
      const carts = await cartService.getAllCarts();
      setRestockNotifications(restocks || []);
      setCouponUsages(usages || []);
      setActiveCarts(carts || []);
    } catch (err) {
      console.error("Failed to load store database telemetry:", err);
    } finally {
      setTelemetryLoading(false);
    }
  };

  // Load product catalog from Appwrite
  const loadProductCatalog = async () => {
    try {
      const response = await productsService.getProducts();
      const structuredData = response?.documents || response || [];
      setProducts(structuredData);
    } catch (err) {
      console.error("Failed to fetch products from Appwrite:", err.message);
    }
  };

  // Load customer orders from Appwrite
  const loadCustomerOrders = async () => {
    try {
      const response = await ordersService.getOrders();
      setOrders(response || []);
    } catch (err) {
      console.error("Orders retrieval failed:", err.message);
    }
  };

  // Admin role validation — single env-var lookup, no hardcoded emails
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || '').replace(/['"]/g, '').trim();
  const isAdmin = isAuthenticated && user && adminEmail && user.email === adminEmail;

  // Load active campaign announcements & coupons on mount
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isAdmin) return;

    loadProductCatalog();
    loadCustomerOrders();

    // Hydrate campaigns
    campaignService.getPromoText()
      .then(text => {
        if (text) setCampaignPromoText(text);
      })
      .catch(err => console.error("Failed to load promo text:", err));

    campaignService.getCoupons()
      .then(couponsList => {
        if (couponsList) setCampaignCoupons(couponsList);
      })
      .catch(err => console.error("Failed to load coupons:", err));
  }, [isAdmin]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isAdmin) return <Navigate to="/" replace />;

  const onSubmit = async (data) => {
    setActionLoading(true);

    const searchKeywords = data.search_keywords
      ? data.search_keywords.split(',').map(k => k.trim()).filter(Boolean)
      : [];
    const backImageLinks = BACK_IMAGE_FIELDS
      .map((fieldName) => data[fieldName]?.trim())
      .filter(Boolean);

    // Build size-wise stock map
    const stockMap = {};
    const selectedSizes = [];
    SIZE_OPTIONS.forEach(size => {
      const stockVal = Number(data[`stock_${size}`] || 0);
      stockMap[size] = stockVal;
      if (stockVal > 0) {
        selectedSizes.push(size);
      }
    });

    // Check if colorVariants exist
    let finalColorName = data.color_name?.trim() || "";
    let finalColorHex = data.color_hex?.trim() || "";
    if (colorVariants.length > 0) {
      finalColorHex = JSON.stringify(colorVariants);
      finalColorName = colorVariants.map(v => v.name).join(', ');
    }

    // Format product database payload
    const productPayload = {
      name: data.name.trim(),
      price: String(data.price).trim(),
      tags: searchKeywords,
      category: data.category,
      front_image_link: data.front_image_link.trim(),
      description: data.description?.trim() || "",
      sizes: selectedSizes,
      back_image_links: backImageLinks,
      sizes_stock: JSON.stringify(stockMap), // Stringified stock mapping
      tag: data.single_tag?.trim() || "",
      discount_percent: Number(data.discount_percent || 0),
      color_group_id: data.color_group_id?.trim() || "",
      color_name: finalColorName,
      color_hex: finalColorHex,
      fit_type: data.fit_type?.trim() || "",
      fabric_gsm: data.fabric_gsm?.trim() || "",
      compare_at_price: data.compare_at_price ? Number(data.compare_at_price) : 0,
      is_featured: !!data.is_featured,
      slug: data.slug?.trim() || data.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ""
    };

    const updateHelper = async (id, payload) => {
      try {
        return await productsService.updateProduct(id, payload);
      } catch (err) {
        if (
          err.message?.toLowerCase().includes("attribute") ||
          err.message?.toLowerCase().includes("not found") ||
          err.message?.toLowerCase().includes("structure") ||
          err.code === 400 ||
          err.status === 400
        ) {
          console.warn("Schema mismatch. Retrying with basic fields.");
          const stripped = { ...payload };
          delete stripped.sizes_stock;
          delete stripped.compare_at_price;
          delete stripped.is_featured;
          delete stripped.slug;
          return await productsService.updateProduct(id, stripped);
        }
        throw err;
      }
    };

    const createHelper = async (payload) => {
      try {
        return await productsService.createProduct(payload);
      } catch (err) {
        if (
          err.message?.toLowerCase().includes("attribute") ||
          err.message?.toLowerCase().includes("not found") ||
          err.message?.toLowerCase().includes("structure") ||
          err.code === 400 ||
          err.status === 400
        ) {
          console.warn("Schema mismatch. Retrying with basic fields.");
          const stripped = { ...payload };
          delete stripped.sizes_stock;
          delete stripped.compare_at_price;
          delete stripped.is_featured;
          delete stripped.slug;
          return await productsService.createProduct(stripped);
        }
        throw err;
      }
    };

    try {
      if (editingId) {
        await updateHelper(editingId, productPayload);
        showToast('🔥 Drop variations updated in cloud servers successfully!', 'success');
      } else {
        await createHelper(productPayload);
        showToast('⚡ Fresh Streetwear Drop Deployed Globally!', 'success');
      }
    } catch (cloudError) {
      console.error("Appwrite product write failed:", cloudError.message);
      showToast("Failed to save product. Check Appwrite connection.", "error");
    } finally {
      // Clear form
      reset();
      SIZE_OPTIONS.forEach(size => {
        setValue(`stock_${size}`, '');
      });
      setValue('compare_at_price', '');
      setValue('is_featured', false);
      setValue('slug', '');
      setColorVariants([]);
      setEditingId(null);
      setProductsSubTab('list');
      setActionLoading(false);
      await loadProductCatalog(); // Refresh catalog view
    }
  };

  const handleEdit = (id) => {
    const product = products.find(p => p.id === id || p.$id === id);
    if (product) {
      setValue('name', product.name);
      
      const numericPrice = typeof product.price === 'string'
        ? Number(product.price.replace(/[^0-9]/g, ''))
        : product.price;
      setValue('price', numericPrice || '');
      
      const tagsArray = Array.isArray(product.tags) ? product.tags : [];
      setValue('search_keywords', tagsArray.join(', '));
      setValue('category', product.category);
      setValue('front_image_link', product.front_image_link || product.image_url || product.image || '');
      setValue('description', product.description || '');
      
      // Hydrate Stocks
      let parsedStock = {};
      try {
        parsedStock = JSON.parse(product.sizes_stock || '{}');
      } catch {
        parsedStock = {};
      }

      SIZE_OPTIONS.forEach(size => {
        const hasSizeChecked = product.sizes?.includes(size);
        setValue(`stock_${size}`, parsedStock[size] !== undefined ? parsedStock[size] : (hasSizeChecked ? 10 : 0));
      });

      const backImageLinks = Array.isArray(product.back_image_links)
        ? product.back_image_links
        : [product.back_image_link].filter(Boolean);

      BACK_IMAGE_FIELDS.forEach((fieldName, index) => {
        setValue(fieldName, backImageLinks[index] || '');
      });
      setValue('single_tag', product.tag || '');
      setValue('discount_percent', product.discount_percent || 0);
      setValue('color_group_id', product.color_group_id || '');

      // Parse dynamic JSON variants if present
      let parsedVariants = [];
      let isJsonVariants = false;
      if (product.color_hex && product.color_hex.startsWith('[')) {
        try {
          parsedVariants = JSON.parse(product.color_hex);
          isJsonVariants = true;
        } catch (e) {
          console.warn("Failed to parse color_hex as JSON variants:", e);
        }
      }

      if (isJsonVariants) {
        setColorVariants(parsedVariants);
        setValue('color_name', '');
        setValue('color_hex', '');
      } else {
        setColorVariants([]);
        setValue('color_name', product.color_name || '');
        setValue('color_hex', product.color_hex || '');
      }

      setValue('fit_type', product.fit_type || '');
      setValue('fabric_gsm', product.fabric_gsm || '');
      setValue('compare_at_price', product.compare_at_price || '');
      setValue('is_featured', product.is_featured === true || product.is_featured === 'true' || product.is_featured === 1 || product.is_featured === '1');
      setValue('slug', product.slug || '');
      setEditingId(id);
      setProductsSubTab('form');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    reset();
    SIZE_OPTIONS.forEach(size => {
      setValue(`stock_${size}`, '');
    });
    setValue('search_keywords', '');
    setValue('single_tag', '');
    setValue('discount_percent', '');
    setValue('color_group_id', '');
    setValue('color_name', '');
    setValue('color_hex', '');
    setValue('fit_type', '');
    setValue('fabric_gsm', '');
    setValue('compare_at_price', '');
    setValue('is_featured', false);
    setValue('slug', '');
    setValue('color_hex', '');
    setValue('fit_type', '');
    setValue('fabric_gsm', '');
    setColorVariants([]);
    setVName('');
    setVHex('');
    setVFront('');
    setVBack('');
    setEditingId(null);
    setProductsSubTab('list');
  };

  const handleRemoveProductItem = async (targetId) => {
    setSweepTargetProductId(targetId);
    setIsSweepProductModalOpen(true);
  };

  const confirmSweepProductItem = async () => {
    if (!sweepTargetProductId) return;
    setIsSweepProductModalOpen(false);
    try {
      await productsService.deleteProduct(sweepTargetProductId);
      showToast('🗑️ Live Drop Revoked From Appwrite Repository Pool!', 'success');
    } catch (err) {
      console.error("Failed to delete product:", err.message);
      showToast("Failed to delete product. Check Appwrite connection.", "error");
    } finally {
      setSweepTargetProductId(null);
      await loadProductCatalog();
    }
  };

  const handleExportOrdersToCSV = () => {
    if (orders.length === 0) {
      showToast("No orders available to export.", "error");
      return;
    }

    const headers = [
      "Order Number",
      "Customer Name",
      "Email Address",
      "Contact Phone",
      "Total Amount (INR)",
      "Order Status",
      "Fulfillment Address",
      "Garments Checked Out",
      "Timestamp"
    ];

    const csvRows = [headers.join(",")];

    orders.forEach(order => {
      let parsedItems;
      try {
        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
      } catch (err) {
        console.warn("CSV items parsing failed:", err.message);
        parsedItems = [];
      }

      let parsedAddr = order.address || '';
      try {
        const addrJSON = JSON.parse(order.address);
        if (addrJSON && typeof addrJSON === 'object') {
          parsedAddr = addrJSON.customerAddress || order.address;
        }
      } catch {
        parsedAddr = order.address || '';
      }

      const orderNumber = order.order_number || order.$id?.substring(0, 12).toUpperCase();
      const garmentsList = parsedItems.map(i => `${i.name} (Size: ${i.size || 'M'}, Qty: ${i.quantity})`).join(" | ");
      const orderDate = new Date(order.$createdAt || order.createdAt || '1970-01-01').toLocaleString('en-IN');

      const values = [
        `"${String(orderNumber).replace(/"/g, '""')}"`,
        `"${String(order.customerName || '').replace(/"/g, '""')}"`,
        `"${String(order.email || '').replace(/"/g, '""')}"`,
        `"${String(order.phone || '').replace(/"/g, '""')}"`,
        `"${order.total || 0}"`,
        `"${order.status || 'PENDING'}"`,
        `"${String(parsedAddr).replace(/"/g, '""')}"`,
        `"${String(garmentsList).replace(/"/g, '""')}"`,
        `"${orderDate}"`
      ];

      csvRows.push(values.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `streetwear_orders_manifest_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("✅ Shipping manifest CSV generated and downloaded!", "success");
  };

  // Orders Fulfillment Operations
  const handleOrderStatusShift = async (order, targetStatus, providedExtraData = {}) => {
    const orderId = order.$id || order.id;
    const previousStatus = order.status || 'PENDING';
    
    if (previousStatus === targetStatus) return; // No change

    let extraData = { ...providedExtraData };

    setActionLoading(true);
    try {
      // 1. Handle stock restoration or depletion if transition involves CANCELLED
      if (previousStatus !== 'CANCELLED' && targetStatus === 'CANCELLED') {
        // Transition TO CANCELLED -> Restore stock
        let items = [];
        try {
          items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
        } catch {
          items = [];
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
              }
            } catch (err) {
              console.error(`Failed to restore stock for product ${item.product_id}:`, err.message);
            }
          }
        }
      } else if (previousStatus === 'CANCELLED' && targetStatus !== 'CANCELLED') {
        // Transition FROM CANCELLED to active status -> Deplete stock
        let items = [];
        try {
          items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
        } catch {
          items = [];
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
                stocks[baseSize] = Math.max(0, currentStock - Number(item.quantity));
                
                await productsService.updateProduct(item.product_id, {
                  sizes_stock: JSON.stringify(stocks)
                });
              }
            } catch (err) {
              console.error(`Failed to deplete stock for product ${item.product_id}:`, err.message);
            }
          }
        }
      }

      // 2. Perform status change
      await ordersService.updateOrderStatus(orderId, targetStatus, extraData);
      showToast(`✅ Order status transitioned to ${targetStatus}!`, 'success');
      await loadProductCatalog(); // Update active catalog stock display
    } catch (err) {
      console.error("Status update failed:", err.message);
      showToast(`Failed to update order status. Check Appwrite connection.`, "error");
    } finally {
      setActionLoading(false);
      loadCustomerOrders();
    }
  };

  const submitAdminCancelOrder = async () => {
    if (!cancelTargetOrder) return;
    
    let finalReason = adminCancelReason;
    if (adminCancelReason === "Other") {
      finalReason = adminCancelCustomText.trim() || "Cancelled by Admin";
    } else if (adminCancelCustomText.trim()) {
      finalReason = `${adminCancelReason} - ${adminCancelCustomText.trim()}`;
    }

    setIsAdminCancelModalOpen(false);
    await handleOrderStatusShift(cancelTargetOrder, 'CANCELLED', { cancel_reason: finalReason });
    setCancelTargetOrder(null);
  };

  const submitAdminShippedOrder = async () => {
    if (!shippedTargetOrder) return;
    if (!adminTrackingNumber.trim()) {
      showToast("Tracking number is required to dispatch shipment.", "error");
      return;
    }

    const trackingNum = adminTrackingNumber.trim();
    const trackingUrl = adminTrackingUrl.trim() || `https://track.delhivery.com/query?id=${trackingNum}`;

    setIsShippedModalOpen(false);
    await handleOrderStatusShift(shippedTargetOrder, 'SHIPPED', {
      tracking_number: trackingNum,
      tracking_url: trackingUrl
    });
    setShippedTargetOrder(null);
  };

  // Campaign & Coupons Operations
  const saveCampaignPromoText = async () => {
    try {
      await campaignService.savePromoText(campaignPromoText);
      showToast('📢 Announcement Marquee updated dynamically!', 'success');
    } catch (err) {
      console.error("Failed to update announcement:", err);
    }
  };

  const handleAddCoupon = async () => {
    if (!newCouponCode.trim()) return;
    const cleanCode = newCouponCode.trim().toUpperCase();
    
    if (campaignCoupons.some(c => c.code === cleanCode)) {
      showToast("This coupon already exists.", "error");
      return;
    }

    try {
      await campaignService.createCoupon(cleanCode, Number(newCouponDiscount), {
        min_order_value: newCouponMinOrderValue ? Number(newCouponMinOrderValue) : 0,
        valid_until: newCouponValidUntil || ''
      });
      const response = await campaignService.getCoupons();
      setCampaignCoupons(response || []);
      showToast(`🎟️ Coupon ${cleanCode} activated successfully!`, 'success');
      setNewCouponCode('');
      setNewCouponMinOrderValue('');
      setNewCouponValidUntil('');
    } catch (err) {
      console.error("Failed to add coupon:", err);
    }
  };

  const handleDeleteCoupon = async (couponCode) => {
    const coupon = campaignCoupons.find(c => c.code === couponCode);
    if (!coupon) return;

    try {
      const docId = coupon.$id || coupon.id || '';
      await campaignService.deleteCoupon(docId, couponCode);
      const response = await campaignService.getCoupons();
      setCampaignCoupons(response || []);
      showToast('🗑️ Coupon deactivated.', 'success');
    } catch (err) {
      console.error("Failed to delete coupon:", err);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 p-6 md:p-12 relative selection:bg-neutral-950 selection:text-white">
      <div className="relative z-20 max-w-4xl mx-auto space-y-8">

        {/* Header Display Node */}
        <div className="bg-white p-8 rounded-none border border-neutral-950">
          <div className="mb-6 pb-6 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs tracking-[0.4em] text-neutral-400 font-bold uppercase mb-1">HQ Operations</h4>
              <h1 className="text-3xl font-black tracking-widest uppercase text-neutral-900">
                Operations Console
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/" className="bg-neutral-950 hover:bg-neutral-800 text-white text-[10px] font-black tracking-widest px-4 py-2.5 rounded-none uppercase h-fit transition-colors">
                HOME
              </Link>
              <div className="border border-neutral-950 text-neutral-950 text-[10px] font-mono font-black tracking-widest px-4 py-2.5 rounded-none uppercase h-fit">
                Admin Mode Active
              </div>
            </div>
          </div>

          {/* Tab Navigation Menu */}
          <div className="flex gap-6 border-b border-neutral-200 pb-3 mb-8 flex-wrap">
            <button 
              onClick={() => { setActiveTab('products'); }}
              className={`text-[10px] font-mono font-black tracking-[0.2em] uppercase pb-1 transition-all cursor-pointer ${activeTab === 'products' ? 'text-neutral-950 border-b-2 border-neutral-950' : 'text-neutral-400 hover:text-neutral-900'}`}
            >
              Drops Manager
            </button>
            <button 
              onClick={() => { setActiveTab('orders'); loadCustomerOrders(); }}
              className={`text-[10px] font-mono font-black tracking-[0.2em] uppercase pb-1 transition-all cursor-pointer ${activeTab === 'orders' ? 'text-neutral-950 border-b-2 border-neutral-950' : 'text-neutral-400 hover:text-neutral-900'}`}
            >
              Fulfillment ({orders.length})
            </button>
            <button 
              onClick={() => { setActiveTab('campaigns'); }}
              className={`text-[10px] font-mono font-black tracking-[0.2em] uppercase pb-1 transition-all cursor-pointer ${activeTab === 'campaigns' ? 'text-neutral-950 border-b-2 border-neutral-950' : 'text-neutral-400 hover:text-neutral-900'}`}
            >
              Campaign Panel
            </button>
            <button 
              onClick={() => { setActiveTab('telemetry'); loadStoreTelemetry(); }}
              className={`text-[10px] font-mono font-black tracking-[0.2em] uppercase pb-1 transition-all cursor-pointer ${activeTab === 'telemetry' ? 'text-neutral-950 border-b-2 border-neutral-950' : 'text-neutral-400 hover:text-neutral-900'}`}
            >
              Activity Logs
            </button>
          </div>

          {/* ==========================================
              TAB 1: DROPS CATALOG & LAUNCH DROP
              ========================================== */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {/* Products Sub-Tab Menu */}
              <div className="flex gap-6 border-b border-neutral-200 pb-3 mb-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setProductsSubTab('list')}
                  className={`text-[10px] font-mono font-black tracking-[0.2em] uppercase pb-1.5 transition-all border-b-2 cursor-pointer ${
                    productsSubTab === 'list' 
                      ? 'text-neutral-950 border-neutral-950' 
                      : 'text-neutral-400 border-transparent hover:text-neutral-950'
                  }`}
                >
                  Deployed Drops Pool ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!editingId) {
                      handleCancelEdit();
                    }
                    setProductsSubTab('form');
                  }}
                  className={`text-[10px] font-mono font-black tracking-[0.2em] uppercase pb-1.5 transition-all border-b-2 cursor-pointer ${
                    productsSubTab === 'form' 
                      ? 'text-neutral-950 border-neutral-950' 
                      : 'text-neutral-400 border-transparent hover:text-neutral-950'
                  }`}
                >
                  {editingId ? '⚡ Edit Drop Details' : '➕ Launch New Drop'}
                </button>
              </div>

              {productsSubTab === 'form' ? (
                <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Product Name */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Product Name</label>
                <input
                  type="text"
                  disabled={actionLoading}
                  placeholder="E.G., GOTHIC OVERSIZED HOODIE"
                  className={`w-full bg-[#fbfbfb] border ${errors.name ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-200'} rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider focus:border-neutral-950 transition-colors uppercase font-medium disabled:opacity-50`}
                  {...register('name', { required: 'Product name is required' })}
                />
                {errors.name && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.name.message}</span>}
              </div>

              {/* Price */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Price (INR)</label>
                <input
                  type="number"
                  placeholder="1499"
                  disabled={actionLoading}
                  className={`w-full bg-[#fbfbfb] border ${errors.price ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-200'} rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider focus:border-neutral-950 transition-colors font-medium disabled:opacity-50`}
                  {...register('price', { 
                    required: 'Price is required',
                    min: { value: 1, message: 'Price must be greater than 0' }
                  })}
                />
                {errors.price && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.price.message}</span>}
              </div>

              {/* Compare-at Price */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Compare-At Price (INR)</label>
                <input
                  type="number"
                  placeholder="1999"
                  disabled={actionLoading}
                  className="w-full bg-[#fbfbfb] border border-neutral-200 rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider focus:border-neutral-950 transition-colors font-medium disabled:opacity-50"
                  {...register('compare_at_price')}
                />
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Category</label>
                <select
                  disabled={actionLoading}
                  className="w-full bg-[#fbfbfb] border border-neutral-200 rounded-xl px-4 py-3.5 text-sm text-neutral-800 outline-hidden tracking-wider focus:border-neutral-950 transition-colors font-medium appearance-none cursor-pointer disabled:opacity-50 uppercase"
                  {...register('category')}
                >
                  <option value="printed-tshirt">PRINTED T-SHIRT</option>
                  <option value="oversized-tshirt">OVERSIZED T-SHIRT</option>
                  <option value="shirts">SHIRT</option>
                  <option value="hoodies">HOODIES & SWEATSHIRTS</option>
                </select>
              </div>

              {/* Custom URL Slug */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Custom URL Slug</label>
                <input
                  type="text"
                  placeholder="gothic-oversized-hoodie"
                  disabled={actionLoading}
                  className="w-full bg-[#fbfbfb] border border-neutral-200 rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider focus:border-neutral-950 transition-colors font-medium disabled:opacity-50 lowercase"
                  {...register('slug')}
                />
              </div>

              {/* Search Keywords */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Search Keywords (Comma Separated)</label>
                <input
                  type="text"
                  disabled={actionLoading}
                  placeholder="E.G., OVERSIZED, HEAVYWEIGHT, BLACK, GRAPHIC, COTTON"
                  className="w-full bg-[#fbfbfb] border border-neutral-200 rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider focus:border-neutral-950 transition-colors uppercase font-medium disabled:opacity-50"
                  {...register('search_keywords')}
                />
              </div>

              {/* Front Image Link */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Front Image Link</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    disabled={actionLoading}
                    placeholder="PASTE FRONT IMAGE LINK"
                    className={`flex-1 bg-[#fbfbfb] border ${errors.front_image_link ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-200'} rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider focus:border-neutral-950 transition-colors font-medium disabled:opacity-50`}
                    {...register('front_image_link', { required: 'Front image link is required' })}
                  />
                  <label className="shrink-0 bg-neutral-950 hover:bg-neutral-850 text-white font-mono font-bold text-xs px-4 py-3.5 rounded-xl uppercase transition-all cursor-pointer border border-neutral-950 text-center select-none disabled:opacity-50">
                    {uploadingFields['front_image_link'] ? 'Uploading...' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleProductImageUpload(e, 'front_image_link')}
                      disabled={actionLoading || uploadingFields['front_image_link']}
                      className="hidden"
                    />
                  </label>
                </div>
                {errors.front_image_link && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.front_image_link.message}</span>}
              </div>

              {/* Gallery Images */}
              <div className="flex flex-col gap-3 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Back Image Links (Max 4)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {BACK_IMAGE_FIELDS.map((fieldName, index) => (
                    <div key={fieldName} className="flex gap-2 items-center">
                      <input
                        type="text"
                        disabled={actionLoading}
                        placeholder={`BACK IMAGE LINK ${index + 1}`}
                        className="flex-1 bg-[#fbfbfb] border border-neutral-200 focus:border-neutral-950 rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider transition-colors font-medium disabled:opacity-50"
                        {...register(fieldName, index === 0 ? { required: 'At least one back view link is required.' } : undefined)}
                      />
                      <label className="shrink-0 bg-neutral-950 hover:bg-neutral-850 text-white font-mono font-bold text-xs px-4 py-3.5 rounded-xl uppercase transition-all cursor-pointer border border-neutral-950 text-center select-none disabled:opacity-50">
                        {uploadingFields[fieldName] ? 'Uploading...' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleProductImageUpload(e, fieldName)}
                          disabled={actionLoading || uploadingFields[fieldName]}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ))}
                </div>
                {errors.back_image_link_1 && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.back_image_link_1.message}</span>}
              </div>

              {/* Size-wise Stock Management (Option 2) */}
              <div className="flex flex-col gap-3 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Size-wise Stock Inventory Configuration</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
                  {SIZE_OPTIONS.map((size) => (
                    <div key={size} className="flex flex-col gap-1.5 p-2 bg-white rounded-lg border border-neutral-200">
                      <span className="text-[10px] font-black text-neutral-800 tracking-wider text-center">{size} STOCK</span>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        disabled={actionLoading}
                        className="w-full text-center text-xs font-bold font-mono outline-hidden border-b border-neutral-200 focus:border-neutral-900 bg-transparent py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        {...register(`stock_${size}`)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Metadata & Custom Variations */}
              <div className="flex flex-col gap-3 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Product Metadata & Custom Variations</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
                  {/* Status Badge Tag */}
                  <div className="flex flex-col gap-1.5 bg-white p-3 rounded-lg border border-neutral-200">
                    <label className="text-[9px] font-black text-neutral-500 uppercase">Status Badge Tag</label>
                    <select
                      disabled={actionLoading}
                      className="w-full text-xs font-bold font-mono outline-hidden border-b border-neutral-200 focus:border-neutral-950 bg-transparent py-1 uppercase appearance-none cursor-pointer text-neutral-800"
                      {...register('single_tag')}
                    >
                      <option value="">NONE / NO BADGE</option>
                      {TAG_OPTIONS.map((tag) => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  </div>

                  {/* Discount Percent */}
                  <div className="flex flex-col gap-1.5 bg-white p-3 rounded-lg border border-neutral-200">
                    <label className="text-[9px] font-black text-neutral-500 uppercase">Discount Percent (%)</label>
                    <input
                      type="number"
                      disabled={actionLoading}
                      placeholder="0"
                      min="0"
                      max="100"
                      className="w-full text-xs font-bold font-mono outline-hidden border-b border-neutral-200 focus:border-neutral-900 bg-transparent py-1"
                      {...register('discount_percent')}
                    />
                  </div>

                  {/* Color Group ID */}
                  <div className="flex flex-col gap-1.5 bg-white p-3 rounded-lg border border-neutral-200">
                    <label className="text-[9px] font-black text-neutral-500 uppercase">Color Group ID</label>
                    <input
                      type="text"
                      disabled={actionLoading}
                      placeholder="E.G., CG-TEE-01"
                      className="w-full text-xs font-bold font-mono outline-hidden border-b border-neutral-200 focus:border-neutral-900 bg-transparent py-1 uppercase"
                      {...register('color_group_id')}
                    />
                  </div>

                  {/* Color Name */}
                  <div className="flex flex-col gap-1.5 bg-white p-3 rounded-lg border border-neutral-200">
                    <label className="text-[9px] font-black text-neutral-500 uppercase">Color Name</label>
                    <input
                      type="text"
                      disabled={actionLoading}
                      placeholder="E.G., JET BLACK"
                      className="w-full text-xs font-bold font-mono outline-hidden border-b border-neutral-200 focus:border-neutral-900 bg-transparent py-1 uppercase"
                      {...register('color_name')}
                    />
                  </div>

                  {/* Color Hex */}
                  <div className="flex flex-col gap-1.5 bg-white p-3 rounded-lg border border-neutral-200">
                    <label className="text-[9px] font-black text-neutral-500 uppercase">Color Hex Code</label>
                    <input
                      type="text"
                      disabled={actionLoading}
                      placeholder="E.G., #000000"
                      className="w-full text-xs font-bold font-mono outline-hidden border-b border-neutral-200 focus:border-neutral-900 bg-transparent py-1 uppercase"
                      {...register('color_hex')}
                    />
                  </div>

                  {/* Fit Type */}
                  <div className="flex flex-col gap-1.5 bg-white p-3 rounded-lg border border-neutral-200">
                    <label className="text-[9px] font-black text-neutral-500 uppercase">Fit Type</label>
                    <input
                      type="text"
                      disabled={actionLoading}
                      placeholder="E.G., OVERSIZED BOX FIT"
                      className="w-full text-xs font-bold font-mono outline-hidden border-b border-neutral-200 focus:border-neutral-900 bg-transparent py-1 uppercase"
                      {...register('fit_type')}
                    />
                  </div>

                  {/* Fabric GSM */}
                  <div className="flex flex-col gap-1.5 bg-white p-3 rounded-lg border border-neutral-200 sm:col-span-2 md:col-span-3">
                    <label className="text-[9px] font-black text-neutral-500 uppercase">Fabric GSM</label>
                    <input
                      type="text"
                      disabled={actionLoading}
                      placeholder="E.G., 240 GSM 100% COMBED COTTON"
                      className="w-full text-xs font-bold font-mono outline-hidden border-b border-neutral-200 focus:border-neutral-900 bg-transparent py-1 uppercase"
                      {...register('fabric_gsm')}
                    />
                  </div>

                  {/* Featured Product Flag */}
                  <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-neutral-200 sm:col-span-2 md:col-span-3">
                    <input
                      type="checkbox"
                      id="is_featured"
                      disabled={actionLoading}
                      className="w-4 h-4 text-neutral-950 border-neutral-200 focus:ring-0 focus:ring-offset-0 rounded-none accent-neutral-950 cursor-pointer"
                      {...register('is_featured')}
                    />
                    <label htmlFor="is_featured" className="text-[10px] font-black text-neutral-750 uppercase tracking-widest cursor-pointer select-none">
                      ★ Mark as Featured (Display in Heavyweight Drops on Homepage)
                    </label>
                  </div>

                  {/* Dynamic Color Variants Creator */}
                  <div className="sm:col-span-2 md:col-span-3 border-t border-neutral-200/60 pt-4 mt-2 space-y-3">
                    <label className="text-[10px] font-black tracking-widest text-neutral-800 uppercase block">
                      Multi-Color Variants (Option B: Single Page Switcher)
                    </label>
                    <p className="text-[9px] text-neutral-400 uppercase tracking-wider">
                      Add color swatches and specific photos for this product. If you add variants here, they will override the simple Color Name/Hex fields above.
                    </p>

                    {/* Variant Entry Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-neutral-50 p-3 border border-neutral-200">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-bold text-neutral-500 uppercase">Color Name</span>
                        <input
                          type="text"
                          placeholder="E.G. BLACK"
                          value={vName}
                          onChange={(e) => setVName(e.target.value)}
                          className="bg-white border border-neutral-300 px-3 py-2 text-xs tracking-wider uppercase outline-hidden"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-bold text-neutral-500 uppercase">Hex Code</span>
                        <input
                          type="text"
                          placeholder="E.G. #000000"
                          value={vHex}
                          onChange={(e) => setVHex(e.target.value)}
                          className="bg-white border border-neutral-300 px-3 py-2 text-xs tracking-wider uppercase outline-hidden font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-bold text-neutral-500 uppercase">Front Image Link</span>
                        <input
                          type="text"
                          placeholder="URL TO FRONT IMAGE"
                          value={vFront}
                          onChange={(e) => setVFront(e.target.value)}
                          className="bg-white border border-neutral-300 px-3 py-2 text-xs tracking-wider outline-hidden"
                        />
                      </div>
                      <div className="flex flex-col gap-1 justify-end">
                        <span className="text-[8px] font-bold text-neutral-500 uppercase">Back Image Link (Optional)</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="URL TO BACK IMAGE"
                            value={vBack}
                            onChange={(e) => setVBack(e.target.value)}
                            className="bg-white border border-neutral-300 px-3 py-2 text-xs tracking-wider outline-hidden flex-1"
                          />
                          <button
                            type="button"
                            onClick={addColorVariant}
                            className="bg-neutral-950 hover:bg-neutral-800 text-white text-[10px] font-bold tracking-widest px-3 py-2 uppercase shrink-0 transition-colors cursor-pointer"
                          >
                            ADD
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Added Variants List */}
                    {colorVariants.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest block">Added Variants ({colorVariants.length})</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {colorVariants.map((variant, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-neutral-50/50 border border-neutral-200">
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full border border-neutral-300 shrink-0" style={{ backgroundColor: variant.hex }} />
                                <div className="text-[10px] font-bold text-neutral-800 tracking-wider">
                                  {variant.name} ({variant.hex})
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeColorVariant(idx)}
                                className="text-[9px] font-bold text-rose-600 hover:text-rose-800 uppercase tracking-widest cursor-pointer"
                              >
                                REMOVE
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description Spec */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Description (Optional)</label>
                <textarea
                  rows="3"
                  disabled={actionLoading}
                  placeholder="E.G., 280 GSM 100% FRENCH TERRY COTTON. BOOTCUT BOXED DROP LAYOUT SPEC..."
                  className="w-full bg-[#fbfbfb] border border-neutral-200 rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider focus:border-neutral-950 transition-colors font-medium resize-none disabled:opacity-50 uppercase"
                  {...register('description')}
                />
              </div>

              {/* Form actions and submission */}
              <div className="md:col-span-2 mt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-neutral-950 hover:bg-neutral-800 text-white font-black text-xs tracking-widest uppercase py-4 rounded-none border border-neutral-950 transition-all active:scale-[0.99] disabled:opacity-40 cursor-pointer"
                >
                  {actionLoading ? 'PROCESSING REQUEST...' : editingId ? 'UPDATE DROP SPECIFICATION' : 'DEPLOY DROP TO PUBLIC'}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCancelEdit}
                  className="px-6 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-black text-xs tracking-widest uppercase py-4 rounded-none border border-neutral-350 transition-all active:scale-[0.99] cursor-pointer"
                >
                  {editingId ? 'CANCEL' : 'RETURN TO POOL'}
                </button>
              </div>
            </form>
              ) : (
                (() => {
                  const filteredProducts = products.filter(p => {
                    // Search filter
                    if (productSearchQuery.trim()) {
                      const query = productSearchQuery.toLowerCase().trim();
                      const nameMatch = (p.name || '').toLowerCase().includes(query);
                      const slugMatch = (p.slug || '').toLowerCase().includes(query);
                      const descMatch = (p.description || '').toLowerCase().includes(query);
                      const tagBadgeMatch = (p.tag || '').toLowerCase().includes(query);
                      const categoryMatch = (p.category || '').toLowerCase().includes(query);
                      const colorNameMatch = (p.color_name || '').toLowerCase().includes(query);
                      const keywordMatch = Array.isArray(p.tags) && p.tags.some(t => String(t).toLowerCase().includes(query));
                      if (!nameMatch && !slugMatch && !descMatch && !tagBadgeMatch && !categoryMatch && !colorNameMatch && !keywordMatch) return false;
                    }

                    // Category filter
                    if (productCategoryFilter !== 'ALL' && p.category !== productCategoryFilter) {
                      return false;
                    }

                    // Tag filter
                    if (productTagFilter !== 'ALL' && p.tag !== productTagFilter) {
                      return false;
                    }

                    // Stock filter
                    if (productStockFilter !== 'ALL') {
                      let parsedStock;
                      try {
                        parsedStock = JSON.parse(p.sizes_stock || '{}');
                      } catch {
                        parsedStock = {};
                      }
                      const totalStock = Object.values(parsedStock).reduce((acc, v) => acc + Number(v), 0);
                      const isOut = totalStock === 0;

                      if (productStockFilter === 'IN_STOCK' && isOut) return false;
                      if (productStockFilter === 'OUT_STOCK' && !isOut) return false;
                    }

                    return true;
                  });

                  return (
                    <div className="space-y-6">
                      {/* Search & Filter Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-neutral-50/50 p-4 border border-neutral-950 rounded-none">
                        {/* Search Input */}
                        <div className="flex flex-col gap-1.5 sm:col-span-1">
                          <span className="text-[8px] font-mono text-neutral-400 font-bold uppercase tracking-widest">Search Drops</span>
                          <input
                            type="text"
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                            placeholder="Search name, slug, tag..."
                            className="w-full bg-white border border-neutral-950 text-xs font-mono font-bold px-3 py-2 outline-hidden placeholder-neutral-450 uppercase tracking-wider rounded-none focus:border-neutral-950 focus:bg-white"
                          />
                        </div>
                        {/* Category Selector */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-mono text-neutral-400 font-bold uppercase tracking-widest">Filter Category</span>
                          <select
                            value={productCategoryFilter}
                            onChange={(e) => setProductCategoryFilter(e.target.value)}
                            className="w-full bg-white border border-neutral-950 text-xs font-mono font-bold text-neutral-800 outline-hidden tracking-wider focus:border-neutral-950 uppercase cursor-pointer rounded-none px-2 py-2"
                          >
                            <option value="ALL">ALL CATEGORIES</option>
                            <option value="printed-tshirt">PRINTED T-SHIRT</option>
                            <option value="oversized-tshirt">OVERSIZED T-SHIRT</option>
                            <option value="shirts">SHIRT</option>
                            <option value="hoodies">HOODIES & SWEATSHIRTS</option>
                          </select>
                        </div>
                        {/* Tag Selector */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-mono text-neutral-400 font-bold uppercase tracking-widest">Filter Badge</span>
                          <select
                            value={productTagFilter}
                            onChange={(e) => setProductTagFilter(e.target.value)}
                            className="w-full bg-white border border-neutral-950 text-xs font-mono font-bold text-neutral-800 outline-hidden tracking-wider focus:border-neutral-950 uppercase cursor-pointer rounded-none px-2 py-2"
                          >
                            <option value="ALL">ALL BADGES</option>
                            <option value="NEW DROP">NEW DROP</option>
                            <option value="BEST SELLER">BEST SELLER</option>
                            <option value="FEW LEFT">FEW LEFT</option>
                            <option value="LIMITED ITEM">LIMITED ITEM</option>
                          </select>
                        </div>
                        {/* Stock Selector */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-mono text-neutral-400 font-bold uppercase tracking-widest">Filter Stock</span>
                          <select
                            value={productStockFilter}
                            onChange={(e) => setProductStockFilter(e.target.value)}
                            className="w-full bg-white border border-neutral-950 text-xs font-mono font-bold text-neutral-800 outline-hidden tracking-wider focus:border-neutral-950 uppercase cursor-pointer rounded-none px-2 py-2"
                          >
                            <option value="ALL">ALL STOCK STATUS</option>
                            <option value="IN_STOCK">IN STOCK ONLY</option>
                            <option value="OUT_STOCK">OUT OF STOCK ONLY</option>
                          </select>
                        </div>
                      </div>

                      {filteredProducts.length === 0 ? (
                        <div className="py-12 text-center border border-dashed border-neutral-950 rounded-none bg-neutral-50/50">
                          <p className="text-xs font-mono font-black tracking-widest text-neutral-500 uppercase">
                            No active product drops match the search criteria or filters.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredProducts.map((p) => {
                            const targetId = p.$id || p.id;
                            const coverThumbnailUrl = p.front_image_link || p.image_url || p.image || 'https://placehold.co/100x100?text=No+Asset';
                            const badgeStr = p.tag ? `[${p.tag}]` : "[NO BADGE]";
                            const keywordsStr = Array.isArray(p.tags) && p.tags.length > 0 ? p.tags.join(', ') : "no keywords";
                            const parsedTagsString = `${badgeStr} Keywords: ${keywordsStr}`;
                            
                            // Parse sizes and stock
                            let parsedStock = {};
                            try {
                              parsedStock = JSON.parse(p.sizes_stock || '{}');
                            } catch (err) {
                              console.warn("Stock parsing failed for catalog list:", err.message);
                              parsedStock = {};
                            }

                            const sizesWithStockArray = (p.sizes || []).map(size => {
                              const stock = parsedStock[size] !== undefined ? parsedStock[size] : 10;
                              return `${size} (${stock})`;
                            });
                            const parsedSizesString = sizesWithStockArray.join(', ') || "NONE";
                            const backImagesArrayCount = Array.isArray(p.back_image_links) ? p.back_image_links.length : p.back_image_link ? 1 : 0;

                            return (
                              <div key={targetId} className="flex items-center gap-4 p-3 border border-neutral-950 bg-neutral-50/50 group hover:bg-neutral-100/30 transition-colors duration-200 rounded-none">
                                <img src={coverThumbnailUrl} alt={p.name} className="w-12 h-12 object-cover border border-neutral-950 shrink-0 rounded-none" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black uppercase tracking-wide text-neutral-900 truncate">{p.name}</p>
                                  <p className="text-xs text-neutral-500 mt-0.5 uppercase tracking-tight">
                                    ₹{p.price} · <span className="text-[var(--theme-primary)] font-bold">{parsedTagsString}</span> · Stocks: {parsedSizesString} · Backframes: {backImagesArrayCount}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleEdit(targetId)}
                                  className="text-[9px] bg-white border border-neutral-950 hover:bg-neutral-950 hover:text-white px-3 py-1.5 font-mono font-black text-neutral-950 uppercase tracking-widest cursor-pointer shrink-0 transition-colors duration-150 rounded-none"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProductItem(targetId)}
                                  className="text-[9px] bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-950 px-3 py-1.5 font-mono font-black text-rose-950 uppercase tracking-widest cursor-pointer shrink-0 transition-colors duration-150 rounded-none"
                                >
                                  Sweep
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* ==========================================
              TAB 2: ORDER MANAGEMENT
              ========================================== */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="text-xs font-black tracking-[0.4em] text-[var(--theme-primary)] uppercase">Incoming Customer Orders</h2>
                <span className="text-[10px] font-mono text-neutral-400 uppercase font-black">{orders.length} TOTAL ORDERS</span>
              </div>

              {/* Telemetry Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest font-bold">TOTAL SALES REVENUE</span>
                  <span className="text-lg font-black text-neutral-900">
                    ₹{orders
                      .filter(o => o.status !== 'CANCELLED')
                      .reduce((acc, o) => acc + Number(o.total || 0), 0)
                      .toLocaleString('en-IN')
                    }
                  </span>
                  <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">Total from active orders</span>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest font-bold">PENDING ORDERS</span>
                  <span className="text-lg font-black text-amber-600">
                    {orders.filter(o => (o.status || 'PENDING') === 'PENDING').length} ORDERS
                  </span>
                  <span className="text-[8px] font-bold text-neutral-450 uppercase tracking-wider">Awaiting shipping</span>
                </div>
                <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest font-bold">CANCELLED ORDERS</span>
                  <span className="text-lg font-black text-rose-600">
                    {orders.filter(o => o.status === 'CANCELLED').length} ORDERS
                  </span>
                  <span className="text-[8px] font-bold text-neutral-450 uppercase tracking-wider">Cancelled order count</span>
                </div>
              </div>

              {/* Search and Export Utilities Row */}
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white border border-neutral-200 p-4 rounded-xl">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Search name, email, or order ID..."
                    className="w-full bg-[#fafafb] border border-neutral-200 focus:border-neutral-950 text-xs font-semibold px-4 py-2.5 outline-hidden placeholder-neutral-400 uppercase tracking-wider rounded-lg font-sans"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleExportOrdersToCSV}
                  className="bg-neutral-950 hover:bg-neutral-855 text-white font-mono font-black text-[10px] tracking-widest uppercase px-5 py-3.5 rounded-lg cursor-pointer transition-all duration-300 shrink-0 text-center"
                >
                  Export Orders list to CSV
                </button>
              </div>

              {/* Order Status Filters */}
              <div className="flex flex-wrap gap-2 border-b border-neutral-200/60 pb-4">
                {['ALL', 'PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((filterVal) => {
                  const count = filterVal === 'ALL' 
                    ? orders.length 
                    : orders.filter(o => (o.status || 'PENDING') === filterVal).length;
                  return (
                    <button
                      key={filterVal}
                      onClick={() => setOrderFilter(filterVal)}
                      className={`px-3.5 py-2 text-[9px] font-black uppercase tracking-wider transition-all rounded-lg border cursor-pointer ${
                        orderFilter === filterVal
                          ? 'bg-neutral-950 text-white border-neutral-950 shadow-xs'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-450'
                      }`}
                    >
                      {filterVal} ({count})
                    </button>
                  );
                })}
              </div>

              {(() => {
                const filteredOrders = orders.filter(order => {
                  const status = order.status || 'PENDING';
                  if (orderFilter !== 'ALL' && status !== orderFilter) return false;
                  
                  if (orderSearchQuery.trim()) {
                    const query = orderSearchQuery.toLowerCase().trim();
                    const uniqueId = order.$id || order.id || '';
                    let orderNumber = order.order_number || '';
                    try {
                      const parsed = JSON.parse(order.address);
                      if (parsed && typeof parsed === 'object' && parsed.metadata && parsed.metadata.order_number) {
                        orderNumber = parsed.metadata.order_number;
                      }
                    } catch (err) {
                      console.warn("JSON address parsing failed for search:", err.message);
                    }
                    const customerName = order.customerName || '';
                    const email = order.email || '';
                    
                    return uniqueId.toLowerCase().includes(query) ||
                           orderNumber.toLowerCase().includes(query) ||
                           customerName.toLowerCase().includes(query) ||
                           email.toLowerCase().includes(query);
                  }
                  
                  return true;
                });

                if (filteredOrders.length === 0) {
                  return (
                    <div className="py-20 text-center border border-dashed border-neutral-350 rounded-2xl bg-neutral-50/50">
                      <p className="text-xs font-black tracking-widest text-neutral-500 uppercase">
                        No orders match the filters or search query &ldquo;{orderSearchQuery || orderFilter}&rdquo;.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filteredOrders.map((order, idx) => {
                      const uniqueOrderId = order.$id || order.id;
                      let parsedItems;
                      try {
                        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
                      } catch {
                        parsedItems = [];
                      }

                      // Parse address — handles both old JSON format and new plain string
                      let displayAddress = order.address || '';
                      let orderNumber = order.order_number || uniqueOrderId?.substring(0, 12).toUpperCase();
                      let cancelReason = '';
                      try {
                        const parsedAddr = JSON.parse(order.address);
                        if (parsedAddr && typeof parsedAddr === 'object') {
                          // New format: { customerAddress: '...', metadata: {...} }
                          let rawAddr = parsedAddr.customerAddress || order.address;
                          // Handle if customerAddress is itself a JSON string
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
                            } catch (err) {
                              console.warn("Could not parse inner customer address JSON:", err.message);
                            }
                          }
                          displayAddress = rawAddr;
                          if (parsedAddr.metadata?.order_number) {
                            orderNumber = parsedAddr.metadata.order_number;
                          }
                          if (parsedAddr.metadata?.cancel_reason) {
                            cancelReason = parsedAddr.metadata.cancel_reason;
                          }
                        }
                      } catch {
                        // Plain string address (new format after fix)
                        displayAddress = order.address || '';
                      }

                      return (
                        <div key={uniqueOrderId || idx} className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 flex flex-col gap-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-200/60 pb-3 gap-2">
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono text-neutral-500 block uppercase">ORDER: {orderNumber}</span>
                              <span className="text-xs font-black text-neutral-900 uppercase tracking-wide">{order.customerName}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Dynamic Order Status Badge */}
                              <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                order.status === 'DELIVERED' 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-250' 
                                : order.status === 'SHIPPED' 
                                ? 'bg-amber-50 text-amber-600 border border-amber-250' 
                                : order.status === 'CANCELLED'
                                ? 'bg-neutral-100 text-neutral-500 border border-neutral-300'
                                : 'bg-rose-50 text-rose-600 border border-rose-250 animate-pulse'
                              }`}>
                                {order.status || 'PENDING'}
                              </span>
                              
                              <span className="text-xs font-mono font-black text-neutral-900">₹{order.total?.toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          {order.status === 'CANCELLED' && cancelReason && (
                            <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg text-rose-700 text-[10px] font-medium uppercase tracking-wide">
                              <span className="font-bold block text-[8px] text-rose-500">CANCELLATION REASON</span>
                              &ldquo;{cancelReason}&rdquo;
                            </div>
                          )}

                          {/* Customer & shipping info */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium uppercase tracking-wide text-neutral-600">
                            <div>
                              <span className="text-[8px] font-bold text-neutral-400 block tracking-widest">SHIPPING DESTINATION</span>
                              <span className="text-neutral-900 font-bold block mt-0.5 text-[11px] leading-relaxed">{displayAddress}</span>
                            </div>
                            <div>
                              <span className="text-[8px] font-bold text-neutral-400 block tracking-widest">CONTACT SPEC DETAILS</span>
                              <span className="text-neutral-900 font-bold block mt-0.5">{order.phone} · {order.email}</span>
                            </div>
                          </div>

                          {/* Purchased Garments */}
                          <div className="bg-white/80 p-4 rounded-xl border border-neutral-200/50 space-y-2">
                            <span className="text-[8px] font-bold text-neutral-400 block tracking-widest">GARMENTS SPECIFICATION LIST</span>
                            <div className="divide-y divide-neutral-100">
                              {parsedItems.map((item, itemIdx) => (
                                <div key={itemIdx} className="flex justify-between items-center py-2 text-xs">
                                  <span className="font-black text-neutral-800 uppercase tracking-wide truncate max-w-sm">{item.name}</span>
                                  <span className="font-mono text-neutral-500">Size: {item.size || 'M'} · Qty: {item.quantity} · ₹{item.price}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Actions to shift status */}
                          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-neutral-200/40">
                            {(order.status && order.status !== 'PENDING') && (
                              <button
                                disabled={actionLoading}
                                onClick={() => handleOrderStatusShift(order, 'PENDING')}
                                className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                              >
                                Reset to Pending
                              </button>
                            )}
                            {order.status !== 'SHIPPED' && (
                              <button
                                disabled={actionLoading}
                                onClick={() => {
                                  setShippedTargetOrder(order);
                                  setAdminTrackingNumber('');
                                  setAdminTrackingUrl('');
                                  setIsShippedModalOpen(true);
                                }}
                                className="bg-neutral-950 hover:bg-neutral-800 text-white font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-none border border-neutral-950 cursor-pointer transition-colors disabled:opacity-50"
                              >
                                Mark as Shipped
                              </button>
                            )}
                            {order.status !== 'DELIVERED' && (
                              <button
                                disabled={actionLoading}
                                onClick={() => handleOrderStatusShift(order, 'DELIVERED')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-none border border-emerald-700 cursor-pointer transition-colors disabled:opacity-50"
                              >
                                Mark as Delivered
                              </button>
                            )}
                            {order.status !== 'CANCELLED' && (
                              <button
                                disabled={actionLoading}
                                onClick={() => {
                                  setCancelTargetOrder(order);
                                  setAdminCancelReason('Out of Stock / Inventory Error');
                                  setAdminCancelCustomText('');
                                  setIsAdminCancelModalOpen(true);
                                }}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-none border border-rose-600 cursor-pointer transition-colors disabled:opacity-50"
                              >
                                Cancel Order
                              </button>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ==========================================
              TAB 3: CAMPAIGNS & COUPONS ENGINE (Option 4)
              ========================================== */}
          {activeTab === 'campaigns' && (
            <div className="space-y-8">
              
              {/* Marquee Announcer Manager */}
              <div className="bg-white p-6 rounded-none border border-neutral-950 space-y-4">
                <div>
                  <h3 className="text-xs font-mono font-black tracking-widest text-neutral-950 uppercase">DYNAMIC BANNER ANNOUNCEMENT</h3>
                  <p className="text-[10px] text-neutral-450 uppercase tracking-wider mt-0.5">Edit the live marquee banner announcement text displayed globally on the homepage.</p>
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={campaignPromoText}
                    onChange={(e) => setCampaignPromoText(e.target.value)}
                    placeholder="ENTER MARQUEE ANNOUNCEMENT TEXT..."
                    className="flex-1 bg-white border border-neutral-300 focus:border-neutral-950 rounded-none px-4 py-3 text-xs font-bold uppercase tracking-wider outline-hidden"
                  />
                  <button
                    onClick={saveCampaignPromoText}
                    className="bg-neutral-950 hover:bg-neutral-900 text-white font-mono font-black text-xs tracking-widest uppercase px-6 rounded-none cursor-pointer transition-all duration-300"
                  >
                    SAVE
                  </button>
                </div>
              </div>

              {/* Coupons Generator */}
              <div className="bg-white p-6 rounded-none border border-neutral-950 space-y-4">
                <div>
                  <h3 className="text-xs font-mono font-black tracking-widest text-neutral-950 uppercase">PROMO COUPON MANAGER</h3>
                  <p className="text-[10px] text-neutral-450 uppercase tracking-wider mt-0.5">Activate or revoke coupon discount codes to enable live checkouts promotions.</p>
                </div>

                {/* Coupon Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-white p-4 rounded-none border border-neutral-300">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-black text-neutral-550 block tracking-widest uppercase">COUPON CODE</span>
                    <input
                      type="text"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value)}
                      placeholder="E.G., STREET50"
                      className="bg-neutral-50 border border-neutral-300 focus:border-neutral-950 rounded-none px-3 py-2 text-xs font-mono font-black uppercase tracking-wider w-full outline-hidden"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-black text-neutral-550 block tracking-widest uppercase">DISCOUNT %</span>
                    <select
                      value={newCouponDiscount}
                      onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                      className="bg-neutral-50 border border-neutral-300 rounded-none px-3 py-2 text-xs font-mono font-black uppercase tracking-wider w-full outline-hidden cursor-pointer"
                    >
                      <option value="10">10% OFF</option>
                      <option value="20">20% OFF</option>
                      <option value="30">30% OFF</option>
                      <option value="50">50% OFF</option>
                      <option value="75">75% OFF</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-black text-neutral-550 block tracking-widest uppercase">MIN ORDER VALUE (INR, OPTIONAL)</span>
                    <input
                      type="number"
                      value={newCouponMinOrderValue}
                      onChange={(e) => setNewCouponMinOrderValue(e.target.value)}
                      placeholder="e.g. 1999"
                      className="bg-neutral-50 border border-neutral-300 focus:border-neutral-950 rounded-none px-3 py-2 text-xs font-mono font-black w-full outline-hidden"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-black text-neutral-550 block tracking-widest uppercase">VALID UNTIL (OPTIONAL)</span>
                    <input
                      type="date"
                      value={newCouponValidUntil}
                      onChange={(e) => setNewCouponValidUntil(e.target.value)}
                      className="bg-neutral-50 border border-neutral-300 focus:border-neutral-950 rounded-none px-3 py-1.5 text-xs font-mono font-black w-full outline-hidden"
                    />
                  </div>
                  <button
                    onClick={handleAddCoupon}
                    className="bg-neutral-950 hover:bg-neutral-900 text-white font-mono font-black text-xs tracking-widest uppercase py-2.5 rounded-none cursor-pointer transition-colors w-full md:col-span-2 lg:col-span-1"
                  >
                    ACTIVATE
                  </button>
                </div>

                {/* Active Coupons List */}
                <div className="space-y-2 mt-4">
                  <span className="text-[8px] font-bold text-neutral-400 block tracking-widest uppercase">ACTIVE EXCLUSIVE COUPONS ({campaignCoupons.length})</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {campaignCoupons.map((coupon, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-neutral-200">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-black bg-neutral-900 text-white px-2.5 py-1 rounded border border-neutral-900 tracking-wider">{coupon.code}</span>
                          <span className="text-[10px] font-black text-emerald-600 tracking-wider uppercase">{coupon.discount}% SAVINGS</span>
                        </div>
                        <button
                          onClick={() => handleDeleteCoupon(coupon.code)}
                          className="text-[9px] font-black text-rose-600 hover:text-rose-700 uppercase cursor-pointer"
                        >
                          Deactivate
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ==========================================
              TAB 4: STORE ACTIVITY LOGS
              ========================================== */}
          {activeTab === 'telemetry' && (
            <div className="space-y-8 animate-fade-in">
              
              {/* Restock Alerts Section */}
              <div className="space-y-4">
                <div className="pb-4 border-b border-neutral-200 flex items-center justify-between">
                  <h2 className="text-xs font-mono font-black tracking-[0.2em] text-neutral-950 uppercase">Restock Requests</h2>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase font-black">{restockNotifications.length} REQUESTS</span>
                </div>
                
                {telemetryLoading ? (
                  <div className="py-12 text-center text-xs font-bold text-neutral-400 animate-pulse uppercase tracking-widest">Loading data...</div>
                ) : restockNotifications.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-neutral-300 rounded-none bg-neutral-50/50">
                    <p className="text-xs font-black tracking-wide text-neutral-500 uppercase">No size restock requests logged.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-neutral-950 rounded-none bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-black uppercase tracking-wider text-neutral-450">
                            <th className="p-4">Email Address</th>
                            <th className="p-4">Product ID</th>
                            <th className="p-4">Size</th>
                            <th className="p-4">Time Requested</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="font-semibold text-neutral-600 uppercase tracking-wide">
                          {restockNotifications.map((n, idx) => (
                            <tr key={n.$id || idx} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                              <td className="p-4 font-bold text-neutral-900 select-all lowercase">{n.email}</td>
                              <td className="p-4 font-mono text-[10px]">{n.productId}</td>
                              <td className="p-4 font-black text-indigo-600">{n.size}</td>
                              <td className="p-4 text-[10px] font-mono text-neutral-500">{n.requestedAt ? new Date(n.requestedAt).toLocaleString('en-IN') : 'N/A'}</td>
                              <td className="p-4">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${n.notified ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                                  {n.notified ? 'NOTIFIED' : 'PENDING'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Coupon Usage Logs Section */}
              <div className="space-y-4">
                <div className="pb-4 border-b border-neutral-200 flex items-center justify-between">
                  <h2 className="text-xs font-mono font-black tracking-[0.2em] text-neutral-950 uppercase">Promo Coupon Usage</h2>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase font-black">{couponUsages.length} TOTAL USES</span>
                </div>
                
                {telemetryLoading ? (
                  <div className="py-12 text-center text-xs font-bold text-neutral-400 animate-pulse uppercase tracking-widest">Loading data...</div>
                ) : couponUsages.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-neutral-300 rounded-none bg-neutral-50/50">
                    <p className="text-xs font-black tracking-wide text-neutral-500 uppercase">No active coupon usage history has been recorded.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-neutral-950 rounded-none bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-black uppercase tracking-wider text-neutral-450">
                            <th className="p-4">Customer ID</th>
                            <th className="p-4">Coupon Applied</th>
                            <th className="p-4">Usage Count</th>
                            <th className="p-4">Last Used Time</th>
                          </tr>
                        </thead>
                        <tbody className="font-semibold text-neutral-600 uppercase tracking-wide">
                          {couponUsages.map((c, idx) => (
                            <tr key={c.$id || idx} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                              <td className="p-4 font-mono select-all text-[10px]">{c.userId}</td>
                              <td className="p-4 font-black text-emerald-600 tracking-widest">{c.couponCode}</td>
                              <td className="p-4 font-mono font-black text-neutral-900">{c.usedCount}</td>
                              <td className="p-4 text-[10px] font-mono text-neutral-500">{c.lastUsedAt ? new Date(c.lastUsedAt).toLocaleString('en-IN') : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Cart Telemetry / Status Section */}
              <div className="space-y-4">
                <div className="pb-4 border-b border-neutral-200 flex items-center justify-between">
                  <h2 className="text-xs font-mono font-black tracking-[0.2em] text-neutral-950 uppercase">Customer Cart Activity</h2>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase font-black">{activeCarts.length} TOTAL CARTS</span>
                </div>
                
                {telemetryLoading ? (
                  <div className="py-12 text-center text-xs font-bold text-neutral-400 animate-pulse uppercase tracking-widest">Loading data...</div>
                ) : activeCarts.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-neutral-300 rounded-none bg-neutral-50/50">
                    <p className="text-xs font-black tracking-wide text-neutral-500 uppercase">No active cart activity recorded.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-neutral-950 rounded-none bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-black uppercase tracking-wider text-neutral-450">
                            <th className="p-4">Customer ID</th>
                            <th className="p-4">Product Detail</th>
                            <th className="p-4">Size</th>
                            <th className="p-4">Price & Quantity</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="font-semibold text-neutral-600 uppercase tracking-wide">
                          {activeCarts.map((c, idx) => (
                            <tr key={c.$id || idx} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                              <td className="p-4 font-mono select-all text-[10px]">{c.userId}</td>
                              <td className="p-4 font-bold text-neutral-900 truncate max-w-[180px]">{c.name}</td>
                              <td className="p-4 font-mono text-neutral-800">{c.size}</td>
                              <td className="p-4 text-neutral-500">₹{c.price} x {c.quantity}</td>
                              <td className="p-4">
                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-md ${
                                  c.cart_status === 'converted' 
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                  : c.cart_status === 'abandoned' 
                                  ? 'bg-rose-50 text-rose-600 border border-rose-250' 
                                  : 'bg-indigo-50 text-indigo-600 border border-indigo-200 animate-pulse'
                                }`}>
                                  {c.cart_status || 'ACTIVE'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>



      {/* Admin Cancellation Reason Modal Popup */}
      {isAdminCancelModalOpen && cancelTargetOrder && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-neutral-950/65 backdrop-blur-xs" 
            onClick={() => setIsAdminCancelModalOpen(false)}
          />
          
          {/* Modal Container */}
          <div className="relative z-60 w-full max-w-md bg-white p-8 border border-neutral-950 shadow-2xl space-y-6 text-neutral-900 animate-scale-up">
            <div>
              <span className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest">ADMIN PANEL OPERATIONS</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-neutral-950 mt-1">
                Cancel Order Manifest
              </h2>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mt-0.5 leading-relaxed">
                Please select a reason for cancelling order {cancelTargetOrder.order_number || cancelTargetOrder.$id?.substring(0, 12).toUpperCase()}. This will release inventory stock back to the active registry.
              </p>
            </div>
            
            {/* Options List */}
            <div className="space-y-2.5 font-sans">
              {[
                "Out of Stock / Inventory Error",
                "Customer Requested Cancellation",
                "Suspected Fraudulent Activity",
                "Incorrect pricing/checkout parameters",
                "Other"
              ].map((opt) => (
                <label 
                  key={opt} 
                  className={`flex items-start gap-3 p-3 border cursor-pointer transition-all ${
                    adminCancelReason === opt
                    ? 'border-neutral-950 bg-neutral-50/50'
                    : 'border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="admin_cancel_option"
                    checked={adminCancelReason === opt}
                    onChange={() => setAdminCancelReason(opt)}
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
                value={adminCancelCustomText}
                onChange={(e) => setAdminCancelCustomText(e.target.value)}
                placeholder="ENTER CUSTOM REASON DETAILS..."
                rows={3}
                className="w-full bg-[#fafafb] border border-neutral-200 hover:border-neutral-450 focus:border-neutral-950 text-xs font-semibold p-3 outline-hidden placeholder-neutral-400 font-sans tracking-wide resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsAdminCancelModalOpen(false)}
                className="w-full py-3 border border-neutral-250 hover:bg-neutral-50 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600 rounded-none cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={submitAdminCancelOrder}
                className="w-full py-3 bg-neutral-950 hover:bg-neutral-850 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-none cursor-pointer shadow-md"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Sweep Product Confirmation Modal */}
      {isSweepProductModalOpen && sweepTargetProductId && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-neutral-950/65 backdrop-blur-xs" 
            onClick={() => setIsSweepProductModalOpen(false)}
          />
          
          {/* Modal Container */}
           <div className="relative z-60 w-full max-w-sm bg-white p-8 border border-neutral-950 shadow-2xl space-y-6 text-neutral-900 animate-scale-up">
            <div>
              <span className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest">DELETE PRODUCT</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-neutral-950 mt-1">
                Delete Product?
              </h2>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mt-0.5 leading-relaxed">
                Are you sure you want to permanently delete this product from the shop? This action cannot be undone.
              </p>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsSweepProductModalOpen(false)}
                className="w-full py-3 border border-neutral-250 hover:bg-neutral-50 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600 rounded-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSweepProductItem}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-none cursor-pointer shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {isShippedModalOpen && shippedTargetOrder && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-neutral-950/65 backdrop-blur-xs" 
            onClick={() => setIsShippedModalOpen(false)}
          />
          
          {/* Modal Container */}
          <div className="relative z-60 w-full max-w-md bg-white p-8 border border-neutral-950 shadow-2xl space-y-6 text-neutral-900 animate-scale-up">
            <div>
              <span className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest">ADMIN PANEL OPERATIONS</span>
              <h2 className="text-sm font-black tracking-wider uppercase text-neutral-950 mt-1">
                Mark Order as Shipped
              </h2>
              <p className="text-[9px] text-neutral-400 uppercase tracking-wider mt-0.5 leading-relaxed">
                Add tracking information for order {shippedTargetOrder.order_number || shippedTargetOrder.$id?.substring(0, 12).toUpperCase()}.
              </p>
            </div>
            
            {/* Tracking Number Input */}
            <div className="space-y-2">
              <label className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest">
                CARRIER TRACKING NUMBER *
              </label>
              <input
                type="text"
                value={adminTrackingNumber}
                onChange={(e) => setAdminTrackingNumber(e.target.value)}
                placeholder="E.G., Delhivery: 123456789"
                className="w-full bg-[#fafafb] border border-neutral-200 hover:border-neutral-450 focus:border-neutral-950 text-xs font-semibold p-3 outline-hidden placeholder-neutral-400 uppercase tracking-wider"
              />
            </div>

            {/* Tracking URL Input */}
            <div className="space-y-2">
              <label className="text-[8px] font-mono text-neutral-400 block uppercase tracking-widest">
                CUSTOM TRACKING URL (OPTIONAL)
              </label>
              <input
                type="text"
                value={adminTrackingUrl}
                onChange={(e) => setAdminTrackingUrl(e.target.value)}
                placeholder="LEAVE BLANK TO DEFAULT TO DELHIVERY TRACKER..."
                className="w-full bg-[#fafafb] border border-neutral-200 hover:border-neutral-450 focus:border-neutral-950 text-xs font-semibold p-3 outline-hidden placeholder-neutral-400 tracking-wider"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsShippedModalOpen(false)}
                className="w-full py-3 border border-neutral-250 hover:bg-neutral-50 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600 rounded-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAdminShippedOrder}
                className="w-full py-3 bg-neutral-950 hover:bg-neutral-850 active:scale-[0.98] transition-all text-[10px] font-mono font-bold uppercase tracking-wider text-white rounded-none cursor-pointer shadow-md"
              >
                Dispatch shipment
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

export default AdminPanel;
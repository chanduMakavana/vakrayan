import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import productsService from '../../appwrite/products';
import ordersService from '../../appwrite/orders';
import campaignService from '../../appwrite/campaign';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
const TAG_OPTIONS = ['NEW DROP', 'BEST SELLER', 'FEW LEFT', 'LIMITED ITEM'];
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const BACK_IMAGE_FIELDS = ['back_image_link_1', 'back_image_link_2', 'back_image_link_3', 'back_image_link_4'];

const generateMockProductId = () => Date.now().toString();

function AdminPanel() {
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm();
  const [successMsg, setSuccessMsg] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [products, setProducts] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Tab Manager State
  const [activeTab, setActiveTab] = useState('products'); // products | orders | campaigns

  // Orders State (Fulfillment)
  const [orders, setOrders] = useState([]);

  // Campaign State
  const [campaignPromoText, setCampaignPromoText] = useState('');
  const [campaignCoupons, setCampaignCoupons] = useState([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(10);

  // Read local cache backup from localStorage
  const getLocalStorageFallbackData = () => {
    return JSON.parse(localStorage.getItem('products')) || [];
  };

  const getLocalStorageOrders = () => {
    return JSON.parse(localStorage.getItem('ordersData')) || [];
  };

  // Load product catalog from database
  const loadProductCatalog = async () => {
    try {
      const response = await productsService.getProducts();
      const structuredData = response?.documents || response || [];
      if (structuredData && structuredData.length > 0) {
        setProducts(structuredData);
      } else {
        setProducts(getLocalStorageFallbackData());
      }
    } catch {
      console.error("Failed to fetch products from Appwrite. Initializing Fallback.");
      setProducts(getLocalStorageFallbackData());
    }
  };

  // Load customer orders from database
  const loadCustomerOrders = async () => {
    try {
      const response = await ordersService.getOrders();
      const dbOrders = response || [];
      const localOrders = getLocalStorageOrders();

      const seenIds = new Set();
      const mergedOrders = [];

      dbOrders.forEach(o => {
        const id = o.$id || o.id;
        if (id) seenIds.add(id);
        mergedOrders.push(o);
      });

      localOrders.forEach(o => {
        const id = o.$id || o.id;
        if (id && !seenIds.has(id)) {
          mergedOrders.push(o);
        } else if (!id) {
          mergedOrders.push(o);
        }
      });

      mergedOrders.sort((a, b) => new Date(b.$createdAt || b.createdAt || 0) - new Date(a.$createdAt || a.createdAt || 0));
      setOrders(mergedOrders);
    } catch {
      console.warn("⚠️ Orders retrieval failed. Falling back to sandbox logs.");
      setOrders(getLocalStorageOrders());
    }
  };

  // Load active campaign announcements & coupons on mount
  useEffect(() => {
    setTimeout(() => {
      loadProductCatalog();
      loadCustomerOrders();
    }, 0);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Admin role validation checks
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const isAdmin = isAuthenticated && user && (user.email === ADMIN_EMAIL || user.email === import.meta.env.VITE_ADMIN_EMAIL || user.email === "makwanachandu480@gmail.com");

  if (!isAdmin) return <Navigate to="/" replace />;

  const onSubmit = async (data) => {
    setActionLoading(true);
    setSuccessMsg('');

    const selectedTags = Array.isArray(data.tag) ? data.tag : [data.tag].filter(Boolean);
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

    // Format product database payload
    const productPayload = {
      name: data.name.trim(),
      price: String(data.price).trim(),
      tags: selectedTags,
      category: data.category,
      front_image_link: data.front_image_link.trim(),
      description: data.description?.trim() || "",
      sizes: selectedSizes,
      back_image_links: backImageLinks,
      sizes_stock: JSON.stringify(stockMap) // Stringified stock mapping
    };

    try {
      if (editingId) {
        // Attempt cloud update. If sizes_stock is missing in schema, fallback to basic fields
        try {
          await productsService.updateProduct(editingId, productPayload);
        } catch (dbErr) {
          console.warn("⚠️ sizes_stock attribute error on cloud. Retrying basic schema fields.", dbErr.message);
          const strippedPayload = { ...productPayload };
          delete strippedPayload.sizes_stock;
          await productsService.updateProduct(editingId, strippedPayload);
        }
        setSuccessMsg('🔥 Drop variations updated in cloud servers successfully!');
      } else {
        try {
          await productsService.createProduct(productPayload);
        } catch (dbErr) {
          console.warn("⚠️ sizes_stock attribute error on cloud. Retrying basic schema fields.", dbErr.message);
          const strippedPayload = { ...productPayload };
          delete strippedPayload.sizes_stock;
          await productsService.createProduct(strippedPayload);
        }
        setSuccessMsg('⚡ Fresh Streetwear Drop Deployed Globally!');
      }
    } catch (cloudError) {
      console.warn("⚠️ Appwrite Offline Mode. Engaging local sandbox processing.", cloudError.message);
      const localPool = getLocalStorageFallbackData();

      if (editingId) {
        const mutatedPool = localPool.map(p => 
          (p.id === editingId || p.$id === editingId) ? { ...p, ...productPayload, $id: editingId, id: editingId } : p
        );
        localStorage.setItem('products', JSON.stringify(mutatedPool));
        setSuccessMsg('🔒 Configurations synchronized locally inside Antigravity Sandbox!');
      } else {
        const mockRow = {
          id: generateMockProductId(),
          $id: generateMockProductId(),
          ...productPayload,
          $createdAt: new Date().toISOString()
        };
        localPool.unshift(mockRow);
        localStorage.setItem('products', JSON.stringify(localPool));
        setSuccessMsg('🔒 Drop deployed locally inside Antigravity Sandbox!');
      }
    } finally {
      // Clear form
      reset();
      SIZE_OPTIONS.forEach(size => {
        setValue(`stock_${size}`, '');
      });
      setEditingId(null);
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
      
      setValue('tag', product.tags || product.tag || []);
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
        setValue(`stock_${size}`, parsedStock[size] || (hasSizeChecked ? 10 : 0));
      });

      const backImageLinks = Array.isArray(product.back_image_links)
        ? product.back_image_links
        : [product.back_image_link].filter(Boolean);

      BACK_IMAGE_FIELDS.forEach((fieldName, index) => {
        setValue(fieldName, backImageLinks[index] || '');
      });
      setEditingId(id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    reset();
    SIZE_OPTIONS.forEach(size => {
      setValue(`stock_${size}`, '');
    });
    setEditingId(null);
  };

  const handleRemoveProductItem = async (targetId) => {
    if (!window.confirm("Are you sure you want to sweep this item drop from stock?")) return;

    try {
      await productsService.deleteProduct(targetId);
      setSuccessMsg('🗑️ Live Drop Revoked From Appwrite Repository Pool!');
    } catch {
      console.warn("⚠️ Appwrite Connection Timeout. Flushing rows locally inside client cache.");
      const filteredStorageData = getLocalStorageFallbackData().filter(p => p.id !== targetId && p.$id !== targetId);
      localStorage.setItem('products', JSON.stringify(filteredStorageData));
      setSuccessMsg('🗑️ Product entry wiped from local cache logs.');
    } finally {
      await loadProductCatalog();
    }
  };

  // Orders Fulfillment Operations
  const handleOrderStatusShift = async (order, targetStatus) => {
    const orderId = order.$id || order.id;
    try {
      await ordersService.updateOrderStatus(orderId, targetStatus);
      setSuccessMsg(`✅ Order status transitioned to ${targetStatus}!`);
    } catch {
      console.warn("⚠️ Status update offline. Advancing in local sandbox logs.");
      const localOrders = getLocalStorageOrders();
      const updated = localOrders.map(o => (o.id === orderId || o.$id === orderId) ? { ...o, status: targetStatus } : o);
      localStorage.setItem('ordersData', JSON.stringify(updated));
      setSuccessMsg(`🔒 Status transitioned to ${targetStatus} locally!`);
    } finally {
      loadCustomerOrders();
    }
  };

  // Campaign & Coupons Operations
  const saveCampaignPromoText = async () => {
    try {
      await campaignService.savePromoText(campaignPromoText);
      setSuccessMsg('📢 Announcement Marquee updated dynamically!');
    } catch (err) {
      console.error("Failed to update announcement:", err);
    }
  };

  const handleAddCoupon = async () => {
    if (!newCouponCode.trim()) return;
    const cleanCode = newCouponCode.trim().toUpperCase();
    
    if (campaignCoupons.some(c => c.code === cleanCode)) {
      alert("This coupon already exists.");
      return;
    }

    try {
      await campaignService.createCoupon(cleanCode, Number(newCouponDiscount));
      const response = await campaignService.getCoupons();
      setCampaignCoupons(response || []);
      setSuccessMsg(`🎟️ Coupon ${cleanCode} activated successfully!`);
      setNewCouponCode('');
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
      setSuccessMsg('🗑️ Coupon deactivated.');
    } catch (err) {
      console.error("Failed to delete coupon:", err);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 p-6 md:p-12 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative selection:bg-neutral-900 selection:text-white">
      <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-10" />

      <div className="relative z-20 max-w-4xl mx-auto space-y-8">

        {/* Header Display Node */}
        <div className="bg-white p-8 rounded-2xl border border-neutral-200/60 shadow-xl">
          <div className="mb-6 pb-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs tracking-[0.6em] text-[var(--theme-primary)] font-black uppercase mb-1">HQ Operations</h4>
              <h1 className="text-3xl font-black tracking-widest uppercase text-neutral-900">
                Operations Console
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/" className="bg-neutral-950 hover:bg-neutral-800 text-white text-[10px] font-black tracking-widest px-3 py-1.5 rounded-sm uppercase h-fit transition-colors">
                HOME
              </Link>
              <div className="bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 text-[var(--theme-primary)] text-[10px] font-black tracking-widest px-3 py-1.5 rounded-sm uppercase h-fit">
                Admin Mode Active
              </div>
            </div>
          </div>

          {/* Feedback alerts */}
          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-black tracking-widest rounded-xl text-center uppercase animate-pulse">
              {successMsg}
            </div>
          )}

          {/* Tab Navigation Menu */}
          <div className="flex gap-4 border-b border-neutral-300/30 pb-3 mb-6 flex-wrap">
            <button 
              onClick={() => { setActiveTab('products'); setSuccessMsg(''); }}
              className={`text-[10px] font-black tracking-widest uppercase pb-1 transition-all cursor-pointer ${activeTab === 'products' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              Drops Manager
            </button>
            <button 
              onClick={() => { setActiveTab('orders'); setSuccessMsg(''); loadCustomerOrders(); }}
              className={`text-[10px] font-black tracking-widest uppercase pb-1 transition-all cursor-pointer ${activeTab === 'orders' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              Fulfillment Dashboard ({orders.length})
            </button>
            <button 
              onClick={() => { setActiveTab('campaigns'); setSuccessMsg(''); }}
              className={`text-[10px] font-black tracking-widest uppercase pb-1 transition-all cursor-pointer ${activeTab === 'campaigns' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-neutral-500 hover:text-neutral-900'}`}
            >
              Campaign Controls
            </button>
          </div>

          {/* ==========================================
              TAB 1: DROPS CATALOG & LAUNCH DROP
              ========================================== */}
          {activeTab === 'products' && (
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

              {/* Product Placement Tags */}
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Product Placement Tags</label>
                <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl border ${errors.tag ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-200'} bg-neutral-50/50 p-3`}>
                  {TAG_OPTIONS.map((tag) => (
                    <label key={tag} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-3 text-[10px] font-black uppercase tracking-widest text-neutral-800 cursor-pointer hover:border-neutral-950 select-none transition-colors">
                      <input
                        type="checkbox"
                        value={tag}
                        disabled={actionLoading}
                        className="accent-neutral-950 disabled:opacity-50"
                        {...register('tag', {
                          validate: (value) => value?.length > 0 || 'Select at least one position tag stamp.'
                        })}
                      />
                      {tag}
                    </label>
                  ))}
                </div>
                {errors.tag && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.tag.message}</span>}
              </div>

              {/* Front Image Link */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Front Image Link</label>
                <input
                  type="text"
                  disabled={actionLoading}
                  placeholder="PASTE FRONT IMAGE LINK"
                  className={`w-full bg-[#fbfbfb] border ${errors.front_image_link ? 'border-rose-300 focus:border-rose-500' : 'border-neutral-200'} rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider focus:border-neutral-950 transition-colors font-medium disabled:opacity-50`}
                  {...register('front_image_link', { required: 'Front image link is required' })}
                />
                {errors.front_image_link && <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">{errors.front_image_link.message}</span>}
              </div>

              {/* Gallery Images */}
              <div className="flex flex-col gap-3 md:col-span-2">
                <label className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Back Image Links (Max 4)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {BACK_IMAGE_FIELDS.map((fieldName, index) => (
                    <input
                      key={fieldName}
                      type="text"
                      disabled={actionLoading}
                      placeholder={`BACK IMAGE LINK ${index + 1}`}
                      className="w-full bg-[#fbfbfb] border border-neutral-200 focus:border-neutral-950 rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider transition-colors font-medium disabled:opacity-50"
                      {...register(fieldName, index === 0 ? { required: 'At least one back view link is required.' } : undefined)}
                    />
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
                  className="flex-1 bg-neutral-950 hover:bg-neutral-800 text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-40 cursor-pointer"
                >
                  {actionLoading ? 'PROCESSING REQUEST...' : editingId ? 'UPDATE DROP SPECIFICATION' : 'DEPLOY DROP TO PUBLIC'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleCancelEdit}
                    className="px-6 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer"
                  >
                    CANCEL
                  </button>
                )}
              </div>
            </form>
          )}

          {/* ==========================================
              TAB 2: ORDERS FULFILLMENT DASHBOARD (Option 3)
              ========================================== */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="text-xs font-black tracking-[0.4em] text-[var(--theme-primary)] uppercase">Incoming Shipping Manifests</h2>
                <span className="text-[10px] font-mono text-neutral-400 uppercase font-black">{orders.length} ACTIVE POOL ORDERS</span>
              </div>

              {orders.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-neutral-300 rounded-2xl bg-neutral-50/50">
                  <p className="text-xs font-black tracking-widest text-neutral-500 uppercase">No active customer checkout manifests recorded.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order, idx) => {
                    const uniqueOrderId = order.$id || order.id;
                    let parsedItems;
                    try {
                      parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
                    } catch {
                      parsedItems = [];
                    }

                    return (
                      <div key={uniqueOrderId || idx} className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-200/60 pb-3 gap-2">
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-neutral-500 block uppercase">ORDER ID: {uniqueOrderId?.substring(0, 15).toUpperCase()}</span>
                            <span className="text-xs font-black text-neutral-900 uppercase tracking-wide">{order.customerName}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Dynamic Order Status Badge */}
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
                              order.status === 'DELIVERED' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-250' 
                              : order.status === 'SHIPPED' 
                              ? 'bg-amber-50 text-amber-600 border border-amber-250' 
                              : 'bg-rose-50 text-rose-600 border border-rose-250 animate-pulse'
                            }`}>
                              {order.status || 'PENDING'}
                            </span>
                            
                            <span className="text-xs font-mono font-black text-neutral-900">₹{order.total?.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {/* Customer & shipping info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium uppercase tracking-wide text-neutral-600">
                          <div>
                            <span className="text-[8px] font-bold text-neutral-400 block tracking-widest">SHIPPING DESTINATION</span>
                            <span className="text-neutral-900 font-bold block mt-0.5">{order.address}</span>
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
                        <div className="flex gap-2 justify-end pt-1 border-t border-neutral-200/40">
                          {order.status !== 'SHIPPED' && order.status !== 'DELIVERED' && (
                            <button
                              onClick={() => handleOrderStatusShift(order, 'SHIPPED')}
                              className="bg-neutral-900 hover:bg-neutral-800 text-white font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-lg cursor-pointer transition-colors"
                            >
                              Dispatch Fit Drop (Mark Shipped)
                            </button>
                          )}
                          {order.status !== 'DELIVERED' && (
                            <button
                              onClick={() => handleOrderStatusShift(order, 'DELIVERED')}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] tracking-wider uppercase px-4 py-2 rounded-lg cursor-pointer transition-colors"
                            >
                              Fulfill Delivery (Mark Delivered)
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              TAB 3: CAMPAIGNS & COUPONS ENGINE (Option 4)
              ========================================== */}
          {activeTab === 'campaigns' && (
            <div className="space-y-8">
              
              {/* Marquee Announcer Manager */}
              <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 space-y-4">
                <div>
                  <h3 className="text-xs font-black tracking-widest text-[var(--theme-primary)] uppercase">DYNAMIC BANNER ANNOUNCEMENT</h3>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Edit the live marquee banner announcement text displayed globally on the homepage.</p>
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={campaignPromoText}
                    onChange={(e) => setCampaignPromoText(e.target.value)}
                    placeholder="ENTER MARQUEE ANNOUNCEMENT TEXT..."
                    className="flex-1 bg-white border border-neutral-200 focus:border-neutral-900 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider"
                  />
                  <button
                    onClick={saveCampaignPromoText}
                    className="bg-neutral-950 hover:bg-neutral-800 text-white font-black text-xs tracking-widest uppercase px-6 rounded-xl cursor-pointer transition-colors"
                  >
                    SAVE Live
                  </button>
                </div>
              </div>

              {/* Coupons Generator */}
              <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 space-y-4">
                <div>
                  <h3 className="text-xs font-black tracking-widest text-[var(--theme-primary)] uppercase">PROMO COUPON MANAGER</h3>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Activate or revoke coupon discount codes to enable live checkouts promotions.</p>
                </div>

                {/* Coupon Form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-white p-4 rounded-xl border border-neutral-200">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-bold text-neutral-400 block tracking-widest uppercase">COUPON CODE</span>
                    <input
                      type="text"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value)}
                      placeholder="E.G., STREET50"
                      className="bg-neutral-50 border border-neutral-200 focus:border-neutral-900 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider w-full"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-bold text-neutral-400 block tracking-widest uppercase">DISCOUNT PERCENTAGE</span>
                    <select
                      value={newCouponDiscount}
                      onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                      className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider w-full"
                    >
                      <option value="10">10% OFF</option>
                      <option value="20">20% OFF</option>
                      <option value="30">30% OFF</option>
                      <option value="50">50% OFF</option>
                      <option value="75">75% OFF</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddCoupon}
                    className="bg-neutral-950 hover:bg-neutral-800 text-white font-black text-xs tracking-widest uppercase py-3 rounded-lg cursor-pointer transition-colors w-full"
                  >
                    ACTIVATE COUPON
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

        </div>

        {/* Active product listings - only display inside Drop Manager tab */}
        {activeTab === 'products' && products && products.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-neutral-200/60 shadow-xl">
            <h2 className="text-xs tracking-[0.4em] text-[var(--theme-primary)] font-black uppercase mb-6">Live Drops Active Pool Repository ({products.length})</h2>
            <div className="space-y-3">
              {products.map((p) => {
                const targetId = p.$id || p.id;
                const coverThumbnailUrl = p.front_image_link || p.image_url || p.image || 'https://placehold.co/100x100?text=No+Asset';
                const parsedTagsString = Array.isArray(p.tags) ? p.tags.join(', ') : p.tag ? String(p.tag) : "NO TAG";
                
                // Parse sizes and stock
                let parsedStock = {};
                try {
                  parsedStock = JSON.parse(p.sizes_stock || '{}');
                } catch {
                  parsedStock = {};
                }

                const sizesWithStockArray = (p.sizes || []).map(size => {
                  const stock = parsedStock[size] !== undefined ? parsedStock[size] : 10;
                  return `${size} (${stock})`;
                });
                const parsedSizesString = sizesWithStockArray.join(', ') || "NONE";
                const backImagesArrayCount = Array.isArray(p.back_image_links) ? p.back_image_links.length : p.back_image_link ? 1 : 0;

                return (
                  <div key={targetId} className="flex items-center gap-4 p-3 rounded-xl border border-neutral-200 bg-neutral-50/50 group hover:bg-neutral-100/30 transition-colors duration-200">
                    <img src={coverThumbnailUrl} alt={p.name} className="w-12 h-12 object-cover rounded-lg border border-neutral-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase tracking-wide text-neutral-900 truncate">{p.name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5 uppercase tracking-tight">
                        ₹{p.price} · <span className="text-[var(--theme-primary)] font-bold">{parsedTagsString}</span> · Stocks: {parsedSizesString} · Backframes: {backImagesArrayCount}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEdit(targetId)}
                      className="text-[10px] bg-white border border-neutral-200 hover:border-neutral-500 px-2 py-1 rounded-sm font-black text-neutral-800 hover:text-[var(--theme-primary)] hover:border-[var(--theme-primary)]/40 uppercase tracking-widest cursor-pointer shrink-0 transition-colors duration-150"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveProductItem(targetId)}
                      className="text-[10px] font-black text-rose-600 hover:text-rose-700 uppercase tracking-widest cursor-pointer shrink-0 transition-colors duration-150"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default AdminPanel;
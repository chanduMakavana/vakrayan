import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import productsService from '../../appwrite/products';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
const TAG_OPTIONS = ['NEW DROP', 'BEST SELLER', 'FEW LEFT', 'LIMITED ITEM'];
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const BACK_IMAGE_FIELDS = ['back_image_link_1', 'back_image_link_2', 'back_image_link_3', 'back_image_link_4'];

function AdminPanel() {
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm();
  const [successMsg, setSuccessMsg] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [products, setProducts] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Read local cache backup from localStorage
  const getLocalStorageFallbackData = () => {
    return JSON.parse(localStorage.getItem('products')) || [];
  };

  // Load product catalog from database
  const loadProductCatalog = async () => {
    try {
      const response = await productsService.getProducts();
      // Normalize query response format
      const structuredData = response?.documents || response || [];
      
      if (structuredData && structuredData.length > 0) {
        setProducts(structuredData);
      } else {
        setProducts(getLocalStorageFallbackData());
      }
    } catch (error) {
      console.error("Failed to fetch products from Appwrite. Initializing Fallback.");
      setProducts(getLocalStorageFallbackData());
    }
  };

  useEffect(() => {
    loadProductCatalog();
  }, []);

  // Admin role validation checks
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const isAdmin = isAuthenticated && user && (user.email === ADMIN_EMAIL || user.email === import.meta.env.VITE_ADMIN_EMAIL);

  if (!isAdmin) return <Navigate to="/" replace />;

  const onSubmit = async (data) => {
    setActionLoading(true);
    setSuccessMsg('');

    const selectedTags = Array.isArray(data.tag) ? data.tag : [data.tag].filter(Boolean);
    const selectedSizes = Array.isArray(data.sizes) ? data.sizes : [data.sizes].filter(Boolean);
    const backImageLinks = BACK_IMAGE_FIELDS
      .map((fieldName) => data[fieldName]?.trim())
      .filter(Boolean);

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
    };

    try {
      if (editingId) {
        // Update product document in database
        await productsService.updateProduct(editingId, productPayload);
        setSuccessMsg('🔥 Drop variations updated in cloud servers successfully!');
      } else {
        // Create product document in database
        await productsService.createProduct(productPayload);
        setSuccessMsg('⚡ Fresh Streetwear Drop Deployed Globally!');
      }
    } catch (cloudError) {
      console.warn("⚠️ Appwrite Offline Mode. Engaging local sandbox processing.");
      const localPool = getLocalStorageFallbackData();

      if (editingId) {
        const mutatedPool = localPool.map(p => 
          (p.id === editingId || p.$id === editingId) ? { ...p, ...productPayload } : p
        );
        localStorage.setItem('products', JSON.stringify(mutatedPool));
        setSuccessMsg('🔒 Configurations synchronized locally inside Antigravity Sandbox!');
      } else {
        const mockRow = {
          id: Date.now().toString(),
          $id: Date.now().toString(),
          ...productPayload
        };
        localPool.unshift(mockRow);
        localStorage.setItem('products', JSON.stringify(localPool));
        setSuccessMsg('🔒 Drop deployed locally inside Antigravity Sandbox!');
      }
    } finally {
      reset();
      setEditingId(null);
      setActionLoading(false);
      await loadProductCatalog(); // Refresh catalog view
    }
  };

  const handleEdit = (id) => {
    // Populate form with product details for editing
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
      setValue('sizes', product.sizes || []);
      
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
    setEditingId(null);
  };

  const handleRemoveProductItem = async (targetId) => {
    if (!window.confirm("Are you sure you want to sweep this item drop from stock?")) return;

    try {
      await productsService.deleteProduct(targetId);
      setSuccessMsg('🗑️ Live Drop Revoked From Appwrite Repository Pool!');
    } catch (err) {
      console.warn("⚠️ Appwrite Connection Timeout. Flushing rows locally inside client cache.");
      const filteredStorageData = getLocalStorageFallbackData().filter(p => p.id !== targetId && p.$id !== targetId);
      localStorage.setItem('products', JSON.stringify(filteredStorageData));
      setSuccessMsg('🗑️ Product entry wiped from local cache logs.');
    } finally {
      await loadProductCatalog();
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 p-6 md:p-12 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center relative selection:bg-neutral-900 selection:text-white">
      <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-10" />

      <div className="relative z-20 max-w-3xl mx-auto space-y-8">

        {/* Header Display Node */}
        <div className="bg-white p-8 md:p-10 rounded-3xl border border-neutral-200/60 shadow-xl">
          <div className="mb-10 pb-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs tracking-[0.6em] text-red-500 font-black uppercase mb-1">HQ Operations</h4>
              <h1 className="text-3xl font-black tracking-widest uppercase text-neutral-900">
                {editingId ? 'Edit Drop' : 'Launch New Drop'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/" className="bg-neutral-950 hover:bg-neutral-850 text-white text-[10px] font-black tracking-widest px-3 py-1.5 rounded-sm uppercase h-fit transition-colors">
                HOME
              </Link>
              <div className="bg-red-50 border border-red-200 text-red-600 text-[10px] font-black tracking-widest px-3 py-1.5 rounded-sm uppercase h-fit">
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

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Product Name Input */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-black tracking-widest text-neutral-450 uppercase">Product Name</label>
              <input
                type="text"
                disabled={actionLoading}
                placeholder="E.G., GOTHIC OVERSIZED HOODIE"
                className={`w-full bg-[#fbfbfb] border ${errors.name ? 'border-red-500/50' : 'border-neutral-200 focus:border-neutral-950'} rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider focus:border-red-500 transition-colors uppercase font-medium disabled:opacity-50`}
                {...register('name', { required: 'Product name is required' })}
              />
              {errors.name && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.name.message}</span>}
            </div>

            {/* Price Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-neutral-450 uppercase">Price (INR)</label>
              <input
                type="number"
                placeholder="1499"
                disabled={actionLoading}
                className={`w-full bg-[#fbfbfb] border ${errors.price ? 'border-red-500/50' : 'border-neutral-200 focus:border-neutral-950'} rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider focus:border-red-500 transition-colors font-medium disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} 
                {...register('price', { 
                  required: 'Price is required',
                  min: { value: 1, message: 'Price must be greater than 0' }
                })}
              />
              {errors.price && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.price.message}</span>}
            </div>

            {/* Product Placement Tags */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-[10px] font-black tracking-widest text-neutral-450 uppercase">Product Placement Tags</label>
              <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl border ${errors.tag ? 'border-red-500/50' : 'border-neutral-200'} bg-neutral-50/50 p-3`}>
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
              {errors.tag && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.tag.message}</span>}
            </div>

            {/* Category selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-neutral-450 uppercase">Category</label>
              <select
                disabled={actionLoading}
                className="w-full bg-[#fbfbfb] border border-neutral-200 rounded-xl px-4 py-3.5 text-sm text-neutral-850 outline-hidden tracking-wider focus:border-neutral-950 transition-colors font-medium appearance-none cursor-pointer disabled:opacity-50 uppercase"
                {...register('category')}
              >
                <option value="printed-tshirt">PRINTED T-SHIRT</option>
                <option value="oversized-tshirt">OVERSIZED T-SHIRT</option>
                <option value="shirts">SHIRT</option>
                <option value="hoodies">HOODIES & SWEATSHIRTS</option>
              </select>
            </div>

            {/* Front Image link */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black tracking-widest text-neutral-450 uppercase">Front Image Link</label>
              <input
                type="text"
                disabled={actionLoading}
                placeholder="PASTE FRONT IMAGE LINK"
                className={`w-full bg-[#fbfbfb] border ${errors.front_image_link ? 'border-red-500/50' : 'border-neutral-200 focus:border-neutral-955'} rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider focus:border-red-500 transition-colors font-medium disabled:opacity-50`}
                {...register('front_image_link', { required: 'Front image link is required' })}
              />
              {errors.front_image_link && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.front_image_link.message}</span>}
            </div>

            {/* Gallery Images Array Inputs */}
            <div className="flex flex-col gap-3 md:col-span-2">
              <label className="text-[10px] font-black tracking-widest text-neutral-450 uppercase">Back Image Links (Max 4)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {BACK_IMAGE_FIELDS.map((fieldName, index) => (
                  <input
                    key={fieldName}
                    type="text"
                    disabled={actionLoading}
                    placeholder={`BACK IMAGE LINK ${index + 1}`}
                    className={`w-full bg-[#fbfbfb] border ${errors.back_image_link_1 ? 'border-red-500/50' : 'border-neutral-200 focus:border-neutral-950'} rounded-xl px-4 py-3.5 text-sm text-neutral-900 placeholder-neutral-400 outline-hidden tracking-wider focus:border-red-500 transition-colors font-medium disabled:opacity-50`}
                    {...register(fieldName, index === 0 ? { required: 'At least one back view link checkpoint is required.' } : undefined)}
                  />
                ))}
              </div>
              {errors.back_image_link_1 && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.back_image_link_1.message}</span>}
            </div>

            {/* Sizes Checkboxes */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-black tracking-widest text-neutral-450 uppercase">Sizes</label>
              <div className={`grid grid-cols-3 md:grid-cols-6 gap-3 rounded-xl border ${errors.sizes ? 'border-red-500/50' : 'border-neutral-200'} bg-neutral-50/50 p-3`}>
                {SIZE_OPTIONS.map((size) => (
                  <label key={size} className="flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-3 text-xs font-black uppercase tracking-widest text-neutral-800 cursor-pointer hover:border-neutral-950 select-none transition-colors">
                    <input
                      type="checkbox"
                      value={size}
                      disabled={actionLoading}
                      className="accent-neutral-950 disabled:opacity-50"
                      {...register('sizes', {
                        validate: (value) => value?.length > 0 || 'Select at least one physical stock dimension size.'
                      })}
                    />
                    {size}
                  </label>
                ))}
              </div>
              {errors.sizes && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.sizes.message}</span>}
            </div>

            {/* Description Spec */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-black tracking-widest text-neutral-450 uppercase">Description (Optional)</label>
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
                className="flex-1 bg-neutral-950 hover:bg-neutral-850 text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-40 cursor-pointer"
              >
                {actionLoading ? 'PROCESSING REQUEST MODULES...' : editingId ? 'UPDATE DROP SPECIFICATION' : 'DEPLOY DROP TO PUBLIC'}
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
        </div>

        {/* Active product listings */}
        {products && products.length > 0 && (
          <div className="bg-white p-6 rounded-3xl border border-neutral-200/60 shadow-xl">
            <h2 className="text-xs tracking-[0.4em] text-red-500 font-black uppercase mb-6">Live Drops Active Pool Repository ({products.length})</h2>
            <div className="space-y-3">
              {products.map((p) => {
                const targetId = p.$id || p.id;
                const coverThumbnailUrl = p.front_image_link || p.image_url || p.image || 'https://placehold.co/100x100?text=No+Asset';
                const parsedTagsString = Array.isArray(p.tags) ? p.tags.join(', ') : p.tag ? String(p.tag) : "NO TAG";
                const parsedSizesString = Array.isArray(p.sizes) ? p.sizes.join(', ') : String(p.sizes || "NONE");
                const backImagesArrayCount = Array.isArray(p.back_image_links) ? p.back_image_links.length : p.back_image_link ? 1 : 0;

                return (
                  <div key={targetId} className="flex items-center gap-4 p-3 rounded-xl border border-neutral-200 bg-neutral-50/50 group hover:bg-neutral-100/30 transition-colors duration-200">
                    <img src={coverThumbnailUrl} alt={p.name} className="w-12 h-12 object-cover rounded-lg border border-neutral-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase tracking-wide text-neutral-900 truncate">{p.name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5 uppercase tracking-tight">
                        ₹{p.price} · <span className="text-red-500 font-bold">{parsedTagsString}</span> · Sizes: {parsedSizesString} · Backframes: {backImagesArrayCount}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEdit(targetId)}
                      className="text-[10px] bg-white border border-neutral-200 hover:border-neutral-450 px-2 py-1 rounded-sm font-black text-neutral-800 hover:text-red-500 uppercase tracking-widest cursor-pointer shrink-0 transition-colors duration-150"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveProductItem(targetId)}
                      className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest cursor-pointer shrink-0 transition-colors duration-150"
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
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiChevronDown, FiChevronUp, FiShield, FiTruck, FiScissors, FiArrowLeft } from 'react-icons/fi';
import productsService from '../../appwrite/products';
import AddToCartButton from '../pageComponets/AddToCartButton';
import { IoAlertCircleOutline } from "react-icons/io5";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  

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
  async function loadCompleteProductStage() {
    try {
      setLoading(true);
      
      // ➡️ STEP 1: Main Single Product Data Fetch Karo
      const mainProductData = await productsService.getProductById(id);

      if (mainProductData) {
        // State updates triggers
        setProduct(mainProductData);
        setActiveImage(mainProductData.front_image_link || mainProductData.image_url || mainProductData.image);
        
        if (mainProductData.sizes && mainProductData.sizes.length > 0) {
          setSelectedSize(mainProductData.sizes[0]);
        }

        // ➡️ STEP 2: Main data aate hi, bina ruke catalog fetch trigger karo
        // ✅ TRICK: Hum state wale 'product' ke bajaye direct 'mainProductData' use karenge!
        if (mainProductData.category) {
          const response = await productsService.getProducts();
          const structuredData = response?.documents || response || [];
          
          // Current product ko recommendation pool se filter out kar do
          const filteredSuggestions = structuredData.filter(
            item => item.category === mainProductData.category && item.$id !== mainProductData.$id
          );
          
          setSuggestProduct(filteredSuggestions);
        }
      }
    } catch (error) {
      console.error("Failed to execute data pipeline matrix updates from Appwrite:", error);
      alert("Requested drop sequence untraceable inside active servers.");
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  if (id) {
    loadCompleteProductStage();
  }
}, [id, navigate]);
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#fafafb] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        <div className="text-[10px] tracking-[0.5em] text-neutral-900 font-black uppercase">
          FETCHING DROP ARCHIVE // HQ
        </div>
      </div>
    );
  }

  if (!product) return null;

  const galleryImages = [
    product.front_image_link || product.image_url || product.image,
    ...(Array.isArray(product.back_image_links) ? product.back_image_links : [product.back_image_link])
  ].filter(Boolean);

  return (
    <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 font-sans relative selection:bg-neutral-900 selection:text-white">
      {/* Structural layout grid lines */}
      <div className="absolute top-0 bottom-0 left-6 md:left-12 border-l border-neutral-200/30 pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-6 md:right-12 border-r border-neutral-200/30 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 relative z-20 space-y-8">

        {/* Navigation & Back Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/40">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-black tracking-widest text-neutral-400 hover:text-neutral-950 transition-colors uppercase group">
            <FiArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
            Back to catalogue
          </Link>
          <div className="text-[9px] tracking-[0.3em] font-mono text-neutral-400 uppercase flex items-center gap-2">
            <span>INDEX</span>
            <span>/</span>
            <span>{product.category?.replace('-', ' ')}</span>
            <span>/</span>
            <span className="text-neutral-950 font-bold">{product.name?.substring(0, 15)}...</span>
          </div>
        </div>

        {/* Core Product Presenter Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-16 items-start">

          {/* STAGE COLUMN 1: IMAGE AND GALLERY VIEWPORT (7 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:col-span-7">

            {/* Gallery Thumbnails List */}
            {galleryImages.length > 1 && (
              <div className="md:col-span-2 order-2 md:order-1 flex md:flex-col gap-3 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
                {galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(imgUrl)}
                    className={`w-16 h-20 md:w-full md:aspect-3/4 rounded-xl overflow-hidden bg-neutral-100 border shrink-0 transition-all duration-300 ${activeImage === imgUrl ? 'border-neutral-955 scale-95 shadow-sm' : 'border-neutral-200 hover:border-neutral-400'}`}
                  >
                    <img src={imgUrl} alt="Garment perspective" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Heavyweight Viewport Image with Loupe Zoom */}
            <div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className={`w-full ${galleryImages.length > 1 ? 'md:col-span-10' : 'md:col-span-12'} order-1 md:order-2 rounded-2xl overflow-hidden bg-white border border-neutral-200/50 shadow-xs relative group cursor-zoom-in`}
            >
              <div className="absolute top-4 right-4 bg-neutral-955 text-white font-mono text-[8px] tracking-[0.2em] px-2.5 py-1 rounded-sm uppercase z-10 pointer-events-none">
                SPEC VOL. I // ZOOM LENS
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

          {/* STAGE COLUMN 2: SPECS AND CONTROLLER DOCK (5 Columns) */}
          <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-24">

            {/* Header info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-[9px] bg-neutral-900 text-white font-black tracking-widest uppercase px-2.5 py-1 rounded-sm">
                  {product.category?.replace('-', ' ')}
                </span>
                <span className="flex items-center gap-1.5 text-[9px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  READY TO SHIP
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-[9px] font-mono tracking-widest text-neutral-400 uppercase">
                  DROP ID: {product.$id?.substring(0, 10).toUpperCase() || 'N/A'}
                </p>
                <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight uppercase text-neutral-955 leading-none">
                  {product.name}
                </h1>
              </div>

              <div className="flex items-baseline gap-3 pt-2">
                <span className="text-3xl font-black text-neutral-955 tracking-tight">
                  ₹{Number(product.price).toLocaleString('en-IN')}
                </span>
                <span className="text-sm text-neutral-400 line-through font-bold">
                  ₹2,999
                </span>
                <span className="text-xs text-red-500 font-bold tracking-wider bg-red-50 px-2 py-0.5 rounded">
                  50% OFF
                </span>
              </div>
            </div>

            <div className="border-t border-neutral-200/60" />

            {/* Sizing selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-3.5">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black tracking-[0.2em] text-neutral-400 uppercase">SELECT SPEC SIZE</h4>
                  <span className="text-[10px] text-neutral-500 font-bold border-b border-neutral-300 cursor-pointer pb-0.5 hover:text-neutral-950 transition-colors uppercase tracking-wider">SIZE GUIDE</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`py-3.5 rounded-xl font-bold font-mono text-xs tracking-wider transition-all duration-200 cursor-pointer border ${selectedSize === size ? 'bg-neutral-950 text-white border-neutral-955 shadow-md' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400 hover:text-neutral-950'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cart Dock */}
            {/* Operations Actions & Dispatch Docking Unit (Fully Mobile Responsive Colors Fixed) */}
            <div className="space-y-4 pt-4 border-t border-neutral-900/5">

              {/* Add to cart component wrapper box */}
              <div className="w-full transform active:scale-[0.99] transition-transform duration-150">
                <AddToCartButton
                  product={product}
    selectedSize={selectedSize}
                />
              </div>


              <div className="flex items-center gap-2 text-neutral-500 font-mono text-[9px] sm:text-xs tracking-widest uppercase bg-neutral-100 p-3 rounded-lg border border-neutral-900/3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />

                <p className="font-black flex items-center gap-1.5">
                  <span>7 Days easy exchange & return policy active</span>

                  {/* 🚨 FIXED: Wrapper ko relative aur group banaya taaki tooltip accurate iske upar align ho */}
                  <span className="group relative inline-block cursor-pointer  p-0.5">

                    {/* 🔮 FULLY OPTIMIZED CSS TOOLTIP BOX */}
                    <span className="absolute bottom-full left-1/10 -translate-x-1/2 mb-2 w-56 sm:w-64 p-3 bg-white text-neutral-600 border border-neutral-900/10 shadow-xl rounded-xl normal-case text-[10px] font-medium leading-relaxed tracking-wide opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 ease-out z-50">
                      {/* Chota sa dynamic downward triangle indicator arrow */}
                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white" />

                      Return or exchange within 7 days of delivery. Product must be unused with original packaging intact.
                    </span>

                    {/* Icon Frame */}
                    <IoAlertCircleOutline className="text-sm sm:text-base text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                  </span>
                </p>
              </div>
            </div>

            {/* Collapsible Accordion Block */}
            <div className="border-t border-b border-neutral-200/60 divide-y divide-neutral-200/40">

              {/* DESCRIPTION ACCORDION */}
              {product.description && (
                <div className="py-4">
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="w-full flex items-center justify-between text-left text-xs font-black tracking-widest text-neutral-800 uppercase focus:outline-hidden"
                  >
                    <span>GARMENT SPECIFICATION</span>
                    {descExpanded ? <FiChevronUp className="text-base" /> : <FiChevronDown className="text-base" />}
                  </button>
                  <div className={`transition-all duration-300 overflow-hidden ${descExpanded ? 'max-h-40 mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="text-xs text-neutral-500 leading-relaxed font-medium uppercase tracking-wide bg-neutral-100/50 p-4 rounded-xl border border-neutral-200/30">
                      {product.description}
                    </p>
                  </div>
                </div>
              )}

              {/* SIZING ACCORDION */}
              <div className="py-4">
                <button
                  onClick={() => setSizingExpanded(!sizingExpanded)}
                  className="w-full flex items-center justify-between text-left text-xs font-black tracking-widest text-neutral-800 uppercase focus:outline-hidden"
                >
                  <span><FiScissors className="inline mr-2 text-sm" /> FIT & MEASUREMENTS</span>
                  {sizingExpanded ? <FiChevronUp className="text-base" /> : <FiChevronDown className="text-base" />}
                </button>
                <div className={`transition-all duration-300 overflow-hidden ${sizingExpanded ? 'max-h-40 mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="text-xs text-neutral-500 leading-relaxed font-medium bg-neutral-100/50 p-4 rounded-xl border border-neutral-200/30 space-y-2 uppercase tracking-wide">
                    <p>• Premium oversized signature aesthetic drop shoulders.</p>
                    <p>• Heavyweight combed knit structure tailored for comfort.</p>
                    <p>• Pre-shrunk industrial washed fabrics.</p>
                  </div>
                </div>
              </div>

              {/* SHIPPING ACCORDION */}
              <div className="py-4">
                <button
                  onClick={() => setShippingExpanded(!shippingExpanded)}
                  className="w-full flex items-center justify-between text-left text-xs font-black tracking-widest text-neutral-800 uppercase focus:outline-hidden"
                >
                  <span><FiTruck className="inline mr-2 text-sm" /> DISPATCH & LOGISTICS</span>
                  {shippingExpanded ? <FiChevronUp className="text-base" /> : <FiChevronDown className="text-base" />}
                </button>
                <div className={`transition-all duration-300 overflow-hidden ${shippingExpanded ? 'max-h-40 mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="text-xs text-neutral-500 leading-relaxed font-medium bg-neutral-100/50 p-4 rounded-xl border border-neutral-200/30 space-y-2 uppercase tracking-wide">
                    <p>• Free express domestic dispatch on all active drop catalogs.</p>
                    <p>• Delivered in custom eco-friendly heavyweight streetwear vacuum pouches.</p>
                    <p>• 7-day hassle-free drop size swap guarantee.</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Verified Footnote Badge */}
            <div className="flex items-center gap-3 text-[9px] font-mono text-neutral-400 border border-neutral-200 bg-white p-4 rounded-xl shadow-xs">
              <FiShield className="text-base text-neutral-700 shrink-0 animate-pulse" />
              <div className="leading-tight uppercase">
                <span className="font-bold text-neutral-800 block">AUTHENTIC STREETWEAR BRANDING</span>
                100% verified drops engineered with heavy fabric architecture.
              </div>
            </div>

          </div>

        </div>

   {/* 🚨 REFACTORED: Related Products Section Wrapper with Responsive Grid Matrix */}
{suggestProduct && suggestProduct.length > 0 && (
  <div className="pt-12 border-t border-neutral-200/60 space-y-8">
    
    {/* Section Typography Header */}
    <div>
      <h4 className="text-[10px] tracking-[0.4em] text-red-500 font-black uppercase mb-1.5">
        COMPLETE THE CREW LOOK
      </h4>
      <h2 className="text-2xl md:text-3xl font-black tracking-wider text-neutral-950 uppercase">
        Related Drop Bundles
      </h2>
    </div>

    {/* ⚡ THE MATRIX GRID: This fixes the multi-column alignment layout */}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
      {suggestProduct.map((item) => {
        const uniqueId = item.$id || item.id;
        
        const frontView = item.front_image_link || item.image_url || item.image || 'https://placehold.co/400x500?text=No+Front+View';
        const backView = item.back_image_links?.[0] || item.back_image_link || frontView;

        const activeTag = Array.isArray(item.tags) ? item.tags[0] : Array.isArray(item.tag) ? item.tag[0] : item.tag || "FRESH DROP";

        return (
          <div 
            key={uniqueId} 
            onClick={() => {
              navigate(`/product/${uniqueId}`);
              window.scrollTo({ top: 0, behavior: 'smooth' }); // Smooth scroll back to top on look shift
            }} 
            className="group relative flex flex-col bg-white rounded-3xl p-2 border border-neutral-200/60 hover:border-neutral-900/20 hover:shadow-xl transition-all duration-500 cursor-pointer overflow-hidden"
          >
            
            {/* Hover Radial Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-500/2 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            {/* Product Viewport Canvas */}
            <div className="w-full aspect-3/4 rounded-2xl overflow-hidden bg-neutral-100 relative border border-neutral-200/50">
              
              {/* Drop Tag Badge */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-xs border border-neutral-200/80 px-2.5 py-1 rounded-md shadow-xs group-hover:border-red-500/20 transition-colors duration-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-neutral-800 font-black text-[9px] tracking-[0.15em] uppercase">
                  {activeTag}
                </span>
              </div>

              {/* Seamless Hover Dual Image Flip */}
              <div className="w-full h-full relative overflow-hidden">
                <img
                  src={frontView}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover object-center absolute inset-0 transition-all cubic-bezier(0.4, 0, 0.2, 1) duration-700 group-hover:opacity-0 group-hover:scale-[1.04]"
                />
                <img  
                  src={backView}
                  alt={`${item.name} alternate viewframe`}
                  loading="lazy"
                  className="w-full h-full object-cover object-center absolute inset-0 transition-all cubic-bezier(0.4, 0, 0.2, 1) duration-700 opacity-0 group-hover:opacity-100 group-hover:scale-[1.04]"
                />
              </div>
            </div>

            {/* Content Specifications metadata layer */}
            <div className="mt-4 px-2 pb-2 flex flex-col justify-between grow relative z-20">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[9px] text-red-500 font-black tracking-[0.25em] uppercase">
                    {item.category?.replace('-', ' ') || "HQ MERCH"}
                  </span>
                  <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider group-hover:text-neutral-600 transition-colors duration-300">
                    DROP VOL. I
                  </span>
                </div>
                
                <h3 className="text-sm font-black tracking-wide text-neutral-800 uppercase group-hover:text-neutral-950 transition-colors truncate duration-300">
                  {item.name}
                </h3>
              </div>
              
              {/* Pricing Dock Unit Footer */}
              <div className="mt-4 pt-3 border-t border-neutral-200/60 flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">PRICE</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-base font-black text-neutral-950 tracking-wider">
                      ₹{Number(item.price).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-neutral-400 line-through font-bold">
                      ₹2,999
                    </span>
                  </div>
                </div>
                
                <span className="text-[9px] font-black tracking-wider text-neutral-500 group-hover:text-red-500 transition-colors duration-200 uppercase">
                  View Drop &rarr;
                </span>
              </div>
            </div>

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

export default ProductDetail;
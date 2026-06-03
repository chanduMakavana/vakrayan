import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

function BestSellers() {
  const navigate = useNavigate()
  const products = useSelector(state => state.products.items || [])
  const [, setWishlistVersion] = useState(0)

  useEffect(() => {
    const handleUpdate = () => setWishlistVersion(v => v + 1)
    window.addEventListener('wishlist-updated', handleUpdate)
    return () => window.removeEventListener('wishlist-updated', handleUpdate)
  }, [])

  return (
    <section id="drops" className="bg-[#fafafb] py-16 px-4 md:px-12 border-t border-neutral-200/50 scroll-mt-20 selection:bg-neutral-900 selection:text-white">
      {/* Section Header */}
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between max-w-7xl mx-auto">
        <div>
          <h4 className="text-xs tracking-[0.4em] text-[var(--theme-accent)] font-bold uppercase mb-2">In Focus</h4>
          <h2 className="text-3xl md:text-5xl font-black tracking-wider text-neutral-900 uppercase">
            Heavyweight Drops
          </h2>
        </div>
        <button 
          onClick={() => navigate('/shop')} 
          className="mt-4 md:mt-0 text-xs font-bold tracking-widest text-neutral-500 hover:text-neutral-900 uppercase transition-colors duration-300 border-b border-neutral-300 pb-1 w-fit cursor-pointer"
        >
          View All Products &rarr;
        </button>
      </div>

      {/* Empty state view */}
      {products.length === 0 && (
        <p className="text-center text-neutral-400 text-xs tracking-widest uppercase py-20 font-bold">
          No products yet — Admin se add karwao.
        </p>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 max-w-7xl mx-auto">
    {products.map((product) => {
  // Resolve unique document ID
  const uniqueId = product.$id || product.id;
  
  // Resolve image views and fallbacks
  const frontView = product.front_image_link || product.image_url || product.image || 'https://placehold.co/400x500?text=No+Front+View';
  const backView = product.back_image_links?.[0] || product.back_image_link || frontView;

  // Tags Array Handler
  const activeTag = Array.isArray(product.tags) ? product.tags[0] : Array.isArray(product.tag) ? product.tag[0] : product.tag || "FRESH DROP";

  return (
    <div 
      key={uniqueId} 
      onClick={() => navigate(`/product/${uniqueId}`)} 
      className="group relative flex flex-col bg-white rounded-2xl p-2 border border-neutral-200/60 hover:border-neutral-900/20 hover:shadow-xl transition-all duration-500 cursor-pointer overflow-hidden"
    >
      
      {/* Radial background glow on hover */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[var(--theme-glow)] rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Product Images */}
      <div className="w-full aspect-3/4 rounded-2xl overflow-hidden bg-neutral-100 relative border border-neutral-200/50">
        
        {/* Floating Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
            const exists = saved.some(item => item.$id === uniqueId || item.id === uniqueId);
            let updated;
            if (exists) {
              updated = saved.filter(item => item.$id !== uniqueId && item.id !== uniqueId);
            } else {
              updated = [...saved, product];
            }
            localStorage.setItem('wishlist', JSON.stringify(updated));
            window.dispatchEvent(new Event('wishlist-updated'));
          }}
          className="absolute top-3 right-3 z-30 bg-white/95 backdrop-blur-xs border border-neutral-200/80 hover:border-neutral-950 p-2 rounded-full shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
        >
          {(() => {
            const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
            const isFav = saved.some(item => item.$id === uniqueId || item.id === uniqueId);
            return isFav ? (
              <svg className="w-3.5 h-3.5 text-rose-500 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-neutral-500 hover:text-rose-500 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            );
          })()}
        </button>

        {/* Tag Badge */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-xs border border-neutral-200/80 px-2.5 py-1 rounded-md shadow-xs group-hover:border-[var(--theme-primary)]/20 transition-colors duration-300">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-primary)] animate-pulse" />
          <span className="text-neutral-800 font-black text-[9px] tracking-[0.15em] uppercase">
            {activeTag}
          </span>
        </div>

        {/* Hover image flip transition */}
        <div className="w-full h-full relative overflow-hidden">
          <img
            src={frontView}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover object-center absolute inset-0 transition-all cubic-bezier(0.4, 0, 0.2, 1) duration-700 group-hover:opacity-0 group-hover:scale-[1.04]"
          />
          <img  
            src={backView}
            alt={`${product.name} alternate viewframe`}
            loading="lazy"
            className="w-full h-full object-cover object-center absolute inset-0 transition-all cubic-bezier(0.4, 0, 0.2, 1) duration-700 opacity-0 group-hover:opacity-100 group-hover:scale-[1.04]"
          />
        </div>
      </div>

     {/* Metadata and Details */}
<div className="mt-4 px-2 pb-2 flex flex-col justify-between grow relative z-20">
  <div>
    {/* Product category */}
    <div className="flex items-center justify-between gap-2 mb-1">
      <span className="text-[9px] text-[var(--theme-primary)] font-black tracking-[0.25em] uppercase">
        {product.category?.replace('-', ' ') || "HQ MERCH"}
      </span>
      <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider group-hover:text-neutral-600 transition-colors duration-300">
        DROP VOL. I
      </span>
    </div>
    
    {/* Product Name */}
    <h3 className="text-sm font-black tracking-wide text-neutral-800 uppercase group-hover:text-neutral-950 transition-colors truncate duration-300">
      {product.name}
    </h3>
  </div>
  
  {/* Pricing and links */}
  <div className="mt-4 pt-3 border-t border-neutral-200/60 flex items-center justify-between gap-4">
    <div className="flex flex-col">
      <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">PRICE</span>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-base font-black text-neutral-950 tracking-wider">
          ₹{Number(product.price).toLocaleString('en-IN')}
        </span>
        {product.discount_percent > 0 && (
          <span className="text-xs text-neutral-400 line-through font-bold">
            ₹{Math.round(Number(product.price) / (1 - product.discount_percent / 100)).toLocaleString('en-IN')}
          </span>
        )}
      </div>
    </div>
    
    {/* View link indicator */}
    <span className="text-[9px] font-black tracking-wider text-neutral-500 group-hover:text-[var(--theme-primary)] transition-colors duration-200 uppercase">
      View Drop &rarr;
    </span>
  </div>
</div>
    </div>
  );
})}
      </div>
    </section>
  )
}

export default BestSellers
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import wishlistService from '../../appwrite/wishlist'
import ProductCardSkeleton from './ProductCardSkeleton'
import { addWishlistItemState, removeWishlistItemState } from '../../features/wishlistSlice'

function BestSellers() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const products = useSelector(state => state.products.items || [])
  const fetched = useSelector(state => state.products.fetched)
  const wishlist = useSelector(state => state.wishlist || [])
  const { user, isAuthenticated, adminMode } = useSelector(state => state.auth)

  const loading = !fetched && products.length === 0;

  const isOutOfStock = (product) => {
    let stocks = {};
    try {
      stocks = JSON.parse(product?.sizes_stock || '{}');
    } catch {
      stocks = {};
    }
    if (product && product.sizes && product.sizes.length > 0) {
      const totalStock = product.sizes.reduce((acc, size) => acc + (stocks[size] !== undefined ? Number(stocks[size]) : 0), 0);
      return totalStock === 0;
    }
    return false;
  };

  const sortInStockFirst = (arr) => {
    return [...arr].sort((a, b) => {
      const aOut = isOutOfStock(a);
      const bOut = isOutOfStock(b);
      if (aOut && !bOut) return 1;
      if (!aOut && bOut) return -1;
      return 0;
    });
  };

  const sortedProducts = sortInStockFirst(products);
  const featuredProducts = sortedProducts.filter(p => p.is_featured === true || p.is_featured === 'true' || p.is_featured === 1 || p.is_featured === '1');
  const displayedProducts = featuredProducts.length > 0 ? featuredProducts.slice(0, 4) : sortedProducts.slice(0, 4);

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

      {/* Loading state view */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-16 max-w-7xl mx-auto">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      )}

      {/* Empty state view */}
      {!loading && products.length === 0 && (
        <p className="text-center text-neutral-400 text-xs tracking-widest uppercase py-20 font-bold">
          No products yet — Admin se add karwao.
        </p>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-16 max-w-7xl mx-auto">
        {!loading && displayedProducts.map((product) => {
  // Resolve unique document ID
  const uniqueId = product.$id || product.id;
  
  // Resolve image views and fallbacks
  const frontView = product.front_image_link || product.image_url || product.image || 'https://placehold.co/400x500?text=No+Front+View';
  const backView = product.back_image_links?.[0] || product.back_image_link || frontView;

  // Tags Array Handler
  const activeTag = product.tag || "";

  let stocks = {};
  try {
    stocks = JSON.parse(product?.sizes_stock || '{}');
  } catch {
    stocks = {};
  }
  let isAllOutOfStock = false;
  if (product && product.sizes && product.sizes.length > 0) {
    const totalStock = product.sizes.reduce((acc, size) => acc + (stocks[size] !== undefined ? Number(stocks[size]) : 0), 0);
    isAllOutOfStock = totalStock === 0;
  }

  return (
    <div 
      key={uniqueId} 
      onClick={() => navigate(`/product/${uniqueId}`)} 
      className="group relative flex flex-col bg-transparent cursor-pointer transition-all duration-700 pb-4 border-b border-transparent hover:border-neutral-950/20"
    >
      {/* Image Aspect Ratio Canvas */}
      <div className="w-full aspect-[3/4] overflow-hidden bg-[#f6f6f6] relative transition-transform duration-700 ease-out group-hover:scale-[0.98]">
        
        {/* Floating Heart Button */}
        <button
          onClick={async (e) => {
            e.stopPropagation();
            const exists = wishlist.some(item => item.$id === uniqueId || item.id === uniqueId);
            let updated;
            if (exists) {
              dispatch(removeWishlistItemState(uniqueId));
              const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
              updated = saved.filter(item => item.$id !== uniqueId && item.id !== uniqueId);
              localStorage.setItem('wishlist', JSON.stringify(updated));
              if (isAuthenticated && user) {
                try {
                  await wishlistService.removeFromWishlist(user.$id, uniqueId);
                } catch (err) {
                  console.warn("⚠️ Appwrite wishlist cloud sync failed:", err.message);
                }
              }
            } else {
              dispatch(addWishlistItemState(product));
              const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
              updated = [...saved, product];
              localStorage.setItem('wishlist', JSON.stringify(updated));
              if (isAuthenticated && user) {
                try {
                  await wishlistService.addToWishlist(user.$id, uniqueId);
                } catch (err) {
                  console.warn("⚠️ Appwrite wishlist cloud sync failed:", err.message);
                }
              }
            }
          }}
          className="absolute top-4 right-4 z-30 bg-white/90 backdrop-blur-md border border-neutral-200/60 p-2.5 rounded-full hover:border-neutral-950 hover:bg-white active:scale-90 transition-all duration-300 shadow-xs hover:shadow-sm cursor-pointer"
        >
          {wishlist.some(item => item.$id === uniqueId || item.id === uniqueId) ? (
            <svg className="w-3.5 h-3.5 text-neutral-950 fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-950 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          )}
        </button>

        {/* Edit Button for Admin Mode */}
        {adminMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate('/admin', { state: { editProductId: uniqueId } });
            }}
            className="absolute bottom-4 left-4 z-30 bg-neutral-950 hover:bg-neutral-800 text-white text-[9px] font-mono font-bold uppercase tracking-wider py-1.5 px-3 border border-neutral-950 transition-all shadow-md cursor-pointer"
          >
            ✏️ EDIT
          </button>
        )}

        {/* Active Tag Badge */}
        {activeTag && (
          <div className="absolute top-4 left-4 z-20 flex items-center bg-neutral-950 px-2 py-0.5 select-none">
            <span className="text-white font-mono text-[8px] tracking-[0.25em] uppercase font-bold">
              {activeTag}
            </span>
          </div>
        )}

        {/* Out of Stock Overlay */}
        {isAllOutOfStock && (
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none">
            <span className="bg-white/95 text-neutral-950 border border-neutral-950 text-[10px] font-mono font-black tracking-[0.3em] uppercase py-2.5 px-5 shadow-xs">
              SOLD OUT
            </span>
          </div>
        )}

        {/* Image Flip */}
        <div className={`w-full h-full relative ${isAllOutOfStock ? 'grayscale-[30%] opacity-60' : ''}`}>
          <img
            src={frontView}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-center absolute inset-0 transition-image-flip group-hover:opacity-0 group-hover:scale-105"
          />
          <img  
            src={backView}
            alt={`${product.name} alternate viewframe`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-center absolute inset-0 transition-image-flip opacity-0 group-hover:opacity-100 group-hover:scale-105"
          />
        </div>
      </div>

      {/* Metadata Content */}
      <div className="mt-3 px-1 flex flex-col justify-between grow">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[8px] font-mono text-neutral-400 tracking-wider uppercase">
              {product.category?.replace('-', ' ') || "HQ MERCH"}
            </span>
          </div>
          
          <h3 className="text-[11px] md:text-xs font-bold tracking-[0.05em] text-neutral-950 uppercase truncate">
            {product.name}
          </h3>
        </div>
        
        <div className="mt-2 pt-2 border-t border-neutral-100 flex items-baseline justify-between flex-wrap gap-x-2 gap-y-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs md:text-sm font-mono font-black text-neutral-950">
              ₹{Number(product.price).toLocaleString('en-IN')}
            </span>
            {(() => {
              const priceNum = Number(product.price || 0);
              const compareNum = Number(product.compare_at_price || 0);
              const showCompare = compareNum > priceNum;
              const compareDisplay = showCompare
                ? compareNum
                : (product.discount_percent > 0
                    ? Math.round(priceNum / (1 - product.discount_percent / 100))
                    : null);
              return compareDisplay ? (
                <span className="text-[9px] font-mono text-neutral-400 line-through">
                  ₹{compareDisplay.toLocaleString('en-IN')}
                </span>
              ) : null;
            })()}
          </div>
          <span className="text-[8px] text-neutral-450 font-sans tracking-wide uppercase font-bold">
            incl. taxes
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
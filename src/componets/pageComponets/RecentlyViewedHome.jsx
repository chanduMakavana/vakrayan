import { useMemo, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, useInView } from 'framer-motion';
import wishlistService from '../../services/wishlist';
import { addWishlistItemState, removeWishlistItemState } from '../../features/wishlistSlice';
import { getOptimizedImageUrl, preloadProductBatch, preloadImage } from '../../utils/imageOptimizer';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

function RecentlyViewedHome() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const products = useSelector(state => state.products.items || []);
  const wishlist = useSelector(state => state.wishlist || []);
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.05 });
  const [fallbackShow, setFallbackShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFallbackShow(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const shouldShow = isInView || fallbackShow;

  const viewedProducts = useMemo(() => {
    const saved = localStorage.getItem('recently_viewed');
    if (!saved || products.length === 0) return [];
    try {
      const viewedIds = JSON.parse(saved);
      return viewedIds
        .map(id => products.find(p => p.$id === id || p.id === id))
        .filter(Boolean)
        .slice(0, 4); // Show top 4 recently viewed products
    } catch {
      return [];
    }
  }, [products]);

  useEffect(() => {
    if (viewedProducts.length > 0) {
      preloadProductBatch(viewedProducts, 4);
    }
  }, [viewedProducts]);

  if (viewedProducts.length === 0) return null;

  return (
    <section
      style={{ background: 'var(--color-bg)', padding: '36px 0 40px 0', borderTop: '1px solid var(--color-border)' }}
    >
      <div className="max-w-[1728px] mx-auto px-4 md:px-12">
        {/* Header */}
        <div className="mb-6">
          <div className="accent-line mb-3" />
          <p className="eyebrow mb-2">Your History</p>
          <h2 className="section-title">

            Recently Viewed
          </h2>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {viewedProducts.map((product) => {
            const parentId = product.$id || product.id;
            const frontView = product.front_image_link || product.image_url || product.image || 'https://placehold.co/400x500?text=No+Image';
            const backView = product.back_image_links?.[0] || product.back_image_link || frontView;
            const activeTag = product.tag || '';
            let stocks = {};
            try { stocks = JSON.parse(product?.sizes_stock || '{}') } catch { stocks = {} }
            let isAllOutOfStock = false;
            if (product?.sizes?.length > 0) {
              isAllOutOfStock = product.sizes.reduce((acc, size) => acc + (stocks[size] !== undefined ? Number(stocks[size]) : 0), 0) === 0;
            }
            const isWishlisted = wishlist.some(item => item.$id === parentId || item.id === parentId);

            return (
              <div
                key={parentId}
                onClick={() => { navigate(`/product/${product.slug || parentId}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="group relative flex flex-col bg-white border border-emerald-900/15 hover:border-emerald-600 transition-all duration-300 shadow-xs hover:shadow-md cursor-pointer rounded-none overflow-hidden"
              >
                {/* Image */}
                <div className="w-full aspect-[3/4] relative overflow-hidden bg-[#F0F7F3] border-b border-emerald-900/15">
                  {/* Wishlist btn */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (isWishlisted) {
                        dispatch(removeWishlistItemState(parentId));
                        const savedList = JSON.parse(localStorage.getItem('wishlist')) || [];
                        localStorage.setItem('wishlist', JSON.stringify(savedList.filter(item => item.$id !== parentId && item.id !== parentId)));
                        if (isAuthenticated && user) { try { await wishlistService.removeFromWishlist(user.$id, parentId) } catch {} }
                      } else {
                        dispatch(addWishlistItemState(product));
                        const savedList = JSON.parse(localStorage.getItem('wishlist')) || [];
                        localStorage.setItem('wishlist', JSON.stringify([...savedList, product]));
                        if (isAuthenticated && user) { try { await wishlistService.addToWishlist(user.$id, parentId) } catch {} }
                      }
                    }}
                    className={`absolute top-3 right-3 z-30 w-8 h-8 flex items-center justify-center cursor-pointer transition-all duration-200 border rounded-none shadow-xs ${
                      isWishlisted 
                        ? 'bg-emerald-600 border-emerald-600 text-white' 
                        : 'bg-white/95 border-emerald-900/20 text-emerald-800 hover:bg-emerald-600 hover:text-white hover:border-emerald-600'
                    }`}
                    aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill={isWishlisted ? '#fff' : 'none'} stroke="currentColor" strokeWidth="2">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>

                  {/* Tag */}
                  {activeTag && (
                    <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 z-20 px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-800/90 backdrop-blur-xs text-white rounded-xs border border-emerald-600/30 shadow-xs max-w-[70%] truncate">
                      <span className="text-[8px] sm:text-[9.5px] font-mono font-bold tracking-wider uppercase">{activeTag}</span>
                    </div>
                  )}

                  {/* Out of stock */}
                  {isAllOutOfStock && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-emerald-950/40 backdrop-blur-xs pointer-events-none">
                      <span className="px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-white border border-emerald-900/20 font-mono text-[8.5px] sm:text-[10px] font-black tracking-widest uppercase text-emerald-950 rounded-none shadow-xs">Sold Out</span>
                    </div>
                  )}

                  {/* Image flip */}
                  <div className={`w-full h-full relative ${isAllOutOfStock ? 'grayscale-[30%] opacity-60' : ''}`} onMouseEnter={() => preloadImage(getOptimizedImageUrl(backView, 600, 75))}>
                    <img 
                      src={getOptimizedImageUrl(frontView, 600, 75)} 
                      alt={product.name} 
                      loading="lazy" 
                      decoding="async" 
                      width={600}
                      height={800}
                      className="w-full h-full object-cover absolute inset-0 transition-image-flip group-hover:opacity-0" 
                    />
                    <img 
                      src={getOptimizedImageUrl(backView, 600, 75)} 
                      alt={`${product.name} back`} 
                      loading="lazy" 
                      decoding="async" 
                      width={600}
                      height={800}
                      className="w-full h-full object-cover absolute inset-0 transition-image-flip opacity-0 group-hover:opacity-100" 
                    />
                  </div>
                </div>

                {/* Card info */}
                <div className="p-2.5 md:p-3 flex flex-col justify-between bg-white">
                  <div className="mb-1.5">
                    <p className="text-[9.5px] font-mono font-bold tracking-widest uppercase text-emerald-700 mb-0.5">
                      {product.category?.replace(/-/g, ' ') || 'Collection'}
                    </p>
                    <h3 className="text-xs font-black tracking-wide text-[#0D1A14] uppercase truncate font-sans">
                      {product.name}
                    </h3>
                  </div>

                  <div className="flex items-baseline gap-1.5 pt-1.5 border-t border-emerald-900/15">
                    <span className="text-sm font-black text-[#0D1A14] font-sans">
                      ₹{Number(product.price).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default RecentlyViewedHome;

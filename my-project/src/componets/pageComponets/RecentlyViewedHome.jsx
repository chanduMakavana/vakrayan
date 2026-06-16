import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import wishlistService from '../../appwrite/wishlist';
import { addWishlistItemState, removeWishlistItemState } from '../../features/wishlistSlice';

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

  if (viewedProducts.length === 0) return null;

  return (
    <section
      style={{ background: 'var(--color-bg)', padding: '72px 0', borderTop: '1px solid var(--color-border)' }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-12">
        {/* Header */}
        <div className="mb-12">
          <div className="accent-line mb-3" />
          <p className="eyebrow mb-2">Your History</p>
          <h2 style={{ fontFamily: "'Chelsea Market', cursive", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: 'var(--color-text)', lineHeight: 1.1 }}>
            Recently Viewed
          </h2>
        </div>

        {/* Products grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
        >
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
              <motion.div
                key={parentId}
                variants={cardVariants}
                onClick={() => { navigate(`/product/${product.slug || parentId}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="product-card group cursor-pointer"
              >
                {/* Image */}
                <div className="relative overflow-hidden" style={{ aspectRatio: '3/4', borderRadius: '16px 16px 0 0', background: 'var(--color-subtle)' }}>
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
                    className="absolute top-3 right-3 z-30 w-9 h-9 flex items-center justify-center cursor-pointer transition-all duration-300"
                    style={{
                      background: isWishlisted ? 'rgba(5,150,105,0.90)' : 'rgba(255,255,255,0.85)',
                      backdropFilter: 'blur(8px)',
                      border: `1px solid ${isWishlisted ? 'rgba(5,150,105,0.40)' : 'rgba(255,255,255,0.60)'}`,
                      borderRadius: 10
                    }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isWishlisted ? '#fff' : 'none'} stroke={isWishlisted ? '#fff' : 'var(--color-muted)'} strokeWidth="2">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>

                  {/* Tag */}
                  {activeTag && (
                    <div className="absolute top-3 left-3 z-20 px-2.5 py-1" style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(8px)', border: '1px solid rgba(5,150,105,0.20)', borderRadius: 6 }}>
                      <span style={{ color: 'var(--color-accent)', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Jost', sans-serif" }}>{activeTag}</span>
                    </div>
                  )}

                  {/* Out of stock */}
                  {isAllOutOfStock && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(244,250,247,0.55)', backdropFilter: 'blur(2px)' }}>
                      <span className="px-4 py-2" style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid var(--color-border-hard)', borderRadius: 8, fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-muted)', fontFamily: "'Jost', sans-serif" }}>Sold Out</span>
                    </div>
                  )}

                  {/* Image flip */}
                  <div className={`w-full h-full relative ${isAllOutOfStock ? 'grayscale-[30%] opacity-60' : ''}`}>
                    <img src={frontView} alt={product.name} loading="lazy" className="w-full h-full object-cover absolute inset-0 transition-image-flip group-hover:opacity-0" />
                    <img src={backView} alt={`${product.name} back`} loading="lazy" className="w-full h-full object-cover absolute inset-0 transition-image-flip opacity-0 group-hover:opacity-100" />
                  </div>
                </div>

                {/* Card info */}
                <div className="p-4">
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: 4, fontFamily: "'Jost', sans-serif" }}>
                    {product.category?.replace(/-/g, ' ') || 'Collection'}
                  </p>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10, fontFamily: "'Jost', sans-serif" }} className="truncate">
                    {product.name}
                  </h3>
                  <div className="flex items-baseline justify-between pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', fontFamily: "'Jost', sans-serif" }}>
                      ₹{Number(product.price).toLocaleString('en-IN')}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--color-muted)', fontFamily: "'Jost', sans-serif" }}>incl. taxes</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

export default RecentlyViewedHome;

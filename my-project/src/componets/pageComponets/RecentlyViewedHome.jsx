import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import wishlistService from '../../appwrite/wishlist';
import { addWishlistItemState, removeWishlistItemState } from '../../features/wishlistSlice';

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
    <section className="bg-[var(--color-bg)] py-16 px-4 md:px-12 border-t border-[var(--color-border)]">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between max-w-7xl mx-auto">
        <div>
          <h4 className="text-xs tracking-[0.4em] text-[var(--color-accent)] font-bold uppercase mb-2">Your History</h4>
          <h2 className="text-3xl md:text-5xl font-black tracking-wider text-[var(--color-text)] uppercase">
            Recently Viewed
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-16 max-w-7xl mx-auto">
        {viewedProducts.map((product) => {
          const parentId = product.$id || product.id;
          const frontView = product.front_image_link || product.image_url || product.image || 'https://placehold.co/400x500?text=No+Front+View';
          const backView = product.back_image_links?.[0] || product.back_image_link || frontView;
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
              key={parentId} 
              onClick={() => {
                navigate(`/product/${product.slug || parentId}`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
              className="group relative flex flex-col bg-transparent cursor-pointer transition-all duration-300 ease-out pb-4 border-b border-transparent hover:shadow-lg hover:border-[var(--color-border)] rounded-xl"
            >
              <div className="w-full aspect-[3/4] overflow-hidden rounded-xl bg-[var(--color-subtle)] relative transition-transform duration-700 ease-out">
                {/* Floating Heart Button */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const exists = wishlist.some(item => item.$id === parentId || item.id === parentId);
                    let updated;
                    if (exists) {
                      dispatch(removeWishlistItemState(parentId));
                      const savedList = JSON.parse(localStorage.getItem('wishlist')) || [];
                      updated = savedList.filter(item => item.$id !== parentId && item.id !== parentId);
                      localStorage.setItem('wishlist', JSON.stringify(updated));
                      if (isAuthenticated && user) {
                        try {
                          await wishlistService.removeFromWishlist(user.$id, parentId);
                        } catch (err) {
                          console.warn("⚠️ Appwrite wishlist cloud sync failed:", err.message);
                        }
                      }
                    } else {
                      dispatch(addWishlistItemState(product));
                      const savedList = JSON.parse(localStorage.getItem('wishlist')) || [];
                      updated = [...savedList, product];
                      localStorage.setItem('wishlist', JSON.stringify(updated));
                      if (isAuthenticated && user) {
                        try {
                          await wishlistService.addToWishlist(user.$id, parentId);
                        } catch (err) {
                          console.warn("⚠️ Appwrite wishlist cloud sync failed:", err.message);
                        }
                      }
                    }
                  }}
                  className="absolute top-4 right-4 z-30 bg-[var(--color-surface)]/95 backdrop-blur-md border border-[var(--color-border)] p-2.5 rounded-full hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)] active:scale-90 transition-all duration-300 shadow-xs hover:shadow-sm cursor-pointer"
                >
                  {wishlist.some(item => item.$id === parentId || item.id === parentId) ? (
                    <svg className="w-3.5 h-3.5 text-[var(--color-accent)] fill-current" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-[var(--color-muted)] group-hover:text-[var(--color-accent)] stroke-current fill-none stroke-2" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  )}
                </button>

                {activeTag ? (
                  <div className="absolute top-4 left-4 z-20 flex items-center bg-[var(--color-accent)] px-2 py-0.5 select-none">
                    <span className="text-white font-mono text-[8px] tracking-[0.25em] uppercase font-bold">
                      {activeTag}
                    </span>
                  </div>
                ) : null}

                {isAllOutOfStock && (
                  <div className="absolute inset-0 bg-[var(--color-bg)]/20 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none">
                    <span className="bg-[var(--color-surface)]/95 text-[var(--color-text)] border border-[var(--color-border)] text-[10px] font-mono font-black tracking-[0.3em] uppercase py-2.5 px-5 shadow-xs">
                      SOLD OUT
                    </span>
                  </div>
                )}

                <div className={`w-full h-full relative ${isAllOutOfStock ? 'grayscale-[30%] opacity-60' : ''}`}>
                  <img
                    src={frontView}
                    alt={product.name}
                    loading="lazy"
                    className="w-full h-full object-cover object-center absolute inset-0 transition-all duration-500 group-hover:opacity-0"
                  />
                  <img  
                    src={backView}
                    alt={`${product.name} alternate viewframe`}
                    loading="lazy"
                    className="w-full h-full object-cover object-center absolute inset-0 transition-all duration-500 opacity-0 group-hover:opacity-100"
                  />
                </div>
              </div>

              <div className="mt-3 px-1 flex flex-col justify-between grow">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[8px] font-mono text-[var(--color-muted)] tracking-wider uppercase">
                      {product.category?.replace('-', ' ') || "Collection"}
                    </span>
                  </div>
                  <h3 className="text-[11px] md:text-xs font-bold tracking-[0.05em] text-[var(--color-text)] uppercase truncate">
                    {product.name}
                  </h3>
                </div>
                
                <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-baseline justify-between flex-wrap gap-x-2 gap-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm md:text-base font-mono font-black text-[var(--color-text)]">
                      ₹{Number(product.price).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span className="text-[8px] text-[var(--color-muted)] font-sans tracking-wide uppercase font-bold">
                    incl. taxes
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default RecentlyViewedHome;

import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import wishlistService from '../../services/wishlist'
import ProductCardSkeleton from './ProductCardSkeleton'
import { useDelayedLoading } from '../../hooks/useDelayedLoading'
import { addWishlistItemState, removeWishlistItemState } from '../../features/wishlistSlice'
import { scatterProducts } from '../../utils/colorHelper'
import { getOptimizedImageUrl, preloadProductBatch, preloadImage } from '../../utils/imageOptimizer'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.09 } }
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
}

function BestSellerCard({ product, isOutOfStock, isWishlisted, adminMode, navigate, dispatch, isAuthenticated, user }) {
  const [isHovered, setIsHovered] = useState(false);
  const parentId = product.$id || product.id;
  const frontView = product.front_image_link || product.image_url || product.image || 'https://placehold.co/400x500?text=No+Image';
  const backView = product.back_image_links?.[0] || product.back_image_link || frontView;
  const hasBackView = backView && backView !== frontView;
  const activeTag = product.tag || (product.category === 'oversized-tshirt' ? 'OVERSIZED' : '');

  const productPath = `/product/${product.slug || parentId}`

  return (
    <Link
      to={productPath}
      className="group relative flex flex-col bg-white border border-emerald-900/15 hover:border-emerald-600 transition-all duration-300 shadow-xs hover:shadow-md cursor-pointer rounded-none overflow-hidden no-underline"
      style={{ textDecoration: 'none', color: 'inherit' }}
      tabIndex={0}
      aria-label={`View ${product.name}`}
    >
    <motion.div
      variants={cardVariants}
      className="flex flex-col w-full h-full"
      onMouseEnter={() => {
        setIsHovered(true);
        if (hasBackView) preloadImage(getOptimizedImageUrl(backView, 500, 75));
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image area */}
      <div className="w-full aspect-[3/4] relative overflow-hidden bg-[#F0F7F3] border-b border-emerald-900/15">
        {/* Wishlist button */}
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (isWishlisted) {
              dispatch(removeWishlistItemState(parentId));
              const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
              localStorage.setItem('wishlist', JSON.stringify(saved.filter(item => item.$id !== parentId && item.id !== parentId)));
              if (isAuthenticated && user) {
                try { await wishlistService.removeFromWishlist(user.$id, parentId); } catch {}
              }
            } else {
              dispatch(addWishlistItemState(product));
              const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
              localStorage.setItem('wishlist', JSON.stringify([...saved, product]));
              if (isAuthenticated && user) {
                try { await wishlistService.addToWishlist(user.$id, parentId); } catch {}
              }
            }
          }}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          className={`absolute top-3 right-3 z-30 w-8 h-8 flex items-center justify-center cursor-pointer transition-all duration-200 border rounded-none shadow-xs ${
            isWishlisted 
              ? 'bg-emerald-600 border-emerald-600 text-white' 
              : 'bg-white/95 border-emerald-900/20 text-emerald-800 hover:bg-emerald-600 hover:text-white hover:border-emerald-600'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isWishlisted ? '#fff' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>

        {/* Admin edit button */}
        {adminMode && (
          <button
            onClick={e => { e.stopPropagation(); navigate(`/admin?edit=${parentId}`, { state: { editProductId: parentId } }); }}
            className="absolute bottom-3 left-3 z-30 px-3 py-1.5 cursor-pointer transition-all duration-200 text-white font-mono font-bold text-[10px] uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800 rounded-none border-none shadow-xs"
          >
            Edit
          </button>
        )}

        {/* Tag badge */}
        {activeTag && (
          <div className="absolute top-3 left-3 z-20 px-2.5 py-1 bg-emerald-700 text-white rounded-none shadow-xs">
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase">
              {activeTag}
            </span>
          </div>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-emerald-950/40 backdrop-blur-xs pointer-events-none">
            <span className="px-3.5 py-1.5 bg-white border border-emerald-900/20 font-mono text-[10px] font-black tracking-widest uppercase text-emerald-950 rounded-none shadow-xs">
              Sold Out
            </span>
          </div>
        )}

        {/* Dynamic single-image / on-demand back-image flip */}
        <div className={`w-full h-full relative ${isOutOfStock ? 'grayscale-[30%] opacity-60' : ''}`}>
          <img 
            src={getOptimizedImageUrl(frontView, 500, 75)} 
            alt={product.name} 
            loading="lazy" 
            decoding="async"
            width={500}
            height={667}
            className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-300 ${isHovered && hasBackView ? 'opacity-0' : 'opacity-100'}`} 
          />
          {hasBackView && isHovered && (
            <img 
              src={getOptimizedImageUrl(backView, 500, 75)} 
              alt={`${product.name} back`} 
              loading="lazy" 
              decoding="async"
              width={500}
              height={667}
              className="w-full h-full object-cover absolute inset-0 transition-opacity duration-300 opacity-100" 
            />
          )}
        </div>
      </div>

      {/* Card info */}
      <div className="p-2.5 md:p-3 flex flex-col justify-between bg-white">
        <div className="mb-1.5">
          <p className="text-[9.5px] font-mono font-bold tracking-widest uppercase text-emerald-700 mb-0.5">
            {product.category?.replace(/-/g, ' ') || 'Premium'}
          </p>
          <h3 className="text-xs font-black tracking-wide text-[#0D1A14] uppercase truncate font-sans">
            {product.name}
          </h3>
        </div>

        <div className="flex items-baseline gap-1.5 pt-1.5 border-t border-emerald-900/15">
          <span className="text-sm font-black text-[#0D1A14] font-sans">
            ₹{Number(product.price).toLocaleString('en-IN')}
          </span>
          {(() => {
            const priceNum = Number(product.price || 0);
            const compareNum = Number(product.compare_at_price || 0);
            const compareDisplay = compareNum > priceNum ? compareNum : (product.discount_percent > 0 ? Math.round(priceNum / (1 - product.discount_percent / 100)) : null);
            return compareDisplay ? (
              <span className="text-[11px] text-[#527060] line-through font-sans">
                ₹{compareDisplay.toLocaleString('en-IN')}
              </span>
            ) : null;
          })()}
        </div>
      </div>
    </motion.div>
    </Link>
  );
}

function BestSellers() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const products = useSelector(state => state.products.items || [])
  const fetched = useSelector(state => state.products.fetched)
  const wishlist = useSelector(state => state.wishlist || [])
  const { user, isAuthenticated, adminMode } = useSelector(state => state.auth)
  const loading = !fetched && products.length === 0
  const showSkeletons = useDelayedLoading(loading, 1500)

  const isOutOfStock = (product) => {
    let stocks = {}
    try { stocks = JSON.parse(product?.sizes_stock || '{}') } catch { stocks = {} }
    if (product?.sizes?.length > 0) {
      return product.sizes.reduce((acc, size) => acc + (stocks[size] !== undefined ? Number(stocks[size]) : 0), 0) === 0
    }
    return false
  }

  const sortInStockFirst = (arr) => [...arr].sort((a, b) => {
    const aOut = isOutOfStock(a), bOut = isOutOfStock(b)
    if (aOut && !bOut) return 1
    if (!aOut && bOut) return -1
    return 0
  })

  const sortedProducts = useMemo(() =>
    scatterProducts(sortInStockFirst(products))
  , [products]) // eslint-disable-line react-hooks/exhaustive-deps

  const featuredProducts = useMemo(() =>
    scatterProducts(sortedProducts.filter(p => p.is_featured === true || p.is_featured === 'true' || p.is_featured === 1 || p.is_featured === '1'))
  , [sortedProducts])

  const displayedProducts = featuredProducts.length > 0 ? featuredProducts.slice(0, 4) : sortedProducts.slice(0, 4)

  useEffect(() => {
    if (displayedProducts.length > 0) {
      preloadProductBatch(displayedProducts, 4)
    }
  }, [displayedProducts])

  return (
    <section id="drops" className="scroll-mt-20 selection:bg-[var(--color-accent)] selection:text-white"
      style={{ background: 'var(--color-bg)', padding: '48px 0 24px 0', borderTop: '1px solid var(--color-border)' }}
    >
      <div className="max-w-[1728px] mx-auto px-4 md:px-12">

        {/* Section Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="accent-line mb-3" />
            <p className="eyebrow mb-2">In Focus</p>
            <h2 className="section-title">
              Heavyweight Drops
            </h2>
          </div>
        </div>

        {/* Loading skeletons */}
        {showSkeletons && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
            </svg>
            <div>
              <p style={{ color: 'var(--color-text)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Drops Coming Soon</p>
              <p style={{ color: 'var(--color-muted)', fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>Be first in line — join the drop list below.</p>
            </div>
          </div>
        )}

        {/* Products Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
        >
          {!loading && displayedProducts.map((product) => (
            <BestSellerCard
              key={product.$id || product.id}
              product={product}
              isOutOfStock={isOutOfStock(product)}
              isWishlisted={wishlist.some(item => (item.$id || item.id) === (product.$id || product.id))}
              adminMode={adminMode}
              navigate={navigate}
              dispatch={dispatch}
              isAuthenticated={isAuthenticated}
              user={user}
            />
          ))}
        </motion.div>

        {/* Centered CTA button at the bottom of the grid */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => navigate('/shop')}
            className="group relative px-10 py-4.5 overflow-hidden rounded-xl bg-transparent border border-[var(--color-border-hard)] hover:border-[var(--color-accent)] cursor-pointer transition-all duration-300 select-none active:scale-98"
          >
            <div className="absolute inset-0 w-0 bg-[var(--color-accent)] transition-all duration-300 ease-out group-hover:w-full" style={{ zIndex: 0 }} />
            <span className="relative z-10 flex items-center justify-center gap-3 text-xs font-black font-mono tracking-widest uppercase text-[var(--color-text)] group-hover:text-white transition-colors duration-300">
              EXPLORE ALL PRODUCTS
              <svg className="w-4 h-4 fill-none stroke-current stroke-2 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </button>
        </div>

      </div>
    </section>
  )
}

export default BestSellers
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { motion } from 'framer-motion'
import wishlistService from '../../services/wishlist'
import ProductCardSkeleton from './ProductCardSkeleton'
import { addWishlistItemState, removeWishlistItemState } from '../../features/wishlistSlice'
import { scatterProducts } from '../../utils/colorHelper'

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.09 } }
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
}

function BestSellers() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const products = useSelector(state => state.products.items || [])
  const fetched = useSelector(state => state.products.fetched)
  const wishlist = useSelector(state => state.wishlist || [])
  const { user, isAuthenticated, adminMode } = useSelector(state => state.auth)
  const loading = !fetched && products.length === 0

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

  const sortedProducts = scatterProducts(sortInStockFirst(products))
  const featuredProducts = scatterProducts(sortedProducts.filter(p => p.is_featured === true || p.is_featured === 'true' || p.is_featured === 1 || p.is_featured === '1'))
  const displayedProducts = featuredProducts.length > 0 ? featuredProducts.slice(0, 4) : sortedProducts.slice(0, 4)

  return (
    <section id="drops" className="scroll-mt-20 selection:bg-[var(--color-accent)] selection:text-white"
      style={{ background: 'var(--color-bg)', padding: '72px 0', borderTop: '1px solid var(--color-border)' }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-12">

        {/* Section Header */}
        <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="accent-line mb-3" />
            <p className="eyebrow mb-2">In Focus</p>
            <h2 className="section-title">
              Heavyweight Drops
            </h2>
          </div>
          <button
            onClick={() => navigate('/shop')}
            className="btn-ghost cursor-pointer w-fit"
            style={{ fontSize: 13 }}
          >
            View All &rarr;
          </button>
        </div>

        {/* Loading skeletons */}
        {loading && (
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
          {!loading && displayedProducts.map((product) => {
            const parentId = product.$id || product.id
            const frontView = product.front_image_link || product.image_url || product.image || 'https://placehold.co/400x500?text=No+Image'
            const backView = product.back_image_links?.[0] || product.back_image_link || frontView
            const activeTag = product.tag || (product.category === 'oversized-tshirt' ? 'OVERSIZED' : '')
            let stocks = {}
            try { stocks = JSON.parse(product?.sizes_stock || '{}') } catch { stocks = {} }
            let isAllOutOfStock = false
            if (product?.sizes?.length > 0) {
              isAllOutOfStock = product.sizes.reduce((acc, size) => acc + (stocks[size] !== undefined ? Number(stocks[size]) : 0), 0) === 0
            }
            const isWishlisted = wishlist.some(item => item.$id === parentId || item.id === parentId)

            return (
              <motion.div
                key={parentId}
                variants={cardVariants}
                onClick={() => navigate(`/product/${product.slug || parentId}`)}
                className="product-card group cursor-pointer"
              >
                {/* Image area */}
                <div className="relative overflow-hidden" style={{ aspectRatio: '3/4', borderRadius: '16px 16px 0 0', background: 'var(--color-subtle)' }}>

                  {/* Wishlist button */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      const exists = wishlist.some(item => item.$id === parentId || item.id === parentId)
                      if (exists) {
                        dispatch(removeWishlistItemState(parentId))
                        const saved = JSON.parse(localStorage.getItem('wishlist')) || []
                        localStorage.setItem('wishlist', JSON.stringify(saved.filter(item => item.$id !== parentId && item.id !== parentId)))
                        if (isAuthenticated && user) {
                          try { await wishlistService.removeFromWishlist(user.$id, parentId) } catch {}
                        }
                      } else {
                        dispatch(addWishlistItemState(product))
                        const saved = JSON.parse(localStorage.getItem('wishlist')) || []
                        localStorage.setItem('wishlist', JSON.stringify([...saved, product]))
                        if (isAuthenticated && user) {
                          try { await wishlistService.addToWishlist(user.$id, parentId) } catch {}
                        }
                      }
                    }}
                    className="absolute top-3 right-3 z-30 w-9 h-9 flex items-center justify-center cursor-pointer transition-all duration-300"
                    style={{
                      background: isWishlisted ? 'rgba(5,150,105,0.90)' : 'rgba(255,255,255,0.85)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: `1px solid ${isWishlisted ? 'rgba(5,150,105,0.40)' : 'rgba(255,255,255,0.60)'}`,
                      borderRadius: 10,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.10)'
                    }}
                    onMouseEnter={e => { if (!isWishlisted) e.currentTarget.style.background = 'rgba(5,150,105,0.15)' }}
                    onMouseLeave={e => { if (!isWishlisted) e.currentTarget.style.background = 'rgba(255,255,255,0.85)' }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isWishlisted ? '#fff' : 'none'} stroke={isWishlisted ? '#fff' : 'var(--color-muted)'} strokeWidth="2">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>

                  {/* Admin edit button */}
                  {adminMode && (
                    <button
                      onClick={e => { e.stopPropagation(); navigate('/admin', { state: { editProductId: parentId } }) }}
                      className="absolute bottom-3 left-3 z-30 px-3 py-1.5 cursor-pointer transition-all duration-200 text-white font-bold text-[10px] uppercase tracking-wider"
                      style={{ background: 'var(--color-accent)', borderRadius: 8, border: 'none', fontFamily: "'Jost', sans-serif" }}
                    >
                      Edit
                    </button>
                  )}

                  {/* Tag badge */}
                  {activeTag && (
                    <div
                      className="absolute top-3 left-3 z-20 px-2.5 py-1"
                      style={{
                        background: 'rgba(255,255,255,0.90)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(5,150,105,0.20)',
                        borderRadius: 6
                      }}
                    >
                      <span style={{ color: 'var(--color-accent)', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Jost', sans-serif" }}>
                        {activeTag}
                      </span>
                    </div>
                  )}

                  {/* Out of stock overlay */}
                  {isAllOutOfStock && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
                      style={{ background: 'rgba(244,250,247,0.55)', backdropFilter: 'blur(2px)' }}>
                      <span
                        className="px-4 py-2"
                        style={{
                          background: 'rgba(255,255,255,0.95)',
                          border: '1px solid var(--color-border-hard)',
                          borderRadius: 8,
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: '0.2em',
                          textTransform: 'uppercase',
                          color: 'var(--color-muted)',
                          fontFamily: "'Jost', sans-serif"
                        }}
                      >
                        Sold Out
                      </span>
                    </div>
                  )}

                  {/* Image flip */}
                  <div className={`w-full h-full relative ${isAllOutOfStock ? 'grayscale-[30%] opacity-60' : ''}`}>
                    <img src={frontView} alt={product.name} loading="lazy" decoding="async"
                      className="w-full h-full object-cover absolute inset-0 transition-image-flip group-hover:opacity-0" />
                    <img src={backView} alt={`${product.name} back`} loading="lazy" decoding="async"
                      className="w-full h-full object-cover absolute inset-0 transition-image-flip opacity-0 group-hover:opacity-100" />
                  </div>
                </div>

                {/* Card info */}
                <div className="p-4">
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: 4, fontFamily: "'Jost', sans-serif" }}>
                    {product.category?.replace(/-/g, ' ') || 'Premium'}
                  </p>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10, fontFamily: "'Jost', sans-serif" }} className="truncate">
                    {product.name}
                  </h3>
                  <div className="flex items-baseline justify-between gap-2 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <div className="flex items-baseline gap-2">
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', fontFamily: "'Jost', sans-serif" }}>
                        ₹{Number(product.price).toLocaleString('en-IN')}
                      </span>
                      {(() => {
                        const priceNum = Number(product.price || 0)
                        const compareNum = Number(product.compare_at_price || 0)
                        const compareDisplay = compareNum > priceNum ? compareNum : (product.discount_percent > 0 ? Math.round(priceNum / (1 - product.discount_percent / 100)) : null)
                        return compareDisplay ? (
                          <span style={{ fontSize: 11, color: 'var(--color-muted)', textDecoration: 'line-through', fontFamily: "'Jost', sans-serif" }}>
                            ₹{compareDisplay.toLocaleString('en-IN')}
                          </span>
                        ) : null
                      })()}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--color-muted)', fontFamily: "'Jost', sans-serif" }}>incl. taxes</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

export default BestSellers
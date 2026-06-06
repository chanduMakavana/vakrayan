import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import productsService from '../../appwrite/products'
import wishlistService from '../../appwrite/wishlist'
import Navbar from '../pageComponets/Navbar'
import Footer from '../pageComponets/Footer'
import ProductCardSkeleton from '../pageComponets/ProductCardSkeleton'
import { setProducts } from '../../features/productsSlice'
import { addWishlistItemState, removeWishlistItemState } from '../../features/wishlistSlice'
import Fuse from 'fuse.js'

function Shop() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { category: urlCategory } = useParams()
  const [searchParams] = useSearchParams()
  const tagParam = searchParams.get('tag') // supports ?tag=NEW+DROP

  const products = useSelector(state => state.products.items || [])
  const wishlist = useSelector(state => state.wishlist || [])
  const { user, isAuthenticated, adminMode } = useSelector(state => state.auth)
  const reduxFetched = useSelector(state => state.products.fetched)
  
  const [loading, setLoading] = useState(!reduxFetched)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(urlCategory || 'all')
  const [selectedTag, setSelectedTag] = useState(tagParam || 'all')
  const [sortBy, setSortBy] = useState('newest') // newest | price-low | price-high

  const getLocalStorageFallbackData = () => {
    return JSON.parse(localStorage.getItem('products')) || []
  }

  const loadProductCatalog = async () => {
    try {
      setLoading(true)
      const response = await productsService.getProducts()
      const structuredData = response?.documents || response || []
      
      if (structuredData && structuredData.length > 0) {
        dispatch(setProducts(structuredData))
      } else {
        dispatch(setProducts(getLocalStorageFallbackData()))
      }
    } catch (error) {
      console.error("Failed to load catalog, using local sandbox fallback:", error)
      dispatch(setProducts(getLocalStorageFallbackData()))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!reduxFetched) {
      setTimeout(() => loadProductCatalog(), 0)
    } else {
      setTimeout(() => setLoading(false), 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduxFetched])

  useEffect(() => {
    if (urlCategory) {
      setTimeout(() => setSelectedCategory(urlCategory), 0)
    }
  }, [urlCategory])

  useEffect(() => {
    if (tagParam) {
      setTimeout(() => setSelectedTag(tagParam), 0)
    }
  }, [tagParam])

  // Synchronize search input with URL search parameter
  const searchParam = searchParams.get('search') || ''
  useEffect(() => {
    setTimeout(() => setSearchQuery(searchParam), 0)
  }, [searchParam])

  // Debounced search query analytics logging — baseFiltered ke baad hona chahiye

  let baseFiltered = products.filter(product => {
    // Category Filter
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory

    // Tag Filter
    const matchesTag = selectedTag === 'all' || (product.tag && product.tag.toUpperCase() === selectedTag.toUpperCase())

    return matchesCategory && matchesTag
  })

  // 2. Apply Fuzzy Search using Fuse.js (Amazon-style typo-tolerant engine)
  if (searchQuery.trim()) {
    const fuse = new Fuse(baseFiltered, {
      keys: [
        { name: 'name', weight: 0.6 },
        { name: 'category', weight: 0.2 },
        { name: 'tags', weight: 0.3 }, // Search keywords array
        { name: 'description', weight: 0.1 }
      ],
      threshold: 0.4, // Optimal balance for typo tolerance vs specificity
      distance: 100,
      ignoreLocation: true
    })
    
    // Fuzzy results
    let fuseResults = fuse.search(searchQuery.trim()).map(r => r.item)
    
    // Alphanumeric fallback normalization (ensures matches for custom spellings like 'tshrt' or 'tshirt')
    const normalize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const normQuery = normalize(searchQuery)
    
    let fallbackResults = baseFiltered.filter(product => {
      const matchName = normalize(product.name).includes(normQuery)
      const matchCategory = normalize(product.category).includes(normQuery)
      const matchTags = Array.isArray(product.tags) && product.tags.some(tag => normalize(tag).includes(normQuery))
      return matchName || matchCategory || matchTags
    })

    // 🧠 Smart E-commerce Semantics: If the user searches strictly for "shirt" or "shirts",
    // we want casual/formal shirts, NOT t-shirts! Exclude t-shirt categories for this specific query.
    const isSearchJustShirt = normQuery === 'shirt' || normQuery === 'shirts'
    if (isSearchJustShirt) {
      fuseResults = fuseResults.filter(p => !p.category?.toLowerCase().includes('tshirt'))
      fallbackResults = fallbackResults.filter(p => !p.category?.toLowerCase().includes('tshirt'))
    }

    // Merge uniquely, keeping fuzzy prioritized
    const merged = [...fuseResults]
    fallbackResults.forEach(item => {
      const exists = merged.some(m => (m.$id || m.id) === (item.$id || item.id))
      if (!exists) merged.push(item)
    })
    
    baseFiltered = merged
  }

  // 3. Sort Results
  const filteredProducts = baseFiltered.sort((a, b) => {
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

    const aOut = isOutOfStock(a);
    const bOut = isOutOfStock(b);

    if (aOut && !bOut) return 1;
    if (!aOut && bOut) return -1;

    if (sortBy === 'popularity') {
      return Number(b.total_sold || 0) - Number(a.total_sold || 0)
    }
    if (sortBy === 'price-low') {
      return Number(a.price) - Number(b.price)
    }
    if (sortBy === 'price-high') {
      return Number(b.price) - Number(a.price)
    }
    return new Date(b.$createdAt || '1970-01-01') - new Date(a.$createdAt || '1970-01-01')
  })

  // Debounced search analytics — declared after filteredProducts so length is accessible
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const delayDebounceFn = setTimeout(() => {
      productsService.logSearch(searchQuery, filteredProducts.length, user?.$id || 'GUEST')
        .catch(err => console.warn("Failed to log search analytics:", err));
    }, 1500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, filteredProducts.length, user]);

  // Get all unique categories from products
  const uniqueProductCategories = Array.from(
    new Set(products.map(p => p.category).filter(Boolean))
  )
  
  const defaultCategories = [
    { value: 'printed-tshirt', label: 'PRINTED T-SHIRTS' },
    { value: 'oversized-tshirt', label: 'OVERSIZED T-SHIRTS' },
    { value: 'shirts', label: 'SHIRTS' },
    { value: 'hoodies', label: 'HOODIES' },
  ]
  
  const categoriesList = [{ value: 'all', label: 'ALL PRODUCTS' }]
  
  defaultCategories.forEach(c => {
    if (!categoriesList.some(item => item.value === c.value)) {
      categoriesList.push(c)
    }
  })
  
  uniqueProductCategories.forEach(cat => {
    const value = cat.toLowerCase().trim()
    if (!categoriesList.some(item => item.value === value)) {
      const label = cat.replace(/-/g, ' ').toUpperCase()
      categoriesList.push({ value, label })
    }
  })

  return (
    <>
      <Navbar />
      
      <div className="w-full min-h-screen bg-white text-neutral-900 font-sans relative selection:bg-neutral-900 selection:text-white pb-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 relative z-20 space-y-10">
          
          {/* Headline Title */}
          <div className="text-center md:text-left space-y-2 border-b border-neutral-200/50 pb-6">
            <h4 className="text-xs tracking-[0.4em] text-[var(--theme-accent)] font-black uppercase">
              Streetwear Archives // HQ
            </h4>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase leading-none text-neutral-900">
              Shop Collection
            </h1>
          </div>

          {/* Filtering Controller Unit */}
          <div className="bg-white border border-neutral-950/10 p-6 rounded-none flex flex-col gap-6">
            {/* Category Select Tabs */}
            <div className="border-b border-neutral-950/10 flex flex-wrap gap-x-8 gap-y-2 pb-3">
              {categoriesList.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setSelectedCategory(c.value)}
                  className={`text-[10px] font-mono tracking-widest uppercase transition-all duration-300 pb-2 border-b-2 cursor-pointer ${
                    selectedCategory === c.value
                      ? 'border-neutral-950 text-neutral-950 font-bold'
                      : 'border-transparent text-neutral-400 hover:text-neutral-950'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Tags Select Pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'ALL TAGS' },
                { value: 'NEW DROP', label: 'NEW DROPS' },
                { value: 'BEST SELLER', label: 'BEST SELLERS' },
                { value: 'FEW LEFT', label: 'FEW LEFT' },
                { value: 'LIMITED ITEM', label: 'LIMITED ITEMS' }
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setSelectedTag(t.value)}
                  className={`text-[9px] font-mono tracking-wider uppercase px-3 py-1.5 border transition-all duration-200 cursor-pointer rounded-none ${
                    selectedTag === t.value
                      ? 'bg-neutral-950 text-white border-neutral-950'
                      : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-950 hover:text-neutral-950'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search & Sort Controls Row */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-end gap-5 pt-2">
              {/* Minimal Underline Search Input */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="SEARCH THE ARCHIVE..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-b border-neutral-300 focus:border-neutral-950 py-2.5 text-xs text-neutral-950 placeholder-neutral-400 outline-hidden tracking-widest font-mono uppercase transition-colors"
                />
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">SORT BY:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-neutral-950/15 text-[10px] font-mono font-bold tracking-wider uppercase px-3 py-2 outline-hidden cursor-pointer text-neutral-800 rounded-none hover:border-neutral-950"
                >
                  <option value="newest">NEWEST RELEASES</option>
                  <option value="popularity">POPULARITY</option>
                  <option value="price-low">PRICE: LOW TO HIGH</option>
                  <option value="price-high">PRICE: HIGH TO LOW</option>
                </select>
              </div>
            </div>
          </div>

          {/* Catalog Count Indicator */}
          <div className="flex justify-between items-center text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
            <span>SHOWING {filteredProducts.length} FITS</span>
            <span>CATALOG VOL. I</span>
          </div>

          {/* Page Loading State */}
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-16">
              {Array.from({ length: 8 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          )}

          {/* Empty Catalog View */}
          {!loading && filteredProducts.length === 0 && (
            <div className="w-full py-28 text-center bg-white border border-neutral-950/10">
              <p className="text-xs font-mono font-bold tracking-widest text-neutral-400 uppercase">
                NO STREETWEAR FIT MATCHES YOUR SEARCH CRITERIA.
              </p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSelectedTag('all'); }} 
                className="mt-4 text-[10px] font-mono font-bold tracking-widest bg-neutral-950 hover:bg-neutral-800 text-white px-5 py-3 rounded-none uppercase transition-all cursor-pointer"
              >
                RESET SEARCH FILTERS
              </button>
            </div>
          )}

          {/* Catalog Products Matrix Grid */}
          {!loading && filteredProducts.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-16">
              {filteredProducts.map((product) => {
                const uniqueId = product.$id || product.id
                const frontView = product.front_image_link || product.image_url || product.image || 'https://placehold.co/400x500?text=No+Front+View'
                const backView = product.back_image_links?.[0] || product.back_image_link || frontView
                const activeTag = product.tag || ""

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

                let swatches = [];
                if (product.color_hex) {
                  if (product.color_hex.startsWith('[')) {
                    try {
                      const parsed = JSON.parse(product.color_hex);
                      if (Array.isArray(parsed)) {
                        swatches = parsed; // Array of { name, hex, front, back }
                      }
                    } catch (err) {
                      console.warn("Failed to parse color_hex JSON in Shop:", err);
                    }
                  } else {
                    const hexParts = product.color_hex.split(',').map(s => s.trim());
                    const nameParts = (product.color_name || '').split(',').map(s => s.trim());
                    swatches = hexParts.map((hex, idx) => ({
                      hex,
                      name: nameParts[idx] || hex
                    })).filter(s => s.hex);
                  }
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
                        className="absolute top-4 right-4 z-30 bg-white border border-neutral-950/10 p-2.5 rounded-none hover:border-neutral-950 hover:bg-white transition-all duration-300 shadow-xs hover:shadow-sm cursor-pointer"
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
                          alt={`${product.name} alternate frame`}
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
                )
              })}
            </div>
          )}

        </div>
      </div>

      <Footer />
    </>
  )
}

export default Shop

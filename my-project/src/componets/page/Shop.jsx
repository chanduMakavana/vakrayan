import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ImSearch } from 'react-icons/im'
import { FiChevronDown } from 'react-icons/fi'
import { useDispatch, useSelector } from 'react-redux'
import productsService from '../../appwrite/products'
import Navbar from '../pageComponets/Navbar'
import Footer from '../pageComponets/Footer'
import { setProducts } from '../../features/productsSlice'
import Fuse from 'fuse.js'

function Shop() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { category: urlCategory } = useParams()
  const [searchParams] = useSearchParams()
  const tagParam = searchParams.get('tag') // supports ?tag=NEW+DROP

  const products = useSelector(state => state.products.items || [])
  const reduxFetched = useSelector(state => state.products.fetched)
  const [, setWishlistVersion] = useState(0)

  useEffect(() => {
    const handleUpdate = () => setWishlistVersion(v => v + 1)
    window.addEventListener('wishlist-updated', handleUpdate)
    return () => window.removeEventListener('wishlist-updated', handleUpdate)
  }, [])
  
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

  // 1. Pre-filter products by Category and Tag
  let baseFiltered = products.filter(product => {
    // Category Filter
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory

    // Tag Filter
    const productTags = Array.isArray(product.tags) ? product.tags : product.tag ? [product.tag] : []
    const matchesTag = selectedTag === 'all' || productTags.some(t => t.toUpperCase() === selectedTag.toUpperCase())

    return matchesCategory && matchesTag
  })

  // 2. Apply Fuzzy Search using Fuse.js (Amazon-style typo-tolerant engine)
  if (searchQuery.trim()) {
    const fuse = new Fuse(baseFiltered, {
      keys: [
        { name: 'name', weight: 0.6 },
        { name: 'category', weight: 0.3 },
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
      return normalize(product.name).includes(normQuery) || 
             normalize(product.category).includes(normQuery)
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
    if (sortBy === 'price-low') {
      return Number(a.price) - Number(b.price)
    }
    if (sortBy === 'price-high') {
      return Number(b.price) - Number(a.price)
    }
    // default: newest first (Appwrite createdAt order)
    return new Date(b.$createdAt || '1970-01-01') - new Date(a.$createdAt || '1970-01-01')
  })

  return (
    <>
      <Navbar />
      
      <div className="w-full min-h-screen bg-[#fafafb] text-neutral-900 font-sans relative selection:bg-neutral-900 selection:text-white pb-20 bg-[url(https://static.vecteezy.com/system/resources/previews/015/586/867/large_2x/overlay-distressed-concrete-texture-background-free-photo.jpg)] bg-cover bg-center">
        <div className="absolute inset-0 bg-white/96 backdrop-blur-xs z-10" />

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
          <div className="bg-white border border-neutral-200/60 p-6 rounded-2xl shadow-xl flex flex-col lg:flex-row gap-5 items-stretch lg:items-center justify-between">
            
            {/* Search Input Box */}
            <div className="relative flex-1 max-w-lg">
              <input
                type="text"
                placeholder="SEARCH FOR STYLES..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 focus:border-neutral-950 focus:bg-white rounded-xl pl-11 pr-4 py-3.5 text-xs text-neutral-900 placeholder-neutral-400 outline-hidden tracking-widest font-black uppercase transition-all"
              />
              <ImSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-sm" />
            </div>

            {/* Filter Docks */}
            <div className="flex flex-wrap gap-3 items-center">
              
              {/* Category Dropdown */}
              <div className="relative flex items-center bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 cursor-pointer hover:border-neutral-950 transition-colors">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent text-[10px] font-black tracking-wider uppercase pr-6 outline-hidden cursor-pointer text-neutral-800"
                >
                  <option value="all">ALL CATEGORIES</option>
                  <option value="printed-tshirt">PRINTED T-SHIRTS</option>
                  <option value="oversized-tshirt">OVERSIZED T-SHIRTS</option>
                  <option value="shirts">SHIRTS</option>
                  <option value="hoodies">HOODIES & SWEATSHIRTS</option>
                </select>
                <FiChevronDown className="absolute right-3 text-neutral-500 text-sm pointer-events-none" />
              </div>

              {/* Tag Selector */}
              <div className="relative flex items-center bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 cursor-pointer hover:border-neutral-950 transition-colors">
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="bg-transparent text-[10px] font-black tracking-wider uppercase pr-6 outline-hidden cursor-pointer text-neutral-800"
                >
                  <option value="all">ALL TAGS</option>
                  <option value="NEW DROP">NEW DROPS</option>
                  <option value="BEST SELLER">BEST SELLERS</option>
                  <option value="FEW LEFT">FEW LEFT</option>
                  <option value="LIMITED ITEM">LIMITED ITEMS</option>
                </select>
                <FiChevronDown className="absolute right-3 text-neutral-500 text-sm pointer-events-none" />
              </div>

              {/* Sort Dropdown */}
              <div className="relative flex items-center bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 cursor-pointer hover:border-neutral-950 transition-colors">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-[10px] font-black tracking-wider uppercase pr-6 outline-hidden cursor-pointer text-neutral-800"
                >
                  <option value="newest">NEWEST RELEASES</option>
                  <option value="price-low">PRICE: LOW TO HIGH</option>
                  <option value="price-high">PRICE: HIGH TO LOW</option>
                </select>
                <FiChevronDown className="absolute right-3 text-neutral-500 text-sm pointer-events-none" />
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
            <div className="w-full py-32 flex flex-col items-center justify-center gap-4 bg-white/50 rounded-2xl border border-neutral-200/50">
              <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
              <div className="text-[10px] tracking-[0.4em] font-black uppercase text-neutral-800">
                LOADING ARCHIVES // DOCKED...
              </div>
            </div>
          )}

          {/* Empty Catalog View */}
          {!loading && filteredProducts.length === 0 && (
            <div className="w-full py-28 text-center bg-white rounded-2xl border border-neutral-200/60 shadow-md">
              <p className="text-sm font-black tracking-widest text-neutral-500 uppercase">
                NO STREETWEAR FIT MATCHES YOUR SEARCH CRITERIA.
              </p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSelectedTag('all'); }} 
                className="mt-4 text-[10px] font-black tracking-widest bg-neutral-950 hover:bg-neutral-800 text-white px-5 py-3 rounded-lg uppercase shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                RESET SEARCH FILTERS
              </button>
            </div>
          )}

          {/* Catalog Products Matrix Grid */}
          {!loading && filteredProducts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
              {filteredProducts.map((product) => {
                const uniqueId = product.$id || product.id
                const frontView = product.front_image_link || product.image_url || product.image || 'https://placehold.co/400x500?text=No+Front+View'
                const backView = product.back_image_links?.[0] || product.back_image_link || frontView
                const activeTag = Array.isArray(product.tags) ? product.tags[0] : Array.isArray(product.tag) ? product.tag[0] : product.tag || "FRESH DROP"

                return (
                  <div 
                    key={uniqueId} 
                    onClick={() => navigate(`/product/${uniqueId}`)} 
                    className="group relative flex flex-col bg-white rounded-2xl p-2 border border-neutral-200/60 hover:border-neutral-900/20 hover:shadow-xl transition-all duration-500 cursor-pointer overflow-hidden"
                  >
                    {/* Hover glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[var(--theme-glow)] rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    {/* Image Canvas */}
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

                      {/* Active Tag Badge */}
                      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-xs border border-neutral-200/80 px-2.5 py-1 rounded-md shadow-xs group-hover:border-[var(--theme-primary)]/20 transition-colors duration-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-primary)] animate-pulse" />
                        <span className="text-neutral-800 font-black text-[9px] tracking-[0.15em] uppercase">
                          {activeTag}
                        </span>
                      </div>

                      {/* Image Flip */}
                      <div className="w-full h-full relative overflow-hidden">
                        <img
                          src={frontView}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-cover object-center absolute inset-0 transition-all cubic-bezier(0.4, 0, 0.2, 1) duration-700 group-hover:opacity-0 group-hover:scale-[1.04]"
                        />
                        <img  
                          src={backView}
                          alt={`${product.name} alternate frame`}
                          loading="lazy"
                          className="w-full h-full object-cover object-center absolute inset-0 transition-all cubic-bezier(0.4, 0, 0.2, 1) duration-700 opacity-0 group-hover:opacity-100 group-hover:scale-[1.04]"
                        />
                      </div>
                    </div>

                    {/* Metadata Content */}
                    <div className="mt-4 px-2 pb-2 flex flex-col justify-between grow relative z-20">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[9px] text-[var(--theme-primary)] font-black tracking-[0.25em] uppercase">
                            {product.category?.replace('-', ' ') || "HQ MERCH"}
                          </span>
                          <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider group-hover:text-neutral-600 transition-colors duration-300">
                            DROP VOL. I
                          </span>
                        </div>
                        
                        <h3 className="text-sm font-black tracking-wide text-neutral-800 uppercase group-hover:text-neutral-950 transition-colors truncate duration-300">
                          {product.name}
                        </h3>
                      </div>
                      
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
                        
                        <span className="text-[9px] font-black tracking-wider text-neutral-500 group-hover:text-[var(--theme-primary)] transition-colors duration-200 uppercase">
                          View Drop &rarr;
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

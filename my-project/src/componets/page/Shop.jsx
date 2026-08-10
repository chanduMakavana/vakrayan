import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import productsService from '../../services/products'
import wishlistService from '../../services/wishlist'
import Footer from '../pageComponets/Footer'
import ProductCardSkeleton from '../pageComponets/ProductCardSkeleton'
import { useDelayedLoading } from '../../hooks/useDelayedLoading'
import PageSkeleton from '../pageComponets/PageSkeleton'
import { setProducts } from '../../features/productsSlice'
import { addWishlistItemState, removeWishlistItemState } from '../../features/wishlistSlice'
import Fuse from 'fuse.js'
import { scatterProducts } from '../../utils/colorHelper'
import { getOptimizedImageUrl, preloadProductBatch, preloadImage } from '../../utils/imageOptimizer'

function Shop() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { category: urlCategory } = useParams()
  const [searchParams] = useSearchParams()
  const tagParam = searchParams.get('tag') // supports ?tag=NEW+DROP

  const products = useSelector(state => state.products.items || [])
  const offers = useSelector(state => state.products.offers || [])
  const wishlist = useSelector(state => state.wishlist || [])
  const { user, isAuthenticated, adminMode } = useSelector(state => state.auth)
  const reduxFetched = useSelector(state => state.products.fetched)

  // ✅ SEO: Dynamic page title — updates when category URL changes
  useEffect(() => {
    const label = urlCategory
      ? urlCategory.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : null
    document.title = label
      ? `${label} | Vakrayan`
      : 'Shop All Drops | Vakrayan'
  }, [urlCategory])

  
  const [loading, setLoading] = useState(!reduxFetched)
  const showSkeletons = useDelayedLoading(loading, 300)
  const [searchQuery, setSearchQuery] = useState('')
  const [tempSearch, setTempSearch] = useState('')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(urlCategory || 'all')
  const [selectedTag, setSelectedTag] = useState(tagParam || 'all')
  const [sortBy, setSortBy] = useState('newest') // newest | price-low | price-high

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [minPriceFilter, setMinPriceFilter] = useState(0)
  const [maxPriceFilter, setMaxPriceFilter] = useState(3000)
  const [selectedSizes, setSelectedSizes] = useState([])
  const [selectedColors, setSelectedColors] = useState([])
  const [inStockOnly, setInStockOnly] = useState(false)
  const [cols, setCols] = useState(4) // 2 | 3 | 4 columns on desktop
  const [mobileSortOpen, setMobileSortOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(12) // Pagination: show 12 at a time

  // Drawer Draft Filter States (Committed only when user clicks "Apply Filters")
  const [draftCategory, setDraftCategory] = useState(selectedCategory)
  const [draftTag, setDraftTag] = useState(selectedTag)
  const [draftMinPrice, setDraftMinPrice] = useState(minPriceFilter)
  const [draftMaxPrice, setDraftMaxPrice] = useState(maxPriceFilter)
  const [draftSizes, setDraftSizes] = useState(selectedSizes)
  const [draftColors, setDraftColors] = useState(selectedColors)
  const [draftInStock, setDraftInStock] = useState(inStockOnly)

  const openFilterDrawer = () => {
    setDraftCategory(selectedCategory)
    setDraftTag(selectedTag)
    setDraftMinPrice(minPriceFilter)
    setDraftMaxPrice(maxPriceFilter)
    setDraftSizes([...selectedSizes])
    setDraftColors([...selectedColors])
    setDraftInStock(inStockOnly)
    setFilterDrawerOpen(true)
  }

  const handleApplyDrawerFilters = () => {
    setSelectedCategory(draftCategory)
    setSelectedTag(draftTag)
    setMinPriceFilter(draftMinPrice)
    setMaxPriceFilter(draftMaxPrice)
    setSelectedSizes(draftSizes)
    setSelectedColors(draftColors)
    setInStockOnly(draftInStock)
    setFilterDrawerOpen(false)
  }

  const handleResetDrawerDrafts = () => {
    setDraftCategory('all')
    setDraftTag('all')
    setDraftMinPrice(0)
    setDraftMaxPrice(maxPriceLimit)
    setDraftSizes([])
    setDraftColors([])
    setDraftInStock(false)
  }

  const maxPriceLimit = products.length > 0 ? Math.ceil(Math.max(...products.map(p => Number(p.price || 0))) / 500) * 500 : 3000

  const availableColors = [
    { name: 'Black', hex: '#121212', darkText: false },
    { name: 'White', hex: '#FFFFFF', border: true, darkText: true },
    { name: 'Beige', hex: '#F5E6D3', border: true, darkText: true },
    { name: 'Cream', hex: '#FFFDD0', border: true, darkText: true },
    { name: 'Navy', hex: '#0F172A', darkText: false },
    { name: 'Blue', hex: '#2563EB', darkText: false },
    { name: 'Grey', hex: '#64748B', darkText: false },
    { name: 'Green', hex: '#059669', darkText: false },
    { name: 'Olive', hex: '#4B5320', darkText: false },
    { name: 'Brown', hex: '#5C3A21', darkText: false },
    { name: 'Maroon', hex: '#6B1D2F', darkText: false },
    { name: 'Red', hex: '#DC2626', darkText: false },
    { name: 'Purple', hex: '#7C3AED', darkText: false },
    { name: 'Lavender', hex: '#D8B4FE', darkText: true },
    { name: 'Pink', hex: '#F472B6', darkText: false },
    { name: 'Yellow', hex: '#FACC15', darkText: true }
  ]

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (selectedCategory !== 'all') count++
    if (selectedTag !== 'all') count++
    if (minPriceFilter > 0 || (maxPriceLimit > 0 && maxPriceFilter < maxPriceLimit)) count++
    if (selectedSizes.length > 0) count += selectedSizes.length
    if (selectedColors.length > 0) count += selectedColors.length
    if (inStockOnly) count++
    if (searchQuery.trim()) count++
    return count
  }, [selectedCategory, selectedTag, minPriceFilter, maxPriceFilter, maxPriceLimit, selectedSizes, selectedColors, inStockOnly, searchQuery])

  const handleResetAllFilters = () => {
    setSelectedCategory('all')
    setSelectedTag('all')
    setSearchQuery('')
    setTempSearch('')
    setMinPriceFilter(0)
    setMaxPriceFilter(maxPriceLimit)
    setSelectedSizes([])
    setSelectedColors([])
    setInStockOnly(false)
  }

  // Sync maxPriceFilter when products are loaded
  useEffect(() => {
    if (products.length > 0) {
      const highest = Math.max(...products.map(p => Number(p.price || 0)))
      if (highest > 0) setMaxPriceFilter(Math.ceil(highest / 500) * 500)
    }
  }, [products])

  const loadProductCatalog = async () => {
    try {
      setLoading(true)
      const response = await productsService.getProducts()
      const structuredData = response?.documents || response || []
      
      dispatch(setProducts(structuredData))
    } catch (error) {
      console.error("Failed to load catalog:", error)
      dispatch(setProducts([]))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!reduxFetched) {
      loadProductCatalog()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduxFetched])

  useEffect(() => {
    setSelectedCategory(urlCategory || 'all')
  }, [urlCategory])

  useEffect(() => {
    if (urlCategory) {
      const element = document.getElementById('shop-products-grid')
      if (element) {
        const t = setTimeout(() => {
          const yOffset = -100; // Offset for sticky navbar height + margin
          const y = element.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }, 150);
        return () => clearTimeout(t);
      }
    }
  }, [urlCategory])

  useEffect(() => {
    setSelectedTag(tagParam || 'all')
  }, [tagParam])

  // Synchronize search input with URL search parameter
  const searchParam = searchParams.get('search') || ''
  useEffect(() => {
    setSearchQuery(searchParam)
    setTempSearch(searchParam)
  }, [searchParam])

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('#shop-search-container')) {
        setSuggestionsOpen(false)
      }
    }
    if (suggestionsOpen) {
      document.addEventListener('mousedown', handler)
    }
    return () => document.removeEventListener('mousedown', handler)
  }, [suggestionsOpen])

  // Search suggestions (keywords and products matching tempSearch)
  const searchSuggestions = useMemo(() => {
    if (tempSearch.trim().length < 2) return { keywords: [], products: [] };
    const q = tempSearch.toLowerCase().trim();

    // 1. Filter products matching by name, category, tags, tag, or fit
    const matchedProducts = products.filter(p => {
      const nameMatch = p.name?.toLowerCase().includes(q);
      const categoryMatch = p.category?.toLowerCase().includes(q);
      const tagsMatch = Array.isArray(p.tags) && p.tags.some(t => t?.toLowerCase().includes(q));
      const singleTagMatch = p.tag?.toLowerCase().includes(q);
      const fitMatch = p.fit_type?.toLowerCase().includes(q);
      return nameMatch || categoryMatch || tagsMatch || singleTagMatch || fitMatch;
    });

    // 2. Extract unique matching keywords/tags/categories
    const keywordsSet = new Set();
    products.forEach(p => {
      if (p.category && p.category.toLowerCase().includes(q)) {
        keywordsSet.add(p.category.replace(/-/g, ' '));
      }
      if (Array.isArray(p.tags)) {
        p.tags.forEach(t => {
          if (t && t.toLowerCase().includes(q)) {
            keywordsSet.add(t);
          }
        });
      }
      if (p.tag && p.tag.toLowerCase().includes(q)) {
        keywordsSet.add(p.tag);
      }
      if (p.fit_type && p.fit_type.toLowerCase().includes(q)) {
        keywordsSet.add(p.fit_type);
      }
    });

    return {
      keywords: Array.from(keywordsSet).slice(0, 4),
      products: matchedProducts.slice(0, 6)
    };
  }, [tempSearch, products]);

  // ✅ PERFORMANCE FIX: Wrapped entire filter + search + sort pipeline in useMemo.
  // Previously ran on EVERY render (e.g. when filterDrawerOpen or mobileSortOpen changed).
  // Now only re-runs when actual filter data or criteria change.
  const filteredProducts = useMemo(() => {
    // 1. Base filter: category, tag, price, size, stock
    let baseFiltered = products.filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory

      const activeOfferMatch = offers.find(o =>
        (o.tag && selectedTag && o.tag.toLowerCase() === selectedTag.toLowerCase()) ||
        (o.$id && selectedTag && o.$id.toLowerCase() === selectedTag.toLowerCase()) ||
        (o.id && selectedTag && o.id.toLowerCase() === selectedTag.toLowerCase())
      );
      let matchesTag = selectedTag === 'all' ||
        (product.tag && product.tag.toUpperCase() === selectedTag.toUpperCase()) ||
        (Array.isArray(product.tags) && product.tags.some(t => t && t.toUpperCase() === selectedTag.toUpperCase()));

      if (activeOfferMatch) {
        const matchesId = Array.isArray(activeOfferMatch.productIds) && activeOfferMatch.productIds.includes(product.$id || product.id);
        const matchesCat = activeOfferMatch.category && product.category && product.category.toLowerCase() === activeOfferMatch.category.toLowerCase();
        const matchesOfferTag = activeOfferMatch.tag && Array.isArray(product.tags) && product.tags.some(t => t && t.toLowerCase() === activeOfferMatch.tag.toLowerCase());
        matchesTag = matchesId || matchesCat || matchesOfferTag;
      }

      const priceNum = Number(product.price || 0)
      const matchesPrice = priceNum >= minPriceFilter && priceNum <= maxPriceFilter

      let stocks = {};
      try { stocks = JSON.parse(product?.sizes_stock || '{}'); } catch { stocks = {}; }

      const matchesSize = selectedSizes.length === 0 || selectedSizes.some(sz => Number(stocks[sz] || 0) > 0);

      let isAllOutOfStock;
      if (product.sizes && product.sizes.length > 0) {
        const totalStock = product.sizes.reduce((acc, size) => acc + (stocks[size] !== undefined ? Number(stocks[size]) : 0), 0);
        isAllOutOfStock = totalStock === 0;
      } else {
        isAllOutOfStock = true;
      }
      const matchesStock = !inStockOnly || !isAllOutOfStock;

      const colorSynonyms = {
        'black': ['black', 'dark', 'nero'],
        'white': ['white', 'snow'],
        'cream': ['cream', 'off-white', 'offwhite', 'ivory', 'bone'],
        'beige': ['beige', 'tan', 'sand'],
        'navy': ['navy', 'dark blue'],
        'blue': ['blue', 'denim', 'sky', 'royal', 'cyan', 'indigo'],
        'grey': ['grey', 'gray', 'charcoal', 'slate', 'ash'],
        'green': ['green', 'emerald', 'sage', 'mint'],
        'olive': ['olive', 'khaki', 'army'],
        'brown': ['brown', 'chocolate', 'coffee'],
        'maroon': ['maroon', 'burgundy', 'wine'],
        'red': ['red', 'crimson', 'scarlet'],
        'purple': ['purple', 'violet'],
        'lavender': ['lavender', 'lilac'],
        'pink': ['pink', 'rose', 'magenta'],
        'yellow': ['yellow', 'mustard', 'gold'],
      }

      const matchesColor = selectedColors.length === 0 || selectedColors.some(colorName => {
        const cKey = colorName.toLowerCase();
        const targets = colorSynonyms[cKey] || [cKey];
        return targets.some(target => {
          return (product.color && product.color.toLowerCase().includes(target)) ||
                 (product.name && product.name.toLowerCase().includes(target)) ||
                 (Array.isArray(product.tags) && product.tags.some(t => t && t.toLowerCase().includes(target))) ||
                 (product.description && product.description.toLowerCase().includes(target));
        });
      });

      return matchesCategory && matchesTag && matchesPrice && matchesSize && matchesColor && matchesStock
    })

    // 2. Apply Fuzzy Search using Fuse.js
    if (searchQuery.trim()) {
      const fuse = new Fuse(baseFiltered, {
        keys: [
          { name: 'name', weight: 0.6 },
          { name: 'category', weight: 0.2 },
          { name: 'tags', weight: 0.3 },
          { name: 'description', weight: 0.1 }
        ],
        threshold: 0.4,
        distance: 100,
        ignoreLocation: true
      })

      let fuseResults = fuse.search(searchQuery.trim()).map(r => r.item)
      const normalize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const normQuery = normalize(searchQuery)

      let fallbackResults = baseFiltered.filter(product => {
        const matchName = normalize(product.name).includes(normQuery)
        const matchCategory = normalize(product.category).includes(normQuery)
        const matchTags = Array.isArray(product.tags) && product.tags.some(tag => normalize(tag).includes(normQuery))
        return matchName || matchCategory || matchTags
      })

      const isSearchJustShirt = normQuery === 'shirt' || normQuery === 'shirts'
      if (isSearchJustShirt) {
        fuseResults = fuseResults.filter(p => !p.category?.toLowerCase().includes('tshirt'))
        fallbackResults = fallbackResults.filter(p => !p.category?.toLowerCase().includes('tshirt'))
      }

      const merged = [...fuseResults]
      fallbackResults.forEach(item => {
        const exists = merged.some(m => (m.$id || m.id) === (item.$id || item.id))
        if (!exists) merged.push(item)
      })
      baseFiltered = merged
    }

    // 3. Sort Results
    return [...baseFiltered].sort((a, b) => {
      const isOutOfStock = (product) => {
        let stocks = {};
        try { stocks = JSON.parse(product?.sizes_stock || '{}'); } catch { stocks = {}; }
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
      if (sortBy === 'popularity') return Number(b.total_sold || 0) - Number(a.total_sold || 0)
      if (sortBy === 'price-low') return Number(a.price) - Number(b.price)
      if (sortBy === 'price-high') return Number(b.price) - Number(a.price)
      return 0;
    })
  }, [products, selectedCategory, selectedTag, offers, minPriceFilter, maxPriceFilter, selectedSizes, selectedColors, inStockOnly, searchQuery, sortBy])

  const drawerPreviewCount = useMemo(() => {
    if (!filterDrawerOpen) return filteredProducts.length
    return products.filter(product => {
      const matchesCategory = draftCategory === 'all' || product.category === draftCategory

      const activeOfferMatch = offers.find(o =>
        (o.tag && draftTag && o.tag.toLowerCase() === draftTag.toLowerCase()) ||
        (o.$id && draftTag && o.$id.toLowerCase() === draftTag.toLowerCase()) ||
        (o.id && draftTag && o.id.toLowerCase() === draftTag.toLowerCase())
      )
      let matchesTag = draftTag === 'all' ||
        (product.tag && product.tag.toUpperCase() === draftTag.toUpperCase()) ||
        (Array.isArray(product.tags) && product.tags.some(t => t && t.toUpperCase() === draftTag.toUpperCase()))
      if (activeOfferMatch) {
        const matchesId = Array.isArray(activeOfferMatch.productIds) && activeOfferMatch.productIds.includes(product.$id || product.id)
        const matchesCat = activeOfferMatch.category && product.category && product.category.toLowerCase() === activeOfferMatch.category.toLowerCase()
        const matchesOfferTag = activeOfferMatch.tag && Array.isArray(product.tags) && product.tags.some(t => t && t.toLowerCase() === activeOfferMatch.tag.toLowerCase())
        matchesTag = matchesId || matchesCat || matchesOfferTag
      }

      const priceNum = Number(product.price || 0)
      const matchesPrice = priceNum >= draftMinPrice && priceNum <= draftMaxPrice

      let stocks = {}
      try { stocks = JSON.parse(product?.sizes_stock || '{}') } catch { stocks = {} }
      const matchesSize = draftSizes.length === 0 || draftSizes.some(sz => Number(stocks[sz] || 0) > 0)

      let isAllOutOfStock
      if (product.sizes && product.sizes.length > 0) {
        const totalStock = product.sizes.reduce((acc, size) => acc + (stocks[size] !== undefined ? Number(stocks[size]) : 0), 0)
        isAllOutOfStock = totalStock === 0
      } else {
        isAllOutOfStock = true
      }
      const matchesStock = !draftInStock || !isAllOutOfStock

      const colorSynonyms = {
        'black': ['black', 'dark', 'nero'],
        'white': ['white', 'snow'],
        'cream': ['cream', 'off-white', 'offwhite', 'ivory', 'bone'],
        'beige': ['beige', 'tan', 'sand'],
        'navy': ['navy', 'dark blue'],
        'blue': ['blue', 'denim', 'sky', 'royal', 'cyan', 'indigo'],
        'grey': ['grey', 'gray', 'charcoal', 'slate', 'ash'],
        'green': ['green', 'emerald', 'sage', 'mint'],
        'olive': ['olive', 'khaki', 'army'],
        'brown': ['brown', 'chocolate', 'coffee'],
        'maroon': ['maroon', 'burgundy', 'wine'],
        'red': ['red', 'crimson', 'scarlet'],
        'purple': ['purple', 'violet'],
        'lavender': ['lavender', 'lilac'],
        'pink': ['pink', 'rose', 'magenta'],
        'yellow': ['yellow', 'mustard', 'gold'],
      }

      const matchesColor = draftColors.length === 0 || draftColors.some(colorName => {
        const cKey = colorName.toLowerCase()
        const targets = colorSynonyms[cKey] || [cKey]
        return targets.some(target => {
          return (product.color && product.color.toLowerCase().includes(target)) ||
                 (product.name && product.name.toLowerCase().includes(target)) ||
                 (Array.isArray(product.tags) && product.tags.some(t => t && t.toLowerCase().includes(target))) ||
                 (product.description && product.description.toLowerCase().includes(target))
        })
      })

      return matchesCategory && matchesTag && matchesPrice && matchesSize && matchesColor && matchesStock
    }).length
  }, [filterDrawerOpen, products, offers, draftCategory, draftTag, draftMinPrice, draftMaxPrice, draftSizes, draftColors, draftInStock, filteredProducts.length])

  const hasActiveFilters = 
    selectedCategory !== 'all' || 
    selectedTag !== 'all' || 
    searchQuery.trim() !== '' || 
    minPriceFilter > 0 || 
    (maxPriceLimit > 0 && maxPriceFilter < maxPriceLimit) || 
    selectedSizes.length > 0 || 
    selectedColors.length > 0 || 
    inStockOnly

  const gridClass = `grid grid-cols-2 gap-x-2 gap-y-4 sm:gap-x-4 sm:gap-y-8 ${
    cols === 2 
      ? 'md:grid-cols-2 lg:grid-cols-2 md:gap-x-12 md:gap-y-16' 
      : cols === 3 
        ? 'md:grid-cols-3 lg:grid-cols-3 md:gap-x-10 md:gap-y-16' 
        : 'md:grid-cols-4 lg:grid-cols-4 md:gap-x-8 md:gap-y-16'
  }`

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

  if (loading) {
    return showSkeletons ? <PageSkeleton /> : null
  }

  return (
    <>
      
      <div className="w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans relative selection:bg-[var(--color-accent)] selection:text-white pb-16">
        <div className="max-w-[1728px] mx-auto px-4 md:px-12 py-5 md:py-10 relative z-20 space-y-4 md:space-y-8">
          
          {/* Headline Title */}
          <div className="text-center md:text-left space-y-1 border-b border-[var(--color-border)] pb-3 md:pb-5">
            <h4 className="text-[10px] md:text-xs tracking-[0.4em] text-[var(--color-accent)] font-black uppercase">
              Vakrayan Archives // HQ
            </h4>
            <h1 className="text-3xl md:text-6xl font-black tracking-tight uppercase leading-none text-[var(--color-text)]">
              Shop Collection
            </h1>
          </div>

          {/* Explore Categories Banner */}
          <div
            onClick={() => {
              navigate('/?scroll=categories', { replace: true })
            }}
            className="group relative h-44 md:h-52 w-full rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-lg transition-all duration-300 border border-[var(--color-border)] bg-neutral-950"
          >
            {/* Background Image */}
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80"
              alt="Explore Categories Banner"
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 brightness-75"
            />
            {/* Heavy Dark Gradient Overlay for Maximum Text Contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/85 group-hover:from-black/80 group-hover:via-black/55 group-hover:to-black/80 transition-colors duration-300" />
            
            {/* Content Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
              <h2 className="text-white font-mono font-black text-sm md:text-xl tracking-[0.3em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-amber-400 transition-colors duration-300">
                🔍 EXPLORE ALL CATEGORIES
              </h2>
              <p className="text-[11px] md:text-sm font-bold text-neutral-100 uppercase tracking-widest leading-relaxed max-w-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                Browse our curated drops of Printed Tees, Oversized Fits, Shirts, Hoodies and more
              </p>
              <span className="text-[10px] md:text-xs font-mono bg-white text-black font-black uppercase tracking-widest mt-3 px-6 py-2.5 rounded-lg border border-white hover:bg-amber-400 hover:text-black hover:border-amber-400 transition-all duration-300 shadow-md">
                EXPLORE NOW &rarr;
              </span>
            </div>
          </div>

          {/* Mobile Quick Filters (Horizontal Scroll) */}
          <div className="flex lg:hidden overflow-x-auto gap-2.5 pb-2 pt-1 scrollbar-none snap-x items-center w-full">
            {[
              { value: 'all', label: 'All Fits' },
              { value: 'oversized-tshirt', label: 'Oversized' },
              { value: 'printed-tshirt', label: 'Printed' },
              { value: 'shirts', label: 'Shirts' },
              { value: 'hoodies', label: 'Hoodies' }
            ].map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`snap-start shrink-0 text-xs font-mono px-4 py-2 border transition-all rounded-xl shadow-xs font-bold uppercase cursor-pointer ${
                  selectedCategory === cat.value
                    ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
                }`}
              >
                {cat.label}
              </button>
            ))}
            <button
               onClick={openFilterDrawer}
               className="snap-start shrink-0 text-xs font-mono px-4 py-2 border rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/30 flex items-center gap-1.5 font-bold uppercase shadow-xs cursor-pointer"
            >
               Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''} ⚙️
            </button>
          </div>

          {/* Filtering Controller Unit (Desktop) */}
          <div className="hidden lg:flex bg-[var(--color-surface)]/40 backdrop-blur-md border border-[var(--color-border)] p-6 rounded-2xl flex-col gap-5 shadow-xs relative z-40">
            {/* Tags Select Pills Row */}
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono text-[var(--color-muted)] uppercase tracking-widest shrink-0 font-bold">DROPS:</span>
              <div className="flex flex-wrap gap-2 flex-1">
                {[
                  { value: 'all', label: 'ALL DROPS' },
                  { value: 'NEW DROP', label: 'NEW DROPS' },
                  { value: 'BEST SELLER', label: 'BEST SELLERS' },
                  { value: 'FEW LEFT', label: 'FEW LEFT' },
                  { value: 'LIMITED ITEM', label: 'LIMITED ITEMS' }
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setSelectedTag(t.value)}
                    className={`text-[9px] font-mono tracking-wider uppercase px-3.5 py-1.5 border transition-all duration-200 cursor-pointer rounded-lg ${
                      selectedTag === t.value
                        ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-xs font-bold'
                        : 'bg-[var(--color-surface)]/40 text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search & Sort Controls Row */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-end gap-5 pt-2">
              {/* Minimal Underline Search Input & Filter Toggle */}
              <div className="flex items-end gap-4 flex-1 max-w-xl">
                <div id="shop-search-container" className="relative flex-1 z-50">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="SEARCH THE ARCHIVE..."
                      value={tempSearch}
                      onChange={(e) => {
                        setTempSearch(e.target.value)
                        setSuggestionsOpen(true)
                      }}
                      onFocus={() => setSuggestionsOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setSearchQuery(tempSearch)
                          setSuggestionsOpen(false)
                        }
                      }}
                      className="w-full bg-transparent border-b border-[var(--color-border)] focus:border-[var(--color-accent)] py-2.5 pr-8 text-xs text-[var(--color-text)] placeholder-[var(--color-muted)]/50 outline-hidden tracking-widest font-mono uppercase transition-colors"
                    />
                    <button
                      onClick={() => {
                        setSearchQuery(tempSearch)
                        setSuggestionsOpen(false)
                      }}
                      className="absolute right-0 bottom-2.5 text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                      </svg>
                    </button>
                  </div>

                  {/* Suggestions Dropdown */}
                  <AnimatePresence>
                    {suggestionsOpen && (searchSuggestions.keywords.length > 0 || searchSuggestions.products.length > 0) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 right-0 border border-[var(--color-border)] rounded-2xl overflow-hidden z-[100] mt-2 p-4 space-y-4 shadow-xl"
                        style={{
                          background: 'var(--glass-bg-heavy)',
                          backdropFilter: 'blur(24px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                        }}
                      >
                        {/* Suggested Keywords / Tags Section */}
                        {searchSuggestions.keywords.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[9px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest block">
                              🏷️ Suggested Searches
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {searchSuggestions.keywords.map(keyword => (
                                <button
                                  key={keyword}
                                  type="button"
                                  onClick={() => {
                                    setTempSearch(keyword)
                                    setSearchQuery(keyword)
                                    setSuggestionsOpen(false)
                                  }}
                                  className="bg-[var(--color-subtle)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-sans font-bold text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-md cursor-pointer transition-colors border border-[var(--color-border)]"
                                >
                                  {keyword}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Matching Products Section */}
                        {searchSuggestions.products.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[9px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-widest block">
                              👕 Matching Products
                            </span>
                            <div className="divide-y divide-[var(--color-border)]/50">
                              {searchSuggestions.products.map(p => {
                                const img = p.front_image_link || p.image_url || p.image || 'https://placehold.co/80x100'
                                return (
                                  <button
                                    key={p.$id || p.id}
                                    type="button"
                                    onClick={() => {
                                      navigate(`/product/${p.slug || p.$id || p.id}`)
                                      setSuggestionsOpen(false)
                                    }}
                                    className="w-full flex items-center gap-3 py-2.5 hover:bg-[var(--color-bg)] transition-all text-left border-b border-zinc-50/10 last:border-0 first:pt-0"
                                  >
                                    <img src={img} alt={p.name} className="w-8 h-10 object-cover rounded-md bg-[var(--color-subtle)] shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-semibold text-[var(--color-text)] truncate">{p.name}</p>
                                      <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider">{p.category?.replace(/-/g, ' ')}</p>
                                    </div>
                                    <span className="text-[11px] font-bold text-[var(--color-text)] shrink-0">
                                      ₹{Number(p.price).toLocaleString('en-IN')}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  onClick={openFilterDrawer}
                  className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-mono text-[10px] tracking-widest uppercase px-4.5 py-2.5 flex items-center gap-1.5 transition-all select-none cursor-pointer rounded-xl shadow-xs relative"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>FILTERS{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
                </button>
              </div>

              {/* Sort & Grid Layout Controls */}
              <div className="flex flex-wrap items-center gap-6">
                {/* Grid Column Selector (Desktop Only) */}
                <div className="hidden lg:flex items-center gap-2.5">
                  <span className="text-[10px] font-mono text-[var(--color-muted)] uppercase tracking-widest font-bold">VIEW:</span>
                  <div className="flex border border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-xs rounded-xl overflow-hidden p-0.5 gap-0.5">
                    {[2, 3, 4].map((n) => (
                      <button
                        key={n}
                        onClick={() => setCols(n)}
                        className={`text-[9.5px] font-mono font-bold px-3 py-1 rounded-lg cursor-pointer transition-all ${
                          cols === n ? 'bg-[var(--color-accent)] text-white shadow-xs' : 'text-[var(--color-muted)] hover:text-[var(--color-text)] bg-transparent'
                        }`}
                      >
                        {n} COL
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[var(--color-muted)] uppercase tracking-widest">SORT BY:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-[var(--color-surface)]/40 backdrop-blur-xs border border-[var(--color-border)] text-[10px] font-mono font-bold tracking-wider uppercase px-3 py-2 outline-hidden cursor-pointer text-[var(--color-text)] rounded-lg hover:border-[var(--color-accent)] transition-all"
                  >
                    <option value="newest">NEWEST RELEASES</option>
                    <option value="popularity">POPULARITY</option>
                    <option value="price-low">PRICE: LOW TO HIGH</option>
                    <option value="price-high">PRICE: HIGH TO LOW</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 bg-[var(--color-surface)]/30 backdrop-blur-md p-2.5 md:p-3.5 rounded-xl md:rounded-2xl border border-white/20 shadow-xs">
              <span className="text-[9px] font-mono text-[var(--color-muted)] uppercase tracking-widest mr-1">ACTIVE:</span>
              
              {selectedCategory !== 'all' && (
                <div className="flex items-center gap-1 bg-[var(--color-surface)]/80 backdrop-blur-xs px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--color-text)] border border-[var(--color-border)] rounded-lg shadow-2xs">
                  <span>CAT: {selectedCategory.replace('-', ' ')}</span>
                  <button 
                    onClick={() => setSelectedCategory('all')}
                    className="hover:text-rose-600 cursor-pointer font-black ml-1.5"
                  >
                    ✕
                  </button>
                </div>
              )}

              {selectedTag !== 'all' && (
                <div className="flex items-center gap-1 bg-[var(--color-surface)]/80 backdrop-blur-xs px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--color-text)] border border-[var(--color-border)] rounded-lg shadow-2xs">
                  <span>TAG: {selectedTag}</span>
                  <button 
                    onClick={() => setSelectedTag('all')}
                    className="hover:text-rose-600 cursor-pointer font-black ml-1.5"
                  >
                    ✕
                  </button>
                </div>
              )}

              {searchQuery.trim() !== '' && (
                <div className="flex items-center gap-1 bg-[var(--color-surface)]/80 backdrop-blur-xs px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--color-text)] border border-[var(--color-border)] rounded-lg shadow-2xs">
                  <span>SEARCH: "{searchQuery}"</span>
                  <button 
                    onClick={() => { setSearchQuery(''); setTempSearch(''); }}
                    className="hover:text-rose-600 cursor-pointer font-black ml-1.5"
                  >
                    ✕
                  </button>
                </div>
              )}

              {(minPriceFilter > 0 || (maxPriceLimit > 0 && maxPriceFilter < maxPriceLimit)) && (
                <div className="flex items-center gap-1 bg-[var(--color-surface)]/80 backdrop-blur-xs px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--color-text)] border border-[var(--color-border)] rounded-lg shadow-2xs">
                  <span>PRICE: ₹{minPriceFilter} - ₹{maxPriceFilter}</span>
                  <button 
                    onClick={() => { setMinPriceFilter(0); setMaxPriceFilter(maxPriceLimit); }}
                    className="hover:text-rose-600 cursor-pointer font-black ml-1.5"
                  >
                    ✕
                  </button>
                </div>
              )}

              {selectedSizes.map(size => (
                <div key={size} className="flex items-center gap-1 bg-[var(--color-surface)]/80 backdrop-blur-xs px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--color-text)] border border-[var(--color-border)] rounded-lg shadow-2xs">
                  <span>SIZE: {size}</span>
                  <button 
                    onClick={() => setSelectedSizes(selectedSizes.filter(s => s !== size))}
                    className="hover:text-rose-600 cursor-pointer font-black ml-1.5"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {selectedColors.map(color => (
                <div key={color} className="flex items-center gap-1 bg-[var(--color-surface)]/80 backdrop-blur-xs px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--color-text)] border border-[var(--color-border)] rounded-lg shadow-2xs">
                  <span>COLOR: {color}</span>
                  <button 
                    onClick={() => setSelectedColors(selectedColors.filter(c => c !== color))}
                    className="hover:text-rose-600 cursor-pointer font-black ml-1.5"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {inStockOnly && (
                <div className="flex items-center gap-1 bg-[var(--color-surface)]/80 backdrop-blur-xs px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--color-text)] border border-[var(--color-border)] rounded-lg shadow-2xs">
                  <span>IN STOCK</span>
                  <button 
                    onClick={() => setInStockOnly(false)}
                    className="hover:text-rose-600 cursor-pointer font-black ml-1.5"
                  >
                    ✕
                  </button>
                </div>
              )}

              <button
                onClick={handleResetAllFilters}
                className="text-[9px] font-mono font-bold text-rose-600 hover:text-rose-800 uppercase tracking-widest ml-3 border-b border-rose-200 hover:border-rose-800 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Mobile Sticky Action Bar */}
          <div className="sticky top-[80px] left-0 right-0 z-40 bg-[var(--color-bg)] border-y border-[var(--color-border)] lg:hidden shadow-[0_4px_12px_rgba(0,0,0,0.06)] mb-4">
            <div className="flex h-12 relative items-center">
              <button 
                onClick={() => setMobileSortOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 active:bg-[var(--color-subtle)] transition-colors cursor-pointer py-1"
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <svg className="w-4 h-4 text-[var(--color-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                  </div>
                  <div className="flex flex-col items-start leading-none mt-0.5">
                    <span className="font-bold text-[12px] text-[var(--color-text)] uppercase tracking-wider">Sort</span>
                    <span className="text-[9px] text-[var(--color-muted)]">{sortBy === 'newest' ? 'Newest' : sortBy === 'popularity' ? 'Popularity' : sortBy === 'price-low' ? 'Price: Low' : 'Price: High'}</span>
                  </div>
                </div>
              </button>
              
              <div className="w-[1px] h-6 bg-[var(--color-border)] absolute left-1/2 top-1/2 -translate-y-1/2" />

              <button 
                onClick={openFilterDrawer}
                className="flex-1 flex items-center justify-center gap-2 active:bg-[var(--color-subtle)] transition-colors cursor-pointer py-1"
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-muted)]"></span>
                    <svg className="w-4 h-4 text-[var(--color-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  </div>
                  <div className="flex flex-col items-start leading-none mt-0.5">
                    <span className="font-bold text-[12px] text-[var(--color-text)] uppercase tracking-wider">Filter</span>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Catalog Count Indicator */}
          <div id="shop-products-grid" className="flex justify-between items-center text-[10px] font-mono tracking-widest text-[var(--color-muted)] uppercase">
            <span>SHOWING {Math.min(visibleCount, filteredProducts.length)} OF {filteredProducts.length} FITS</span>
            <span>CATALOG VOL. I</span>
          </div>

          {/* Page Loading State */}
          {showSkeletons && (
            <div className={gridClass}>
              {Array.from({ length: 8 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          )}

          {/* Empty Catalog View */}
          {!loading && filteredProducts.length === 0 && (
            <div className="w-full py-28 text-center bg-[var(--color-surface)] border border-neutral-950/10">
              <p className="text-xs font-mono font-bold tracking-widest text-[var(--color-muted)] uppercase">
                NO VAKRAYAN FIT MATCHES YOUR SEARCH CRITERIA.
              </p>
              <button 
                onClick={handleResetAllFilters} 
                className="mt-4 text-[10px] font-mono font-bold tracking-widest bg-neutral-950 hover:bg-neutral-800 text-white px-5 py-3 rounded-none uppercase transition-all cursor-pointer"
              >
                RESET SEARCH FILTERS
              </button>
            </div>
          )}

          {/* Catalog Products Matrix Grid */}
          {(() => {
            const allDisplayProducts = (sortBy !== 'price-low' && sortBy !== 'price-high')
              ? scatterProducts(filteredProducts)
              : filteredProducts;
            const displayProducts = allDisplayProducts.slice(0, visibleCount);
            const hasMore = visibleCount < allDisplayProducts.length;

            return !loading && allDisplayProducts.length > 0 && (
              <>
                <div className={gridClass}>
                  {displayProducts.map((product) => {
                    const parentId = product.$id || product.id;
                    const uniqueId = parentId;
                    const frontView = product.front_image_link || product.image_url || product.image || 'https://placehold.co/400x500?text=No+Front+View';
                    const backView = product.back_image_links?.[0] || product.back_image_link || frontView;
                    const clickPath = `/product/${product.slug || parentId}`;
                    const activeTag = product.tag || (product.category === 'oversized-tshirt' ? 'OVERSIZED FIT' : "");
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
                        onClick={() => navigate(clickPath)} 
                        className="group relative flex flex-col bg-white border border-emerald-900/15 hover:border-emerald-600 transition-all duration-300 shadow-xs hover:shadow-md cursor-pointer rounded-none overflow-hidden"
                      >
                        {/* Image Aspect Ratio Canvas */}
                        <div className="w-full aspect-[3/4] overflow-hidden bg-[#F0F7F3] relative transition-transform duration-700 ease-out border-b border-emerald-900/15">
                          
                          {/* Floating Heart Button */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const exists = wishlist.some(item => item.$id === parentId || item.id === parentId);
                              let updated;
                              if (exists) {
                                dispatch(removeWishlistItemState(parentId));
                                const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
                                updated = saved.filter(item => item.$id !== parentId && item.id !== parentId);
                                localStorage.setItem('wishlist', JSON.stringify(updated));
                                if (isAuthenticated && user) {
                                  try {
                                    await wishlistService.removeFromWishlist(user.$id, parentId);
                                  } catch (err) {
                                    console.warn("⚠️ Firebase wishlist cloud sync failed:", err.message);
                                  }
                                }
                              } else {
                                 dispatch(addWishlistItemState(product));
                                 const saved = JSON.parse(localStorage.getItem('wishlist')) || [];
                                 updated = [...saved, product];
                                localStorage.setItem('wishlist', JSON.stringify(updated));
                                if (isAuthenticated && user) {
                                  try {
                                    await wishlistService.addToWishlist(user.$id, parentId);
                                  } catch (err) {
                                    console.warn("⚠️ Firebase wishlist cloud sync failed:", err.message);
                                  }
                                }
                              }
                            }}
                            aria-label={wishlist.some(item => item.$id === parentId || item.id === parentId) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                            className={`absolute top-3 right-3 z-30 w-8 h-8 flex items-center justify-center cursor-pointer transition-all duration-200 border rounded-none shadow-xs ${
                              wishlist.some(item => item.$id === parentId || item.id === parentId)
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white/95 border-emerald-900/20 text-emerald-800 hover:bg-emerald-600 hover:text-white hover:border-emerald-600'
                            }`}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill={wishlist.some(item => item.$id === parentId || item.id === parentId) ? '#fff' : 'none'} stroke="currentColor" strokeWidth="2">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                          </button>
  
                          {/* Edit Button for Admin Mode */}
                          {adminMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/admin', { state: { editProductId: parentId } });
                              }}
                              className="absolute bottom-3 left-3 z-30 px-3 py-1.5 cursor-pointer transition-all duration-200 text-white font-mono font-bold text-[10px] uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800 rounded-none border-none shadow-xs"
                            >
                              Edit
                            </button>
                          )}
  
                          {activeTag && (
                            <div className="absolute top-3 left-3 z-20 px-2.5 py-1 bg-emerald-700 text-white rounded-none shadow-xs">
                              <span className="text-[10px] font-mono font-bold tracking-widest uppercase">
                                {activeTag}
                              </span>
                            </div>
                          )}
  
                          {/* Out of Stock Overlay */}
                          {isAllOutOfStock && (
                            <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-xs z-10 flex items-center justify-center pointer-events-none">
                              <span className="px-3.5 py-1.5 bg-white border border-emerald-900/20 font-mono text-[10px] font-black tracking-widest uppercase text-emerald-950 rounded-none shadow-xs">
                                SOLD OUT
                              </span>
                            </div>
                          )}
  
                          {/* Image Flip */}
                          <div className={`w-full h-full relative ${isAllOutOfStock ? 'grayscale-[30%] opacity-60' : ''}`} onMouseEnter={() => preloadImage(getOptimizedImageUrl(backView, 600, 75))}>
                            <img
                              src={getOptimizedImageUrl(frontView, 600, 75)}
                              alt={product.name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover object-center absolute inset-0 transition-image-flip group-hover:opacity-0"
                            />
                            <img  
                              src={getOptimizedImageUrl(backView, 600, 75)}
                              alt={`${product.name} alternate frame`}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover object-center absolute inset-0 transition-image-flip opacity-0 group-hover:opacity-100"
                            />
                          </div>
                        </div>
  
                        {/* Metadata Content */}
                        <div className="p-3.5 flex flex-col justify-between flex-1 bg-white">
                          <div>
                            <p className="text-[10px] font-mono font-bold tracking-widest uppercase text-emerald-700 mb-1">
                              {product.category?.replace('-', ' ') || "HQ MERCH"}
                            </p>
                            <h3 className="text-xs font-black tracking-wide text-[#0D1A14] uppercase truncate mb-3 font-sans">
                              {product.name}
                            </h3>
                          </div>
                         
                          <div className="flex items-baseline justify-between gap-2 pt-2.5 border-t border-emerald-900/15">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-sm font-black text-[#0D1A14] font-sans">
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
                                  <span className="text-[11px] text-[#527060] line-through font-sans">
                                    ₹{compareDisplay.toLocaleString('en-IN')}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-700">
                              INCL. TAXES
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              {/* ── Load More Button ── */}
              {hasMore && (
                <div className="flex flex-col items-center gap-3 pt-8 pb-4">
                  <p className="text-[10px] font-mono text-[var(--color-muted)] uppercase tracking-widest">
                    Showing {displayProducts.length} of {allDisplayProducts.length} products
                  </p>
                  <button
                    onClick={() => setVisibleCount(prev => prev + 12)}
                    className="flex items-center gap-2 px-8 py-3.5 font-mono text-[11px] font-bold tracking-widest uppercase transition-all duration-200 cursor-pointer rounded-xl"
                    style={{
                      background: 'var(--color-accent)',
                      color: '#fff',
                      border: '1.5px solid var(--color-accent)',
                      boxShadow: '0 4px 16px rgba(5,150,105,0.25)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 5v14M5 12l7 7 7-7"/>
                    </svg>
                    Load More ({allDisplayProducts.length - displayProducts.length} remaining)
                  </button>
                </div>
              )}
              </>
            );
          })()}


        </div>
      </div>

      {/* Sidebar Filter Drawer */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ease-in-out ${filterDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setFilterDrawerOpen(false)}></div>
        
        {/* Drawer Content */}
        <div className={`absolute top-0 left-0 h-full w-full sm:w-[380px] bg-[var(--color-bg)]/95 backdrop-blur-2xl border-r border-[var(--color-border)] shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${filterDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Header */}
          <div className="p-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]/60 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-mono font-black uppercase tracking-[0.2em] text-[var(--color-text)]">
                ⚙️ FILTERS
              </h3>
              {activeFilterCount > 0 && (
                <span className="bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                  {activeFilterCount} Active
                </span>
              )}
            </div>
            <button 
              onClick={() => setFilterDrawerOpen(false)}
              className="text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs font-mono font-bold uppercase"
            >
              ✕ CLOSE
            </button>
          </div>

          {/* Drawer Body (Scrollable filters) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Category Filter */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest block font-mono">
                CATEGORY
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { value: 'all', label: 'All Categories' },
                  { value: 'oversized-tshirt', label: 'Oversized Tees' },
                  { value: 'printed-tshirt', label: 'Printed Tees' },
                  { value: 'shirts', label: 'Shirts' },
                  { value: 'hoodies', label: 'Hoodies' }
                ].map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setDraftCategory(cat.value)}
                    className={`text-[9.5px] font-mono font-bold px-3.5 py-2 border transition-all duration-200 cursor-pointer rounded-xl uppercase ${
                      draftCategory === cat.value
                        ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-xs'
                        : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-accent)]/60'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Swatch Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest block font-mono">
                  FILTER BY COLOR
                </label>
                {draftColors.length > 0 && (
                  <button 
                    onClick={() => setDraftColors([])} 
                    className="text-[9px] font-mono text-rose-600 font-bold hover:underline uppercase cursor-pointer"
                  >
                    Clear ({draftColors.length})
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {availableColors.map((col) => {
                  const isSelected = draftColors.includes(col.name);
                  return (
                    <button
                      key={col.name}
                      onClick={() => {
                        if (isSelected) {
                          setDraftColors(draftColors.filter(c => c !== col.name));
                        } else {
                          setDraftColors([...draftColors, col.name]);
                        }
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/12 text-[var(--color-accent)] shadow-xs font-bold'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-accent)]/50'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                          col.border ? 'border border-neutral-400/60' : 'border border-black/15 shadow-2xs'
                        } ${isSelected ? 'scale-110' : ''}`}
                        style={{ backgroundColor: col.hex }}
                      >
                        {isSelected && (
                          <svg className={`w-3 h-3 ${col.darkText ? 'text-black' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className={`text-[10px] font-mono uppercase tracking-wider truncate flex-1 text-left ${isSelected ? 'text-[var(--color-accent)] font-bold' : 'text-[var(--color-text)] font-semibold'}`}>
                        {col.name}
                      </span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest block font-mono">
                PRICE RANGE
              </label>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2 pt-0.5">
                {[
                  { label: 'All Prices', min: 0, max: maxPriceLimit },
                  { label: 'Under ₹999', min: 0, max: 999 },
                  { label: '₹1000 - ₹1999', min: 1000, max: 1999 },
                  { label: '₹2000+', min: 2000, max: maxPriceLimit }
                ].map(preset => {
                  const isActive = draftMinPrice === preset.min && draftMaxPrice === preset.max;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setDraftMinPrice(preset.min);
                        setDraftMaxPrice(preset.max);
                      }}
                      className={`text-[9px] font-mono font-bold px-2.5 py-1.5 border transition-all rounded-lg cursor-pointer ${
                        isActive
                          ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-xs'
                          : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-accent)]/60'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              
              {/* Display Range & Input Boxes */}
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 space-y-1">
                  <span className="text-[9px] font-mono text-[var(--color-muted)] block uppercase font-bold">MIN PRICE</span>
                  <div className="flex items-center border border-[var(--color-border)] px-2.5 py-1.5 bg-[var(--color-surface)] rounded-xl focus-within:border-[var(--color-accent)]">
                    <span className="text-xs font-mono font-bold text-[var(--color-muted)] mr-1">₹</span>
                    <input
                      type="number"
                      min="0"
                      max={maxPriceLimit}
                      value={draftMinPrice}
                      onChange={(e) => {
                        const val = Math.min(Number(e.target.value || 0), draftMaxPrice);
                        setDraftMinPrice(val);
                      }}
                      className="w-full bg-transparent outline-hidden text-xs font-mono font-bold text-[var(--color-text)] border-none p-0"
                    />
                  </div>
                </div>
                
                <div className="text-[var(--color-muted)] font-bold self-end pb-2.5 font-mono text-xs">TO</div>

                <div className="flex-1 space-y-1">
                  <span className="text-[9px] font-mono text-[var(--color-muted)] block uppercase font-bold">MAX PRICE</span>
                  <div className="flex items-center border border-[var(--color-border)] px-2.5 py-1.5 bg-[var(--color-surface)] rounded-xl focus-within:border-[var(--color-accent)]">
                    <span className="text-xs font-mono font-bold text-[var(--color-muted)] mr-1">₹</span>
                    <input
                      type="number"
                      min="0"
                      max={maxPriceLimit}
                      value={draftMaxPrice}
                      onChange={(e) => {
                        const val = Math.max(Number(e.target.value || 0), draftMinPrice);
                        setDraftMaxPrice(val);
                      }}
                      className="w-full bg-transparent outline-hidden text-xs font-mono font-bold text-[var(--color-text)] border-none p-0"
                    />
                  </div>
                </div>
              </div>

              {/* Sliders container */}
              <div className="space-y-3 pt-1">
                {/* Min Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono text-[var(--color-muted)] uppercase font-bold">
                    <span>Min Limit</span>
                    <span className="text-[var(--color-text)]">₹{draftMinPrice}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={maxPriceLimit}
                    step="50"
                    value={draftMinPrice}
                    onChange={(e) => {
                      const val = Math.min(Number(e.target.value), draftMaxPrice);
                      setDraftMinPrice(val);
                    }}
                    className="w-full accent-[var(--color-accent)] cursor-pointer h-1.5 bg-[var(--color-subtle)] appearance-none rounded-lg"
                  />
                </div>

                {/* Max Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono text-[var(--color-muted)] uppercase font-bold">
                    <span>Max Limit</span>
                    <span className="text-[var(--color-text)]">₹{draftMaxPrice}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={maxPriceLimit}
                    step="50"
                    value={draftMaxPrice}
                    onChange={(e) => {
                      const val = Math.max(Number(e.target.value), draftMinPrice);
                      setDraftMaxPrice(val);
                    }}
                    className="w-full accent-[var(--color-accent)] cursor-pointer h-1.5 bg-[var(--color-subtle)] appearance-none rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Size Filter */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest block font-mono">
                SELECT SIZES
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => {
                  const isSelected = draftSizes.includes(size);
                  return (
                    <button
                      key={size}
                      onClick={() => {
                        if (isSelected) {
                          setDraftSizes(draftSizes.filter(s => s !== size));
                        } else {
                          setDraftSizes([...draftSizes, size]);
                        }
                      }}
                      className={`text-[9.5px] font-mono font-bold px-3.5 py-2 border transition-all duration-200 cursor-pointer rounded-xl ${
                        isSelected
                          ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-xs'
                          : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-accent)]/60'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* In Stock Availability Filter */}
            <div className="space-y-3 pt-2">
              <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest block font-mono">
                AVAILABILITY
              </label>
              <button
                type="button"
                onClick={() => setDraftInStock(!draftInStock)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/50 transition-all cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${draftInStock ? 'bg-[var(--color-accent)] animate-pulse' : 'bg-neutral-400'}`} />
                  <span className="text-xs font-mono font-bold tracking-wider text-[var(--color-text)] uppercase">
                    SHOW IN-STOCK ONLY
                  </span>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors p-0.5 relative ${draftInStock ? 'bg-[var(--color-accent)]' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${draftInStock ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>
          </div>

          {/* Drawer Footer (Sticky Actions) */}
          <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-xl shadow-lg space-y-3">
            <button
              onClick={handleApplyDrawerFilters}
              className="w-full py-3.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-[11px] font-mono font-bold uppercase tracking-[0.15em] rounded-xl text-center transition-all cursor-pointer shadow-md active:scale-[0.99]"
            >
              Apply Filters ({drawerPreviewCount} Results)
            </button>
            <button
              onClick={handleResetDrawerDrafts}
              className="w-full py-3 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-subtle)] text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[var(--color-text)] rounded-xl text-center transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>



      {/* Mobile Sort Bottom Sheet Modal */}
      {mobileSortOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileSortOpen(false)} />
          <div className="w-full bg-white rounded-t-2xl p-6 relative animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-neutral-900 uppercase tracking-widest">Sort By</h3>
              <button onClick={() => setMobileSortOpen(false)} className="text-neutral-500 hover:text-neutral-900 cursor-pointer">✕</button>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { value: 'newest', label: 'Newest Releases' },
                { value: 'popularity', label: 'Popularity' },
                { value: 'price-low', label: 'Price: Low to High' },
                { value: 'price-high', label: 'Price: High to Low' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSortBy(opt.value); setMobileSortOpen(false); }}
                  className={`flex justify-between items-center py-2 text-sm uppercase tracking-widest font-mono cursor-pointer ${sortBy === opt.value ? 'text-blue-600 font-bold' : 'text-neutral-600'}`}
                >
                  {opt.label}
                  {sortBy === opt.value && <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}

export default Shop

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiArrowLeft, FiStar, FiFilter, FiTrendingDown, FiTrendingUp, FiCalendar, FiCheckCircle } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import productsService from '../../appwrite/products';
import reviewsService from '../../appwrite/reviews';
import { useToast } from '../../context/ToastContext';
import Footer from '../pageComponets/Footer';

function ProductReviews() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter and Sort states
  const [ratingFilter, setRatingFilter] = useState('ALL'); // 'ALL', '5', '4', '3', '2', '1'
  const [sortBy, setSortBy] = useState('NEWEST'); // 'NEWEST', 'HIGHEST_RATING', 'LOWEST_RATING'
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [activeReviewImage, setActiveReviewImage] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    async function loadData() {
      try {
        setLoading(true);
        // Load product details
        const productData = await productsService.getProductBySlugOrId(idOrSlug);
        if (productData) {
          setProduct(productData);
          
          // Load reviews
          const productId = productData.$id || productData.id;
          const productReviews = await reviewsService.getReviewsByProductId(productId);
          setReviews(productReviews || []);
        } else {
          showToast("Product not found.", "error");
          navigate('/shop');
        }
      } catch (err) {
        console.error("Failed to load reviews page data:", err);
        showToast("Error loading reviews.", "error");
        navigate('/shop');
      } finally {
        setLoading(false);
      }
    }

    if (idOrSlug) {
      loadData();
    }
  }, [idOrSlug, navigate, showToast]);

  // Calculations for reviews stats
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return {
        average: 5.0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const average = (sum / total).toFixed(1);

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      const ratingVal = Math.round(Number(r.rating)) || 5;
      if (distribution[ratingVal] !== undefined) {
        distribution[ratingVal] += 1;
      }
    });

    const percentages = {};
    [5, 4, 3, 2, 1].forEach(star => {
      percentages[star] = Math.round((distribution[star] / total) * 100);
    });

    return { average, distribution, percentages };
  }, [reviews]);

  // Filtered and sorted reviews
  const processedReviews = useMemo(() => {
    let result = [...reviews];

    // Apply rating filter
    if (ratingFilter !== 'ALL') {
      const filterStars = parseInt(ratingFilter, 10);
      result = result.filter(r => Math.round(Number(r.rating)) === filterStars);
    }

    // Apply verified only filter
    if (verifiedOnly) {
      result = result.filter(r => {
        let isVerified = !!r.is_verified_purchase;
        try {
          const parsed = JSON.parse(r.comment);
          if (parsed && typeof parsed === 'object' && parsed.is_verified_purchase !== undefined) {
            isVerified = !!parsed.is_verified_purchase;
          }
        } catch {
          // ignore
        }
        return isVerified;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      const ratingA = Number(a.rating) || 5;
      const ratingB = Number(b.rating) || 5;
      const dateA = new Date(a.$createdAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.$createdAt || b.createdAt || 0).getTime();

      if (sortBy === 'NEWEST') {
        return dateB - dateA;
      } else if (sortBy === 'HIGHEST_RATING') {
        if (ratingB !== ratingA) return ratingB - ratingA;
        return dateB - dateA; // secondary sort
      } else if (sortBy === 'LOWEST_RATING') {
        if (ratingA !== ratingB) return ratingA - ratingB;
        return dateB - dateA; // secondary sort
      }
      return 0;
    });

    return result;
  }, [reviews, ratingFilter, sortBy, verifiedOnly]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center gap-4">
        <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        <div className="text-[10px] tracking-[0.5em] text-[var(--color-text)] font-black uppercase">
          Loading Product Reviews...
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <>
      <div className="w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans relative pb-20">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-10 space-y-8 relative z-20">
          
          {/* Header Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]/40">
            <Link 
              to={`/product/${product.$id || product.id || idOrSlug}`} 
              className="inline-flex items-center gap-2 text-xs font-black tracking-widest text-[var(--color-muted)] hover:text-neutral-950 transition-colors uppercase group"
            >
              <FiArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
              Back to Product
            </Link>
            <div className="text-[9px] tracking-[0.3em] font-mono text-[var(--color-muted)] uppercase">
              REVIEWS & RATINGS INDEX
            </div>
          </div>

          {/* Flipkart-Style Structured Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Product Info & Ratings Summary Panel */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Product Card */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-5 rounded-2xl shadow-sm flex items-center gap-4">
                <img 
                  src={product.front_image_link || product.image_url || product.image} 
                  alt={product.name} 
                  className="w-16 h-20 object-cover border border-[var(--color-border)] rounded-lg bg-[var(--color-subtle)]"
                />
                <div className="space-y-1 min-w-0">
                  <span className="text-[8px] font-mono font-bold tracking-widest text-[var(--color-muted)] block uppercase">CURRENT FIT DETAILS</span>
                  <h2 className="font-display font-black text-lg text-neutral-950 uppercase tracking-wide truncate leading-tight">
                    {product.name}
                  </h2>
                  <p className="text-xs font-black text-[var(--color-accent)] font-mono">
                    ₹{Number(product.price).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Star Statistics Panel */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl shadow-sm space-y-6">
                <div>
                  <h3 className="text-xs font-black tracking-widest text-[var(--color-muted)] uppercase block mb-3">
                    Ratings Overview
                  </h3>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-neutral-950 tracking-tight font-display">
                      {stats.average}
                    </span>
                    <div className="space-y-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FaStar
                            key={star}
                            className={`text-xs ${star <= Math.round(Number(stats.average)) ? 'text-amber-400' : 'text-neutral-200'}`}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] font-mono text-[var(--color-muted)] block font-bold uppercase tracking-wider">
                        Based on {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating Distribution Bars */}
                <div className="space-y-2.5 pt-2 border-t border-[var(--color-border)]">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-3 text-xs font-mono select-none">
                      <button 
                        onClick={() => setRatingFilter(ratingFilter === String(star) ? 'ALL' : String(star))}
                        className={`flex items-center gap-1 hover:text-[var(--color-accent)] transition-colors shrink-0 text-left min-w-[40px] font-bold ${ratingFilter === String(star) ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}
                      >
                        {star} <FiStar className="text-[10px] inline mb-0.5 fill-amber-400 stroke-amber-400" />
                      </button>
                      <div className="flex-1 h-2 bg-[var(--color-subtle)] rounded-full overflow-hidden border border-[var(--color-border)]/50">
                        <div 
                          className="h-full bg-amber-400 transition-all duration-500 rounded-full" 
                          style={{ width: `${stats.percentages[star]}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[var(--color-muted)] font-bold text-right min-w-[32px]">
                        {stats.percentages[star]}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Filter Menu & Reviews List */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Filter / Sort Control Toolbar */}
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 sm:p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <FiFilter className="text-[var(--color-muted)] text-sm" />
                    <span className="text-xs font-mono font-bold tracking-widest text-[var(--color-muted)] uppercase">
                      Filter & Sort
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={verifiedOnly}
                        onChange={() => {
                          setVerifiedOnly(!verifiedOnly);
                          setVisibleCount(10);
                        }}
                        className="rounded border-[var(--color-border)] accent-[var(--color-accent)] cursor-pointer"
                      />
                      <span className="text-[10px] font-mono font-bold text-[var(--color-text)] uppercase tracking-wider">
                        Verified Buyers Only
                      </span>
                    </label>
                  </div>
                </div>

                {/* Rating Filter Pills */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--color-border)]/50">
                  <button
                    onClick={() => { setRatingFilter('ALL'); setVisibleCount(10); }}
                    className={`px-3 py-1.5 rounded-lg font-mono text-[9px] font-bold tracking-widest uppercase border transition-all cursor-pointer ${
                      ratingFilter === 'ALL'
                        ? 'bg-neutral-950 text-white border-neutral-950'
                        : 'bg-transparent text-[var(--color-muted)] border-[var(--color-border)] hover:border-neutral-900 hover:text-neutral-900'
                    }`}
                  >
                    All Ratings
                  </button>
                  {[5, 4, 3, 2, 1].map((star) => (
                    <button
                      key={star}
                      onClick={() => { setRatingFilter(String(star)); setVisibleCount(10); }}
                      className={`px-3 py-1.5 rounded-lg font-mono text-[9px] font-bold tracking-widest uppercase border transition-all cursor-pointer flex items-center gap-1 ${
                        ratingFilter === String(star)
                          ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]'
                          : 'bg-transparent text-[var(--color-muted)] border-[var(--color-border)] hover:border-neutral-900 hover:text-neutral-900'
                      }`}
                    >
                      {star} ★
                    </button>
                  ))}
                </div>

                {/* Sorting Selectors */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--color-border)]/50 items-center justify-between text-xs">
                  <span className="text-[10px] font-mono font-bold text-[var(--color-muted)] uppercase tracking-wider">Sort by:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'NEWEST', label: 'Most Recent', icon: <FiCalendar /> },
                      { key: 'HIGHEST_RATING', label: 'Highest Rating', icon: <FiTrendingUp /> },
                      { key: 'LOWEST_RATING', label: 'Lowest Rating', icon: <FiTrendingDown /> }
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => { setSortBy(opt.key); setVisibleCount(10); }}
                        className={`px-3 py-1.5 rounded-lg font-sans text-[9px] font-bold tracking-widest uppercase border transition-all cursor-pointer flex items-center gap-1.5 ${
                          sortBy === opt.key
                            ? 'bg-neutral-950 text-white border-neutral-950'
                            : 'bg-transparent text-[var(--color-muted)] border-[var(--color-border)] hover:border-neutral-900 hover:text-neutral-900'
                        }`}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reviews List */}
              {processedReviews.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)]/50">
                  <p className="text-xs text-[var(--color-muted)] font-mono font-bold uppercase tracking-wider">
                    No reviews match the selected filter parameters.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {processedReviews.slice(0, visibleCount).map((rev) => {
                    const uniqueId = rev.$id || rev.id;
                    const formattedDate = new Date(rev.$createdAt || '1970-01-01').toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });

                    let titleText = rev.title || "";
                    let commentText = rev.comment || "";
                    let imagesList = [];
                    let verifiedPurchase = !!rev.is_verified_purchase;
                    let fitPreference = "";
                    let comfortRating = 0;
                    let qualityRating = 0;
                    let breathableRating = 0;

                    try {
                      const parsed = JSON.parse(rev.comment);
                      if (parsed && typeof parsed === 'object') {
                        titleText = parsed.title || rev.title || "";
                        commentText = parsed.comment || "";
                        imagesList = parsed.images || [];
                        if (parsed.is_verified_purchase !== undefined) {
                          verifiedPurchase = !!parsed.is_verified_purchase;
                        }
                        fitPreference = parsed.fit || "";
                        comfortRating = Number(parsed.comfort) || 0;
                        qualityRating = Number(parsed.quality) || 0;
                        breathableRating = Number(parsed.breathable) || 0;
                      }
                    } catch (e) {
                      commentText = rev.comment || "";
                      if (rev.images) {
                        try {
                          imagesList = JSON.parse(rev.images);
                        } catch {
                          imagesList = typeof rev.images === 'string' ? rev.images.split(',').filter(Boolean) : (Array.isArray(rev.images) ? rev.images : []);
                        }
                      }
                    }

                    return (
                      <div key={uniqueId} className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-2xl space-y-4 shadow-sm hover:border-[var(--color-accent)] transition-all duration-300">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono text-[var(--color-muted)] block font-bold">
                              {formattedDate}
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-[var(--color-text)] uppercase font-sans">
                                {rev.userName}
                              </span>
                              {verifiedPurchase && (
                                <span className="inline-flex items-center text-[8px] text-emerald-700 font-mono font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 tracking-widest uppercase">
                                  ✓ Verified Buyer
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <FaStar
                                key={star}
                                className={`text-[10px] ${star <= (isNaN(Number(rev.rating)) ? 5 : Number(rev.rating)) ? 'text-amber-400' : 'text-neutral-200'}`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {titleText && (
                            <h4 className="text-xs font-mono font-bold text-[var(--color-text)] uppercase tracking-wide">
                              &ldquo;{titleText}&rdquo;
                            </h4>
                          )}

                          <p className="text-xs text-[var(--color-text)]/90 leading-relaxed font-sans whitespace-pre-wrap pl-0.5">
                            {commentText}
                          </p>
                        </div>

                        {imagesList && imagesList.length > 0 && (
                          <div className="flex flex-wrap gap-2.5 pt-1">
                            {imagesList.map((img, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveReviewImage(img)}
                                className="group relative w-20 h-20 overflow-hidden rounded-xl border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-zoom-in shadow-xs bg-[var(--color-surface)]/20"
                              >
                                <img
                                  src={img}
                                  alt={`Customer image ${idx + 1}`}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md text-xs font-mono">🔍</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {processedReviews.length > visibleCount && (
                    <button
                      type="button"
                      onClick={() => setVisibleCount(prev => prev + 15)}
                      className="w-full mt-4 py-3.5 bg-neutral-950 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[var(--color-accent)] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      Load More Reviews (+15)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Review Image Modal */}
      {activeReviewImage && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/85 backdrop-blur-xs transition-opacity" 
            onClick={() => setActiveReviewImage(null)}
          />
          <div className="relative z-[160] max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl bg-neutral-950 border border-neutral-800">
            <button 
              onClick={() => setActiveReviewImage(null)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 text-white text-lg hover:bg-black/60 transition-colors border border-white/10 z-10 cursor-pointer"
            >
              ×
            </button>
            <img 
              src={activeReviewImage} 
              alt="Expanded Review" 
              className="max-w-full max-h-[85vh] object-contain select-none"
            />
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}

export default ProductReviews;

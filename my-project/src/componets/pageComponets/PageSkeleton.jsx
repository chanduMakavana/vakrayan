import React from 'react'
import ProductCardSkeleton from './ProductCardSkeleton'

function PageSkeleton({ path: propPath }) {
  const path = propPath || window.location.pathname

  // 1. Product Detail Page Skeleton
  if (path.startsWith('/product/')) {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 min-h-[80vh] select-none">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16">
          {/* Left: Image skeleton */}
          <div className="aspect-[4/5] md:aspect-[3/4] w-full rounded-2xl skeleton" />

          {/* Right: Info skeleton */}
          <div className="flex flex-col gap-6 pt-4">
            <div className="h-4 w-28 rounded skeleton" />
            <div className="h-10 w-4/5 rounded-lg skeleton" />
            <div className="h-6 w-32 rounded skeleton" />
            
            <div className="h-[1px] bg-neutral-200/50 w-full my-2" />

            <div className="flex flex-col gap-3">
              <div className="h-4 w-20 rounded skeleton" />
              <div className="flex gap-2">
                <div className="h-10 w-12 rounded-lg skeleton" />
                <div className="h-10 w-12 rounded-lg skeleton" />
                <div className="h-10 w-12 rounded-lg skeleton" />
                <div className="h-10 w-12 rounded-lg skeleton" />
              </div>
            </div>

            <div className="h-12 w-full rounded-xl skeleton mt-4" />
            <div className="h-12 w-full rounded-xl skeleton" />

            <div className="flex flex-col gap-4 mt-6">
              <div className="h-4 w-full rounded skeleton" />
              <div className="h-4 w-5/6 rounded skeleton" />
              <div className="h-4 w-4/5 rounded skeleton" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 2. Cart Page Skeleton
  if (path === '/cart') {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 min-h-[80vh] select-none">
        <div className="h-10 w-48 rounded-lg skeleton mb-10" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: Cart Items List */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 p-4 border border-neutral-100 rounded-xl">
                <div className="w-20 h-24 rounded-lg skeleton flex-shrink-0" />
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div className="flex flex-col gap-2">
                    <div className="h-5 w-2/3 rounded skeleton" />
                    <div className="h-4 w-24 rounded skeleton" />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="h-8 w-24 rounded skeleton" />
                    <div className="h-6 w-16 rounded skeleton" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Order Summary */}
          <div className="h-[320px] rounded-2xl border border-neutral-100 p-6 flex flex-col gap-6">
            <div className="h-6 w-1/2 rounded skeleton" />
            <div className="flex flex-col gap-4">
              <div className="flex justify-between">
                <div className="h-4 w-20 rounded skeleton" />
                <div className="h-4 w-12 rounded skeleton" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-24 rounded skeleton" />
                <div className="h-4 w-12 rounded skeleton" />
              </div>
              <div className="h-[1px] bg-neutral-200/50 my-1" />
              <div className="flex justify-between">
                <div className="h-6 w-16 rounded skeleton" />
                <div className="h-6 w-20 rounded skeleton" />
              </div>
            </div>
            <div className="h-12 w-full rounded-xl skeleton mt-auto" />
          </div>
        </div>
      </div>
    )
  }

  // 3. Home Page Skeleton (matches Hero, Marquee, Bestseller, Categories, PromoBanner)
  if (path === '/') {
    return (
      <div className="w-full select-none" style={{ background: 'var(--color-bg)' }}>
        {/* 1. Hero Slider Skeleton */}
        <div 
          className="w-full relative overflow-hidden" 
          style={{ height: 'clamp(300px, 70vh, 90vh)', background: 'linear-gradient(135deg, #0D1A14 0%, #071A10 100%)' }}
        >
          {/* Skeleton blobs */}
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full animate-pulse" style={{ background: '#059669', filter: 'blur(80px)', opacity: 0.08 }} />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full animate-pulse" style={{ background: '#34D399', filter: 'blur(60px)', opacity: 0.06 }} />
          
          {/* Subtle Shimmer Overlay on background */}
          <div className="absolute inset-0 skeleton-dark pointer-events-none" style={{ opacity: 0.15 }} />

          {/* Left: Slide navigation arrow */}
          <div 
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
          />

          {/* Right: Slide navigation arrow */}
          <div 
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
          />

          {/* Bottom hero content overlay */}
          <div className="absolute bottom-0 left-0 right-0 z-20 px-6 md:px-14 pb-10 md:pb-14 flex justify-between items-end">
            {/* Brand badge on bottom-left */}
            <div
              className="inline-flex items-center gap-3 px-4 py-2.5 animate-pulse"
              style={{
                background: 'rgba(244,250,247,0.08)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', opacity: 0.6, boxShadow: '0 0 8px #34D399' }} />
              <div className="h-4 w-16 skeleton-dark" style={{ opacity: 0.8 }} />
              <div className="h-3.5 w-20 skeleton-dark" style={{ opacity: 0.4 }} />
            </div>
          </div>

          {/* Indicator pills at bottom center */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            <div
              style={{
                height: 6,
                width: 28,
                borderRadius: 99,
                background: '#059669',
                opacity: 0.7
              }}
            />
            <div
              style={{
                height: 6,
                width: 6,
                borderRadius: 99,
                background: 'rgba(255,255,255,0.30)'
              }}
            />
          </div>
        </div>

        {/* 2. Promo Marquee Skeleton */}
        <div className="w-full h-[38px] skeleton border-y border-neutral-100/50" />

        {/* 3. Best Sellers Section Skeleton */}
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-16 border-b border-neutral-100/30">
          <div className="mb-12">
            <div className="w-12 h-1 mb-3 rounded skeleton" />
            <div className="h-4 w-24 rounded skeleton mb-3" />
            <div className="h-8 w-60 rounded-lg skeleton" />
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* 4. Category Grid Section Skeleton */}
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-16 border-b border-neutral-100/30">
          <div className="mb-12 flex flex-col items-center text-center">
            <div className="w-12 h-1 mb-3 rounded skeleton" />
            <div className="h-4 w-32 rounded skeleton mb-3" />
            <div className="h-8 w-64 rounded-lg skeleton" />
          </div>

          {/* Circular/Box Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-4">
                <div className="w-full aspect-square rounded-2xl skeleton" />
                <div className="h-5 w-24 rounded skeleton" />
              </div>
            ))}
          </div>
        </div>

        {/* 5. Promo Banner Section Skeleton */}
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-16">
          <div className="w-full aspect-[21/9] md:aspect-[3.2/1] rounded-2xl skeleton" />
        </div>
      </div>
    )
  }

  // 4. Catalog / Grid Pages (Shop, Category)
  if (path.startsWith('/shop') || path.startsWith('/category')) {
    return (
      <div className="w-full bg-[var(--color-bg)] pb-20 select-none">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 relative z-20 space-y-10">
          
          {/* Headline Title Skeleton */}
          <div className="text-center md:text-left space-y-4 border-b border-[var(--color-border)] pb-6">
            <div className="h-3 w-40 rounded skeleton mx-auto md:mx-0" />
            <div className="h-10 w-64 rounded-lg skeleton mx-auto md:mx-0" />
          </div>

          {/* Explore Categories Banner Skeleton */}
          <div className="w-full h-44 md:h-52 rounded-2xl skeleton" />

          {/* Catalog Count Indicator Placeholder */}
          <div className="flex justify-between items-center text-[10px] font-mono tracking-widest text-[var(--color-muted)] uppercase pt-4">
            <div className="h-4 w-32 rounded skeleton" />
            <div className="h-4 w-28 rounded skeleton" />
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-x-4 gap-y-10">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 4. Default / Generic Page Skeleton (for LegalPage, UserProfile, Checkout, Admin)
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 min-h-[80vh] select-none flex flex-col gap-8">
      <div className="h-10 w-2/3 rounded-lg skeleton" />
      <div className="flex flex-col gap-4 mt-4">
        <div className="h-4 w-full rounded skeleton" />
        <div className="h-4 w-full rounded skeleton" />
        <div className="h-4 w-5/6 rounded skeleton" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-6 w-1/3 rounded skeleton" />
        <div className="h-4 w-full rounded skeleton" />
        <div className="h-4 w-full rounded skeleton" />
        <div className="h-4 w-4/5 rounded skeleton" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-6 w-1/4 rounded skeleton" />
        <div className="h-4 w-full rounded skeleton" />
        <div className="h-4 w-5/6 rounded skeleton" />
      </div>
    </div>
  )
}

export default PageSkeleton

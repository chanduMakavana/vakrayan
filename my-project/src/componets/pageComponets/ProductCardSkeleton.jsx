/**
 * ProductCardSkeleton — A premium pulsing placeholder skeleton matching
 * the vakrayan product card design.
 */
const ProductCardSkeleton = () => {
  return (
    <div className="flex flex-col bg-transparent animate-pulse pb-4 border-b border-transparent">
      <div className="w-full">
        {/* Aspect-ratio bounding container for image skeleton */}
        <div className="w-full aspect-[3/4] bg-neutral-100 relative overflow-hidden rounded-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-200/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        </div>

        {/* Brand / Label skeleton */}
        <div className="mt-5 px-1 space-y-3">
          <div className="h-2 bg-neutral-100 w-1/4 rounded" />
          {/* Title skeleton */}
          <div className="h-3 bg-neutral-100 w-3/4 rounded" />
        </div>
      </div>

      <div className="mt-3 px-1 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
        {/* Price skeleton */}
        <div className="h-4 bg-neutral-100 w-1/3 rounded" />
        {/* CTA skeleton */}
        <div className="h-3 w-8 bg-neutral-100 rounded" />
      </div>
    </div>
  );
};  

export default ProductCardSkeleton;

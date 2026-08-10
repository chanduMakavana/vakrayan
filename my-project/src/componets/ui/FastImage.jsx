import { useState, useEffect } from 'react';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';

/**
 * FastImage Component
 * High-performance image component with compression, eager/lazy loading, 
 * shimmer skeleton loading state, and error handling.
 */
export default function FastImage({
  src,
  alt = '',
  width = 600,
  quality = 75,
  priority = false,
  className = '',
  style = {},
  onLoad,
  onError,
  ...props
}) {
  const optimizedSrc = getOptimizedImageUrl(src, width, quality);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-emerald-950/5 ${className}`} style={style}>
      {/* Shimmer skeleton loader until image finishes loading */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/5 via-emerald-900/10 to-emerald-900/5 animate-pulse z-0" />
      )}

      <img
        src={hasError ? 'https://placehold.co/600x800?text=Vakrayan' : optimizedSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...(priority ? { fetchpriority: 'high' } : {})}
        onLoad={(e) => {
          setIsLoaded(true);
          if (onLoad) onLoad(e);
        }}
        onError={(e) => {
          setHasError(true);
          setIsLoaded(true);
          if (onError) onError(e);
        }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...props}
      />
    </div>
  );
}

import { useState } from 'react';
import { getOptimizedImageUrl, DEFAULT_FALLBACK_IMAGE } from '../../utils/imageOptimizer';

/**
 * FastImage Component
 * High-performance image component with compression, eager/lazy loading, 
 * shimmer skeleton loading state, aspect ratio bounds, and fallback error handling.
 */
export default function FastImage({
  src,
  alt = 'Vakrayan apparel',
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
  const [loadedSrc, setLoadedSrc] = useState('');
  const [hasError, setHasError] = useState(false);
  const isLoaded = loadedSrc === optimizedSrc;

  const displayAlt = alt && alt.trim() ? alt : 'Vakrayan streetwear apparel';

  return (
    <div className={`relative overflow-hidden bg-neutral-900/5 ${className}`} style={style}>
      {/* Shimmer skeleton loader until image finishes loading */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-800/10 via-neutral-700/15 to-neutral-800/10 animate-pulse z-0" />
      )}

      <img
        src={hasError ? DEFAULT_FALLBACK_IMAGE : optimizedSrc}
        alt={displayAlt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...(priority ? { fetchPriority: 'high' } : {})}
        onLoad={(e) => {
          setLoadedSrc(optimizedSrc);
          if (onLoad) onLoad(e);
        }}
        onError={(e) => {
          setHasError(true);
          setLoadedSrc(optimizedSrc);
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

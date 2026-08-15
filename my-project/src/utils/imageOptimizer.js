/**
 * Ultra-Fast Image Optimization & Memory Preloading Utility
 * Formats image URLs with WebP compression and preloads images into browser cache.
 */

// Memory cache to track already preloaded image URLs
const preloadedUrls = new Set();

/**
 * Automatically rewrites legacy Cloudflare worker URLs to the active subdomain
 * @param {string} url
 * @returns {string}
 */
export function fixLegacyWorkerUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('chandumakavana61.workers.dev')) {
    return url.replace(/b2-upload-gateway\.chandumakavana61\.workers\.dev/g, 'b2-upload-gateway.vakrayan.workers.dev')
              .replace(/vakrayan-data\.chandumakavana61\.workers\.dev/g, 'b2-upload-gateway.vakrayan.workers.dev')
              .replace(/chandumakavana61\.workers\.dev/g, 'vakrayan.workers.dev');
  }
  return url;
}

/**
 * Transforms raw image URLs (Unsplash, Cloudinary, Backblaze, etc.) into compressed, high-performance WebP URLs
 * @param {string} url - Raw image URL
 * @param {number} width - Target display width in pixels
 * @param {number} quality - Compression quality (default 75)
 * @returns {string} Optimized image URL
 */
export function getOptimizedImageUrl(url, width = 600, quality = 75) {
  if (!url || typeof url !== 'string') return 'https://placehold.co/600x800?text=No+Image';

  // Fix old worker domain to new active domain seamlessly
  url = fixLegacyWorkerUrl(url);

  // Optimization for Unsplash CDN
  if (url.includes('images.unsplash.com')) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('auto', 'format,compress');
      urlObj.searchParams.set('fit', 'crop');
      urlObj.searchParams.set('w', String(width));
      urlObj.searchParams.set('q', String(quality));
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  // Optimization for Cloudinary CDN
  if (url.includes('res.cloudinary.com') && !url.includes('f_auto')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
  }

  return url;
}

/**
 * Preloads an image URL asynchronously into browser memory cache
 * @param {string} url - Image URL to preload
 * @param {boolean} highPriority - Whether to use high fetch priority
 */
export function preloadImage(url, highPriority = false) {
  if (!url || preloadedUrls.has(url)) return;

  preloadedUrls.add(url);
  const img = new window.Image();
  if (highPriority && 'fetchPriority' in img) {
    img.fetchPriority = 'high';
  }
  img.src = url;
}

/**
 * Preloads a batch of product front and back images for instant display on scroll & hover
 * @param {Array} products - Array of product objects
 * @param {number} limit - Number of top products to preload (default 6)
 */
export function preloadProductBatch(products = [], limit = 6) {
  if (!Array.isArray(products) || products.length === 0) return;

  const topProducts = products.slice(0, limit);
  topProducts.forEach((p, idx) => {
    const isPriority = idx < 2; // First 2 items get high priority
    const front = getOptimizedImageUrl(p.front_image_link || p.image_url || p.image, 600, 75);
    const back = getOptimizedImageUrl(p.back_image_link || p.back_image || front, 600, 75);

    preloadImage(front, isPriority);
    if (back && back !== front) {
      // Slightly delayed back image preloading so front images load first
      setTimeout(() => preloadImage(back, false), 150);
    }
  });
}

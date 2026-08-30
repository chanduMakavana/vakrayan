/**
 * Ultra-Fast Image Optimization & Memory Preloading Utility
 * Formats image URLs with WebP compression and preloads images into browser cache.
 */

// Memory cache to track already preloaded image URLs
const preloadedUrls = new Set();

export const DEFAULT_FALLBACK_IMAGE = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='800' viewBox='0 0 600 800'%3E%3Crect width='100%25' height='100%25' fill='%23121212'/%3E%3Ctext x='50%25' y='48%25' dominant-baseline='middle' text-anchor='middle' fill='%23525252' font-family='sans-serif' font-size='24' font-weight='900' letter-spacing='4'%3EVAKRAYAN%3C/text%3E%3Ctext x='50%25' y='53%25' dominant-baseline='middle' text-anchor='middle' fill='%23383838' font-family='sans-serif' font-size='12' font-weight='700' letter-spacing='2'%3EPREMIUM APPAREL%3C/text%3E%3C/svg%3E";

/**
 * Validates whether a given value is a non-empty, renderable image URL string.
 * @param {any} url
 * @returns {boolean}
 */
export function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '' || trimmed === 'undefined' || trimmed === 'null' || trimmed === '[object Object]') {
    return false;
  }
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/');
}

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
 * Transforms raw image URLs (Unsplash, Cloudinary, Backblaze B2, Cloudflare Workers, ImageKit)
 * into high-performance, responsive URLs with dynamic dimensions, DPR, and compression.
 * @param {string} url - Raw image URL
 * @param {number} width - Target display width in pixels
 * @param {number} quality - Compression quality (default 75)
 * @returns {string} Optimized image URL with dynamic query parameters
 */
export function getOptimizedImageUrl(url, width = 600, quality = 75) {
  if (!isValidImageUrl(url)) {
    return DEFAULT_FALLBACK_IMAGE;
  }

  // Fix legacy worker domain to active domain seamlessly
  let cleanUrl = fixLegacyWorkerUrl(url.trim());

  // Calculate current Device Pixel Ratio (1 for standard, 2 for Retina/Mobile displays)
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio
    ? Math.min(2, Math.round(window.devicePixelRatio))
    : 1;

  // 1. Optimization for Cloudflare Workers / Custom Vakrayan CDN Gateway
  if (cleanUrl.includes('vakrayan.workers.dev') || cleanUrl.includes('img.vakrayan.com') || cleanUrl.includes('cdn.vakrayan.com')) {
    try {
      const urlObj = new URL(cleanUrl);
      urlObj.searchParams.set('w', String(width));
      if (dpr > 1) {
        urlObj.searchParams.set('dpr', String(dpr));
      }
      urlObj.searchParams.set('q', String(quality));
      return urlObj.toString();
    } catch {
      return cleanUrl;
    }
  }

  // 2. Optimization for Unsplash CDN
  if (cleanUrl.includes('images.unsplash.com')) {
    try {
      const urlObj = new URL(cleanUrl);
      urlObj.searchParams.set('auto', 'format,compress');
      urlObj.searchParams.set('fit', 'crop');
      urlObj.searchParams.set('w', String(width));
      if (dpr > 1) {
        urlObj.searchParams.set('dpr', String(dpr));
      }
      urlObj.searchParams.set('q', String(quality));
      return urlObj.toString();
    } catch {
      return cleanUrl;
    }
  }

  // 3. Optimization for Cloudinary CDN
  if (cleanUrl.includes('res.cloudinary.com') && !cleanUrl.includes('f_auto')) {
    const dprParam = dpr > 1 ? `,dpr_${dpr}` : '';
    return cleanUrl.replace('/upload/', `/upload/f_auto,q_auto,w_${width}${dprParam}/`);
  }

  // 4. Optimization for ImageKit CDN
  if (cleanUrl.includes('ik.imagekit.io')) {
    try {
      const urlObj = new URL(cleanUrl);
      urlObj.searchParams.set('tr', `w-${width},dpr-${dpr},q-${quality}`);
      return urlObj.toString();
    } catch {
      return cleanUrl;
    }
  }

  return cleanUrl;
}

/**
 * Preloads an image URL asynchronously into browser memory cache
 * @param {string} url - Image URL to preload
 * @param {boolean} highPriority - Whether to use high fetch priority
 */
export function preloadImage(url, highPriority = false) {
  if (!isValidImageUrl(url) || preloadedUrls.has(url)) return;

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
    const frontRaw = p.front_image_link || p.image_url || p.image;
    const backRaw = p.back_image_links?.[0] || p.back_image_link || frontRaw;
    
    if (isValidImageUrl(frontRaw)) {
      const front = getOptimizedImageUrl(frontRaw, 600, 75);
      preloadImage(front, isPriority);
    }
    if (isValidImageUrl(backRaw) && backRaw !== frontRaw) {
      const back = getOptimizedImageUrl(backRaw, 600, 75);
      setTimeout(() => preloadImage(back, false), 150);
    }
  });
}

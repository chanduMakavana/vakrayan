import { useCallback } from 'react';

/**
 * useRecentlyViewed — Manages the recently viewed products list in localStorage.
 *
 * ✅ FIX: Previously, the same recently_viewed read/write logic was duplicated
 * in ProductDetail.jsx at two separate locations (L769-777 and L1999).
 * This hook consolidates it into one reusable function.
 *
 * Usage:
 *   const { addToRecentlyViewed, getRecentlyViewed } = useRecentlyViewed();
 *   addToRecentlyViewed(product);
 *   const recent = getRecentlyViewed();
 */
export function useRecentlyViewed(maxItems = 10) {
  const STORAGE_KEY = 'recently_viewed';

  const getRecentlyViewed = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }, []);

  const addToRecentlyViewed = useCallback((product) => {
    if (!product) return;
    const productId = product.$id || product.id;
    if (!productId) return;

    try {
      const existing = getRecentlyViewed();
      // Remove duplicate if already exists (push to front)
      const filtered = existing.filter(p => (p.$id || p.id) !== productId);
      const updated = [product, ...filtered].slice(0, maxItems);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage might be full — fail silently
    }
  }, [getRecentlyViewed, maxItems]);

  return { addToRecentlyViewed, getRecentlyViewed };
}

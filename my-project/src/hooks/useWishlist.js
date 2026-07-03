import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addWishlistItemState, removeWishlistItemState } from '../features/wishlistSlice';
import { useToast } from '../context/ToastContext';

/**
 * useWishlist — Consolidated wishlist toggle logic.
 *
 * ✅ FIX: Previously, the same localStorage.getItem('wishlist') + setItem pattern
 * was duplicated 4 times across ProductDetail.jsx (L1653-1667, L2795-2809) and
 * Shop.jsx (L647-661). This caused:
 *   1. Redux wishlistSlice being bypassed (inconsistent state)
 *   2. Code duplication and potential for drift bugs
 *
 * This hook is the single source of truth for wishlist operations.
 * It syncs both Redux state and localStorage together.
 *
 * Usage:
 *   const { isWishlisted, toggleWishlist } = useWishlist(product);
 */
export function useWishlist(product) {
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const wishlist = useSelector(state => state.wishlist || []);

  const productId = product?.$id || product?.id;

  const isWishlisted = Array.isArray(wishlist)
    ? wishlist.some(item => (item.$id || item.id || item) === productId)
    : false;

  const toggleWishlist = useCallback(() => {
    if (!product || !productId) return;

    const saved = JSON.parse(localStorage.getItem('wishlist') || '[]');

    if (isWishlisted) {
      // Remove from wishlist
      const updated = saved.filter(item => (item.$id || item.id || item) !== productId);
      localStorage.setItem('wishlist', JSON.stringify(updated));
      dispatch(removeWishlistItemState(productId));
      showToast('Removed from wishlist', 'info');
    } else {
      // Add to wishlist
      const alreadyExists = saved.some(item => (item.$id || item.id || item) === productId);
      if (!alreadyExists) {
        const updated = [...saved, product];
        localStorage.setItem('wishlist', JSON.stringify(updated));
      }
      dispatch(addWishlistItemState(product));
      showToast('Added to wishlist ❤️', 'success');
    }
  }, [product, productId, isWishlisted, dispatch, showToast]);

  return { isWishlisted, toggleWishlist };
}

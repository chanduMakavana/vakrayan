/**
 * Guest Cart Helper — Shared utilities for managing the guest (unauthenticated) cart.
 *
 * Previously these functions were duplicated across:
 *   - src/componets/pageComponets/Navbar.jsx
 *   - src/componets/pageComponets/AddToCartButton.jsx
 *   - src/componets/pageComponets/AddToCartPage.jsx
 *
 * Single source of truth — update here and it applies everywhere.
 */

/**
 * Generates a unique temporary ID for a guest cart item.
 * Prefixed with "guest_" to distinguish from real Firebase document IDs.
 */
export const generateGuestCartId = () =>
  `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

/**
 * Safely reads and parses the guest cart items from localStorage.
 * Returns an empty array if the data is missing or corrupted.
 */
export const loadGuestCartItems = () => {
  try {
    const saved = localStorage.getItem('guest_cart_items');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

/**
 * Persists the guest cart items array to localStorage.
 */
export const saveGuestCartItems = (items) => {
  try {
    localStorage.setItem('guest_cart_items', JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to persist guest cart to localStorage:', e);
  }
};

/**
 * Clears guest cart from localStorage (called after a successful merge on login).
 */
export const clearGuestCart = () => {
  localStorage.removeItem('guest_cart_items');
};

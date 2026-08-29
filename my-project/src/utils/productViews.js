/**
 * Helper utilities for tracking and displaying product watch/views counts in Admin Mode.
 */

export const getLocalViews = (productId) => {
  if (!productId) return 0;
  try {
    const viewsMap = JSON.parse(localStorage.getItem('product_views') || '{}');
    return viewsMap[productId] || 0;
  } catch {
    return 0;
  }
};

export const getEffectiveViews = (product) => {
  if (!product) return 0;
  const pId = product.$id || product.id;
  const cloudViews = Number(product.views_count || 0);
  const localViews = getLocalViews(pId);
  return Math.max(cloudViews, localViews);
};

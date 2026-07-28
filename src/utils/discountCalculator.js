/**
 * Dynamic discount calculator for bundle offers.
 * Calculates discounts based on active bundle offers and items in the cart.
 *
 * @param {Array} cartItems - Current items in the cart from Redux or local storage
 * @param {Array} allProducts - Full list of all products from Redux products state
 * @param {Array} offers - All offers from database
 * @returns {Object} { totalDiscount: number, appliedOffers: Array }
 */
export function calculateOffersDiscount(cartItems, allProducts, offers) {
    if (!cartItems || cartItems.length === 0 || !offers || offers.length === 0) {
        return { totalDiscount: 0, appliedOffers: [] };
    }

    // 1. Create a pool of all individual item instances in the cart
    let itemPool = [];
    cartItems.forEach(cartItem => {
        const product = allProducts.find(p => p.$id === cartItem.product_id || p.id === cartItem.product_id);
        if (product) {
            // Price from product details or cart item details
            const itemPrice = Number(product.price || cartItem.price || 0);
            for (let i = 0; i < cartItem.quantity; i++) {
                itemPool.push({
                    cartItemId: cartItem.$id || cartItem.id,
                    productId: product.$id || product.id,
                    price: itemPrice,
                    category: product.category || "",
                    tags: Array.isArray(product.tags) ? product.tags : [],
                    poolId: `${cartItem.$id || cartItem.id}-${i}`
                });
            }
        }
    });

    let totalDiscount = 0;
    const appliedOffers = [];

    // Filter active offers and sort them by highest quantity required, then by highest price
    // This gives a deterministic evaluation and generally favors the user
    const activeOffers = offers
        .filter(o => o.is_active !== false)
        .sort((a, b) => {
            const qtyDiff = Number(b.qty || 0) - Number(a.qty || 0);
            if (qtyDiff !== 0) return qtyDiff;
            return Number(b.price || 0) - Number(a.price || 0);
        });

    activeOffers.forEach(offer => {
        const qtyRequired = Number(offer.qty);
        const bundlePrice = Number(offer.price);
        if (qtyRequired <= 0) return;

        // Find all items in the pool that qualify for this offer
        const qualifyingItems = itemPool.filter(item => {
            // A product matches if:
            // - its ID is explicitly in the offer's productIds list
            // - OR its category matches the offer's category (case-insensitive)
            // - OR its tags contain the offer's tag (case-insensitive)
            const matchesId = Array.isArray(offer.productIds) && offer.productIds.includes(item.productId);
            const matchesCategory = offer.category && item.category && item.category.trim().toLowerCase() === offer.category.trim().toLowerCase();
            
            const offerTagClean = offer.tag ? offer.tag.trim().toLowerCase() : '';
            const matchesTag = offerTagClean && item.tags.some(t => t && t.trim().toLowerCase() === offerTagClean);

            return matchesId || matchesCategory || matchesTag;
        });

        // Determine how many times we can apply this offer group
        const timesApply = Math.floor(qualifyingItems.length / qtyRequired);
        if (timesApply > 0) {
            // Sort qualifying items by price descending so we bundle the most expensive items first
            qualifyingItems.sort((a, b) => b.price - a.price);

            let offerDiscount = 0;
            const appliedPoolIds = [];

            for (let t = 0; t < timesApply; t++) {
                const group = qualifyingItems.slice(t * qtyRequired, (t + 1) * qtyRequired);
                const originalSum = group.reduce((sum, item) => sum + item.price, 0);
                
                // Only discount if the original sum of items is greater than the bundle price
                if (originalSum > bundlePrice) {
                    const discount = originalSum - bundlePrice;
                    offerDiscount += discount;
                    group.forEach(g => appliedPoolIds.push(g.poolId));
                }
            }

            if (offerDiscount > 0) {
                totalDiscount += offerDiscount;
                appliedOffers.push({
                    id: offer.$id || offer.id,
                    name: offer.name,
                    timesApplied: timesApply,
                    discount: offerDiscount
                });

                // Remove the grouped items from the pool so they cannot be reused for other offers
                itemPool = itemPool.filter(item => !appliedPoolIds.includes(item.poolId));
            }
        }
    });

    return {
        totalDiscount,
        appliedOffers
    };
}

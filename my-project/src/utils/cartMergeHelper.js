import cartService from "../appwrite/cart";

/**
 * Merges guest cart items from localStorage into the Appwrite database for a logged-in user.
 * Combines identical product+size matches to prevent duplication and sums up their quantities.
 * Clears localStorage upon completion.
 */
export const mergeLocalCartToDb = async (userId) => {
  try {
    const localItemsStr = localStorage.getItem('guest_cart_items');
    if (!localItemsStr) return;

    const localItems = JSON.parse(localItemsStr);
    if (!Array.isArray(localItems) || localItems.length === 0) return;

    // 1. Fetch user's existing DB cart items to check for duplicates
    const dbItems = await cartService.getCartItems(userId);

    // 2. Loop and merge each local item into DB
    for (const localItem of localItems) {
      const existingCartItem = dbItems.find(
        dbItem => dbItem.product_id === localItem.product_id && dbItem.size === localItem.size
      );

      await cartService.addToCart({
        name: localItem.name,
        size: localItem.size,
        price: localItem.price,
        quantity: localItem.quantity,
        product_id: localItem.product_id,
        product_Image: localItem.product_Image,
        userId: userId,
        existingCartItem: existingCartItem
      });
    }

    // 3. Clear guest cart from localStorage
    localStorage.removeItem('guest_cart_items');
  } catch (error) {
    console.error("Error merging guest cart to database:", error);
  }
};

import { createSlice } from "@reduxjs/toolkit";

const initialState = [];

export const wishlistSlice = createSlice({
    name: "wishlist",
    initialState,
    reducers: {
        // Hydrate Redux wishlist with catalog-mapped objects
        setWishlistItems: (state, action) => {
            const rawPayload = action.payload || [];
            return JSON.parse(JSON.stringify(rawPayload));
        },
        // Synchronously add a product to wishlist
        addWishlistItemState: (state, action) => {
            const newItem = JSON.parse(JSON.stringify(action.payload || {}));
            const targetId = newItem.$id || newItem.id;
            const existingIndex = state.findIndex(
                item => (item.$id === targetId || item.id === targetId)
            );
            if (existingIndex === -1) {
                state.push(newItem);
            }
        },
        // Synchronously remove a product from wishlist
        removeWishlistItemState: (state, action) => {
            const targetId = action.payload;
            return state.filter(item => item.$id !== targetId && item.id !== targetId);
        },
        // Clear wishlist on logout
        clearWishlistState: () => {
            return [];
        }
    }
});

export const {
    setWishlistItems,
    addWishlistItemState,
    removeWishlistItemState,
    clearWishlistState
} = wishlistSlice.actions;

export default wishlistSlice.reducer;

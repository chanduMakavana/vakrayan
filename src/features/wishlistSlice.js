import { createSlice } from "@reduxjs/toolkit";

const initialState = [];

export const wishlistSlice = createSlice({
    name: "wishlist",
    initialState,
    reducers: {
        // Hydrate Redux wishlist with catalog-mapped objects
        setWishlistItems: (state, action) => {
            // Immer handles immutability — no need for JSON.parse(JSON.stringify())
            return action.payload ?? [];
        },

        // Synchronously add a product to wishlist (no duplicate check)
        addWishlistItemState: (state, action) => {
            const newItem = action.payload ?? {};
            const targetId = newItem.$id || newItem.id;
            const exists = state.some(item => (item.$id === targetId || item.id === targetId));
            if (!exists) {
                state.push(newItem);
            }
        },

        // Synchronously remove a product from wishlist by ID
        removeWishlistItemState: (state, action) => {
            const targetId = action.payload;
            return state.filter(item => item.$id !== targetId && item.id !== targetId);
        },

        // Clear wishlist on logout
        clearWishlistState: () => {
            return [];
        },
    }
});

export const {
    setWishlistItems,
    addWishlistItemState,
    removeWishlistItemState,
    clearWishlistState,
} = wishlistSlice.actions;

export default wishlistSlice.reducer;

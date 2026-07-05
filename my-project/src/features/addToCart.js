import { createSlice } from "@reduxjs/toolkit";

const initialState = [];

export const cartSlice = createSlice({
    name: "cart",
    initialState,
    reducers: {
        // Hydrate the Redux store with live items fetched from Firebase DB or localStorage
        setCartItems: (state, action) => {
            // Immer handles immutability — no need for JSON.parse(JSON.stringify())
            return action.payload ?? [];
        },

        // Synchronously append or update a cart item document in store
        addCartItemState: (state, action) => {
            const newItem = action.payload ?? {};
            const existingIndex = state.findIndex(
                item => item.$id === newItem.$id || (item.product_id === newItem.product_id && item.size === newItem.size)
            );
            if (existingIndex !== -1) {
                state[existingIndex] = { ...state[existingIndex], ...newItem };
            } else {
                state.push(newItem);
            }
        },

        // Remove an item document by its Firebase ID
        removeCartItemState: (state, action) => {
            return state.filter(item => item.$id !== action.payload);
        },

        // Safely update specific properties like quantity, size, or subtotal
        updateCartItemState: (state, action) => {
            const { $id, ...updates } = action.payload;
            const item = state.find(i => i.$id === $id);
            if (item) {
                Object.assign(item, updates);
            }
        },

        // Clear all cart items inside Redux
        clearCartState: () => {
            return [];
        },
    }
});

export const {
    setCartItems,
    addCartItemState,
    removeCartItemState,
    updateCartItemState,
    clearCartState,
} = cartSlice.actions;

export default cartSlice.reducer;

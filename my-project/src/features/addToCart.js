import { createSlice } from "@reduxjs/toolkit";

const LS_KEY = "cartData";

const getStoredCart = () => {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY)) || [];
    } catch {
        return [];
    }
};

const saveCart = (items) => {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
};

const getId = (product) => product?.id || product?._id;

export const cartSlice = createSlice({
    name: "cart",
    initialState: getStoredCart(),
    reducers: {
        addToCart: (state, action) => {
            const product = action.payload;
            const existing = state.find(item => getId(item.product) === getId(product));
            if (existing) {
                existing.quantity += 1;
            } else {
                state.push({ product, quantity: 1 });
            }
            saveCart(state);
        },
        removeFromCart: (state, action) => {
            const filtered = state.filter(item => getId(item.product) !== action.payload);
            saveCart(filtered);
            return filtered;
        },
        increaseQuantity: (state, action) => {
            const item = state.find(i => getId(i.product) === action.payload);
            if (item) item.quantity += 1;
            saveCart(state);
        },
        decreaseQuantity: (state, action) => {
            const item = state.find(i => getId(i.product) === action.payload);
            if (item) item.quantity = Math.max(1, item.quantity - 1);
            saveCart(state);
        },
        clearCart: (state) => {
            localStorage.removeItem(LS_KEY);
            return [];
        },
    },
});

export const { addToCart, removeFromCart, increaseQuantity, decreaseQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;

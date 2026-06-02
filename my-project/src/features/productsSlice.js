import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    items: [],
    loading: false,
    fetched: false // Tracks if we've successfully loaded catalog once
};

export const productsSlice = createSlice({
    name: "products",
    initialState,
    reducers: {
        setProducts: (state, action) => {
            state.items = JSON.parse(JSON.stringify(action.payload || []));
            state.fetched = true;
            state.loading = false;
        },
        setLoadingProducts: (state, action) => {
            state.loading = action.payload;
        }
    }
});

export const { setProducts, setLoadingProducts } = productsSlice.actions;
export default productsSlice.reducer;

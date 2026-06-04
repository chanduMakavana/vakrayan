import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    items: [],
    fetched: false // Tracks if catalog has been successfully loaded once
};

export const productsSlice = createSlice({
    name: "products",
    initialState,
    reducers: {
        setProducts: (state, action) => {
            state.items = JSON.parse(JSON.stringify(action.payload || []));
            state.fetched = true;
        }
    }
});

export const { setProducts } = productsSlice.actions;
export default productsSlice.reducer;

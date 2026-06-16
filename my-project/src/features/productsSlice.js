import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    allItems: [], // Store all raw products fetched from database
    items: [],    // Store filtered products displayed to the user
    fetched: false, // Tracks if catalog has been successfully loaded once
    offers: [],     // Store all offers loaded from database
    offersFetched: false
};

export const productsSlice = createSlice({
    name: "products",
    initialState,
    reducers: {
        setProducts: (state, action) => {
            state.allItems = JSON.parse(JSON.stringify(action.payload || []));
            const adminMode = localStorage.getItem('adminMode') === 'true';
            state.items = state.allItems.filter(p =>
                adminMode || p.is_live === true || p.is_live === 'true' || p.is_live === 1 || p.is_live === '1'
            );
            state.fetched = true;
        },
        filterProductsForMode: (state, action) => {
            const adminMode = !!action.payload;
            state.items = state.allItems.filter(p =>
                adminMode || p.is_live === true || p.is_live === 'true' || p.is_live === 1 || p.is_live === '1'
            );
        },
        setOffers: (state, action) => {
            state.offers = JSON.parse(JSON.stringify(action.payload || []));
            state.offersFetched = true;
        }
    }
});

export const { setProducts, filterProductsForMode, setOffers } = productsSlice.actions;
export default productsSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    allItems: [], // Store all raw products fetched from database
    items: [],    // Store filtered products displayed to the user (live only, unless adminMode)
    fetched: false, // Tracks if catalog has been successfully loaded once
    offers: [],     // Store all offers loaded from database
    offersFetched: false,
};

export const productsSlice = createSlice({
    name: "products",
    initialState,
    reducers: {
        setProducts: (state, action) => {
            state.allItems = action.payload ?? [];
            // NOTE: adminMode is passed as the second action arg, not read from localStorage.
            // Reducers must be pure functions — no side effects, no localStorage access.
            // filterProductsForMode should be dispatched separately after setProducts
            // if admin filtering is needed.
            state.items = state.allItems.filter(p =>
                p.is_live === true || p.is_live === 'true' || p.is_live === 1 || p.is_live === '1'
            );
            state.fetched = true;
        },

        // Called after setProducts or after adminMode toggle to re-filter products.
        // Accepts boolean payload: true = show all (admin), false = live only
        filterProductsForMode: (state, action) => {
            const adminMode = !!action.payload;
            state.items = adminMode
                ? state.allItems
                : state.allItems.filter(p =>
                    p.is_live === true || p.is_live === 'true' || p.is_live === 1 || p.is_live === '1'
                );
        },

        setOffers: (state, action) => {
            state.offers = action.payload ?? [];
            state.offersFetched = true;
        },
    }
});

export const { setProducts, filterProductsForMode, setOffers } = productsSlice.actions;
export default productsSlice.reducer;

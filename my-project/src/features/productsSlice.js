import { createSlice } from "@reduxjs/toolkit";

// ✅ CODE QUALITY: Helper to normalize is_live to boolean at ingestion.
// Appwrite schema inconsistency sends is_live as: true | 'true' | 1 | '1'.
// Normalizing once here avoids 4-way comparisons throughout the codebase.
const normalizeIsLive = (val) =>
    val === true || val === 'true' || val === 1 || val === '1';

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
            // Normalize is_live to boolean at ingestion so all subsequent checks are simple === true
            state.allItems = (action.payload ?? []).map(p => ({
                ...p,
                is_live: normalizeIsLive(p.is_live)
            }));
            // NOTE: adminMode is passed as the second action arg, not read from localStorage.
            // Reducers must be pure functions — no side effects, no localStorage access.
            // filterProductsForMode should be dispatched separately after setProducts
            // if admin filtering is needed.
            state.items = state.allItems.filter(p => p.is_live === true);
            state.fetched = true;
        },

        // Called after setProducts or after adminMode toggle to re-filter products.
        // Accepts boolean payload: true = show all (admin), false = live only
        filterProductsForMode: (state, action) => {
            const adminMode = !!action.payload;
            state.items = adminMode
                ? state.allItems
                : state.allItems.filter(p => p.is_live === true);
        },

        setOffers: (state, action) => {
            state.offers = action.payload ?? [];
            state.offersFetched = true;
        },
    }
});

export const { setProducts, filterProductsForMode, setOffers } = productsSlice.actions;
export default productsSlice.reducer;

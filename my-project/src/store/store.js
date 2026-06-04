import { configureStore } from "@reduxjs/toolkit";
import loginReducer from "../features/login";
import searchReducer from "../features/search";
import cartReducer from "../features/addToCart";
import productsReducer from "../features/productsSlice";
import wishlistReducer from "../features/wishlistSlice";

export const store = configureStore({
    reducer: {
        auth: loginReducer,
        search: searchReducer,
        cart: cartReducer,
        products: productsReducer,
        wishlist: wishlistReducer,
    }
});


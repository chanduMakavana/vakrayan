import { configureStore } from "@reduxjs/toolkit";
import loginReducer from "../features/login";
import searchReducer from "../features/search";
import cartReducer from "../features/addToCart";

export const store = configureStore({
    reducer: {
        login: loginReducer,
        search: searchReducer,
        cart: cartReducer,
    }
})

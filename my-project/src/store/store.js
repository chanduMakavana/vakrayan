import { configureStore } from "@reduxjs/toolkit";
import loginReducer from "../features/login";
import searchReducer from "../features/search"
export const store = configureStore({
    reducer: {
        login :  loginReducer,
        search : searchReducer 
    }
})

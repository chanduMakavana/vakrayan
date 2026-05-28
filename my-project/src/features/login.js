import { createSlice } from "@reduxjs/toolkit";

// Helper function to safely get array from localStorage
const getLocalData = () => {
    const data = localStorage.getItem("loginData");
    try {
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
};

const initialState = getLocalData();

export const loginSlice = createSlice({
    name: "login",
    initialState,
    reducers: {
        createAccount: (state, action) => {
            const { name, email, password } = action.payload;

            const newUser = { name, email, password, isLogin: false };

            const emailExist = state.find(user => user.email === email);

            if (emailExist) {
                throw new Error("Email already exists");
            } else {
                state.push(newUser);
                localStorage.setItem("loginData", JSON.stringify(state));
            }
        },

        login: (state, action) => {
            const { email, password } = action.payload;
            const user = state.find(u => u.email === email && u.password === password);

            if (user) {
                // Logout all other users
                state.forEach(u => u.isLogin = false);
                
                // Login current user
                user.isLogin = true;
                
                // Update localStorage
                localStorage.setItem("loginData", JSON.stringify(state));
                
            } else {
               throw new Error("Invalid email or password");
            }
        },

        logout: (state) => {
            // Set all users login status to false
            state.forEach(user => {
                user.isLogin = false;
            });

            // Update localStorage
            localStorage.setItem("loginData", JSON.stringify(state));
            localStorage.removeItem("isLogin");
        }
    }
});

export const { createAccount, login, logout } = loginSlice.actions;
export default loginSlice.reducer;

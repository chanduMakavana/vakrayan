import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    user: null,             // Appwrite user object populated on successful authentication
    isAuthenticated: false, // Tracking auth state for protected routes and conditional rendering
    loading: true           // Controls loading state to prevent flash of unauthenticated UI on mount
};

export const loginSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        // Update auth state on successful login or session restoration
        login: (state, action) => {
            state.user = action.payload.user;
            state.isAuthenticated = true;
            state.loading = false;
        },

        // Reset authentication and user state to default
        logout: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.loading = false;
        },

        // Set auth loading state
        setLoading: (state, action) => {
            state.loading = action.payload;
        }
    }
});

export const { login, logout, setLoading } = loginSlice.actions;
export default loginSlice.reducer;
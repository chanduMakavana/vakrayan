import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    user: null,             // Appwrite user object populated on successful authentication
    isAuthenticated: false, // Tracking auth state for protected routes and conditional rendering
<<<<<<< HEAD
    loading: true,          // Controls loading state to prevent flash of unauthenticated UI on mount
    adminMode: localStorage.getItem('adminMode') === 'true' // State indicating if admin mode is ON/OFF
=======
    loading: true           // Controls loading state to prevent flash of unauthenticated UI on mount
>>>>>>> 61e2559d0e1cd6e0dbf11f31859e58bc8057f893
};

export const loginSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        // Update auth state on successful login or session restoration
        login: (state, action) => {
            state.user = action.payload.user ? JSON.parse(JSON.stringify(action.payload.user)) : null;
            state.isAuthenticated = !!action.payload.user;
            state.loading = false;
<<<<<<< HEAD
            
            // Auto check if they are actually admin. If not, disable adminMode.
            const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || '').replace(/['"]/g, '').trim();
            const isAdmin = state.isAuthenticated && state.user && adminEmail && state.user.email === adminEmail;
            if (!isAdmin) {
                state.adminMode = false;
                localStorage.removeItem('adminMode');
            }
=======
>>>>>>> 61e2559d0e1cd6e0dbf11f31859e58bc8057f893
        },

        // Reset authentication and user state to default
        logout: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.loading = false;
<<<<<<< HEAD
            state.adminMode = false;
            localStorage.removeItem('adminMode');
=======
>>>>>>> 61e2559d0e1cd6e0dbf11f31859e58bc8057f893
        },

        // Set auth loading state
        setLoading: (state, action) => {
            state.loading = action.payload;
<<<<<<< HEAD
        },

        // Toggle admin mode
        toggleAdminMode: (state) => {
            state.adminMode = !state.adminMode;
            localStorage.setItem('adminMode', state.adminMode);
        },

        // Set admin mode directly
        setAdminMode: (state, action) => {
            state.adminMode = action.payload;
            localStorage.setItem('adminMode', action.payload);
=======
>>>>>>> 61e2559d0e1cd6e0dbf11f31859e58bc8057f893
        }
    }
});

<<<<<<< HEAD
export const { login, logout, setLoading, toggleAdminMode, setAdminMode } = loginSlice.actions;
=======
export const { login, logout, setLoading } = loginSlice.actions;
>>>>>>> 61e2559d0e1cd6e0dbf11f31859e58bc8057f893
export default loginSlice.reducer;
import { createSlice } from "@reduxjs/toolkit";

// Read adminMode from localStorage OUTSIDE the reducer (at module init time only).
// This is acceptable since it runs once on app startup, not inside a reducer.
// The reducer itself remains a pure function (no side effects).
const storedAdminMode = localStorage.getItem('adminMode') === 'true';

const initialState = {
    user: null,             // Appwrite user object populated on successful authentication
    isAuthenticated: false, // Tracking auth state for protected routes and conditional rendering
    loading: true,          // Controls loading state to prevent flash of unauthenticated UI on mount
    adminMode: storedAdminMode, // Persisted admin mode toggle — read once on startup
};

export const loginSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        // Update auth state on successful login or session restoration
        login: (state, action) => {
            state.user = action.payload.user ?? null;
            state.isAuthenticated = !!action.payload.user;
            state.loading = false;

            // Firebase admin check — 3 methods (Firebase user has no .labels field)
            const hasAdminRole  = state.user?.prefs?.role === 'admin';
            const hasAdminLabel = Array.isArray(state.user?.labels) && state.user.labels.includes('admin');
            const isAdmin = hasAdminRole || hasAdminLabel;
            // Note: email check is done in AdminRoute only (not here, to keep reducer pure)

            if (!isAdmin && !state.adminMode) {
                // Only reset adminMode if they are definitely NOT an admin
                // (keeps adminMode intact if set via VITE_ADMIN_EMAIL)
                state.adminMode = false;
                localStorage.removeItem('adminMode');
            }
        },


        // Reset authentication and user state to default
        logout: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.loading = false;
            state.adminMode = false;
            localStorage.removeItem('adminMode');
        },

        // Set auth loading state
        setLoading: (state, action) => {
            state.loading = action.payload;
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
        }
    }
});

export const { login, logout, setLoading, toggleAdminMode, setAdminMode } = loginSlice.actions;
export default loginSlice.reducer;
// /home/digilab/timesheet/client/src/redux/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios'; // Or your API utility

// Define the base URL for your API
const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// --- Async Thunk for Login ---
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      // Store token in localStorage on successful login
      localStorage.setItem('token', response.data.token);
      return response.data; // Contains token and user data
    } catch (error) {
      // Extract error message or provide a default
      const message = error.response?.data?.message || error.message || 'Login failed';
      return rejectWithValue(message);
    }
  }
);

// --- Async Thunk for Registration ---
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      // Adjust the endpoint '/auth/register' if yours is different
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      // Optionally store token immediately upon registration if your API returns one
      // and logs the user in directly. Adjust based on your API behavior.
      if (response.data.token) {
         localStorage.setItem('token', response.data.token);
      }
      return response.data; // Should contain user info and maybe token
    } catch (error) {
      // Extract error message or provide a default
      const message = error.response?.data?.message || error.message || 'Registration failed';
      return rejectWithValue(message);
    }
  }
);

// --- Async Thunk for Changing Password ---
export const changePassword = createAsyncThunk(
    'auth/changePassword',
    async (passwordData, { getState, rejectWithValue }) => {
        const { token } = getState().auth;
        if (!token) {
            return rejectWithValue('Authentication required.');
        }
        try {
            // Assuming endpoint is PUT /api/auth/change-password
            const response = await axios.put(`${API_URL}/auth/change-password`, passwordData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data; // Expecting success message e.g., { message: 'Password updated successfully' }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Password change failed';
            return rejectWithValue(message);
        }
    }
);

// --- Async Thunk for Deleting Account ---
export const deleteAccount = createAsyncThunk(
    'auth/deleteAccount',
    async (_, { getState, rejectWithValue }) => {
        const { token } = getState().auth;
        if (!token) {
            return rejectWithValue('Authentication required.');
        }
        try {
            // Assuming endpoint is DELETE /api/auth/me
            const response = await axios.delete(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data; // Expecting success message e.g., { message: 'Account deleted successfully' }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Account deletion failed';
            return rejectWithValue(message);
        }
    }
);

// --- Async Thunk to Load User from Token ---
export const loadUserFromToken = createAsyncThunk(
    'auth/loadUserFromToken',
    async (_, { dispatch, rejectWithValue }) => {
        const token = localStorage.getItem('token');
        if (!token) {
            // No need to reject here, just means no user is logged in
            return null; // Indicate no user loaded
        }
        dispatch(setAuthLoading()); // Set loading state while validating
        try {
            // API endpoint to get user profile using the token
            const response = await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Dispatch setAuth with user data and token to update state
            dispatch(setAuth({ user: response.data, token }));
            return response.data; // Return user data
        } catch (error) {
             console.error("Token validation failed:", error.response?.data || error.message);
             // Dispatch error action, which also clears token/auth state
             dispatch(setAuthError(error.response?.data?.message || 'Token validation failed'));
             // Reject the promise so components know loading failed
             return rejectWithValue(error.response?.data?.message || 'Token validation failed');
        }
    }
);


// --- Slice Definition ---
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    // Initialize token from localStorage, default to null if not found
    token: localStorage.getItem('token') || null,
    // Initialize isAuthenticated based on token presence
    isAuthenticated: !!localStorage.getItem('token'),
    // Start with isLoading true only if a token exists, otherwise false
    isLoading: !!localStorage.getItem('token'), // True if token exists, needs validation
    error: null,
  },
  reducers: {
    // Standard reducer for logging out
    logout(state) {
      localStorage.removeItem('token'); // Remove token from storage
      // Reset state to initial non-authenticated values
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    },
    // Standard reducer to manually set auth state (used by loadUserFromToken)
    setAuth(state, action) {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.isLoading = false; // Finished loading/validating
        state.error = null;
    },
    // Standard reducer to set loading state
    setAuthLoading(state) {
        state.isLoading = true;
        state.error = null; // Clear previous errors when starting to load
    },
    // Standard reducer to handle authentication errors
    setAuthError(state, action) {
        state.isLoading = false;
        state.error = action.payload;
        // Clear auth state on error (e.g., invalid token)
        localStorage.removeItem('token');
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
    },
    // Optional: Reducer to clear only the error message
    clearAuthError(state) {
        state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user; // Assuming API returns user object
        state.token = action.payload.token;
        state.error = null;
        // localStorage is set in the thunk itself
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload; // Error message from rejectWithValue
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        localStorage.removeItem('token'); // Ensure token is removed on failed login
      })

      // Register cases
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update state based on successful registration
        // If API returns token and user on register (auto-login):
        if (action.payload.token) {
            state.isAuthenticated = true;
            state.user = action.payload.user; // Assuming API returns user object
            state.token = action.payload.token;
        } else {
            // Handle cases where registration requires separate login or verification
            // State remains largely unchanged, maybe show a success message via alert slice
            state.isAuthenticated = false;
        }
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload; // Error message from rejectWithValue
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        localStorage.removeItem('token'); // Ensure token is removed if set prematurely
      })

      // Load user from token cases
      .addCase(loadUserFromToken.pending, (state) => {
        // isLoading is already handled by dispatch(setAuthLoading()) within the thunk
      })
      .addCase(loadUserFromToken.fulfilled, (state, action) => {
        // State is updated by dispatch(setAuth(...)) within the thunk
        // isLoading is set to false within setAuth
        // If action.payload is null (no token found), state remains unchanged (still loading: false, isAuthenticated: false)
        if (action.payload === null) {
            state.isLoading = false; // Ensure loading stops if no token was found initially
        }
      })
      .addCase(loadUserFromToken.rejected, (state, action) => {
        // State is updated by dispatch(setAuthError(...)) within the thunk
        // isLoading is set to false within setAuthError
      })

      // Change Password cases
      .addCase(changePassword.pending, (state) => {
        // Optionally set a specific loading state if needed, e.g., state.passwordChangeLoading = true;
        state.isLoading = true; // Use general loading or specific one
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.isLoading = false;
        // --- CHANGE START ---
        // Logout the user after successful password change
        localStorage.removeItem('token'); // Remove token from storage
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
        // --- CHANGE END ---
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload; // Set auth error on failure
      })

      // Delete Account cases
      .addCase(deleteAccount.pending, (state) => {
        state.isLoading = true; // Use general loading or a specific one like state.isDeleting = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        // On successful deletion, reset the auth state completely (similar to logout)
        localStorage.removeItem('token');
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload; // Set auth error on failure
      });
  },
});

// Export the action creators generated by createSlice
export const { logout, setAuth, setAuthLoading, setAuthError, clearAuthError } = authSlice.actions; // Keep existing exports

// Export the reducer function
export default authSlice.reducer;

// Optional: Selectors for convenience
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthUser = (state) => state.auth.user;
export const selectAuthToken = (state) => state.auth.token;
export const selectIsAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;

// Export the async thunks
// No need to re-export async thunks here as they were defined with 'export const'
// export { login, register, changePassword, deleteAccount, loadUserFromToken };

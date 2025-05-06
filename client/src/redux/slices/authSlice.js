// /home/digilab/timesheet/client/src/redux/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// Helper to get authorization headers
// Just a small utility to keep the header creation consistent.
const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// Helper to extract a user-friendly error message
// Tries to get the message from a few common places in an error object.
const getErrorMessage = (error) => {
  return error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred';
};

// Thunk for user login
// Handles the async request to the login endpoint.
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      localStorage.setItem('token', response.data.token); // Store token on successful login
      return response.data; // This will be the action.payload if fulfilled
    } catch (error) {
      const message = getErrorMessage(error);
      return rejectWithValue(message); // This will be action.payload if rejected
    }
  }
);

// Thunk for user registration
// Handles the async request to the register endpoint.
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      if (response.data.token) {
         localStorage.setItem('token', response.data.token); // Store token if registration also logs in
      }
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

// Thunk for changing user password
// Requires user to be authenticated.
export const changePassword = createAsyncThunk(
    'auth/changePassword',
    async (passwordData, { getState, rejectWithValue }) => {
        const { token } = getState().auth; // Need the current user's token
        if (!token) {
            return rejectWithValue('Authentication required.');
        }
        try {
            const response = await axios.put(`${API_URL}/auth/change-password`, passwordData, getAuthHeaders(token));
            return response.data; // Usually a success message
        } catch (error) {
            const message = getErrorMessage(error);
            return rejectWithValue(message);
        }
    }
);

// Thunk for deleting user account
// Requires user to be authenticated.
export const deleteAccount = createAsyncThunk(
    'auth/deleteAccount',
    async (_, { getState, rejectWithValue }) => {
        const { token } = getState().auth;
        if (!token) {
            return rejectWithValue('Authentication required.');
        }
        try {
            // Backend might require password confirmation for deletion,
            // if so, it would be passed in the `data` field of the axios config.
            const response = await axios.delete(`${API_URL}/auth/me`, getAuthHeaders(token));
            return response.data; // Usually a success message
        } catch (error) {
            const message = getErrorMessage(error);
            return rejectWithValue(message);
        }
    }
);

// Thunk to load user data if a token exists in localStorage
// This is typically called when the app initializes to check for an existing session.
export const loadUserFromToken = createAsyncThunk(
    'auth/loadUserFromToken',
    async (_, { dispatch, rejectWithValue }) => {
        const token = localStorage.getItem('token');
        if (!token) {
            return null; // No token, nothing to load
        }
        dispatch(setAuthLoading()); // Set loading state while we validate the token
        try {
            // Verify token by fetching user data
            const response = await axios.get(`${API_URL}/auth/me`, getAuthHeaders(token));
            dispatch(setAuth({ user: response.data, token })); // Update auth state with user and token
            return response.data; // User data
        } catch (error) {
             console.error("AuthSlice: Token validation failed:", getErrorMessage(error));
             dispatch(setAuthError(getErrorMessage(error))); // Set error state, clears token
             return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Thunk for updating user profile information
// Requires user to be authenticated.
export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) {
        return rejectWithValue('Authentication required.');
    }
    try {
      // Endpoint for updating profile, e.g., name, email (if allowed), country, phone, companyName
      const response = await axios.put(`${API_URL}/users/profile`, userData, getAuthHeaders(token));
      return response.data; // Updated user data
    } catch (err) {
      const message = getErrorMessage(err);
      return rejectWithValue(message);
    }
  }
);

// Thunk for initiating password reset process (forgot password)
// User provides their email.
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (emailData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, emailData);
      return response.data; // Usually a success message
    } catch (err) {
      const message = getErrorMessage(err);
      return rejectWithValue(message);
    }
  }
);

// Thunk for resetting password using a token (received via email link)
// User provides the reset token and their new password.
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/auth/reset-password/${token}`, { newPassword });
      return response.data; // Usually a success message
    } catch (err) {
      const message = getErrorMessage(err);
      return rejectWithValue(message);
    }
  }
);

// Defines the authentication slice of the Redux state.
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null, // Stores the logged-in user object
    token: localStorage.getItem('token') || null, // Retrieves token from localStorage on initial load
    isAuthenticated: !!localStorage.getItem('token'), // True if token exists
    isLoading: !!localStorage.getItem('token'), // Start loading if token exists, to validate it
    error: null, // Stores any authentication-related error messages
  },
  reducers: {
    // Handles user logout: clears user data, token, and resets auth flags.
    logout: (state) => {
      localStorage.removeItem('token');
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    },
    // Sets authentication state (typically after successful login/token load).
    setAuth: (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
    },
    // Sets loading state, usually before an async auth operation.
    setAuthLoading: (state) => {
        state.isLoading = true;
        state.error = null; // Clear previous errors when starting a new loading state
    },
    // Sets error state and clears authentication details (e.g., on token validation failure).
    setAuthError: (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        localStorage.removeItem('token'); // Important: remove invalid token
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
    },
    // Clears any existing auth error.
    clearAuthError: (state) => {
      state.error = null;
    }
  },
  // Handles actions dispatched by async thunks (e.g., login, register).
  extraReducers: (builder) => {
    builder
      // Login actions
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user; // Backend should return all necessary user fields
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload; // Error message from rejectWithValue
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        localStorage.removeItem('token'); // Clean up on login failure
      })
      // Register actions
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.token) { // If registration also logs the user in
            state.isAuthenticated = true;
            state.user = action.payload.user;
            state.token = action.payload.token;
        } else { // If registration requires separate login
            state.isAuthenticated = false;
        }
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        localStorage.removeItem('token'); // Clean up on registration failure
      })
      // Load user from token actions
      .addCase(loadUserFromToken.pending, (state) => {
        // isLoading is managed by the setAuthLoading action dispatched within the thunk
      })
      .addCase(loadUserFromToken.fulfilled, (state, action) => {
        // If no token was found, or validation failed early, action.payload might be null.
        // Successful load is handled by setAuth action dispatched within the thunk.
        if (action.payload === null) {
            state.isLoading = false; // Ensure loading stops if no token was processed
        }
      })
      .addCase(loadUserFromToken.rejected, (state, action) => {
        // Error state is managed by setAuthError action dispatched within the thunk
      })
      // Change password actions
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.isLoading = false;
        // For security, log user out after password change, requiring re-login.
        localStorage.removeItem('token');
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null; // Clear any previous errors
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Delete account actions
      .addCase(deleteAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        localStorage.removeItem('token'); // Account deleted, log user out
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update user profile actions
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) { // Ensure payload exists
          state.user = { // Merge existing user data with updated fields
            ...state.user,
            name: action.payload.name,
            email: action.payload.email, // Assuming email can be updated
            country: action.payload.country,
            phoneNumber: action.payload.phoneNumber,
            companyName: action.payload.companyName, // This will be undefined/null if not an employer
          };
        }
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Forgot password actions
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null; // Success message handled by UI via setAlert
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Reset password actions
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null; // Success message handled by UI via setAlert
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

// Export synchronous actions for use in components or other thunks.
export const { logout, setAuth, setAuthLoading, setAuthError, clearAuthError } = authSlice.actions;

// Export the reducer to be included in the store.
export default authSlice.reducer;

// Selectors to access parts of the auth state from components.
// These help keep components decoupled from the exact state structure.
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthUser = (state) => state.auth.user;
export const selectAuthToken = (state) => state.auth.token;
export const selectIsAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;

// /home/digilab/timesheet/client/src/redux/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { setAlert } from './alertSlice'; // Import setAlert
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

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

// Thunk to load user data if a token exists in localStorage
// This is typically called when the app initializes to check for an existing session.
export const loadUserFromToken = createAsyncThunk(
    'auth/loadUserFromToken',
    async (_, { dispatch, rejectWithValue }) => {
        const token = localStorage.getItem('token');
        if (!token) {
            return null; // No token, nothing to load
        }
        // Import setAuthLoading, setAuth, setAuthError from this file itself, so no change needed here.
        dispatch(authSlice.actions.setAuthLoading()); // Set loading state while we validate the token
        try {
            // Verify token by fetching user data
            const response = await axios.get(`${API_URL}/auth/me`, getAuthHeaders(token));
            dispatch(authSlice.actions.setAuth({ user: response.data, token })); // Update auth state with user and token
            return response.data; // User data
        } catch (error) {
             console.error("AuthSlice: Token validation failed:", getErrorMessage(error));
             dispatch(authSlice.actions.setAuthError(getErrorMessage(error))); // Set error state, clears token
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

// Thunk for checking prospective employee email status
export const checkProspectiveEmployee = createAsyncThunk(
  'auth/checkProspectiveEmployee',
  async (emailData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/check-prospective-employee`, emailData);
      return response.data; // Expected: { canProceed: bool, userExists: bool, isEmployee: bool, message: string }
    } catch (error) {
      const errorData = error.response?.data || { message: 'Failed to check email status.' };
      return rejectWithValue(errorData);
    }
  }
);

// Thunk for requesting account deletion link
// This will call the backend to send an email with a secure link.
export const requestAccountDeletionLink = createAsyncThunk(
  'auth/requestDeletionLink',
  async (_, { dispatch, rejectWithValue }) => {
    const token = localStorage.getItem('token'); // Or getState().auth.token
    if (!token) {
        return rejectWithValue('Authentication required to request account deletion.');
    }
    try {
      // The backend endpoint will use the authenticated user's details
      const response = await axios.post(`${API_URL}/auth/request-deletion-link`, {}, getAuthHeaders(token));
      // Dispatch an alert with the success message from the backend
      dispatch(setAlert(response.data.message || 'Account deletion link sent. Please check your email.', 'success', 10000));
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      dispatch(setAlert(message, 'danger')); // Dispatch an alert with the error message
      return rejectWithValue(message);
    }
  }
);

// Thunk for confirming account deletion with token and password
export const confirmAccountDeletion = createAsyncThunk(
  'auth/confirmAccountDeletion',
  async ({ token, password }, { dispatch, rejectWithValue }) => {
    try {
      // The backend endpoint will verify the token and password
      const response = await axios.post(`${API_URL}/auth/confirm-delete-account/${token}`, { password });
      // On successful deletion, the backend sends a success message.
      // The user will be logged out by the component after this thunk fulfills.
      return response.data; // e.g., { message: "Account deleted successfully." }
    } catch (error) {
      const message = getErrorMessage(error);
      dispatch(setAlert(message, 'danger')); // Dispatch an alert with the error message
      return rejectWithValue(message);
    }
  }
);

// Thunk for requesting a company invitation
export const requestCompanyInvitation = createAsyncThunk(
  'auth/requestCompanyInvitation',
  async (invitationData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/request-invitation`, invitationData);
      // Dispatch an alert with the success message from the backend
      dispatch(setAlert(response.data.message || 'Invitation request submitted successfully.', 'success', 7000));
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      dispatch(setAlert(message, 'danger')); // Dispatch an alert with the error message
      return rejectWithValue(message);
    }
  }
);

// Thunk for checking if a user exists by email (for employer use)
export const checkUserByEmailForEmployer = createAsyncThunk(
  'auth/checkUserByEmailForEmployer',
  async (emailData, { getState, rejectWithValue }) => {
    const { token } = getState().auth; // Get token from Redux state
    if (!token) {
      // This should ideally not happen if the UI is only accessible to logged-in employers
      return rejectWithValue('Authentication required to check user.');
    }
    try {
      // The backend route is /api/auth/check-user
      const response = await axios.post(`${API_URL}/auth/check-user`, emailData, getAuthHeaders(token));
      return response.data; // Expected: { exists: true/false, user: {...} } or { exists: false }
    } catch (error) {
      const message = getErrorMessage(error);
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
    // State for prospective employee email check
    prospectiveEmployeeCheck: {
      status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
      error: null,    // Error message from check
      result: null,   // { canProceed, userExists, isEmployee, message }
    },
    // State for employer's check user by email
    employerCheckUser: {
      status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
      error: null,
      result: null,   // { exists: true/false, user: {...} }
    },
    // State for company invitation request
    companyInvitationRequest: {
      status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
      error: null,
      message: null,
    }
  },
  reducers: {
    // Handles user logout: clears user data, token, and resets auth flags.
    logout: (state) => {
      localStorage.removeItem('token'); // **CRUCIAL: Remove token from storage**
      delete axios.defaults.headers.common['Authorization']; // Remove auth header
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      state.prospectiveEmployeeCheck = { // Reset this on logout too
        status: 'idle',
        error: null,
        result: null,
      };
      state.employerCheckUser = { // Reset this on logout too
        status: 'idle',
        error: null,
        result: null,
      };
      state.companyInvitationRequest = { // Reset this on logout too
        status: 'idle',
        error: null,
        message: null,
      };
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
    },
    // Clears prospective employee check state
    clearProspectiveEmployeeCheck: (state) => {
      state.prospectiveEmployeeCheck = { status: 'idle', error: null, result: null };
    },
    // Clears employer's check user state
    clearEmployerCheckUser: (state) => {
      state.employerCheckUser = { status: 'idle', error: null, result: null };
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
            // This is for direct user self-registration
            state.isAuthenticated = true;
            state.user = action.payload.user;
            state.token = action.payload.token;
            localStorage.setItem('token', action.payload.token);
        } else { 
            // This case is when an employer registers a new employee.
            // The employer's auth state (isAuthenticated, user, token) should NOT change.
            // The new employee user is created, but the employer remains logged in.
            // Preserve the current authentication state of the employer.
            // No change needed to state.isAuthenticated, state.user, or state.token here.
        }
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
        // Do not clear the employer's token if their attempt to register an employee fails.
        // state.token = null; 
        // localStorage.removeItem('token'); 
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
      })
      // Check prospective employee email
      .addCase(checkProspectiveEmployee.pending, (state) => {
        state.prospectiveEmployeeCheck = { status: 'loading', error: null, result: null };
      })
      .addCase(checkProspectiveEmployee.fulfilled, (state, action) => {
        state.prospectiveEmployeeCheck = { status: 'succeeded', error: null, result: action.payload };
      })
      .addCase(checkProspectiveEmployee.rejected, (state, action) => {
        state.prospectiveEmployeeCheck = { 
          status: 'failed', 
          error: action.payload?.message || 'Error checking email.', 
          result: action.payload // Store the full payload which might include canProceed: false
        };
      })
      // Request account deletion link actions
      .addCase(requestAccountDeletionLink.pending, (state) => {
        state.isLoading = true; // You might want a specific loading state, e.g., state.isRequestingDeletionLinkLoading
        state.error = null;
      })
      .addCase(requestAccountDeletionLink.fulfilled, (state, action) => {
        state.isLoading = false;
        // Success message is handled by the alert dispatched in the thunk
      })
      .addCase(requestAccountDeletionLink.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload; // Error message from rejectWithValue
      })
      // Confirm account deletion actions
      .addCase(confirmAccountDeletion.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(confirmAccountDeletion.fulfilled, (state, action) => {
        state.isLoading = false;
        // User will be logged out by the component.
        // State related to user, token, isAuthenticated will be cleared by the logout action.
      })
      .addCase(confirmAccountDeletion.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload; // Error message from rejectWithValue
      })
      // Check user by email for employer actions
      .addCase(checkUserByEmailForEmployer.pending, (state) => {
        state.employerCheckUser = { status: 'loading', error: null, result: null };
      })
      .addCase(checkUserByEmailForEmployer.fulfilled, (state, action) => {
        state.employerCheckUser = { status: 'succeeded', error: null, result: action.payload };
      })
      .addCase(checkUserByEmailForEmployer.rejected, (state, action) => {
        state.employerCheckUser = { status: 'failed', error: action.payload, result: null };
      });
      // Request company invitation actions
      builder.addCase(requestCompanyInvitation.pending, (state) => {
        state.companyInvitationRequest = { status: 'loading', error: null, message: null };
      })
      .addCase(requestCompanyInvitation.fulfilled, (state, action) => {
        state.companyInvitationRequest = { status: 'succeeded', error: null, message: action.payload.message };
      })
      .addCase(requestCompanyInvitation.rejected, (state, action) => {
        state.companyInvitationRequest = { status: 'failed', error: action.payload, message: null };
      });
  },
});

// Export synchronous actions for use in components or other thunks.
export const {
  logout, setAuth, setAuthLoading, setAuthError, clearAuthError, clearProspectiveEmployeeCheck, clearEmployerCheckUser
} = authSlice.actions;

// Export the reducer to be included in the store.
export default authSlice.reducer;

// Selectors to access parts of the auth state from components.
// These help keep components decoupled from the exact state structure.
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthUser = (state) => state.auth.user;
export const selectAuthToken = (state) => state.auth.token;
export const selectIsAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectProspectiveEmployeeCheck = (state) => state.auth.prospectiveEmployeeCheck;
export const selectEmployerCheckUser = (state) => state.auth.employerCheckUser; // Selector for the new state
export const selectCompanyInvitationRequest = (state) => state.auth.companyInvitationRequest; // Selector for invitation request state

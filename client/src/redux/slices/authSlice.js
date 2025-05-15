// /home/digilab/timesheet/client/src/redux/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { setAlert } from './alertSlice'; // Import setAlert
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

// Helper to get authorization headers (less needed now with default headers)
const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// Helper to extract a user-friendly error message
const getErrorMessage = (error) => {
  return error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred';
};

// Helper to normalize user data, ensuring 'id' property exists
const normalizeUserData = (userData) => {
  if (!userData) return null;
  // Ensure 'id' property exists, using '_id' if 'id' is not directly present
  return { ...userData, id: userData.id || userData._id };
};


// Thunk for user login
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      localStorage.setItem('token', response.data.token);
      // Set Axios default header immediately after successful login
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      return { ...response.data, user: normalizeUserData(response.data.user) }; // Normalize user data
    } catch (error) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

// Thunk for user registration
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      if (response.data.token) {
         localStorage.setItem('token', response.data.token);
         // Set Axios default header if registration also logs in
         axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
      // Normalize user data if present in the response (e.g., if registration also logs in)
      return response.data.user ? { ...response.data, user: normalizeUserData(response.data.user) } : response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

// Thunk for changing user password
export const changePassword = createAsyncThunk(
    'auth/changePassword',
    async (passwordData, { getState, rejectWithValue }) => {
        const { token } = getState().auth;
        if (!token) {
            return rejectWithValue('Authentication required.');
        }
        try {
            // Use default header, no need for getAuthHeaders here if default is set
            const response = await axios.put(`${API_URL}/auth/change-password`, passwordData, getAuthHeaders(token));
            return response.data;
        } catch (error) {
            const message = getErrorMessage(error);
            return rejectWithValue(message);
        }
    }
);

// Thunk to load user data if a token exists in localStorage
export const loadUserFromToken = createAsyncThunk(
    'auth/loadUserFromToken',
    async (_, { dispatch, rejectWithValue }) => {
        const token = localStorage.getItem('token');
        if (!token) {
            // If no token, just resolve null, setAuthError will handle state reset
            dispatch(authSlice.actions.setAuthError('No authentication token found.'));
            return rejectWithValue('No authentication token found.');
        }
        // Set the default Authorization header for subsequent requests like /api/auth/me
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        dispatch(authSlice.actions.setAuthLoading());
        try {
            const response = await axios.get(`${API_URL}/auth/me`); // Uses default header now
            const normalizedUser = normalizeUserData(response.data); // Normalize user data
            dispatch(authSlice.actions.setAuth({ user: normalizedUser, token }));
            return normalizedUser;
        } catch (error) {
             console.error("AuthSlice: Token validation failed:", getErrorMessage(error));
             // Dispatch setAuthError to clear state and token
             dispatch(authSlice.actions.setAuthError(getErrorMessage(error)));
             return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Thunk for updating user profile information
export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) {
        return rejectWithValue('Authentication required.');
    }
    try {
      // Use default header
      const response = await axios.put(`${API_URL}/users/profile`, userData, getAuthHeaders(token));
      return normalizeUserData(response.data); // Normalize updated user data
    } catch (err) {
      const message = getErrorMessage(err);
      return rejectWithValue(message);
    }
  }
);

// Thunk for initiating password reset process (forgot password)
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (emailData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, emailData);
      return response.data;
    } catch (err) {
      const message = getErrorMessage(err);
      return rejectWithValue(message);
    }
  }
);

// Thunk for resetting password using a token (received via email link)
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/auth/reset-password/${token}`, { newPassword });
      return response.data;
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
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || { message: 'Failed to check email status.' };
      return rejectWithValue(errorData);
    }
  }
);

// Thunk for requesting account deletion link
export const requestAccountDeletionLink = createAsyncThunk(
  'auth/requestDeletionLink',
  async (_, { dispatch, rejectWithValue }) => {
    const token = localStorage.getItem('token');
    if (!token) {
        return rejectWithValue('Authentication required to request account deletion.');
    }
    try {
      // Use default header
      const response = await axios.post(`${API_URL}/auth/request-deletion-link`, {}, getAuthHeaders(token));
      dispatch(setAlert(response.data.message || 'Account deletion link sent. Please check your email.', 'success', 10000));
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      dispatch(setAlert(message, 'danger'));
      return rejectWithValue(message);
    }
  }
);

// Thunk for confirming account deletion with token and password
export const confirmAccountDeletion = createAsyncThunk(
  'auth/confirmAccountDeletion',
  async ({ token, password }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/confirm-delete-account/${token}`, { password });
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      dispatch(setAlert(message, 'danger'));
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
      dispatch(setAlert(response.data.message || 'Invitation request submitted successfully.', 'success', 7000));
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      dispatch(setAlert(message, 'danger'));
      return rejectWithValue(message);
    }
  }
);

// Thunk for checking if a user exists by email (for employer use)
export const checkUserByEmailForEmployer = createAsyncThunk(
  'auth/checkUserByEmailForEmployer',
  async (emailData, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) {
      return rejectWithValue('Authentication required to check user.');
    }
    try {
      // Use default header
      const response = await axios.post(`${API_URL}/auth/check-user`, emailData, getAuthHeaders(token));
      // Normalize user data if present in the response
      return response.data.user ? { ...response.data, user: normalizeUserData(response.data.user) } : response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: !!localStorage.getItem('token'),
    error: null, // General auth error
    isTabletViewUnlocked: false, // New state flag
    prospectiveEmployeeCheck: {
      status: 'idle',
      error: null,
      result: null,
    },
    employerCheckUser: {
      status: 'idle',
      error: null,
      result: null,
    },
    companyInvitationRequest: {
      status: 'idle',
      error: null,
      message: null,
    }
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      state.isTabletViewUnlocked = false; // Reset on logout
      state.prospectiveEmployeeCheck = { status: 'idle', error: null, result: null };
      state.employerCheckUser = { status: 'idle', error: null, result: null };
      state.companyInvitationRequest = { status: 'idle', error: null, message: null };
    },
    setAuth: (state, action) => {
        state.user = normalizeUserData(action.payload.user); // Normalize user data
        state.token = action.payload.token;
        // Ensure Axios default header is set whenever auth state is definitively set
        // This is crucial if setAuth is called from places other than thunks that already set it.
        axios.defaults.headers.common['Authorization'] = `Bearer ${action.payload.token}`;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
    },
    setAuthLoading: (state) => {
        state.isLoading = true;
        state.error = null;
    },
    setAuthError: (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        localStorage.removeItem('token');
        state.user = null;
        state.token = null;
        delete axios.defaults.headers.common['Authorization']; // Ensure header is cleared on auth error too
        state.isTabletViewUnlocked = false; // Reset on auth error
        state.isAuthenticated = false;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    clearProspectiveEmployeeCheck: (state) => {
      state.prospectiveEmployeeCheck = { status: 'idle', error: null, result: null };
    },
    clearEmployerCheckUser: (state) => {
      state.employerCheckUser = { status: 'idle', error: null, result: null };
    },
    // New action to set the tablet view unlocked state
    setTabletViewUnlocked: (state, action) => {
      state.isTabletViewUnlocked = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user; // Already normalized by the thunk
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        localStorage.removeItem('token');
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.token) {
            state.isAuthenticated = true;
            state.user = action.payload.user; // Already normalized by the thunk if present
            state.token = action.payload.token;
            localStorage.setItem('token', action.payload.token);
        }
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        // Keep existing auth state if employer registration fails
        // state.isAuthenticated = false;
        // state.user = null;
      })
      .addCase(loadUserFromToken.pending, (state) => {
        // isLoading is managed by setAuthLoading
      })
      .addCase(loadUserFromToken.fulfilled, (state, action) => {
        // Handled by setAuth if successful, or setAuthError if failed within the thunk
        if (action.payload === null && !state.error) { // Only set isLoading if no token and no prior error
            state.isLoading = false;
        }
      })
      .addCase(loadUserFromToken.rejected, (state, action) => {
        // Handled by setAuthError within the thunk
      })
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.isLoading = false;
        localStorage.removeItem('token');
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          // action.payload is already normalized user data
          state.user = { ...state.user, ...action.payload };
        }
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
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
          result: action.payload
        };
      })
      .addCase(requestAccountDeletionLink.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestAccountDeletionLink.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(requestAccountDeletionLink.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(confirmAccountDeletion.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(confirmAccountDeletion.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(confirmAccountDeletion.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(checkUserByEmailForEmployer.pending, (state) => {
        state.employerCheckUser = { status: 'loading', error: null, result: null };
      })
      .addCase(checkUserByEmailForEmployer.fulfilled, (state, action) => {
        // action.payload is already normalized if user exists
        state.employerCheckUser = { status: 'succeeded', error: null, result: action.payload };
      })
      .addCase(checkUserByEmailForEmployer.rejected, (state, action) => {
        state.employerCheckUser = { status: 'failed', error: action.payload, result: null };
      });
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

export const {
  logout, setAuth, setAuthLoading, setAuthError, clearAuthError, clearProspectiveEmployeeCheck, clearEmployerCheckUser, setTabletViewUnlocked // Export the new action
} = authSlice.actions;

export default authSlice.reducer;

export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthUser = (state) => state.auth.user;
export const selectAuthToken = (state) => state.auth.token;
export const selectIsAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectProspectiveEmployeeCheck = (state) => state.auth.prospectiveEmployeeCheck;
export const selectEmployerCheckUser = (state) => state.auth.employerCheckUser;
export const selectCompanyInvitationRequest = (state) => state.auth.companyInvitationRequest;
export const selectIsTabletViewUnlocked = (state) => state.auth.isTabletViewUnlocked; // New selector

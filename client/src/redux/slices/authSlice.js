// /home/digilab/timesheet/client/src/redux/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { setAlert } from './alertSlice';
import axios from 'axios';

const API_URL = 'https://192.168.1.47:5000/api';

// Helpers
const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});
const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred';
const normalizeUserData = (userData) => userData ? { ...userData, id: userData.id || userData._id } : null;

// Thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, credentials);
      localStorage.setItem('token', response.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      return { ...response.data, user: normalizeUserData(response.data.user) };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
      return response.data.user ? { ...response.data, user: normalizeUserData(response.data.user) } : response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (passwordData, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.put(`${API_URL}/auth/change-password`, passwordData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const loadUserFromToken = createAsyncThunk(
  'auth/loadUserFromToken',
  async (_, { dispatch, rejectWithValue }) => {
    const token = localStorage.getItem('token');
    if (!token) {
      dispatch(authSlice.actions.setAuthError('No authentication token found.'));
      return rejectWithValue('No authentication token found.');
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    dispatch(authSlice.actions.setAuthLoading());
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      const normalizedUser = normalizeUserData(response.data);
      dispatch(authSlice.actions.setAuth({ user: normalizedUser, token }));
      return normalizedUser;
    } catch (error) {
      dispatch(authSlice.actions.setAuthError(getErrorMessage(error)));
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.put(`${API_URL}/users/profile`, userData, getAuthHeaders(token));
      return normalizeUserData(response.data);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (emailData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, emailData);
      return response.data;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/auth/reset-password/${token}`, { newPassword });
      return response.data;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

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

export const requestAccountDeletionLink = createAsyncThunk(
  'auth/requestDeletionLink',
  async (_, { dispatch, rejectWithValue }) => {
    const token = localStorage.getItem('token');
    if (!token) return rejectWithValue('Authentication required to request account deletion.');
    try {
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

export const checkUserByEmailForEmployer = createAsyncThunk(
  'auth/checkUserByEmailForEmployer',
  async (emailData, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required to check user.');
    try {
      const response = await axios.post(`${API_URL}/auth/check-user`, emailData, getAuthHeaders(token));
      return response.data.user ? { ...response.data, user: normalizeUserData(response.data.user) } : response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    isLoading: !!localStorage.getItem('token'),
    error: null,
    isTabletViewUnlocked: false,
    prospectiveEmployeeCheck: { status: 'idle', error: null, result: null },
    employerCheckUser: { status: 'idle', error: null, result: null },
    companyInvitationRequest: { status: 'idle', error: null, message: null }
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
      state.isTabletViewUnlocked = false;
      state.prospectiveEmployeeCheck = { status: 'idle', error: null, result: null };
      state.employerCheckUser = { status: 'idle', error: null, result: null };
      state.companyInvitationRequest = { status: 'idle', error: null, message: null };
    },
    setAuth: (state, action) => {
      state.user = normalizeUserData(action.payload.user);
      state.token = action.payload.token;
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
      delete axios.defaults.headers.common['Authorization'];
      state.isTabletViewUnlocked = false;
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
        state.user = action.payload.user;
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
          state.user = action.payload.user;
          state.token = action.payload.token;
          localStorage.setItem('token', action.payload.token);
        }
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(loadUserFromToken.pending, (state) => {
        // handled by setAuthLoading
      })
      .addCase(loadUserFromToken.fulfilled, (state, action) => {
        if (action.payload === null && !state.error) {
          state.isLoading = false;
        }
      })
      .addCase(loadUserFromToken.rejected, (state, action) => {})
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
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
      .addCase(forgotPassword.fulfilled, (state) => {
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
      .addCase(resetPassword.fulfilled, (state) => {
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
      .addCase(requestAccountDeletionLink.fulfilled, (state) => {
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
      .addCase(confirmAccountDeletion.fulfilled, (state) => {
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
  logout, setAuth, setAuthLoading, setAuthError, clearAuthError, clearProspectiveEmployeeCheck, clearEmployerCheckUser, setTabletViewUnlocked
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthUser = (state) => state.auth.user;
export const selectAuthToken = (state) => state.auth.token;
export const selectIsAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;
export const selectProspectiveEmployeeCheck = (state) => state.auth.prospectiveEmployeeCheck;
export const selectEmployerCheckUser = (state) => state.auth.employerCheckUser;
export const selectCompanyInvitationRequest = (state) => state.auth.companyInvitationRequest;
export const selectIsTabletViewUnlocked = (state) => state.auth.isTabletViewUnlocked;
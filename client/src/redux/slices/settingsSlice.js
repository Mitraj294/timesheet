import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { setAlert } from './alertSlice'; // Assuming setAlert is available

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api'; // **IMPORTANT: Update with your actual API URL**

// Helper to get auth headers
const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// Helper to extract error message
const getErrorMessage = (error) => {
  return error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred';
};

// Async Thunk to fetch employer settings
export const fetchEmployerSettings = createAsyncThunk(
  'settings/fetchEmployerSettings',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token, user } = getState().auth;
      if (!token || user?.role !== 'employer') {
        return rejectWithValue('Not authorized or not an employer.');
      }
      // **IMPORTANT: Update endpoint** - e.g., /api/settings/employer
      const response = await axios.get(`${API_URL}/settings/employer`, getAuthHeaders(token));
      return response.data; // Expected: { showVehiclesTabInSidebar: boolean, ...otherSettings }
    } catch (error) {
      const message = getErrorMessage(error);
      return rejectWithValue(message);
    }
  }
);

// Async Thunk to update employer settings
export const updateEmployerSettings = createAsyncThunk(
  'settings/updateEmployerSettings',
  async (settingsData, { getState, dispatch, rejectWithValue }) => {
    try {
      const { token, user } = getState().auth;
      if (!token || user?.role !== 'employer') {
        return rejectWithValue('Not authorized or not an employer.');
      }
      // **IMPORTANT: Update endpoint** - e.g., /api/settings/employer
      const response = await axios.put(`${API_URL}/settings/employer`, settingsData, getAuthHeaders(token));
      dispatch(setAlert('Settings updated successfully!', 'success'));
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      dispatch(setAlert(`Failed to save settings: ${message}`, 'danger'));
      return rejectWithValue(message);
    }
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState: {
    employerSettings: {
      showVehiclesTabInSidebar: true, // Default value
    },
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployerSettings.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchEmployerSettings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.employerSettings = { ...state.employerSettings, ...action.payload };
      })
      .addCase(fetchEmployerSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(updateEmployerSettings.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateEmployerSettings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.employerSettings = { ...state.employerSettings, ...action.payload };
      })
      .addCase(updateEmployerSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default settingsSlice.reducer;

// Selectors
export const selectEmployerSettings = (state) => state.settings.employerSettings;
export const selectSettingsStatus = (state) => state.settings.status;
export const selectSettingsError = (state) => state.settings.error;
export const selectShowVehiclesTabInSidebar = (state) => state.settings.employerSettings.showVehiclesTabInSidebar;
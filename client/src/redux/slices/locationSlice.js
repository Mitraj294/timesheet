import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const getAuthHeaders = (token) => {
  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};
};

const getErrorMessage = (error) => {
    return error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';
}

// Async Thunk for fetching location data
export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) {
        console.error("fetchLocations: No token found in Redux state.");
        return rejectWithValue('Not authorized, no token provided');
      }

      const config = getAuthHeaders(token);
      // Pass query parameters (startDate, endDate, employeeId)
      config.params = params;

      console.log("fetchLocations: Fetching from", `${API_URL}/locations`, "with params:", params);
      const response = await axios.get(`${API_URL}/locations`, config);

      // Assuming the API returns an array of location objects
      return response.data || [];

    } catch (error) {
      console.error("Error fetching locations:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const initialState = {
  items: [], // Store location data here
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const locationSlice = createSlice({
  name: 'locations',
  initialState,
  reducers: {
    clearLocationError: (state) => {
      state.error = null;
      if (state.status === 'failed') {
          state.status = 'idle';
      }
    },
    clearLocations: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLocations.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload; // Assuming payload is the array of locations
        state.error = null;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.items = []; // Clear items on error
      });
  },
});

export const { clearLocationError, clearLocations } = locationSlice.actions;

export default locationSlice.reducer;

// Selectors
export const selectAllLocations = (state) => state.locations.items;
export const selectLocationStatus = (state) => state.locations.status;
export const selectLocationError = (state) => state.locations.error;
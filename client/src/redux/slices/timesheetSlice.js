// /home/digilab/timesheet/client/src/redux/slices/timesheetSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Define the API URL
const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// Helper to get auth headers
const getAuthHeaders = (token) => {
  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};
};

// Helper function to extract error messages
const getErrorMessage = (error) => {
    return error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';
}

// --- Async Thunks ---

// Fetch timesheets (potentially with filtering/pagination params in the future)
export const fetchTimesheets = createAsyncThunk(
  'timesheets/fetchTimesheets',
  async (params = {}, { getState, rejectWithValue }) => { // Accept optional params object
    try {
      const { token } = getState().auth; // Get token from Redux state

      if (!token) {
        console.error("fetchTimesheets: No token found in Redux state.");
        return rejectWithValue('Not authorized, no token provided');
      }

      const config = getAuthHeaders(token);
      // Add query parameters if provided
      config.params = params;

      console.log("fetchTimesheets: Fetching from", `${API_URL}/timesheets`, "with params:", params);
      const response = await axios.get(`${API_URL}/timesheets`, config);

      // Assuming the API returns an object like:
      // { timesheets: [], totalHours: 0, avgHours: 0, ... }
      return response.data; // Return the whole payload

    } catch (error) {
      console.error("Error fetching timesheets:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Note: Add thunks for createTimesheet, updateTimesheet, deleteTimesheet here
// following the pattern used in employeeSlice and projectSlice if needed.
// Example:
/*
export const createTimesheet = createAsyncThunk(
  'timesheets/createTimesheet',
  async (timesheetData, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Not authorized');
      const response = await axios.post(`${API_URL}/timesheets`, timesheetData, getAuthHeaders(token));
      return response.data; // Assuming backend returns the created timesheet
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);
*/

// --- Slice Definition ---

const initialState = {
  timesheets: [],
  totalHours: 0,
  avgHours: 0,
  avgLunchBreak: 0, // Added based on old reducer
  totalExpectedHours: 0, // Added based on old reducer
  avgExpectedHours: 0, // Added based on old reducer
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const timesheetSlice = createSlice({
  name: 'timesheets',
  initialState,
  reducers: {
    // Synchronous action to clear errors
    clearTimesheetError: (state) => {
      state.error = null;
      if (state.status === 'failed') {
          state.status = 'idle';
      }
    },
    // Potentially add action to clear timesheets on logout or other events
    clearTimesheets: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // --- fetchTimesheets ---
      .addCase(fetchTimesheets.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTimesheets.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Update state with the entire payload from the API
        state.timesheets = action.payload.timesheets || [];
        state.totalHours = action.payload.totalHours || 0;
        state.avgHours = action.payload.avgHours || 0;
        state.avgLunchBreak = action.payload.avgLunchBreak || 0;
        state.totalExpectedHours = action.payload.totalExpectedHours || 0;
        state.avgExpectedHours = action.payload.avgExpectedHours || 0;
        state.error = null;
      })
      .addCase(fetchTimesheets.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload; // Error message from rejectWithValue
        // Optionally clear data on failure
        // state.timesheets = [];
        // state.totalHours = 0;
        // ... reset other fields
      });
      // Add cases for createTimesheet, updateTimesheet, deleteTimesheet if implemented
      /*
      .addCase(createTimesheet.fulfilled, (state, action) => {
          // Decide how to update state: refetch or add manually?
          // Adding manually might be okay if payload is complete
          state.timesheets.push(action.payload);
          // Note: Summary fields (totalHours etc.) might become stale here
          // Consider refetching or recalculating if precise summaries are needed immediately
      })
      */
  },
});

// --- Exports ---
export const { clearTimesheetError, clearTimesheets } = timesheetSlice.actions;

export default timesheetSlice.reducer;

// Optional: Selectors
export const selectAllTimesheets = (state) => state.timesheets.timesheets; // Ensure store key is 'timesheets'
export const selectTimesheetStatus = (state) => state.timesheets.status;
export const selectTimesheetError = (state) => state.timesheets.error;
// Selectors for summary data
export const selectTotalHours = (state) => state.timesheets.totalHours;
export const selectAvgHours = (state) => state.timesheets.avgHours;
export const selectAvgLunchBreak = (state) => state.timesheets.avgLunchBreak;
// Add other summary selectors as needed

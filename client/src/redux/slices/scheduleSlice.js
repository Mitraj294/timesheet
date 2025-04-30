// /home/digilab/timesheet/client/src/redux/slices/scheduleSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
});

const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';

// --- Async Thunks ---

export const fetchSchedules = createAsyncThunk(
  'schedules/fetchSchedules',
  async ({ weekStart }, { getState, rejectWithValue }) => { // Expect weekStart param
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const config = getAuthHeaders(token);
      config.params = { weekStart }; // Add weekStart as query param
      const response = await axios.get(`${API_URL}/schedules`, config);
      return response.data || [];
    } catch (error) {
      console.error("Error fetching schedules:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const bulkCreateSchedules = createAsyncThunk(
  'schedules/bulkCreateSchedules',
  async (schedulePayloads, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      // Assuming backend endpoint is /schedules/bulk
      const response = await axios.post(`${API_URL}/schedules/bulk`, schedulePayloads, getAuthHeaders(token));
      return response.data; // Expecting created schedules back, or just a success message
    } catch (error) {
      console.error("Error bulk creating schedules:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteSchedule = createAsyncThunk(
  'schedules/deleteSchedule',
  async (scheduleId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      await axios.delete(`${API_URL}/schedules/${scheduleId}`, getAuthHeaders(token));
      return scheduleId; // Return ID for reducer
    } catch (error) {
      console.error("Error deleting schedule:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteSchedulesByDateRange = createAsyncThunk(
  'schedules/deleteSchedulesByDateRange',
  async ({ startDate, endDate }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      // Assuming backend endpoint is /schedules/deleteByDateRange
      await axios.delete(`${API_URL}/schedules/deleteByDateRange`, {
        data: { startDate, endDate }, // Send data in the body for DELETE
        headers: { Authorization: `Bearer ${token}` },
      });
      return { startDate, endDate }; // Return range for potential reducer logic
    } catch (error) {
      console.error("Error deleting schedules by date range:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// --- Slice Definition ---

const initialState = {
  items: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const scheduleSlice = createSlice({
  name: 'schedules',
  initialState,
  reducers: {
    clearScheduleError: (state) => {
      state.error = null;
      if (state.status === 'failed') state.status = 'idle';
    },
    clearSchedules: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchSchedules.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(fetchSchedules.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload; })
      .addCase(fetchSchedules.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      // Bulk Create (might just refetch or optimistically update)
      .addCase(bulkCreateSchedules.pending, (state) => { state.status = 'loading'; })
      .addCase(bulkCreateSchedules.fulfilled, (state, action) => { state.status = 'succeeded'; /* Optionally update state.items or rely on refetch */ })
      .addCase(bulkCreateSchedules.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      // Delete
      .addCase(deleteSchedule.pending, (state) => { state.status = 'loading'; })
      .addCase(deleteSchedule.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = state.items.filter(sch => sch._id !== action.payload); })
      .addCase(deleteSchedule.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      // Delete by Range (usually requires refetch)
      .addCase(deleteSchedulesByDateRange.pending, (state) => { state.status = 'loading'; })
      .addCase(deleteSchedulesByDateRange.fulfilled, (state) => { state.status = 'succeeded'; /* Rely on refetch */ })
      .addCase(deleteSchedulesByDateRange.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; });
  },
});

export const { clearScheduleError, clearSchedules } = scheduleSlice.actions;
export default scheduleSlice.reducer;

// --- Selectors ---
export const selectAllSchedules = (state) => state.schedules.items;
export const selectScheduleStatus = (state) => state.schedules.status;
export const selectScheduleError = (state) => state.schedules.error;
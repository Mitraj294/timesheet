// /home/digilab/timesheet/client/src/redux/slices/scheduleSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

// Helpers
const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
});
const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';

// Thunks
export const fetchSchedules = createAsyncThunk(
  'schedules/fetchSchedules',
  async ({ weekStart }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const config = getAuthHeaders(token);
      config.params = { weekStart };
      const response = await axios.get(`${API_URL}/schedules`, config);
      return response.data || [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const bulkCreateSchedules = createAsyncThunk(
  'schedules/bulkCreateSchedules',
  async (schedulePayloads, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.post(`${API_URL}/schedules/bulk`, schedulePayloads, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteSchedule = createAsyncThunk(
  'schedules/deleteSchedule',
  async (scheduleId, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      await axios.delete(`${API_URL}/schedules/${scheduleId}`, getAuthHeaders(token));
      return scheduleId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteSchedulesByDateRange = createAsyncThunk(
  'schedules/deleteSchedulesByDateRange',
  async ({ startDate, endDate }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      await axios.delete(`${API_URL}/schedules/deleteByDateRange`, {
        data: { startDate, endDate },
        headers: { Authorization: `Bearer ${token}` },
      });
      return { startDate, endDate };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateSchedule = createAsyncThunk(
  'schedules/updateSchedule',
  async ({ id, scheduleData }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.put(`${API_URL}/schedules/${id}`, scheduleData, getAuthHeaders(token));
      return response.data.schedule;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const sendScheduleUpdateNotificationEmail = createAsyncThunk(
  'schedules/sendScheduleUpdateNotificationEmail',
  async (notificationData, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required to send schedule notifications.');
    try {
      const response = await axios.post(`${API_URL}/notifications/email`, notificationData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// State
const initialState = {
  items: [],
  status: 'idle',
  error: null,
};

// Slice
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
      .addCase(fetchSchedules.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSchedules.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload || [];
        state.error = null;
      })
      .addCase(fetchSchedules.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.items = [];
      })
      .addCase(bulkCreateSchedules.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(bulkCreateSchedules.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (Array.isArray(action.payload)) {
          state.items = state.items.concat(action.payload);
        }
        state.error = null;
      })
      .addCase(bulkCreateSchedules.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(deleteSchedule.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteSchedule.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(sch => sch._id !== action.payload);
        state.error = null;
      })
      .addCase(deleteSchedule.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(deleteSchedulesByDateRange.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteSchedulesByDateRange.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(deleteSchedulesByDateRange.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(updateSchedule.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateSchedule.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(sch => sch._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(updateSchedule.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(sendScheduleUpdateNotificationEmail.fulfilled, (state, action) => {
        // No state change needed
      });
  },
});

export const { clearScheduleError, clearSchedules } = scheduleSlice.actions;
export default scheduleSlice.reducer;

// Selectors
export const selectAllSchedules = (state) => state.schedules.items;
export const selectScheduleStatus = (state) => state.schedules.status;
export const selectScheduleError = (state) => state.schedules.error;
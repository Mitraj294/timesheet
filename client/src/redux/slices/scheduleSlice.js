// /home/digilab/timesheet/client/src/redux/slices/scheduleSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

// Creates authorization headers with Content-Type for JSON.
const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
});

// Extracts a user-friendly error message from an API error.
const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';

//  Async Thunks 
// Fetches schedules, filtered by weekStart. Requires authentication.
// weekStart: The starting date of the week for which to fetch schedules.
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

// Bulk creates multiple schedule entries. Requires authentication.
// schedulePayloads: An array of schedule objects to be created.
export const bulkCreateSchedules = createAsyncThunk(
  'schedules/bulkCreateSchedules',
  async (schedulePayloads, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      // Assuming backend endpoint is /schedules/bulk
      const response = await axios.post(`${API_URL}/schedules/bulk`, schedulePayloads, getAuthHeaders(token));
      return response.data; // Expecting created schedules back.
    } catch (error) {
      console.error("Error bulk creating schedules:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Deletes a single schedule entry by its ID. Requires authentication.
// scheduleId: The ID of the schedule to delete.
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

// Deletes multiple schedule entries within a given date range. Requires authentication.
// startDate: The start of the date range.
// endDate: The end of the date range.
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

// Updates an existing schedule entry. Requires authentication.
// params.id: ID of the schedule to update.
// params.scheduleData: New data for the schedule.
export const updateSchedule = createAsyncThunk(
  'schedules/updateSchedule',
  async ({ id, scheduleData }, { getState, rejectWithValue }) => { // Removed dispatch
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.put(`${API_URL}/schedules/${id}`, scheduleData, getAuthHeaders(token));
      const updatedSchedule = response.data.schedule; // Assuming backend returns { message, schedule }
      return updatedSchedule; // Return the updated schedule for the reducer
    } catch (error) {
      console.error("Error updating schedule:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for sending an email notification related to schedule changes/assignments
export const sendScheduleUpdateNotificationEmail = createAsyncThunk(
  'schedules/sendScheduleUpdateNotificationEmail',
  async (notificationData, { getState, rejectWithValue }) => {
    // notificationData: { recipientId, subject, message, details (optional) }
    try {
      const { token } = getState().auth;
      if (!token) {
        return rejectWithValue('Authentication required to send schedule notifications.');
      }
      // This thunk will call the generic notification endpoint
      const response = await axios.post(`${API_URL}/notifications/email`, notificationData, getAuthHeaders(token));
      return response.data; // e.g., { message: 'Notification sent successfully' }
    } catch (error) {
      console.error("Error sending schedule update email notification:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

//  Slice Definition 

// Note: We are not adding specific state for sendScheduleUpdateNotificationEmail status/error
// in this slice, as it's a fire-and-forget action from the component's perspective.

const initialState = {
  items: [], // List of all schedule entries for the selected period.
  status: 'idle', // Loading status for schedule operations ('idle' | 'loading' | 'succeeded' | 'failed').
  error: null, // Error message for schedule operations.
};

const scheduleSlice = createSlice({
  name: 'schedules',
  initialState,
  reducers: {
    // Clears schedule error and resets status if it was 'failed'.
    clearScheduleError: (state) => {
      state.error = null;
      if (state.status === 'failed') state.status = 'idle';
    },
    // Resets the schedules state to initial.
    clearSchedules: () => initialState,
  },
  extraReducers: (builder) => { // Handles async thunk actions
    builder
      // Fetch
      .addCase(fetchSchedules.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSchedules.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload || []; // Ensure items is an array
        state.error = null;
      })
      .addCase(fetchSchedules.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.items = []; // Clear items on error
      })
      // Bulk Create (might just refetch or optimistically update)
      .addCase(bulkCreateSchedules.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(bulkCreateSchedules.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // If backend returns the created items, add them. Otherwise, a refetch might be needed.
        if (Array.isArray(action.payload)) {
          state.items = state.items.concat(action.payload);
        }
        state.error = null;
      })
      .addCase(bulkCreateSchedules.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Delete
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
      // Delete by Range (usually requires refetch)
      .addCase(deleteSchedulesByDateRange.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteSchedulesByDateRange.fulfilled, (state) => {
        state.status = 'succeeded';
        // Typically, after a bulk delete by range, you'd refetch the schedules
        // or the backend could return the remaining items or IDs of deleted items.
        // For simplicity here, we assume a refetch will occur.
        state.error = null;
      })
      .addCase(deleteSchedulesByDateRange.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Update Schedule
      .addCase(updateSchedule.pending, (state) => {
        state.status = 'loading'; // Or a specific updateStatus
        state.error = null;
      })
      .addCase(updateSchedule.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(sch => sch._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateSchedule.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Cases for sendScheduleUpdateNotificationEmail (optional, if you need to track status)
      .addCase(sendScheduleUpdateNotificationEmail.fulfilled, (state, action) => {
        console.log('Schedule notification email sent:', action.payload?.message);
      });
  },
});

export const { clearScheduleError, clearSchedules } = scheduleSlice.actions;
export default scheduleSlice.reducer;

//  Selectors 
// Selects all schedule items.
export const selectAllSchedules = (state) => state.schedules.items;
// Selects the loading status for schedule operations.
export const selectScheduleStatus = (state) => state.schedules.status;
// Selects the error message for schedule operations.
export const selectScheduleError = (state) => state.schedules.error;
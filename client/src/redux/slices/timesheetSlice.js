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

export const fetchTimesheets = createAsyncThunk(
  'timesheets/fetchTimesheets',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      if (!token) {
        console.error("fetchTimesheets: No token found in Redux state.");
        return rejectWithValue('Not authorized, no token provided');
      }

      const config = getAuthHeaders(token);
      config.params = params;

      console.log("fetchTimesheets: Fetching from", `${API_URL}/timesheets`, "with params:", params);
      const response = await axios.get(`${API_URL}/timesheets`, config);

      return response.data;

    } catch (error) {
      console.error("Error fetching timesheets:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const initialState = {
  timesheets: [],
  totalHours: 0,
  avgHours: 0,
  status: 'idle',
  error: null,
};

const timesheetSlice = createSlice({
  name: 'timesheets',
  initialState,
  reducers: {
    clearTimesheetError: (state) => {
      state.error = null;
      if (state.status === 'failed') {
          state.status = 'idle';
      }
    },
    clearTimesheets: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTimesheets.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTimesheets.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.timesheets = action.payload.timesheets || [];
        state.totalHours = action.payload.totalHours || 0;
        state.avgHours = action.payload.avgHours || 0;
        state.error = null;
      })
      .addCase(fetchTimesheets.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearTimesheetError, clearTimesheets } = timesheetSlice.actions;

export default timesheetSlice.reducer;

export const selectAllTimesheets = (state) => state.timesheets.timesheets;
export const selectTimesheetStatus = (state) => state.timesheets.status;
export const selectTimesheetError = (state) => state.timesheets.error;
export const selectTotalHours = (state) => state.timesheets.totalHours;
export const selectAvgHours = (state) => state.timesheets.avgHours;

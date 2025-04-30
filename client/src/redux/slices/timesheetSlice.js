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

// Async Thunk for Deleting a Timesheet
export const deleteTimesheet = createAsyncThunk(
  'timesheets/deleteTimesheet',
  async (timesheetId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');

      await axios.delete(`${API_URL}/timesheets/${timesheetId}`, getAuthHeaders(token));
      return timesheetId; // Return the ID for reducer logic
    } catch (error) {
      console.error("Error deleting timesheet:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for Downloading Timesheet Report
export const downloadTimesheet = createAsyncThunk(
  'timesheets/downloadTimesheet',
  async (params, { getState, rejectWithValue }) => {
    const { employeeIds = [], startDate, endDate, timezone } = params;
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');

      const config = {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        responseType: 'blob', // Important for file download
      };
      const body = { employeeIds, startDate, endDate, timezone };

      const response = await axios.post(`${API_URL}/timesheets/download`, body, config);

      // Extract filename from header
      const contentDisposition = response.headers['content-disposition'];
      let filename = `timesheets_report.xlsx`; // Default
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }
      // Return blob and filename
      return { blob: response.data, filename };
    } catch (error) {
      console.error("Download timesheet report failed:", error);
      // Handle potential blob error response containing JSON
      if (error.response?.data instanceof Blob && error.response?.data.type.includes('json')) {
        try {
          const errorJson = JSON.parse(await error.response.data.text());
          return rejectWithValue(errorJson.message || errorJson.error || 'Failed to download report');
        } catch (parseError) { console.error("Could not parse error blob:", parseError); }
      }
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for Sending Timesheet Report via Email
export const sendTimesheet = createAsyncThunk(
  'timesheets/sendTimesheet',
  async (params, { getState, rejectWithValue }) => {
    const { email, employeeIds = [], startDate, endDate, timezone } = params;
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');

      const config = {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      };
      const body = { email, employeeIds, startDate, endDate, timezone };

      // The backend endpoint is '/timesheets/send'
      await axios.post(`${API_URL}/timesheets/send`, body, config);

      return { email }; // Return email on success for potential confirmation message
    } catch (error) {
      console.error("Send timesheet report failed:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for Downloading Project-Specific Timesheet Report
export const downloadProjectTimesheet = createAsyncThunk(
  'timesheets/downloadProjectTimesheet',
  async (params, { getState, rejectWithValue }) => {
    // Expects { projectIds: [...], employeeIds: [...], startDate, endDate, timezone }
    const { projectIds = [], employeeIds = [], startDate, endDate, timezone } = params;
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      if (!projectIds || projectIds.length === 0) return rejectWithValue('Project ID is required.');

      const config = {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        responseType: 'blob',
      };
      const body = { projectIds, employeeIds, startDate, endDate, timezone };

      const response = await axios.post(`${API_URL}/timesheets/download/project`, body, config); // Use project-specific endpoint

      const contentDisposition = response.headers['content-disposition'];
      let filename = `Project_Timesheets_Report.xlsx`; // Default
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }
      return { blob: response.data, filename };
    } catch (error) {
      console.error("Download project timesheet report failed:", error);
      if (error.response?.data instanceof Blob && error.response?.data.type.includes('json')) {
        try {
          const errorJson = JSON.parse(await error.response.data.text());
          return rejectWithValue(errorJson.message || errorJson.error || 'Failed to download report');
        } catch (parseError) { console.error("Could not parse error blob:", parseError); }
      }
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for Sending Project-Specific Timesheet Report via Email
export const sendProjectTimesheet = createAsyncThunk(
  'timesheets/sendProjectTimesheet',
  async (params, { getState, rejectWithValue }) => {
    // Expects { email, projectIds: [...], employeeIds: [...], startDate, endDate, timezone }
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      await axios.post(`${API_URL}/timesheets/send-email/project`, params, getAuthHeaders(token)); // Use project-specific endpoint
      return { email: params.email };
    } catch (error) {
      console.error("Send project timesheet report failed:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for Checking if a Timesheet Exists
export const checkTimesheetExists = createAsyncThunk(
  'timesheets/checkTimesheetExists',
  async ({ employee, date }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');

      const config = {
        headers: { Authorization: `Bearer ${token}` },
        params: { employee, date },
      };
      const response = await axios.get(`${API_URL}/timesheets/check`, config);
      return response.data; // { exists: boolean, timesheet: object | null }
    } catch (error) {
      console.error("Error checking timesheet existence:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for Creating a Timesheet
export const createTimesheet = createAsyncThunk(
  'timesheets/createTimesheet',
  async (timesheetData, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');

      const config = {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      };
      const response = await axios.post(`${API_URL}/timesheets`, timesheetData, config);
      return response.data; // { message: string, data: object }
    } catch (error) {
      console.error("Error creating timesheet:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for Updating a Timesheet
export const updateTimesheet = createAsyncThunk(
  'timesheets/updateTimesheet',
  async ({ id, timesheetData }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');

      const config = {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      };
      const response = await axios.put(`${API_URL}/timesheets/${id}`, timesheetData, config);
      return response.data; // { message: string, timesheet: object }
    } catch (error) {
      console.error("Error updating timesheet:", error);
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
  // Add specific state for download action
  downloadStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  downloadError: null,
  // Add specific state for project download action
  projectDownloadStatus: 'idle',
  projectDownloadError: null,
  // Add specific state for send action
  sendStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  sendError: null,
  // Add specific state for check/create/update actions
  checkStatus: 'idle',
  checkError: null,
  checkResult: null, // To store { exists: boolean, timesheet: object | null }
  createStatus: 'idle',
  // Add specific state for project send action
  projectSendStatus: 'idle',
  projectSendError: null,
  createError: null,
  updateStatus: 'idle',
  updateError: null,
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
    clearDownloadStatus: (state) => {
        state.downloadStatus = 'idle';
        state.downloadError = null;
    },
    clearProjectDownloadStatus: (state) => {
        state.projectDownloadStatus = 'idle';
        state.projectDownloadError = null;
    },
    clearProjectSendStatus: (state) => {
        state.projectSendStatus = 'idle';
        state.projectSendError = null;
    },
    clearSendStatus: (state) => {
        state.sendStatus = 'idle';
        state.sendError = null;
    },
    clearCheckStatus: (state) => {
        state.checkStatus = 'idle';
        state.checkError = null;
        state.checkResult = null;
    },
    clearCreateStatus: (state) => {
        state.createStatus = 'idle';
        state.createError = null;
    },
    clearUpdateStatus: (state) => {
        state.updateStatus = 'idle';
        state.updateError = null;
    },
    // Action to clear all timesheet data (e.g., on logout)
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
      })
      // --- deleteTimesheet ---
      .addCase(deleteTimesheet.pending, (state) => {
        // Optionally set a specific delete status: state.deleteStatus = 'loading';
        state.error = null; // Clear general error
      })
      .addCase(deleteTimesheet.fulfilled, (state, action) => {
        // state.deleteStatus = 'succeeded';
        state.timesheets = state.timesheets.filter(ts => ts._id !== action.payload);
      })
      .addCase(deleteTimesheet.rejected, (state, action) => {
        // state.deleteStatus = 'failed';
        state.error = action.payload; // Set general error
      })
      // --- downloadTimesheet ---
      .addCase(downloadTimesheet.pending, (state) => {
        state.downloadStatus = 'loading';
        state.downloadError = null;
      })
      .addCase(downloadTimesheet.fulfilled, (state) => {
        state.downloadStatus = 'succeeded';
        // Blob and filename are handled in the component upon success
      })
      .addCase(downloadTimesheet.rejected, (state, action) => {
        state.downloadStatus = 'failed';
        state.downloadError = action.payload;
      })
      // --- downloadProjectTimesheet ---
      .addCase(downloadProjectTimesheet.pending, (state) => {
        state.projectDownloadStatus = 'loading';
        state.projectDownloadError = null;
      })
      .addCase(downloadProjectTimesheet.fulfilled, (state) => {
        state.projectDownloadStatus = 'succeeded';
      })
      .addCase(downloadProjectTimesheet.rejected, (state, action) => {
        state.projectDownloadStatus = 'failed';
        state.projectDownloadError = action.payload;
      })
      // --- sendProjectTimesheet ---
      .addCase(sendProjectTimesheet.pending, (state) => {
        state.projectSendStatus = 'loading';
        state.projectSendError = null;
      })
      .addCase(sendProjectTimesheet.fulfilled, (state) => {
        state.projectSendStatus = 'succeeded';
      })
      .addCase(sendProjectTimesheet.rejected, (state, action) => {
        state.projectSendStatus = 'failed';
        state.projectSendError = action.payload;
      })
      // --- sendTimesheet ---
      .addCase(sendTimesheet.pending, (state) => {
        state.sendStatus = 'loading';
        state.sendError = null;
      })
      .addCase(sendTimesheet.fulfilled, (state) => {
        state.sendStatus = 'succeeded';
      })
      .addCase(sendTimesheet.rejected, (state, action) => {
        state.sendStatus = 'failed';
        state.sendError = action.payload;
      })
      // --- checkTimesheetExists ---
      .addCase(checkTimesheetExists.pending, (state) => {
        state.checkStatus = 'loading';
        state.checkError = null;
        state.checkResult = null;
      })
      .addCase(checkTimesheetExists.fulfilled, (state, action) => {
        state.checkStatus = 'succeeded';
        state.checkResult = action.payload;
      })
      .addCase(checkTimesheetExists.rejected, (state, action) => {
        state.checkStatus = 'failed';
        state.checkError = action.payload;
      })
      // --- createTimesheet ---
      .addCase(createTimesheet.pending, (state) => {
        state.createStatus = 'loading';
        state.createError = null;
      })
      .addCase(createTimesheet.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        // Optionally add the new timesheet to the state if needed immediately
        // state.timesheets.push(action.payload.data);
        // Or rely on a subsequent fetchTimesheets call
      })
      .addCase(createTimesheet.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = action.payload;
      });
  },
});

export default timesheetSlice.reducer;

export const selectAllTimesheets = (state) => state.timesheets.timesheets;
export const selectTimesheetStatus = (state) => state.timesheets.status;
export const selectTimesheetError = (state) => state.timesheets.error;
export const selectTotalHours = (state) => state.timesheets.totalHours;
export const selectAvgHours = (state) => state.timesheets.avgHours;
// Selectors for download state
export const selectTimesheetDownloadStatus = (state) => state.timesheets.downloadStatus;
export const selectTimesheetDownloadError = (state) => state.timesheets.downloadError;
// Selectors for project download state
export const selectTimesheetProjectDownloadStatus = (state) => state.timesheets.projectDownloadStatus;
export const selectTimesheetProjectDownloadError = (state) => state.timesheets.projectDownloadError;
// Selectors for send state
export const selectTimesheetSendStatus = (state) => state.timesheets.sendStatus;
export const selectTimesheetSendError = (state) => state.timesheets.sendError;
// Selectors for project send state
export const selectTimesheetProjectSendStatus = (state) => state.timesheets.projectSendStatus;
export const selectTimesheetProjectSendError = (state) => state.timesheets.projectSendError;
// Export all actions
export const {
    clearTimesheetError, clearTimesheets,
    clearDownloadStatus, clearSendStatus, clearProjectDownloadStatus, clearProjectSendStatus, // Export new clear actions
    clearCheckStatus, clearCreateStatus, clearUpdateStatus // Export new clear actions
} = timesheetSlice.actions;
// Selectors for check/create/update state
export const selectTimesheetCheckStatus = (state) => state.timesheets.checkStatus;
export const selectTimesheetCheckResult = (state) => state.timesheets.checkResult;
export const selectTimesheetCheckError = (state) => state.timesheets.checkError;
export const selectTimesheetCreateStatus = (state) => state.timesheets.createStatus;
export const selectTimesheetCreateError = (state) => state.timesheets.createError;
export const selectTimesheetUpdateStatus = (state) => state.timesheets.updateStatus;
export const selectTimesheetUpdateError = (state) => state.timesheets.updateError;

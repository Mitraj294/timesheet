// /home/digilab/timesheet/client/src/redux/slices/timesheetSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

// Creates authorization headers if a token is provided.
const getAuthHeaders = (token) => {
  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};
};

// Extracts a user-friendly error message from an API error.
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

// Deletes a Timesheet by its ID. Requires authentication.
// timesheetId: The ID of the timesheet to delete.
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

// Downloads Timesheet Report as an Excel file. Requires authentication.
// params: { employeeIds?, startDate, endDate, timezone }
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

// Sends Timesheet Report via Email. Requires authentication.
// params: { email, employeeIds?, startDate, endDate, timezone }
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

// Downloads Project-Specific Timesheet Report. Requires authentication.
// params: { projectIds, employeeIds?, startDate, endDate, timezone }
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

// Sends Project-Specific Timesheet Report via Email. Requires authentication.
// params: { email, projectIds, employeeIds?, startDate, endDate, timezone }
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

// Checks if a Timesheet Exists for a given employee and date. Requires authentication.
// params: { employee, date }
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

// Fetches all incomplete timesheets for a specific employee. Requires authentication.
// employeeId: The ID of the employee.
export const fetchIncompleteTimesheets = createAsyncThunk(
  'timesheets/fetchIncompleteTimesheets',
  async (employeeId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      if (!employeeId) return rejectWithValue('Employee ID is required.');

      const response = await axios.get(`${API_URL}/timesheets/employee/${employeeId}/incomplete`, getAuthHeaders(token));
      return response.data; // Expecting an array of incomplete timesheet objects
    } catch (error) {
      console.error("Error fetching incomplete timesheets:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);


// Creates a new Timesheet. Requires authentication.
// timesheetData: Data for the new timesheet.
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

// Updates an existing Timesheet. Requires authentication.
// params.id: ID of the timesheet to update.
// params.timesheetData: New data for the timesheet.
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

// Fetches a single Timesheet by its ID. Requires authentication.
// timesheetId: The ID of the timesheet.
export const fetchTimesheetById = createAsyncThunk(
  'timesheets/fetchTimesheetById',
  async (timesheetId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      // Assuming endpoint is GET /api/timesheets/:id
      const response = await axios.get(`${API_URL}/timesheets/${timesheetId}`, getAuthHeaders(token));
      return response.data; // Expecting the single timesheet object
    } catch (error) {
      console.error("Error fetching timesheet by ID:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Initial state for the timesheets slice.
const initialState = {
  timesheets: [], // List of timesheets for the selected period.
  totalHours: 0,  // Total hours for the fetched timesheets.
  avgHours: 0,    // Average hours for the fetched timesheets.
  status: 'idle', // General loading status for timesheet list operations.
  error: null,    // General error for timesheet list operations.

  downloadStatus: 'idle', // Status for general timesheet download.
  downloadError: null,    // Error for general timesheet download.

  projectDownloadStatus: 'idle', // Status for project-specific timesheet download.
  projectDownloadError: null,    // Error for project-specific timesheet download.

  sendStatus: 'idle', // Status for sending general timesheet report.
  sendError: null,    // Error for sending general timesheet report.

  projectSendStatus: 'idle', // Status for sending project-specific timesheet report.
  projectSendError: null,    // Error for sending project-specific timesheet report.

  checkStatus: 'idle',   // Status for checking timesheet existence.
  checkError: null,      // Error for checking timesheet existence.
  checkResult: null,     // Result of the timesheet existence check.

  createStatus: 'idle', // Status for creating a timesheet.
  createError: null,    // Error for creating a timesheet.

  updateStatus: 'idle', // Status for updating a timesheet.
  updateError: null,    // Error for updating a timesheet.

  currentTimesheet: null,        // Currently viewed/edited single timesheet.
  currentTimesheetStatus: 'idle',// Loading status for a single timesheet.
  currentTimesheetError: null,   // Error for single timesheet operations.

  incompleteTimesheets: [],      // List of incomplete timesheets for the logged-in user.
  incompleteStatus: 'idle',      // Status for fetching incomplete timesheets.
  incompleteError: null,         // Error for fetching incomplete timesheets.
};

const timesheetSlice = createSlice({
  name: 'timesheets',
  initialState,
  reducers: {
    clearTimesheetError: (state) => {
      // Clears general timesheet error and resets status if 'failed'.
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
    clearIncompleteStatus: (state) => {
        state.incompleteStatus = 'idle';
        state.incompleteError = null;
        state.incompleteTimesheets = [];
    },
    clearCreateStatus: (state) => {
        state.createStatus = 'idle';
        state.createError = null;
    },
    clearUpdateStatus: (state) => {
        state.updateStatus = 'idle';
        state.updateError = null;
    },
    // Clears the current single timesheet details.
    clearCurrentTimesheet: (state) => {
        state.currentTimesheet = null;
        state.currentTimesheetStatus = 'idle';
        state.currentTimesheetError = null;
    },
    // Resets the entire timesheet state to initial (e.g., on logout).
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
        state.timesheets = []; // Clear data on error
        state.totalHours = 0;
        state.avgHours = 0;
      })
      // --- deleteTimesheet ---
      .addCase(deleteTimesheet.pending, (state) => {
        state.status = 'loading'; // Use general status for list modification
        state.error = null;
      })
      .addCase(deleteTimesheet.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.timesheets = state.timesheets.filter(ts => ts._id !== action.payload);
        state.error = null;
      })
      .addCase(deleteTimesheet.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // --- downloadTimesheet ---
      .addCase(downloadTimesheet.pending, (state) => {
        state.downloadStatus = 'loading';
        state.downloadError = null;
      })
      .addCase(downloadTimesheet.fulfilled, (state, action) => {
        state.downloadStatus = 'succeeded';
        // Blob and filename are handled in the component upon success
        state.downloadError = null;
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
      .addCase(downloadProjectTimesheet.fulfilled, (state, action) => {
        state.projectDownloadStatus = 'succeeded';
        state.projectDownloadError = null;
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
      .addCase(sendProjectTimesheet.fulfilled, (state, action) => {
        state.projectSendStatus = 'succeeded';
        state.projectSendError = null;
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
      .addCase(sendTimesheet.fulfilled, (state, action) => {
        state.sendStatus = 'succeeded';
        state.sendError = null;
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
        state.checkError = null;
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
        state.createError = null;
        // Or rely on a subsequent fetchTimesheets call
      })
      .addCase(createTimesheet.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = action.payload;
      })
      // --- Add cases for fetchTimesheetById ---
      .addCase(fetchTimesheetById.pending, (state) => {
        state.currentTimesheetStatus = 'loading';
        state.currentTimesheetError = null;
        state.currentTimesheet = null; // Clear previous one while loading
      })
      .addCase(fetchTimesheetById.fulfilled, (state, action) => {
        state.currentTimesheetStatus = 'succeeded';
        state.currentTimesheet = action.payload; // Store the fetched timesheet
        state.currentTimesheetError = null;
      })
      .addCase(fetchTimesheetById.rejected, (state, action) => {
        state.currentTimesheetStatus = 'failed';
        state.currentTimesheetError = action.payload;
        state.currentTimesheet = null;
      })
      // --- Add cases for updateTimesheet ---
      .addCase(updateTimesheet.pending, (state) => {
        state.updateStatus = 'loading';
        state.updateError = null;
      })
      .addCase(updateTimesheet.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        const index = state.timesheets.findIndex(ts => ts._id === action.payload.timesheet._id);
        if (index !== -1) {
          state.timesheets[index] = action.payload.timesheet;
        }
        // Also update currentTimesheet if it matches
        if (state.currentTimesheet?._id === action.payload.timesheet._id) {
            state.currentTimesheet = action.payload.timesheet;
        }
        state.updateError = null;
      })
      .addCase(updateTimesheet.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.updateError = action.payload;
      })
      // --- fetchIncompleteTimesheets ---
      .addCase(fetchIncompleteTimesheets.pending, (state) => {
        state.incompleteStatus = 'loading';
        state.incompleteError = null;
      })
      .addCase(fetchIncompleteTimesheets.fulfilled, (state, action) => {
        state.incompleteStatus = 'succeeded';
        state.incompleteTimesheets = action.payload;
      })
      .addCase(fetchIncompleteTimesheets.rejected, (state, action) => {
        state.incompleteStatus = 'failed';
        state.incompleteError = action.payload;
      });
  },
});

// Export main reducer
export default timesheetSlice.reducer;

// Export synchronous actions
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
// Export all clear actions
export const {
    clearTimesheetError, clearTimesheets,
    clearDownloadStatus, clearSendStatus, clearProjectDownloadStatus, clearProjectSendStatus,
    clearCheckStatus, clearCreateStatus, clearUpdateStatus, clearCurrentTimesheet,
    clearIncompleteStatus // Export the new clear action
} = timesheetSlice.actions;
// Selectors for check/create/update state
export const selectTimesheetCheckStatus = (state) => state.timesheets.checkStatus;
export const selectTimesheetCheckResult = (state) => state.timesheets.checkResult;
export const selectTimesheetCheckError = (state) => state.timesheets.checkError;
export const selectTimesheetCreateStatus = (state) => state.timesheets.createStatus;
export const selectTimesheetCreateError = (state) => state.timesheets.createError;
export const selectTimesheetUpdateStatus = (state) => state.timesheets.updateStatus;
export const selectTimesheetUpdateError = (state) => state.timesheets.updateError;
// Selectors for current single timesheet
export const selectCurrentTimesheet = (state) => state.timesheets.currentTimesheet;
export const selectCurrentTimesheetStatus = (state) => state.timesheets.currentTimesheetStatus;
export const selectCurrentTimesheetError = (state) => state.timesheets.currentTimesheetError;
// Selectors for incomplete timesheets
export const selectIncompleteTimesheets = (state) => state.timesheets.incompleteTimesheets;
export const selectIncompleteStatus = (state) => state.timesheets.incompleteStatus;
export const selectIncompleteError = (state) => state.timesheets.incompleteError;

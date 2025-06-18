// /home/digilab/timesheet/client/src/redux/slices/timesheetSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5000/api' : 'https://timesheet-c4mj.onrender.com/api');

// Helpers
const getAuthHeaders = (token) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : {};
const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';

// Thunks
export const fetchTimesheets = createAsyncThunk(
  'timesheets/fetchTimesheets',
  async (params = {}, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Not authorized, no token provided');
    try {
      const config = getAuthHeaders(token);
      config.params = params;
      const response = await axios.get(`${API_URL}/timesheets`, config);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteTimesheet = createAsyncThunk(
  'timesheets/deleteTimesheet',
  async (timesheetId, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      await axios.delete(`${API_URL}/timesheets/${timesheetId}`, getAuthHeaders(token));
      return timesheetId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const downloadTimesheet = createAsyncThunk(
  'timesheets/downloadTimesheet',
  async (params, { getState, rejectWithValue }) => {
    const { employeeIds = [], startDate, endDate, timezone } = params;
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        responseType: 'blob',
      };
      const body = { employeeIds, startDate, endDate, timezone };
      const response = await axios.post(`${API_URL}/timesheets/download`, body, config);
      const contentDisposition = response.headers['content-disposition'];
      let filename = null;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
        if (filenameMatch && filenameMatch[1]) filename = decodeURIComponent(filenameMatch[1]);
      }
      // Do not fallback to 'timesheets_report.xlsx', let frontend handle fallback
      return { blob: response.data, filename };
    } catch (error) {
      if (error.response?.data instanceof Blob && error.response?.data.type.includes('json')) {
        try {
          const errorJson = JSON.parse(await error.response.data.text());
          return rejectWithValue(errorJson.message || errorJson.error || 'Failed to download report');
        } catch {}
      }
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const sendTimesheet = createAsyncThunk(
  'timesheets/sendTimesheet',
  async (params, { getState, rejectWithValue }) => {
    const { email, employeeIds = [], startDate, endDate, timezone } = params;
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      };
      const body = { email, employeeIds, startDate, endDate, timezone };
      await axios.post(`${API_URL}/timesheets/send`, body, config);
      return { email };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const downloadProjectTimesheet = createAsyncThunk(
  'timesheets/downloadProjectTimesheet',
  async (params, { getState, rejectWithValue }) => {
    const { projectIds = [], employeeIds = [], startDate, endDate, timezone } = params;
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    if (!projectIds || projectIds.length === 0) return rejectWithValue('Project ID is required.');
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        responseType: 'blob',
      };
      const body = { projectIds, employeeIds, startDate, endDate, timezone };
      const response = await axios.post(`${API_URL}/timesheets/download/project`, body, config);
      const contentDisposition = response.headers['content-disposition'];
      let filename = `Project_Timesheets_Report.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
        if (filenameMatch && filenameMatch[1]) filename = decodeURIComponent(filenameMatch[1]);
      }
      return { blob: response.data, filename };
    } catch (error) {
      if (error.response?.data instanceof Blob && error.response?.data.type.includes('json')) {
        try {
          const errorJson = JSON.parse(await error.response.data.text());
          return rejectWithValue(errorJson.message || errorJson.error || 'Failed to download report');
        } catch {}
      }
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const sendProjectTimesheet = createAsyncThunk(
  'timesheets/sendProjectTimesheet',
  async (params, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      await axios.post(`${API_URL}/timesheets/send-email/project`, params, getAuthHeaders(token));
      return { email: params.email };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const checkTimesheetExists = createAsyncThunk(
  'timesheets/checkTimesheetExists',
  async ({ employee, date }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        params: { employee, date },
      };
      const response = await axios.get(`${API_URL}/timesheets/check`, config);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchIncompleteTimesheets = createAsyncThunk(
  'timesheets/fetchIncompleteTimesheets',
  async (employeeId, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    if (!employeeId) return rejectWithValue('Employee ID is required.');
    try {
      const response = await axios.get(`${API_URL}/timesheets/employee/${employeeId}/incomplete`, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createTimesheet = createAsyncThunk(
  'timesheets/createTimesheet',
  async (timesheetData, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      };
      const response = await axios.post(`${API_URL}/timesheets`, timesheetData, config);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateTimesheet = createAsyncThunk(
  'timesheets/updateTimesheet',
  async ({ id, timesheetData }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      };
      const response = await axios.put(`${API_URL}/timesheets/${id}`, timesheetData, config);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchTimesheetById = createAsyncThunk(
  'timesheets/fetchTimesheetById',
  async (timesheetId, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.get(`${API_URL}/timesheets/${timesheetId}`, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// State
const initialState = {
  timesheets: [],
  totalHours: 0,
  avgHours: 0,
  status: 'idle',
  error: null,
  downloadStatus: 'idle',
  downloadError: null,
  projectDownloadStatus: 'idle',
  projectDownloadError: null,
  sendStatus: 'idle',
  sendError: null,
  projectSendStatus: 'idle',
  projectSendError: null,
  checkStatus: 'idle',
  checkError: null,
  checkResult: null,
  createStatus: 'idle',
  createError: null,
  updateStatus: 'idle',
  updateError: null,
  currentTimesheet: null,
  currentTimesheetStatus: 'idle',
  currentTimesheetError: null,
  incompleteTimesheets: [],
  incompleteStatus: 'idle',
  incompleteError: null,
};

const timesheetSlice = createSlice({
  name: 'timesheets',
  initialState,
  reducers: {
    clearTimesheetError: (state) => {
      state.error = null;
      if (state.status === 'failed') state.status = 'idle';
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
      console.log("[timesheetSlice] Cleared project send status.");
    },
    clearSendStatus: (state) => {
      state.sendStatus = 'idle';
      state.sendError = null;
      console.log("[timesheetSlice] Cleared send status.");
    },
    clearCheckStatus: (state) => {
      state.checkStatus = 'idle';
      state.checkError = null;
      state.checkResult = null;
      console.log("[timesheetSlice] Cleared check status.");
    },
    clearIncompleteStatus: (state) => {
      state.incompleteStatus = 'idle';
      state.incompleteError = null;
      state.incompleteTimesheets = [];
      console.log("[timesheetSlice] Cleared incomplete status.");
    },
    clearCreateStatus: (state) => {
      state.createStatus = 'idle';
      state.createError = null;
      console.log("[timesheetSlice] Cleared create status.");
    },
    clearUpdateStatus: (state) => {
      state.updateStatus = 'idle';
      state.updateError = null;
      console.log("[timesheetSlice] Cleared update status.");
    },
    clearCurrentTimesheet: (state) => {
      state.currentTimesheet = null;
      state.currentTimesheetStatus = 'idle';
      state.currentTimesheetError = null;
      console.log("[timesheetSlice] Cleared current timesheet.");
    },
    clearTimesheets: () => {
      console.log("[timesheetSlice] Cleared all timesheets.");
      return initialState;
    },
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
        state.timesheets = [];
        state.totalHours = 0;
        state.avgHours = 0;
      })
      .addCase(deleteTimesheet.pending, (state) => {
        state.status = 'loading';
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
      .addCase(downloadTimesheet.pending, (state) => {
        state.downloadStatus = 'loading';
        state.downloadError = null;
      })
      .addCase(downloadTimesheet.fulfilled, (state) => {
        state.downloadStatus = 'succeeded';
        state.downloadError = null;
      })
      .addCase(downloadTimesheet.rejected, (state, action) => {
        state.downloadStatus = 'failed';
        state.downloadError = action.payload;
      })
      .addCase(downloadProjectTimesheet.pending, (state) => {
        state.projectDownloadStatus = 'loading';
        state.projectDownloadError = null;
      })
      .addCase(downloadProjectTimesheet.fulfilled, (state) => {
        state.projectDownloadStatus = 'succeeded';
        state.projectDownloadError = null;
      })
      .addCase(downloadProjectTimesheet.rejected, (state, action) => {
        state.projectDownloadStatus = 'failed';
        state.projectDownloadError = action.payload;
      })
      .addCase(sendProjectTimesheet.pending, (state) => {
        state.projectSendStatus = 'loading';
        state.projectSendError = null;
      })
      .addCase(sendProjectTimesheet.fulfilled, (state) => {
        state.projectSendStatus = 'succeeded';
        state.projectSendError = null;
      })
      .addCase(sendProjectTimesheet.rejected, (state, action) => {
        state.projectSendStatus = 'failed';
        state.projectSendError = action.payload;
      })
      .addCase(sendTimesheet.pending, (state) => {
        state.sendStatus = 'loading';
        state.sendError = null;
      })
      .addCase(sendTimesheet.fulfilled, (state) => {
        state.sendStatus = 'succeeded';
        state.sendError = null;
      })
      .addCase(sendTimesheet.rejected, (state, action) => {
        state.sendStatus = 'failed';
        state.sendError = action.payload;
      })
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
      .addCase(createTimesheet.pending, (state) => {
        state.createStatus = 'loading';
        state.createError = null;
      })
      .addCase(createTimesheet.fulfilled, (state) => {
        state.createStatus = 'succeeded';
        state.createError = null;
      })
      .addCase(createTimesheet.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = action.payload;
      })
      .addCase(fetchTimesheetById.pending, (state) => {
        state.currentTimesheetStatus = 'loading';
        state.currentTimesheetError = null;
        state.currentTimesheet = null;
      })
      .addCase(fetchTimesheetById.fulfilled, (state, action) => {
        state.currentTimesheetStatus = 'succeeded';
        state.currentTimesheet = action.payload;
        state.currentTimesheetError = null;
      })
      .addCase(fetchTimesheetById.rejected, (state, action) => {
        state.currentTimesheetStatus = 'failed';
        state.currentTimesheetError = action.payload;
        state.currentTimesheet = null;
      })
      .addCase(updateTimesheet.pending, (state) => {
        state.updateStatus = 'loading';
        state.updateError = null;
      })
      .addCase(updateTimesheet.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        const index = state.timesheets.findIndex(ts => ts._id === action.payload.timesheet._id);
        if (index !== -1) state.timesheets[index] = action.payload.timesheet;
        if (state.currentTimesheet?._id === action.payload.timesheet._id) {
          state.currentTimesheet = action.payload.timesheet;
        }
        state.updateError = null;
      })
      .addCase(updateTimesheet.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.updateError = action.payload;
      })
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

export default timesheetSlice.reducer;

// Selectors
export const selectAllTimesheets = (state) => state.timesheets.timesheets;
export const selectTimesheetStatus = (state) => state.timesheets.status;
export const selectTimesheetError = (state) => state.timesheets.error;
export const selectTotalHours = (state) => state.timesheets.totalHours;
export const selectAvgHours = (state) => state.timesheets.avgHours;
export const selectTimesheetDownloadStatus = (state) => state.timesheets.downloadStatus;
export const selectTimesheetDownloadError = (state) => state.timesheets.downloadError;
export const selectTimesheetProjectDownloadStatus = (state) => state.timesheets.projectDownloadStatus;
export const selectTimesheetProjectDownloadError = (state) => state.timesheets.projectDownloadError;
export const selectTimesheetSendStatus = (state) => state.timesheets.sendStatus;
export const selectTimesheetSendError = (state) => state.timesheets.sendError;
export const selectTimesheetProjectSendStatus = (state) => state.timesheets.projectSendStatus;
export const selectTimesheetProjectSendError = (state) => state.timesheets.projectSendError;
export const selectTimesheetCheckStatus = (state) => state.timesheets.checkStatus;
export const selectTimesheetCheckResult = (state) => state.timesheets.checkResult;
export const selectTimesheetCheckError = (state) => state.timesheets.checkError;
export const selectTimesheetCreateStatus = (state) => state.timesheets.createStatus;
export const selectTimesheetCreateError = (state) => state.timesheets.createError;
export const selectTimesheetUpdateStatus = (state) => state.timesheets.updateStatus;
export const selectTimesheetUpdateError = (state) => state.timesheets.updateError;
export const selectCurrentTimesheet = (state) => state.timesheets.currentTimesheet;
export const selectCurrentTimesheetStatus = (state) => state.timesheets.currentTimesheetStatus;
export const selectCurrentTimesheetError = (state) => state.timesheets.currentTimesheetError;
export const selectIncompleteTimesheets = (state) => state.timesheets.incompleteTimesheets;
export const selectIncompleteStatus = (state) => state.timesheets.incompleteStatus;
export const selectIncompleteError = (state) => state.timesheets.incompleteError;
export const {
  clearTimesheetError, clearTimesheets,
  clearDownloadStatus, clearSendStatus, clearProjectDownloadStatus, clearProjectSendStatus,
  clearCheckStatus, clearCreateStatus, clearUpdateStatus, clearCurrentTimesheet,
  clearIncompleteStatus
} = timesheetSlice.actions;

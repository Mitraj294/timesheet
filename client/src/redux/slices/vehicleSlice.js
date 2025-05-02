import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

const getErrorMessage = (error) => {
  return error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred';
};

// --- Async Thunks ---

// Fetch all vehicles
export const fetchVehicles = createAsyncThunk(
  'vehicles/fetchVehicles',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.get(`${API_URL}/vehicles`, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Fetch single vehicle by ID
export const fetchVehicleById = createAsyncThunk(
  'vehicles/fetchVehicleById',
  async (vehicleId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.get(`${API_URL}/vehicles/${vehicleId}`, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Create vehicle
export const createVehicle = createAsyncThunk(
  'vehicles/createVehicle',
  async (vehicleData, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.post(`${API_URL}/vehicles`, vehicleData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Update vehicle
export const updateVehicle = createAsyncThunk(
  'vehicles/updateVehicle',
  async ({ vehicleId, vehicleData }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.put(`${API_URL}/vehicles/${vehicleId}`, vehicleData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Delete vehicle
export const deleteVehicle = createAsyncThunk(
  'vehicles/deleteVehicle',
  async (vehicleId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      await axios.delete(`${API_URL}/vehicles/${vehicleId}`, getAuthHeaders(token));
      return vehicleId; // Return ID for removal from state
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Download report for a single vehicle
export const downloadVehicleReport = createAsyncThunk(
  'vehicles/downloadVehicleReport',
  async ({ vehicleId, startDate, endDate }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        params: { startDate, endDate } // Send dates as query params
      };
      const response = await axios.get(`${API_URL}/vehicles/${vehicleId}/download-report`, config);
      const contentDisposition = response.headers['content-disposition'];
      let filename = `vehicle_${vehicleId}_report.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
        if (filenameMatch && filenameMatch[1]) filename = decodeURIComponent(filenameMatch[1]);
      }
      return { blob: response.data, filename };
    } catch (error) {
        if (error.response?.data instanceof Blob && error.response?.data.type.includes('json')) {
            try { const errorJson = JSON.parse(await error.response.data.text()); return rejectWithValue(errorJson.message || 'Failed to download report'); } catch (parseError) {}
        }
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Send report for a single vehicle via email
export const sendVehicleReportByEmail = createAsyncThunk(
  'vehicles/sendVehicleReportByEmail',
  async ({ vehicleId, startDate, endDate, email }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const body = { startDate, endDate, email };
      await axios.post(`${API_URL}/vehicles/report/email/${vehicleId}`, body, getAuthHeaders(token));
      return { email }; // Return email for success message
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Download report for ALL vehicles
export const downloadAllVehiclesReport = createAsyncThunk(
  'vehicles/downloadAllVehiclesReport',
  async ({ startDate, endDate }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        params: { startDate, endDate }
      };
      const response = await axios.get(`${API_URL}/vehicles/download/all`, config);
      const contentDisposition = response.headers['content-disposition'];
      let filename = `all_vehicles_report.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
        if (filenameMatch && filenameMatch[1]) filename = decodeURIComponent(filenameMatch[1]);
      }
      return { blob: response.data, filename };
    } catch (error) {
        if (error.response?.data instanceof Blob && error.response?.data.type.includes('json')) {
            try { const errorJson = JSON.parse(await error.response.data.text()); return rejectWithValue(errorJson.message || 'Failed to download report'); } catch (parseError) {}
        }
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Send report for ALL vehicles via email
export const sendAllVehiclesReportByEmail = createAsyncThunk(
  'vehicles/sendAllVehiclesReportByEmail',
  async ({ startDate, endDate, email }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const body = { startDate, endDate, email };
      await axios.post(`${API_URL}/vehicles/send-report`, body, getAuthHeaders(token));
      return { email };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// --- Slice Definition ---
const initialState = {
  items: [], // List of all vehicles
  currentVehicle: null, // For viewing/editing single vehicle
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed' (for list fetching)
  error: null, // Error for list fetching
  currentStatus: 'idle', // Status for fetching single vehicle
  currentError: null, // Error for fetching single vehicle
  operationStatus: 'idle', // Status for create/update/delete
  operationError: null, // Error for create/update/delete
  reportStatus: 'idle', // Status for report generation/sending
  reportError: null, // Error for report generation/sending
};

const vehicleSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
    resetCurrentVehicle: (state) => {
      state.currentVehicle = null;
      state.currentStatus = 'idle';
      state.currentError = null;
    },
    clearOperationStatus: (state) => {
      state.operationStatus = 'idle';
      state.operationError = null;
    },
    clearReportStatus: (state) => {
      state.reportStatus = 'idle';
      state.reportError = null;
    },
    clearVehicleError: (state) => { // General error clear
        state.error = null;
        state.currentError = null;
        state.operationError = null;
        state.reportError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // List Fetching
      .addCase(fetchVehicles.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(fetchVehicles.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload; })
      .addCase(fetchVehicles.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      // Single Fetching
      .addCase(fetchVehicleById.pending, (state) => { state.currentStatus = 'loading'; state.currentError = null; })
      .addCase(fetchVehicleById.fulfilled, (state, action) => { state.currentStatus = 'succeeded'; state.currentVehicle = action.payload; })
      .addCase(fetchVehicleById.rejected, (state, action) => { state.currentStatus = 'failed'; state.currentError = action.payload; })
      // Create
      .addCase(createVehicle.pending, (state) => { state.operationStatus = 'loading'; state.operationError = null; })
      .addCase(createVehicle.fulfilled, (state, action) => { state.operationStatus = 'succeeded'; state.items.push(action.payload); }) // Add to list
      .addCase(createVehicle.rejected, (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; })
      // Update
      .addCase(updateVehicle.pending, (state) => { state.operationStatus = 'loading'; state.operationError = null; })
      .addCase(updateVehicle.fulfilled, (state, action) => {
        state.operationStatus = 'succeeded';
        const index = state.items.findIndex(v => v._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload; // Update in list
        if (state.currentVehicle?._id === action.payload._id) state.currentVehicle = action.payload; // Update current if matching
      })
      .addCase(updateVehicle.rejected, (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; })
      // Delete
      .addCase(deleteVehicle.pending, (state) => { state.operationStatus = 'loading'; state.operationError = null; })
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.operationStatus = 'succeeded';
        state.items = state.items.filter(v => v._id !== action.payload); // Remove from list
        if (state.currentVehicle?._id === action.payload) state.currentVehicle = null; // Clear current if deleted
      })
      .addCase(deleteVehicle.rejected, (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; })
      // Report Actions (Download/Send - Single & All)
      .addMatcher(
        (action) => [
          downloadVehicleReport.pending.type, sendVehicleReportByEmail.pending.type,
          downloadAllVehiclesReport.pending.type, sendAllVehiclesReportByEmail.pending.type
        ].includes(action.type),
        (state) => { state.reportStatus = 'loading'; state.reportError = null; }
      )
      .addMatcher(
        (action) => [
          downloadVehicleReport.fulfilled.type, sendVehicleReportByEmail.fulfilled.type,
          downloadAllVehiclesReport.fulfilled.type, sendAllVehiclesReportByEmail.fulfilled.type
        ].includes(action.type),
        (state) => { state.reportStatus = 'succeeded'; }
      )
      .addMatcher(
        (action) => [
          downloadVehicleReport.rejected.type, sendVehicleReportByEmail.rejected.type,
          downloadAllVehiclesReport.rejected.type, sendAllVehiclesReportByEmail.rejected.type
        ].includes(action.type),
        (state, action) => { state.reportStatus = 'failed'; state.reportError = action.payload; }
      );
  },
});

// --- Exports ---
export const {
  resetCurrentVehicle,
  clearOperationStatus,
  clearReportStatus,
  clearVehicleError,
} = vehicleSlice.actions;

export default vehicleSlice.reducer;

// --- Selectors ---
export const selectAllVehicles = (state) => state.vehicles.items;
export const selectVehicleByIdState = (state) => state.vehicles.currentVehicle; // Renamed for clarity
export const selectVehicleListStatus = (state) => state.vehicles.status;
export const selectVehicleListError = (state) => state.vehicles.error;
export const selectCurrentVehicleStatus = (state) => state.vehicles.currentStatus;
export const selectCurrentVehicleError = (state) => state.vehicles.currentError;
export const selectVehicleOperationStatus = (state) => state.vehicles.operationStatus;
export const selectVehicleOperationError = (state) => state.vehicles.operationError;
export const selectVehicleReportStatus = (state) => state.vehicles.reportStatus;
export const selectVehicleReportError = (state) => state.vehicles.reportError;
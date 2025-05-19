import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

// Creates authorization headers if a token is provided.
const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// Extracts a user-friendly error message from an API error.
const getErrorMessage = (error) => {
  return error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred';
};

// Async Thunks

// Fetches all vehicles. Requires authentication.
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

// Fetches a single vehicle by its ID. Requires authentication.
// vehicleId: The ID of the vehicle.
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

// Creates a vehicle. Requires authentication.
// vehicleData: Data for the new vehicle.
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

// Updates a vehicle. Requires authentication.
// params.vehicleId: ID of the vehicle to update.
// params.vehicleData: New data for the vehicle.
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

// Deletes a vehicle. Requires authentication.
// vehicleId: ID of the vehicle to delete.
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

// Downloads a report for a single vehicle. Requires authentication.
// params.vehicleId: ID of the vehicle.
// params.startDate, params.endDate: Date range for the report.
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
      const response = await axios.get(`${API_URL}/vehicles/${vehicleId}/report/download`, config);
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

// Sends a report for a single vehicle via email. Requires authentication.
// params.vehicleId: ID of the vehicle.
// params.startDate, params.endDate, params.email: Date range and recipient email.
export const sendVehicleReportByEmail = createAsyncThunk(
  'vehicles/sendVehicleReportByEmail',
  async ({ vehicleId, startDate, endDate, email }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const body = { startDate, endDate, email };
      await axios.post(`${API_URL}/vehicles/${vehicleId}/report/send-email`, body, getAuthHeaders(token));
      return { email }; // Return email for success message
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Downloads a report for ALL vehicles. Requires authentication.
// params.startDate, params.endDate: Date range for the report.
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
      const response = await axios.get(`${API_URL}/vehicles/report/all/download`, config);
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

// Sends a report for ALL vehicles via email. Requires authentication.
// params.startDate, params.endDate, params.email: Date range and recipient email.
export const sendAllVehiclesReportByEmail = createAsyncThunk(
  'vehicles/sendAllVehiclesReportByEmail',
  async ({ startDate, endDate, email }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const body = { startDate, endDate, email };
      await axios.post(`${API_URL}/vehicles/report/all/send-email`, body, getAuthHeaders(token));
      return { email };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Slice Definition
// Initial state for the vehicles slice.
const initialState = {
  items: [],            // List of all vehicles.
  currentVehicle: null, // For viewing/editing a single vehicle.
  status: 'idle',       // Status for list fetching.
  error: null,          // Error for list fetching.
  currentStatus: 'idle',  // Status for fetching a single vehicle.
  currentError: null,     // Error for fetching a single vehicle.
  operationStatus: 'idle',// Status for create/update/delete operations.
  operationError: null,   // Error for create/update/delete operations.
  reportStatus: 'idle',   // Status for report generation/sending.
  reportError: null,      // Error for report generation/sending.
};

const vehicleSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
    // Resets the current vehicle details.
    resetCurrentVehicle: (state) => {
      state.currentVehicle = null;
      state.currentStatus = 'idle';
      state.currentError = null;
    },
    // Clears status and error for create/update/delete operations.
    clearOperationStatus: (state) => {
      state.operationStatus = 'idle';
      state.operationError = null;
    },
    // Clears status and error for report operations.
    clearReportStatus: (state) => {
      state.reportStatus = 'idle';
      state.reportError = null;
    },
    // Clears all error fields in the vehicle slice.
    clearVehicleError: (state) => { // General error clear
        state.error = null;
        state.currentError = null;
        state.operationError = null;
        state.reportError = null;
    },
  },
  extraReducers: (builder) => { // Handles async thunk actions
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
      .addCase(createVehicle.fulfilled, (state, action) => {
        state.operationStatus = 'succeeded';
        state.items.push(action.payload); // Add to list
        state.operationError = null;
      })
      .addCase(createVehicle.rejected, (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; })
      // Update
      .addCase(updateVehicle.pending, (state) => { state.operationStatus = 'loading'; state.operationError = null; })
      .addCase(updateVehicle.fulfilled, (state, action) => {
        state.operationStatus = 'succeeded';
        const index = state.items.findIndex(v => v._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload; // Update in list
        if (state.currentVehicle?._id === action.payload._id) state.currentVehicle = action.payload; // Update current if matching
        state.operationError = null;
      })
      .addCase(updateVehicle.rejected, (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; })
      // Delete
      .addCase(deleteVehicle.pending, (state) => { state.operationStatus = 'loading'; state.operationError = null; })
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.operationStatus = 'succeeded';
        state.items = state.items.filter(v => v._id !== action.payload); // Remove from list
        if (state.currentVehicle?._id === action.payload) state.currentVehicle = null; // Clear current if deleted
        state.operationError = null;
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
        (state) => { state.reportStatus = 'succeeded'; state.reportError = null; } // Clear error on success
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

// Exports
// Export synchronous actions
export const {
  resetCurrentVehicle,
  clearOperationStatus,
  clearReportStatus,
  clearVehicleError,
} = vehicleSlice.actions;

// Export main reducer
export default vehicleSlice.reducer;

// Selectors
// Selects all vehicles.
export const selectAllVehicles = (state) => state.vehicles.items;
// Selects the currently viewed/edited vehicle.
export const selectVehicleByIdState = (state) => state.vehicles.currentVehicle; // Renamed for clarity
// Selects the status for fetching the list of vehicles.
export const selectVehicleListStatus = (state) => state.vehicles.status;
// Selects the error for fetching the list of vehicles.
export const selectVehicleListError = (state) => state.vehicles.error;
// Selects the status for fetching a single vehicle.
export const selectCurrentVehicleStatus = (state) => state.vehicles.currentStatus;
// Selects the error for fetching a single vehicle.
export const selectCurrentVehicleError = (state) => state.vehicles.currentError;
// Selects the status for create/update/delete operations.
export const selectVehicleOperationStatus = (state) => state.vehicles.operationStatus;
// Selects the error for create/update/delete operations.
export const selectVehicleOperationError = (state) => state.vehicles.operationError;
// Selects the status for report generation/sending.
export const selectVehicleReportStatus = (state) => state.vehicles.reportStatus;
// Selects the error for report generation/sending.
export const selectVehicleReportError = (state) => state.vehicles.reportError;
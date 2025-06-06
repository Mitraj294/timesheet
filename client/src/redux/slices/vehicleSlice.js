import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

// Helpers
const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});
const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred';

// Thunks
export const fetchVehicles = createAsyncThunk(
  'vehicles/fetchVehicles',
  async (_, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.get(`${API_URL}/vehicles`, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchVehicleById = createAsyncThunk(
  'vehicles/fetchVehicleById',
  async (vehicleId, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.get(`${API_URL}/vehicles/${vehicleId}`, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createVehicle = createAsyncThunk(
  'vehicles/createVehicle',
  async (vehicleData, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.post(`${API_URL}/vehicles`, vehicleData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateVehicle = createAsyncThunk(
  'vehicles/updateVehicle',
  async ({ vehicleId, vehicleData }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.put(`${API_URL}/vehicles/${vehicleId}`, vehicleData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteVehicle = createAsyncThunk(
  'vehicles/deleteVehicle',
  async (vehicleId, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      await axios.delete(`${API_URL}/vehicles/${vehicleId}`, getAuthHeaders(token));
      return vehicleId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const downloadVehicleReport = createAsyncThunk(
  'vehicles/downloadVehicleReport',
  async ({ vehicleId, startDate, endDate }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        params: { startDate, endDate }
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
        try {
          const errorJson = JSON.parse(await error.response.data.text());
          return rejectWithValue(errorJson.message || 'Failed to download report');
        } catch {}
      }
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const sendVehicleReportByEmail = createAsyncThunk(
  'vehicles/sendVehicleReportByEmail',
  async ({ vehicleId, startDate, endDate, email }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const body = { startDate, endDate, email };
      await axios.post(`${API_URL}/vehicles/${vehicleId}/report/send-email`, body, getAuthHeaders(token));
      return { email };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const downloadAllVehiclesReport = createAsyncThunk(
  'vehicles/downloadAllVehiclesReport',
  async ({ startDate, endDate }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
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
        try {
          const errorJson = JSON.parse(await error.response.data.text());
          return rejectWithValue(errorJson.message || 'Failed to download report');
        } catch {}
      }
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const sendAllVehiclesReportByEmail = createAsyncThunk(
  'vehicles/sendAllVehiclesReportByEmail',
  async ({ startDate, endDate, email }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const body = { startDate, endDate, email };
      await axios.post(`${API_URL}/vehicles/report/all/send-email`, body, getAuthHeaders(token));
      return { email };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// State
const initialState = {
  items: [],
  currentVehicle: null,
  status: 'idle',
  error: null,
  currentStatus: 'idle',
  currentError: null,
  operationStatus: 'idle',
  operationError: null,
  reportStatus: 'idle',
  reportError: null,
};

const vehicleSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
    resetCurrentVehicle: (state) => {
      state.currentVehicle = null;
      state.currentStatus = 'idle';
      state.currentError = null;
      console.log("[vehicleSlice] Reset current vehicle.");
    },
    clearOperationStatus: (state) => {
      state.operationStatus = 'idle';
      state.operationError = null;
      console.log("[vehicleSlice] Cleared operation status.");
    },
    clearReportStatus: (state) => {
      state.reportStatus = 'idle';
      state.reportError = null;
      console.log("[vehicleSlice] Cleared report status.");
    },
    clearVehicleError: (state) => {
      state.error = null;
      state.currentError = null;
      state.operationError = null;
      state.reportError = null;
      console.log("[vehicleSlice] Cleared all vehicle errors.");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVehicles.pending, (state) => { state.status = 'loading'; state.error = null; console.log("[vehicleSlice] Fetching vehicles..."); })
      .addCase(fetchVehicles.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload; console.log("[vehicleSlice] Vehicles fetched:", action.payload.length); })
      .addCase(fetchVehicles.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; console.error("[vehicleSlice] Fetch vehicles error:", action.payload); })
      .addCase(fetchVehicleById.pending, (state) => { state.currentStatus = 'loading'; state.currentError = null; })
      .addCase(fetchVehicleById.fulfilled, (state, action) => { state.currentStatus = 'succeeded'; state.currentVehicle = action.payload; })
      .addCase(fetchVehicleById.rejected, (state, action) => { state.currentStatus = 'failed'; state.currentError = action.payload; })
      .addCase(createVehicle.pending, (state) => { state.operationStatus = 'loading'; state.operationError = null; })
      .addCase(createVehicle.fulfilled, (state, action) => {
        state.operationStatus = 'succeeded';
        state.items.push(action.payload);
        state.operationError = null;
      })
      .addCase(createVehicle.rejected, (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; })
      .addCase(updateVehicle.pending, (state) => { state.operationStatus = 'loading'; state.operationError = null; })
      .addCase(updateVehicle.fulfilled, (state, action) => {
        state.operationStatus = 'succeeded';
        const index = state.items.findIndex(v => v._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
        if (state.currentVehicle?._id === action.payload._id) state.currentVehicle = action.payload;
        state.operationError = null;
      })
      .addCase(updateVehicle.rejected, (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; })
      .addCase(deleteVehicle.pending, (state) => { state.operationStatus = 'loading'; state.operationError = null; })
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.operationStatus = 'succeeded';
        state.items = state.items.filter(v => v._id !== action.payload);
        if (state.currentVehicle?._id === action.payload) state.currentVehicle = null;
        state.operationError = null;
      })
      .addCase(deleteVehicle.rejected, (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; })
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
        (state) => { state.reportStatus = 'succeeded'; state.reportError = null; }
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

export const {
  resetCurrentVehicle,
  clearOperationStatus,
  clearReportStatus,
  clearVehicleError,
} = vehicleSlice.actions;

export default vehicleSlice.reducer;

// Selectors
export const selectAllVehicles = (state) => state.vehicles.items;
export const selectVehicleByIdState = (state) => state.vehicles.currentVehicle;
export const selectVehicleListStatus = (state) => state.vehicles.status;
export const selectVehicleListError = (state) => state.vehicles.error;
export const selectCurrentVehicleStatus = (state) => state.vehicles.currentStatus;
export const selectCurrentVehicleError = (state) => state.vehicles.currentError;
export const selectVehicleOperationStatus = (state) => state.vehicles.operationStatus;
export const selectVehicleOperationError = (state) => state.vehicles.operationError;
export const selectVehicleReportStatus = (state) => state.vehicles.reportStatus;
export const selectVehicleReportError = (state) => state.vehicles.reportError;
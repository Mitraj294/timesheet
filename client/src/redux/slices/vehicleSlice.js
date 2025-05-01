// /home/digilab/timesheet/client/src/redux/slices/vehicleSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios'; // Or your preferred API client
import { setAlertWithTimeout } from './alertSlice'; // Assuming you have alertSlice setup

// --- Configuration ---
const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';
const VEHICLES_API = `${API_URL}/vehicles`; // Base URL for vehicles

// --- Helper Function to get Auth Token ---
const getTokenConfig = (getState) => {
    const { token } = getState().auth;
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

// --- Async Thunks for Vehicles ---

// Fetch All Vehicles
export const fetchVehicles = createAsyncThunk(
    'vehicles/fetchVehicles',
    async (_, { rejectWithValue, getState }) => {
        try {
            const config = getTokenConfig(getState);
            const response = await axios.get(VEHICLES_API, config);
            return response.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            return rejectWithValue(message);
        }
    }
);

// Fetch Single Vehicle by ID
export const fetchVehicleById = createAsyncThunk(
    'vehicles/fetchVehicleById',
    async (vehicleId, { rejectWithValue, getState }) => {
        try {
            const config = getTokenConfig(getState);
            const response = await axios.get(`${VEHICLES_API}/${vehicleId}`, config);
            return response.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            return rejectWithValue(message);
        }
    }
);

// Create Vehicle
export const createVehicle = createAsyncThunk(
    'vehicles/createVehicle',
    async (vehicleData, { rejectWithValue, getState, dispatch }) => {
        try {
            const config = getTokenConfig(getState);
            const response = await axios.post(VEHICLES_API, vehicleData, config);
            dispatch(setAlertWithTimeout('Vehicle created successfully!', 'success'));
            return response.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            dispatch(setAlertWithTimeout(`Error creating vehicle: ${message}`, 'error'));
            return rejectWithValue(message);
        }
    }
);

// Update Vehicle
export const updateVehicle = createAsyncThunk(
    'vehicles/updateVehicle',
    async ({ vehicleId, vehicleData }, { rejectWithValue, getState, dispatch }) => {
        try {
            const config = getTokenConfig(getState);
            const response = await axios.put(`${VEHICLES_API}/${vehicleId}`, vehicleData, config);
            dispatch(setAlertWithTimeout('Vehicle updated successfully!', 'success'));
            return response.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            dispatch(setAlertWithTimeout(`Error updating vehicle: ${message}`, 'error'));
            return rejectWithValue(message);
        }
    }
);

// Delete Vehicle
export const deleteVehicle = createAsyncThunk(
    'vehicles/deleteVehicle',
    async (vehicleId, { rejectWithValue, getState, dispatch }) => {
        try {
            const config = getTokenConfig(getState);
            await axios.delete(`${VEHICLES_API}/${vehicleId}`, config);
            dispatch(setAlertWithTimeout('Vehicle deleted successfully!', 'success'));
            return vehicleId; // Return the ID for removal from state
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            dispatch(setAlertWithTimeout(`Error deleting vehicle: ${message}`, 'error'));
            return rejectWithValue(message);
        }
    }
);

// Download All Vehicles Report
export const downloadAllVehiclesReport = createAsyncThunk(
    'vehicles/downloadAllVehiclesReport',
    async ({ startDate, endDate }, { rejectWithValue, getState }) => {
        try {
            const config = {
                ...getTokenConfig(getState),
                responseType: 'blob',
                params: { startDate, endDate }
            };
            const response = await axios.get(`${VEHICLES_API}/download/all`, config);
            // Handle blob download in component or service
            return { blob: response.data, filename: `AllVehiclesReport_${startDate}_to_${endDate}.xlsx` };
        } catch (error) {
            // Handle potential JSON error response within blob
            let message = 'Failed to download report.';
            if (error.response?.data instanceof Blob && error.response.data.type === 'application/json') {
                try {
                    const errorJson = JSON.parse(await error.response.data.text());
                    message = errorJson.message || message;
                } catch (parseError) { /* Ignore */ }
            } else {
                message = (error.response?.data?.message) || error.message || error.toString();
            }
            return rejectWithValue(message);
        }
    }
);

// Send All Vehicles Report
export const sendAllVehiclesReportByEmail = createAsyncThunk(
    'vehicles/sendAllVehiclesReportByEmail',
    async ({ startDate, endDate, email }, { rejectWithValue, getState, dispatch }) => {
        try {
            const config = getTokenConfig(getState);
            const response = await axios.post(`${VEHICLES_API}/send-report`, { startDate, endDate, email }, config);
            dispatch(setAlertWithTimeout(response.data.message || 'Report sent successfully!', 'success'));
            return response.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            dispatch(setAlertWithTimeout(`Error sending report: ${message}`, 'error'));
            return rejectWithValue(message);
        }
    }
);

// Download Single Vehicle Report (Excel)
export const downloadVehicleReport = createAsyncThunk(
    'vehicles/downloadVehicleReport',
    async ({ vehicleId, startDate, endDate }, { rejectWithValue, getState }) => {
        try {
            const config = {
                ...getTokenConfig(getState),
                responseType: 'blob',
                params: { startDate, endDate }
            };
            // Corresponds to GET /api/vehicles/:vehicleId/download-report
            const response = await axios.get(`${VEHICLES_API}/${vehicleId}/download-report`, config);

            // Extract filename (optional, depends on backend sending Content-Disposition)
            const contentDisposition = response.headers['content-disposition'];
            let filename = `VehicleReport_${vehicleId}.xlsx`; // Default
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch?.[1]) filename = filenameMatch[1];
            }

            return { blob: response.data, filename };
        } catch (error) {
            // Handle potential JSON error response within blob
            let message = 'Failed to download vehicle report.';
            if (error.response?.data instanceof Blob && error.response.data.type === 'application/json') {
                try {
                    const errorJson = JSON.parse(await error.response.data.text());
                    message = errorJson.message || message;
                } catch (parseError) { /* Ignore */ }
            } else {
                message = (error.response?.data?.message) || error.message || error.toString();
            }
            return rejectWithValue(message);
        }
    }
);

// Send Single Vehicle Report by Email
export const sendVehicleReportByEmail = createAsyncThunk(
    'vehicles/sendVehicleReportByEmail',
    async ({ vehicleId, startDate, endDate, email }, { rejectWithValue, getState, dispatch }) => {
        try {
            const config = getTokenConfig(getState);
            // Corresponds to POST /api/vehicles/report/email/:vehicleId
            const response = await axios.post(`${VEHICLES_API}/report/email/${vehicleId}`, { startDate, endDate, email }, config);
            dispatch(setAlertWithTimeout(response.data.message || 'Report sent successfully!', 'success'));
            return response.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            dispatch(setAlertWithTimeout(`Error sending report: ${message}`, 'error'));
            return rejectWithValue(message);
        }
    }
);

// --- Initial State ---
const initialState = {
    items: [], // Holds the list of all vehicles
    currentVehicle: null, // Holds details of a single vehicle being viewed/edited
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed' - For fetching the list
    error: null, // Error message for fetching the list
    currentStatus: 'idle', // Status for fetching a single vehicle
    currentError: null, // Error for fetching a single vehicle
    operationStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed' - For CUD operations
    operationError: null, // Error for CUD operations
    reportStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed' - For report generation/sending
    reportError: null, // Error for report operations
};

// --- Slice Definition ---
const vehicleSlice = createSlice({
    name: 'vehicles',
    initialState,
    reducers: {
        clearVehicleError: (state) => { state.error = null; },
        clearCurrentVehicleError: (state) => { state.currentError = null; },
        clearOperationStatus: (state) => { state.operationStatus = 'idle'; state.operationError = null; },
        clearReportStatus: (state) => { state.reportStatus = 'idle'; state.reportError = null; },
        resetCurrentVehicle: (state) => { state.currentVehicle = null; state.currentStatus = 'idle'; state.currentError = null; },
        resetVehicleState: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            // Fetch Vehicles List
            .addCase(fetchVehicles.pending, (state) => { state.status = 'loading'; state.error = null; })
            .addCase(fetchVehicles.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload; })
            .addCase(fetchVehicles.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })

            // Fetch Single Vehicle
            .addCase(fetchVehicleById.pending, (state) => { state.currentStatus = 'loading'; state.currentError = null; })
            .addCase(fetchVehicleById.fulfilled, (state, action) => { state.currentStatus = 'succeeded'; state.currentVehicle = action.payload; })
            .addCase(fetchVehicleById.rejected, (state, action) => { state.currentStatus = 'failed'; state.currentError = action.payload; state.currentVehicle = null; })

            // Create Vehicle
            .addCase(createVehicle.pending, (state) => { state.operationStatus = 'loading'; state.operationError = null; })
            .addCase(createVehicle.fulfilled, (state, action) => { state.operationStatus = 'succeeded'; state.items.push(action.payload); })
            .addCase(createVehicle.rejected, (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; })

            // Update Vehicle
            .addCase(updateVehicle.pending, (state) => { state.operationStatus = 'loading'; state.operationError = null; })
            .addCase(updateVehicle.fulfilled, (state, action) => {
                state.operationStatus = 'succeeded';
                const index = state.items.findIndex(v => v._id === action.payload._id);
                if (index !== -1) state.items[index] = action.payload;
                if (state.currentVehicle?._id === action.payload._id) state.currentVehicle = action.payload;
            })
            .addCase(updateVehicle.rejected, (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; })

            // Delete Vehicle
            .addCase(deleteVehicle.pending, (state) => { state.operationStatus = 'loading'; state.operationError = null; })
            .addCase(deleteVehicle.fulfilled, (state, action) => {
                state.operationStatus = 'succeeded';
                state.items = state.items.filter(v => v._id !== action.payload);
                if (state.currentVehicle?._id === action.payload) state.currentVehicle = null;
            })
            .addCase(deleteVehicle.rejected, (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; })

            // Download All Vehicles Report
            .addCase(downloadAllVehiclesReport.pending, (state) => { state.reportStatus = 'loading'; state.reportError = null; })
            .addCase(downloadAllVehiclesReport.fulfilled, (state) => { state.reportStatus = 'succeeded'; }) // Blob handled in component
            .addCase(downloadAllVehiclesReport.rejected, (state, action) => { state.reportStatus = 'failed'; state.reportError = action.payload; })

            // Send All Vehicles Report
            .addCase(sendAllVehiclesReportByEmail.pending, (state) => { state.reportStatus = 'loading'; state.reportError = null; })
            .addCase(sendAllVehiclesReportByEmail.fulfilled, (state) => { state.reportStatus = 'succeeded'; })
            .addCase(sendAllVehiclesReportByEmail.rejected, (state, action) => { state.reportStatus = 'failed'; state.reportError = action.payload; })

            // Download Single Vehicle Report
            .addCase(downloadVehicleReport.pending, (state) => { state.reportStatus = 'loading'; state.reportError = null; })
            .addCase(downloadVehicleReport.fulfilled, (state) => { state.reportStatus = 'succeeded'; }) // Blob handled in component
            .addCase(downloadVehicleReport.rejected, (state, action) => { state.reportStatus = 'failed'; state.reportError = action.payload; })

            // Send Single Vehicle Report
            .addCase(sendVehicleReportByEmail.pending, (state) => { state.reportStatus = 'loading'; state.reportError = null; })
            .addCase(sendVehicleReportByEmail.fulfilled, (state) => { state.reportStatus = 'succeeded'; })
            .addCase(sendVehicleReportByEmail.rejected, (state, action) => { state.reportStatus = 'failed'; state.reportError = action.payload; });
    },
});

// --- Export Actions ---
export const {
    clearVehicleError,
    clearCurrentVehicleError,
    clearOperationStatus,
    clearReportStatus,
    resetCurrentVehicle,
    resetVehicleState,
} = vehicleSlice.actions;

// --- Export Reducer ---
export default vehicleSlice.reducer;

// --- Selectors (Optional but Recommended) ---
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

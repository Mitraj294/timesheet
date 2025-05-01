// /home/digilab/timesheet/client/src/redux/slices/vehicleReviewSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { setAlertWithTimeout } from './alertSlice';

// --- Configuration ---
const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';
const REVIEWS_API = `${API_URL}/vehicles/reviews`; // Base URL for reviews
const VEHICLES_API = `${API_URL}/vehicles`; // Base URL for vehicles (needed for some endpoints)

// --- Helper Function to get Auth Token ---
const getTokenConfig = (getState) => {
    const { token } = getState().auth;
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

// --- Async Thunks for Vehicle Reviews ---

// Fetch Reviews for a Specific Vehicle
export const fetchReviewsByVehicleId = createAsyncThunk(
    'vehicleReviews/fetchByVehicleId',
    async (vehicleId, { rejectWithValue, getState }) => {
        try {
            const config = getTokenConfig(getState);
            // Using the endpoint defined in vehicleRoutes.js
            const response = await axios.get(`${VEHICLES_API}/vehicle/${vehicleId}/reviews`, config);
            // The response includes { vehicle, reviews }, we only store reviews here
            return response.data.reviews;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            return rejectWithValue(message);
        }
    }
);

// Fetch Single Review by ID
export const fetchReviewById = createAsyncThunk(
    'vehicleReviews/fetchById',
    async (reviewId, { rejectWithValue, getState }) => {
        try {
            const config = getTokenConfig(getState);
            const response = await axios.get(`${REVIEWS_API}/${reviewId}`, config);
            return response.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            return rejectWithValue(message);
        }
    }
);

// Create Vehicle Review
export const createVehicleReview = createAsyncThunk(
    'vehicleReviews/create',
    async (reviewData, { rejectWithValue, getState, dispatch }) => {
        try {
            const config = getTokenConfig(getState);
            const response = await axios.post(REVIEWS_API, reviewData, config);
            dispatch(setAlertWithTimeout('Review created successfully!', 'success'));
            return response.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            dispatch(setAlertWithTimeout(`Error creating review: ${message}`, 'error'));
            return rejectWithValue(message);
        }
    }
);

// Update Vehicle Review
export const updateVehicleReview = createAsyncThunk(
    'vehicleReviews/update',
    async ({ reviewId, reviewData }, { rejectWithValue, getState, dispatch }) => {
        try {
            const config = getTokenConfig(getState);
            const response = await axios.put(`${REVIEWS_API}/${reviewId}`, reviewData, config);
            dispatch(setAlertWithTimeout('Review updated successfully!', 'success'));
            return response.data;
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            dispatch(setAlertWithTimeout(`Error updating review: ${message}`, 'error'));
            return rejectWithValue(message);
        }
    }
);

// Delete Vehicle Review
export const deleteVehicleReview = createAsyncThunk(
    'vehicleReviews/delete',
    async (reviewId, { rejectWithValue, getState, dispatch }) => {
        try {
            const config = getTokenConfig(getState);
            await axios.delete(`${REVIEWS_API}/${reviewId}`, config);
            dispatch(setAlertWithTimeout('Review deleted successfully!', 'success'));
            return reviewId; // Return the ID for removal from state
        } catch (error) {
            const message = (error.response?.data?.message) || error.message || error.toString();
            dispatch(setAlertWithTimeout(`Error deleting review: ${message}`, 'error'));
            return rejectWithValue(message);
        }
    }
);

// Download Single Review Report
export const downloadReviewReport = createAsyncThunk(
    'vehicleReviews/downloadReport',
    async ({ reviewId, format }, { rejectWithValue, getState }) => {
        try {
            const config = {
                ...getTokenConfig(getState),
                responseType: 'blob', // Correctly set
                params: { format } // 'pdf' or 'excel'
            };
            const response = await axios.get(`${REVIEWS_API}/${reviewId}/download`, config);
            // Handle blob download in component or service
            const filename = `review_${reviewId}.${format}`; // Default filename
            // NOTE: Server might provide a better filename via Content-Disposition,
            // but we handle that possibility in the component if needed.
            // Here we just ensure the blob is passed back.
            return { blob: response.data, filename };
        } catch (error) {
            let message = 'Failed to download report.';
            // Attempt to read error message if the response blob is actually JSON
            if (error.response?.data instanceof Blob && error.response.data.type === 'application/json') {
                try {
                    const errorJson = JSON.parse(await error.response.data.text());
                    message = errorJson.message || message;
                } catch (parseError) { /* Ignore parsing error */ }
            } else {
                message = (error.response?.data?.message) || error.message || error.toString();
            }
            return rejectWithValue(message);
        }
    }
);


// Send Single Review Report
export const sendReviewReportByClient = createAsyncThunk(
    'vehicleReviews/sendReport',
    async ({ reviewId, email, format }, { rejectWithValue, getState, dispatch }) => {
        try {
            const config = getTokenConfig(getState);
            const response = await axios.post(`${REVIEWS_API}/report/email/${reviewId}`, { email, format }, config);
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
    items: [], // Holds the list of reviews for the currently viewed vehicle
    currentReview: null, // Holds details of a single review being viewed/edited
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed' - For fetching the list
    error: null, // Error message for fetching the list
    currentStatus: 'idle', // Status for fetching a single review
    currentError: null, // Error for fetching a single review
    operationStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed' - For CUD operations
    operationError: null, // Error for CUD operations
    reportStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed' - For report generation/sending
    reportError: null, // Error for report operations
};

// --- Slice Definition ---
const vehicleReviewSlice = createSlice({
    name: 'vehicleReviews',
    initialState,
    reducers: {
        clearReviewError: (state) => { state.error = null; },
        clearCurrentReviewError: (state) => { state.currentError = null; },
        clearReviewOperationStatus: (state) => { state.operationStatus = 'idle'; state.operationError = null; },
        clearReviewReportStatus: (state) => { state.reportStatus = 'idle'; state.reportError = null; },
        resetCurrentReview: (state) => { state.currentReview = null; state.currentStatus = 'idle'; state.currentError = null; },
        resetReviewState: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            // Fetch Reviews List (for a vehicle)
            .addCase(fetchReviewsByVehicleId.pending, (state) => { state.status = 'loading'; state.error = null; })
            .addCase(fetchReviewsByVehicleId.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload; })
            .addCase(fetchReviewsByVehicleId.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; state.items = []; })

            // Fetch Single Review
            .addCase(fetchReviewById.pending, (state) => { state.currentStatus = 'loading'; state.currentError = null; })
            .addCase(fetchReviewById.fulfilled, (state, action) => { state.currentStatus = 'succeeded'; state.currentReview = action.payload; })
            .addCase(fetchReviewById.rejected, (state, action) => { state.currentStatus = 'failed'; state.currentError = action.payload; state.currentReview = null; })

            // Create Review
            .addCase(createVehicleReview.pending, (state) => { state.operationStatus = 'loading'; state.operationError = null; })
            .addCase(createVehicleReview.fulfilled, (state, action) => { state.operationStatus = 'succeeded'; state.items.push(action.payload); }) // Add to current list if relevant
            .addCase(createVehicleReview.rejected, (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; })

            // Update Review
            .addCase(updateVehicleReview.pending, (state) => { state.operationStatus = 'loading'; state.operationError = null; })
            .addCase(updateVehicleReview.fulfilled, (state, action) => {
                state.operationStatus = 'succeeded';
                const index = state.items.findIndex(r => r._id === action.payload._id);
                if (index !== -1) state.items[index] = action.payload;
                if (state.currentReview?._id === action.payload._id) state.currentReview = action.payload;
            })
            .addCase(updateVehicleReview.rejected, (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; })

            // Delete Review
            .addCase(deleteVehicleReview.pending, (state) => { state.operationStatus = 'loading'; state.operationError = null; })
            .addCase(deleteVehicleReview.fulfilled, (state, action) => {
                state.operationStatus = 'succeeded';
                state.items = state.items.filter(r => r._id !== action.payload);
                if (state.currentReview?._id === action.payload) state.currentReview = null;
            })
            .addCase(deleteVehicleReview.rejected, (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; })

            // Download Review Report
            .addCase(downloadReviewReport.pending, (state) => { state.reportStatus = 'loading'; state.reportError = null; })
            .addCase(downloadReviewReport.fulfilled, (state) => { state.reportStatus = 'succeeded'; }) // Blob handled in component
            .addCase(downloadReviewReport.rejected, (state, action) => { state.reportStatus = 'failed'; state.reportError = action.payload; })

            // Send Review Report
            .addCase(sendReviewReportByClient.pending, (state) => { state.reportStatus = 'loading'; state.reportError = null; })
            .addCase(sendReviewReportByClient.fulfilled, (state) => { state.reportStatus = 'succeeded'; })
            .addCase(sendReviewReportByClient.rejected, (state, action) => { state.reportStatus = 'failed'; state.reportError = action.payload; });
    },
});

// --- Export Actions ---
export const {
    clearReviewError,
    clearCurrentReviewError,
    clearReviewOperationStatus,
    clearReviewReportStatus,
    resetCurrentReview,
    resetReviewState,
} = vehicleReviewSlice.actions;

// --- Export Reducer ---
export default vehicleReviewSlice.reducer;

// --- Selectors ---
export const selectAllReviewsForVehicle = (state) => state.vehicleReviews.items;
export const selectCurrentReviewData = (state) => state.vehicleReviews.currentReview;
export const selectReviewListStatus = (state) => state.vehicleReviews.status; // Added
export const selectReviewListError = (state) => state.vehicleReviews.error; // Added
export const selectReviewOperationStatus = (state) => state.vehicleReviews.operationStatus; // Added (if missing)
export const selectReviewOperationError = (state) => state.vehicleReviews.operationError; // Added (if missing)
export const selectCurrentReviewStatus = (state) => state.vehicleReviews.currentStatus; // Added for single review fetch status
export const selectCurrentReviewError = (state) => state.vehicleReviews.currentError; // Added for single review fetch error
export const selectReviewReportStatus = (state) => state.vehicleReviews.reportStatus; // Added for report status
export const selectReviewReportError = (state) => state.vehicleReviews.reportError; // Added for report error
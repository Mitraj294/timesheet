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

// Fetch reviews for a specific vehicle
export const fetchReviewsByVehicleId = createAsyncThunk(
  'vehicleReviews/fetchByVehicleId',
  async (vehicleId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      // Endpoint might be /api/vehicles/vehicle/:vehicleId/reviews
      const response = await axios.get(`${API_URL}/vehicles/vehicle/${vehicleId}/reviews`, getAuthHeaders(token));
      // Assuming the response includes vehicle info and reviews array: { vehicle: {...}, reviews: [...] }
      return response.data.reviews || []; // Return only the reviews array
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Fetch single review by ID
export const fetchReviewById = createAsyncThunk(
  'vehicleReviews/fetchById',
  async (reviewId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.get(`${API_URL}/vehicles/reviews/${reviewId}`, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Create vehicle review
export const createVehicleReview = createAsyncThunk(
  'vehicleReviews/create',
  async (reviewData, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.post(`${API_URL}/vehicles/reviews`, reviewData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Update vehicle review
export const updateVehicleReview = createAsyncThunk(
  'vehicleReviews/update',
  async ({ reviewId, reviewData }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.put(`${API_URL}/vehicles/reviews/${reviewId}`, reviewData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Delete vehicle review
export const deleteVehicleReview = createAsyncThunk(
  'vehicleReviews/delete',
  async (reviewId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      await axios.delete(`${API_URL}/vehicles/reviews/${reviewId}`, getAuthHeaders(token));
      return reviewId; // Return ID for removal from state
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Download single review report
export const downloadReviewReport = createAsyncThunk(
  'vehicleReviews/downloadReport',
  async ({ reviewId, format }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        params: { format }
      };
      const response = await axios.get(`${API_URL}/vehicles/reviews/${reviewId}/download`, config);
      const contentDisposition = response.headers['content-disposition'];
      let filename = `review_${reviewId}.${format}`;
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

// Send single review report via email
export const sendReviewReportByClient = createAsyncThunk(
  'vehicleReviews/sendReport',
  async ({ reviewId, email, format }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const body = { email, format };
      await axios.post(`${API_URL}/vehicles/reviews/report/email/${reviewId}`, body, getAuthHeaders(token));
      return { email };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// --- Slice Definition ---
const initialState = {
  items: [], // List of reviews (usually filtered by vehicle in component)
  currentReview: null, // For viewing/editing single review
  status: 'idle', // Status for list fetching (fetchByVehicleId)
  error: null, // Error for list fetching
  currentStatus: 'idle', // Status for fetching single review (fetchById)
  currentError: null, // Error for fetching single review
  operationStatus: 'idle', // Status for create/update/delete
  operationError: null, // Error for create/update/delete
  reportStatus: 'idle', // Status for report generation/sending
  reportError: null, // Error for report generation/sending
};

const vehicleReviewSlice = createSlice({
  name: 'vehicleReviews',
  initialState,
  reducers: {
    resetCurrentReview: (state) => {
      state.currentReview = null;
      state.currentStatus = 'idle';
      state.currentError = null;
    },
    clearReviewOperationStatus: (state) => {
      state.operationStatus = 'idle';
      state.operationError = null;
    },
    clearReviewReportStatus: (state) => {
      state.reportStatus = 'idle';
      state.reportError = null;
    },
    resetReviewState: () => initialState, // Reset entire slice state
  },
  extraReducers: (builder) => {
    builder
      // List Fetching (by Vehicle)
      .addCase(fetchReviewsByVehicleId.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(fetchReviewsByVehicleId.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload; })
      .addCase(fetchReviewsByVehicleId.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      // Single Fetching
      .addCase(fetchReviewById.pending, (state) => { state.currentStatus = 'loading'; state.currentError = null; })
      .addCase(fetchReviewById.fulfilled, (state, action) => { state.currentStatus = 'succeeded'; state.currentReview = action.payload; })
      .addCase(fetchReviewById.rejected, (state, action) => { state.currentStatus = 'failed'; state.currentError = action.payload; })
       // Handle deleteVehicleReview.fulfilled using addCase *before* matchers
       .addCase(deleteVehicleReview.fulfilled, (state, action) => {
        state.operationStatus = 'succeeded';
        state.items = state.items.filter(r => r._id !== action.payload); // Remove from list
        if (state.currentReview?._id === action.payload) state.currentReview = null; // Clear current if deleted
      })
      // Create/Update/Delete Operations
      .addMatcher(
        (action) => [createVehicleReview.pending.type, updateVehicleReview.pending.type, deleteVehicleReview.pending.type].includes(action.type),
        (state) => { state.operationStatus = 'loading'; state.operationError = null; }
      )
      .addMatcher(
        (action) => [createVehicleReview.fulfilled.type, updateVehicleReview.fulfilled.type].includes(action.type),
        (state, action) => {
          state.operationStatus = 'succeeded';
          const index = state.items.findIndex(r => r._id === action.payload._id);
          if (index !== -1) state.items[index] = action.payload; else state.items.push(action.payload); // Add or update
          if (state.currentReview?._id === action.payload._id) state.currentReview = action.payload; // Update current if matching
        }
      )
   
      .addMatcher(
        (action) => [createVehicleReview.rejected.type, updateVehicleReview.rejected.type, deleteVehicleReview.rejected.type].includes(action.type),
        (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; }
      )
      // Report Actions
      .addMatcher(
        (action) => [downloadReviewReport.pending.type, sendReviewReportByClient.pending.type].includes(action.type),
        (state) => { state.reportStatus = 'loading'; state.reportError = null; }
      )
      .addMatcher(
        (action) => [downloadReviewReport.fulfilled.type, sendReviewReportByClient.fulfilled.type].includes(action.type),
        (state) => { state.reportStatus = 'succeeded'; }
      )
      .addMatcher(
        (action) => [downloadReviewReport.rejected.type, sendReviewReportByClient.rejected.type].includes(action.type),
        (state, action) => { state.reportStatus = 'failed'; state.reportError = action.payload; }
      );
  },
});

// --- Exports ---
export const {
  resetCurrentReview,
  clearReviewOperationStatus,
  clearReviewReportStatus,
  resetReviewState,
} = vehicleReviewSlice.actions;

export default vehicleReviewSlice.reducer;

// --- Selectors ---
export const selectAllReviewsForVehicle = (state) => state.vehicleReviews.items;
export const selectCurrentReviewData = (state) => state.vehicleReviews.currentReview;
export const selectReviewListStatus = (state) => state.vehicleReviews.status;
export const selectReviewListError = (state) => state.vehicleReviews.error;
export const selectCurrentReviewStatus = (state) => state.vehicleReviews.currentStatus;
export const selectCurrentReviewError = (state) => state.vehicleReviews.currentError;
export const selectReviewOperationStatus = (state) => state.vehicleReviews.operationStatus;
export const selectReviewOperationError = (state) => state.vehicleReviews.operationError;
export const selectReviewReportStatus = (state) => state.vehicleReviews.reportStatus;
export const selectReviewReportError = (state) => state.vehicleReviews.reportError;
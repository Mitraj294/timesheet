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

//  Async Thunks 

// Fetches reviews for a specific vehicle. Requires authentication.
// vehicleId: The ID of the vehicle.
export const fetchReviewsByVehicleId = createAsyncThunk(
  'vehicleReviews/fetchByVehicleId',
  async (vehicleId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      // Endpoint might be /api/vehicles/vehicle/:vehicleId/reviews
      const response = await axios.get(`${API_URL}/vehicles/vehicle/${vehicleId}/reviews`, getAuthHeaders(token));
      // The backend controller getVehicleReviewsByVehicleId sends the array directly.
      return response.data || []; // Return the array directly
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Fetches a single review by its ID. Requires authentication.
// reviewId: The ID of the review.
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

// Creates a vehicle review. Requires authentication.
// reviewData: Data for the new review.
export const createVehicleReview = createAsyncThunk(
  'vehicleReviews/create',
    async ({ vehicleId, ...reviewData }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      if (!vehicleId) {
        return rejectWithValue('Vehicle ID is required to add a review.');
      }
      // Construct the correct URL with vehicleId
      const response = await axios.post(`${API_URL}/vehicles/${vehicleId}/reviews`, reviewData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Updates a vehicle review. Requires authentication.
// params.reviewId: ID of the review to update.
// params.reviewData: New data for the review.
export const updateVehicleReview = createAsyncThunk(
  'vehicleReviews/update',
    async ({ reviewId, reviewData }, { getState, rejectWithValue }) => { // Removed unused vehicleId from parameters
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

// Deletes a vehicle review. Requires authentication.
// reviewId: ID of the review to delete.
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

// Downloads a single review report (PDF or Excel). Requires authentication.
// params.reviewId: ID of the review.
// params.format: 'pdf' or 'excel'.
export const downloadReviewReport = createAsyncThunk(
  'vehicleReviews/downloadReport',
  async ({ reviewId, format }, { getState, rejectWithValue }) => { // format can be 'pdf' or 'excel'
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        params: { format } // Send format to backend
      };
      const response = await axios.get(`${API_URL}/vehicles/reviews/${reviewId}/download`, config);
      const contentDisposition = response.headers['content-disposition'];
      let filename = `review_${reviewId}.${format === 'excel' ? 'xlsx' : 'pdf'}`; // Adjust fallback based on format
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
        if (filenameMatch && filenameMatch[1]) filename = decodeURIComponent(filenameMatch[1]);
      }
      return { blob: response.data, filename };
    } catch (error) { // The original response.data (the Blob) is available on error.response.data
        if (error.response?.data instanceof Blob && error.response?.data.type.includes('json')) {
            try { const errorJson = JSON.parse(await error.response.data.text()); return rejectWithValue(errorJson.message || 'Failed to download report'); } catch (parseError) {}
        }
      return rejectWithValue(getErrorMessage(error));
    }
  }
);
// The fulfilled payload will now be { blob: Blob, filename: string }
// Sends a single review report (as PDF) via email. Requires authentication.
// params.reviewId: ID of the review.
// params.email: Recipient's email address.
export const sendReviewReportByClient = createAsyncThunk(
  'vehicleReviews/sendReport',
  async ({ reviewId, email, format = 'pdf' }, { getState, rejectWithValue }) => { // Added format
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const body = { email, format }; // Pass format to the backend
      await axios.post(`${API_URL}/vehicles/reviews/${reviewId}/send-email`, body, getAuthHeaders(token)); // URL is correct
      return { email };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

//  Slice Definition 
// Initial state for the vehicleReviews slice.
const initialState = {
  items: [],           // List of reviews (usually filtered by vehicle in component).
  currentReview: null, // For viewing/editing a single review.
  status: 'idle',      // Status for list fetching (fetchByVehicleId).
  error: null,         // Error for list fetching.
  currentStatus: 'idle', // Status for fetching a single review (fetchById).
  currentError: null,    // Error for fetching a single review.
  operationStatus: 'idle', // Status for create/update/delete operations.
  operationError: null,    // Error for create/update/delete operations.
  reportStatus: 'idle',    // Status for report generation/sending.
  reportError: null,       // Error for report generation/sending.
};

const vehicleReviewSlice = createSlice({
  name: 'vehicleReviews',
  initialState,
  reducers: {
    // Resets the current review details.
    resetCurrentReview: (state) => {
      state.currentReview = null;
      state.currentStatus = 'idle';
      state.currentError = null;
    },
    // Clears status and error for create/update/delete operations.
    clearReviewOperationStatus: (state) => {
      state.operationStatus = 'idle';
      state.operationError = null;
    },
    // Clears status and error for report operations.
    clearReviewReportStatus: (state) => {
      state.reportStatus = 'idle';
      state.reportError = null;
    },
    // Resets the entire vehicleReviews slice state to initial.
    resetReviewState: () => initialState, // Reset entire slice state
  },
  extraReducers: (builder) => { // Handles async thunk actions
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
        state.operationError = null; // Clear error on success
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
          state.operationError = null; // Clear error on success
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
        (state) => { state.reportStatus = 'succeeded'; state.reportError = null; } // Clear error on success
      )
      .addMatcher(
        (action) => [downloadReviewReport.rejected.type, sendReviewReportByClient.rejected.type].includes(action.type),
        (state, action) => { state.reportStatus = 'failed'; state.reportError = action.payload; }
      );
  },
});

//  Exports 
// Export synchronous actions
export const {
  resetCurrentReview,
  clearReviewOperationStatus,
  clearReviewReportStatus,
  resetReviewState,
} = vehicleReviewSlice.actions;

// Export main reducer
export default vehicleReviewSlice.reducer;

//  Selectors 
// Selects all reviews (typically for a specific vehicle, filtered in component).
export const selectAllReviewsForVehicle = (state) => state.vehicleReviews.items;
// Selects the currently viewed/edited review.
export const selectCurrentReviewData = (state) => state.vehicleReviews.currentReview;
// Selects the status for fetching the list of reviews.
export const selectReviewListStatus = (state) => state.vehicleReviews.status;
// Selects the error for fetching the list of reviews.
export const selectReviewListError = (state) => state.vehicleReviews.error;
// Selects the status for fetching a single review.
export const selectCurrentReviewStatus = (state) => state.vehicleReviews.currentStatus;
// Selects the error for fetching a single review.
export const selectCurrentReviewError = (state) => state.vehicleReviews.currentError;
// Selects the status for create/update/delete operations.
export const selectReviewOperationStatus = (state) => state.vehicleReviews.operationStatus;
// Selects the error for create/update/delete operations.
export const selectReviewOperationError = (state) => state.vehicleReviews.operationError;
// Selects the status for report generation/sending.
export const selectReviewReportStatus = (state) => state.vehicleReviews.reportStatus;
// Selects the error for report generation/sending.
export const selectReviewReportError = (state) => state.vehicleReviews.reportError;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5000/api' : 'https://timesheet-c4mj.onrender.com/api');

// Helpers
const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});
const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred';

// Thunks
export const fetchReviewsByVehicleId = createAsyncThunk(
  'vehicleReviews/fetchByVehicleId',
  async (vehicleId, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.get(`${API_URL}/vehicles/vehicle/${vehicleId}/reviews`, getAuthHeaders(token));
      return response.data || [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchReviewById = createAsyncThunk(
  'vehicleReviews/fetchById',
  async (reviewId, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.get(`${API_URL}/vehicles/reviews/${reviewId}`, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createVehicleReview = createAsyncThunk(
  'vehicleReviews/create',
  async ({ vehicleId, ...reviewData }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    if (!vehicleId) return rejectWithValue('Vehicle ID is required to add a review.');
    try {
      // Only send reviewData as body, not wrapped in another object
      const response = await axios.post(`${API_URL}/vehicles/${vehicleId}/reviews`, reviewData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateVehicleReview = createAsyncThunk(
  'vehicleReviews/update',
  async ({ reviewId, reviewData }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.put(`${API_URL}/vehicles/reviews/${reviewId}`, reviewData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteVehicleReview = createAsyncThunk(
  'vehicleReviews/delete',
  async (reviewId, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      await axios.delete(`${API_URL}/vehicles/reviews/${reviewId}`, getAuthHeaders(token));
      return reviewId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const downloadReviewReport = createAsyncThunk(
  'vehicleReviews/downloadReport',
  async ({ reviewId, format }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        params: { format }
      };
      const response = await axios.get(`${API_URL}/vehicles/reviews/${reviewId}/download`, config);
      const contentDisposition = response.headers['content-disposition'];
      let filename = `review_${reviewId}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
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

export const sendReviewReportByClient = createAsyncThunk(
  'vehicleReviews/sendReport',
  async ({ reviewId, email, format = 'pdf' }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const body = { email, format };
      await axios.post(`${API_URL}/vehicles/reviews/${reviewId}/send-email`, body, getAuthHeaders(token));
      return { email };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// State
const initialState = {
  items: [],
  currentReview: null,
  status: 'idle',
  error: null,
  currentStatus: 'idle',
  currentError: null,
  operationStatus: 'idle',
  operationError: null,
  reportStatus: 'idle',
  reportError: null,
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
    resetReviewState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReviewsByVehicleId.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchReviewsByVehicleId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchReviewsByVehicleId.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchReviewById.pending, (state) => {
        state.currentStatus = 'loading';
        state.currentError = null;
      })
      .addCase(fetchReviewById.fulfilled, (state, action) => {
        state.currentStatus = 'succeeded';
        state.currentReview = action.payload;
      })
      .addCase(fetchReviewById.rejected, (state, action) => {
        state.currentStatus = 'failed';
        state.currentError = action.payload;
      })
      .addCase(deleteVehicleReview.fulfilled, (state, action) => {
        state.operationStatus = 'succeeded';
        state.items = state.items.filter(r => r._id !== action.payload);
        state.operationError = null;
        if (state.currentReview?._id === action.payload) state.currentReview = null;
      })
      .addMatcher(
        (action) => [createVehicleReview.pending.type, updateVehicleReview.pending.type, deleteVehicleReview.pending.type].includes(action.type),
        (state) => { state.operationStatus = 'loading'; state.operationError = null; }
      )
      .addMatcher(
        (action) => [createVehicleReview.fulfilled.type, updateVehicleReview.fulfilled.type].includes(action.type),
        (state, action) => {
          state.operationStatus = 'succeeded';
          const index = state.items.findIndex(r => r._id === action.payload._id);
          if (index !== -1) state.items[index] = action.payload;
          else state.items.push(action.payload);
          if (state.currentReview?._id === action.payload._id) state.currentReview = action.payload;
          state.operationError = null;
        }
      )
      .addMatcher(
        (action) => [createVehicleReview.rejected.type, updateVehicleReview.rejected.type, deleteVehicleReview.rejected.type].includes(action.type),
        (state, action) => { state.operationStatus = 'failed'; state.operationError = action.payload; }
      )
      .addMatcher(
        (action) => [downloadReviewReport.pending.type, sendReviewReportByClient.pending.type].includes(action.type),
        (state) => { state.reportStatus = 'loading'; state.reportError = null; }
      )
      .addMatcher(
        (action) => [downloadReviewReport.fulfilled.type, sendReviewReportByClient.fulfilled.type].includes(action.type),
        (state) => { state.reportStatus = 'succeeded'; state.reportError = null; }
      )
      .addMatcher(
        (action) => [downloadReviewReport.rejected.type, sendReviewReportByClient.rejected.type].includes(action.type),
        (state, action) => { state.reportStatus = 'failed'; state.reportError = action.payload; }
      );
  },
});

export const {
  resetCurrentReview,
  clearReviewOperationStatus,
  clearReviewReportStatus,
  resetReviewState,
} = vehicleReviewSlice.actions;

export default vehicleReviewSlice.reducer;

// Selectors
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

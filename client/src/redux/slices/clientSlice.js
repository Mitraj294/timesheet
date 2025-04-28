// src/redux/slices/clientSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Define the API URL (consistent with your action file)
const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// 1. Create the Async Thunk for fetching clients
// This replaces the getClients action creator
export const fetchClients = createAsyncThunk(
  'clients/fetchClients', // Action type prefix (e.g., 'clients/fetchClients/pending')
  async (_, { rejectWithValue }) => { // Use rejectWithValue for standardized error handling
    try {
      // Make the API call
      const response = await axios.get(`${API_URL}/clients`);
      // Return the data on success (this becomes action.payload in the fulfilled case)
      return response.data || []; // Ensure we return an array
    } catch (error) {
      // Log the detailed error for debugging
      console.error("Error fetching clients:", error);
      // Extract a user-friendly error message
      const message =
        error.response?.data?.message || // Check for backend error message
        error.response?.data ||         // Fallback to response data if no message field
        error.message ||                // Fallback to generic error message
        'Failed to fetch clients';      // Default message
      // Return the error message using rejectWithValue (becomes action.payload in the rejected case)
      return rejectWithValue(message);
    }
  }
);

// 2. Define the initial state for the slice
// Similar to your old reducer's initial state, but often uses a status string
const initialState = {
  clients: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// 3. Create the Slice
// This combines the reducer logic and action generation
const clientSlice = createSlice({
  name: 'clients', // This name is used in action type generation
  initialState,
  reducers: {
    // You can add synchronous reducers here if needed later.
    // For example, to manually clear the error:
    clearClientError: (state) => {
        state.error = null;
        // Optionally reset status if error occurred
        if (state.status === 'failed') {
            state.status = 'idle';
        }
    }
    // RTK automatically creates an action creator called `clearClientError` for this.
  },
  // Handle actions defined outside the slice, like our async thunk
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        // When the API call starts
        state.status = 'loading';
        state.error = null; // Clear previous errors
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        // When the API call succeeds
        state.status = 'succeeded';
        // Immer allows direct "mutation" here; it handles immutability
        state.clients = action.payload;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        // When the API call fails
        state.status = 'failed';
        state.error = action.payload; // Payload comes from rejectWithValue
      });
  },
});

// 4. Export the parts you'll need elsewhere
export const { clearClientError } = clientSlice.actions; // Export synchronous actions
export default clientSlice.reducer; // Export the reducer for the store

// Optional: Export selectors for cleaner component access
export const selectAllClients = (state) => state.clients.clients;
export const selectClientStatus = (state) => state.clients.status;
export const selectClientError = (state) => state.clients.error;

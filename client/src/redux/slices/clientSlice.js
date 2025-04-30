// src/redux/slices/clientSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Define the API URL (consistent with your action file)
const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// Helper to get auth headers
const getAuthHeaders = (token) => {
  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};
};

// Helper function to extract error messages
const getErrorMessage = (error) => {
    return error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';
}

// 1. Create the Async Thunk for fetching clients
// This replaces the getClients action creator
export const fetchClients = createAsyncThunk(
  'clients/fetchClients', // Action type prefix (e.g., 'clients/fetchClients/pending')
  async (_, { getState, rejectWithValue }) => { // Use rejectWithValue for standardized error handling
    try {
      // Make the API call
      const response = await axios.get(`${API_URL}/clients`);
      // Return the data on success (this becomes action.payload in the fulfilled case)
      return response.data || []; // Ensure we return an array
    } catch (error) {
      // Log the detailed error for debugging
      console.error("Error fetching clients:", error);
      // Return the error message using rejectWithValue (becomes action.payload in the rejected case)
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for fetching a single client by ID
export const fetchClientById = createAsyncThunk(
  'clients/fetchClientById',
  async (clientId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      // Assuming fetching a single client might require auth
      const config = token ? getAuthHeaders(token) : {};
      const response = await axios.get(`${API_URL}/clients/${clientId}`, config);
      return response.data;
    } catch (error) {
      console.error("Error fetching client by ID:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for creating a new client
export const createClient = createAsyncThunk(
  'clients/createClient',
  async (clientData, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.post(`${API_URL}/clients`, clientData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      console.error("Error creating client:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for updating a client
export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ id, clientData }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.put(`${API_URL}/clients/${id}`, clientData, getAuthHeaders(token));
      return response.data; // Return updated client
    } catch (error) {
      console.error("Error updating client:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for deleting a client
export const deleteClient = createAsyncThunk(
  'clients/deleteClient',
  async (clientId, { getState, rejectWithValue }) => {
    try {
      const { token, user } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      if (user?.role !== 'employer') return rejectWithValue('Access Denied: Only employers can delete clients.');

      await axios.delete(`${API_URL}/clients/${clientId}`, getAuthHeaders(token));
      return clientId; // Return the ID for reducer logic
    } catch (error) {
      console.error("Error deleting client:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for downloading clients report
export const downloadClients = createAsyncThunk(
  'clients/downloadClients',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      // No token check here, assuming endpoint might be public or handles auth internally
      const config = token ? { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" } : { responseType: "blob" };

      const response = await axios.get(`${API_URL}/clients/download`, config);

      // Extract filename
      const contentDisposition = response.headers['content-disposition'];
      let filename = `clients_report.xlsx`; // Default filename
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }
      return { blob: response.data, filename };
    } catch (error) {
      console.error("Download clients failed:", error);
      // Handle potential blob error response
      if (error.response?.data instanceof Blob && error.response?.data.type.includes('json')) {
        try {
          const errorJson = JSON.parse(await error.response.data.text());
          return rejectWithValue(errorJson.message || errorJson.error || 'Failed to download report');
        } catch (parseError) { console.error("Could not parse error blob:", parseError); }
      }
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// 2. Define the initial state for the slice
// Similar to your old reducer's initial state, but often uses a status string
const initialState = {
  clients: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  // Add status/error for specific actions if needed for finer UI control
  deleteStatus: 'idle',
  downloadStatus: 'idle',
  // State for the currently viewed/edited client
  currentClient: null,
  currentClientStatus: 'idle',
  currentClientError: null,
  downloadError: null,
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
    },
    clearDownloadStatus: (state) => {
        state.downloadStatus = 'idle';
        state.downloadError = null;
    },
    // Optional: Clear delete status if needed
    // clearDeleteStatus: (state) => {
    //     state.deleteStatus = 'idle';
    // }
    clearCurrentClient: (state) => {
        state.currentClient = null;
        state.currentClientStatus = 'idle';
        state.currentClientError = null;
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
      })
      // --- fetchClientById ---
      .addCase(fetchClientById.pending, (state) => {
        state.currentClientStatus = 'loading';
        state.currentClientError = null;
        state.currentClient = null;
      })
      .addCase(fetchClientById.fulfilled, (state, action) => {
        state.currentClientStatus = 'succeeded';
        state.currentClient = action.payload;
      })
      .addCase(fetchClientById.rejected, (state, action) => {
        state.currentClientStatus = 'failed';
        state.currentClientError = action.payload;
      })
      // --- createClient / updateClient (using general status/error for simplicity) ---
      .addCase(createClient.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(createClient.fulfilled, (state, action) => { state.status = 'succeeded'; state.clients.push(action.payload); }) // Add to list
      .addCase(createClient.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      .addCase(updateClient.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(updateClient.fulfilled, (state, action) => { state.status = 'succeeded'; const index = state.clients.findIndex(c => c._id === action.payload._id); if (index !== -1) state.clients[index] = action.payload; }) // Update in list
      .addCase(updateClient.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      // --- deleteClient ---
      .addCase(deleteClient.pending, (state) => {
        state.deleteStatus = 'loading';
        state.error = null; // Clear general error on new action
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.deleteStatus = 'succeeded';
        state.clients = state.clients.filter(client => client._id !== action.payload);
      })
      .addCase(deleteClient.rejected, (state, action) => {
        state.deleteStatus = 'failed';
        state.error = action.payload; // Set general error
      })
      // --- downloadClients ---
      .addCase(downloadClients.pending, (state) => {
        state.downloadStatus = 'loading';
        state.downloadError = null;
      })
      .addCase(downloadClients.fulfilled, (state) => {
        state.downloadStatus = 'succeeded';
        // Blob handled in component
      })
      .addCase(downloadClients.rejected, (state, action) => {
        state.downloadStatus = 'failed';
        state.downloadError = action.payload;
      });
  },
});

// 4. Export the parts you'll need elsewhere
export const { clearClientError, clearDownloadStatus, clearCurrentClient } = clientSlice.actions; // Export synchronous actions
export default clientSlice.reducer; // Export the reducer for the store

// Optional: Export selectors for cleaner component access
export const selectAllClients = (state) => state.clients.clients;
export const selectClientStatus = (state) => state.clients.status;
export const selectClientError = (state) => state.clients.error;
export const selectClientDeleteStatus = (state) => state.clients.deleteStatus; // Optional
export const selectClientDownloadStatus = (state) => state.clients.downloadStatus;
export const selectClientDownloadError = (state) => state.clients.downloadError;
export const selectCurrentClient = (state) => state.clients.currentClient;
export const selectCurrentClientStatus = (state) => state.clients.currentClientStatus;
export const selectCurrentClientError = (state) => state.clients.currentClientError;
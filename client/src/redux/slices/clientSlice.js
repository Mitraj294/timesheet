// src/redux/slices/clientSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

// Helper to get authorization headers if a token is present.
const getAuthHeaders = (token) => {
  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};
};

// Helper function to extract a user-friendly error message from various error structures.
const getErrorMessage = (error) => {
    return error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';
}

// Async Thunk for fetching all clients.
export const fetchClients = createAsyncThunk(
  'clients/fetchClients', // Action type prefix (e.g., 'clients/fetchClients/pending')
  async (_, { getState, rejectWithValue }) => { // Use rejectWithValue for standardized error handling
    const { token } = getState().auth;
    if (!token) {
      return rejectWithValue('Not authorized, no token provided');
    }
    try {
      const response = await axios.get(`${API_URL}/clients`, getAuthHeaders(token));
      // Return the data on success (this becomes action.payload in the fulfilled case)
      return response.data || []; // Ensure we always return an array, even if API returns null for no clients.
    } catch (error) {
      console.error("Error fetching clients:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for fetching a single client by its ID.
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

// Async Thunk for creating a new client. Requires authentication.
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

// Async Thunk for updating an existing client. Requires authentication.
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

// Async Thunk for deleting a client. Requires employer role and authentication.
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

// Async Thunk for downloading a report of all clients (Excel format).
export const downloadClients = createAsyncThunk(
  'clients/downloadClients',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
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

// Defines the initial state for the clients slice.
const initialState = {
  clients: [], // Holds the list of all clients.
  status: 'idle', // General status for fetching the list of clients ('idle' | 'loading' | 'succeeded' | 'failed').
  error: null, // Error message related to fetching the list of clients.
  deleteStatus: 'idle', // Status for delete operations.
  downloadStatus: 'idle', // Status for download operations.
  downloadError: null, // Error specific to download operations.
  currentClient: null, // Holds the data for a single client when viewed or edited.
  currentClientStatus: 'idle', // Status for fetching a single client.
  currentClientError: null, // Error related to fetching a single client.
};

// Creates the client slice with reducers and extraReducers for async thunks.
const clientSlice = createSlice({
  name: 'clients', // This name is used in action type generation
  initialState,
  reducers: {
    // Synchronous action to clear the general client error and reset status.
    clearClientError: (state) => {
        state.error = null;
        if (state.status === 'failed') {
            state.status = 'idle';
        }
    },
    // Synchronous action to clear download status and error.
    clearDownloadStatus: (state) => {
        state.downloadStatus = 'idle';
        state.downloadError = null;
    },
    // Synchronous action to clear the currently selected/viewed client data and its status/error.
    clearCurrentClient: (state) => {
        state.currentClient = null;
        state.currentClientStatus = 'idle';
        state.currentClientError = null;
    }
  },
  // Handles actions dispatched by async thunks.
  extraReducers: (builder) => {
    builder
      // Cases for fetching all clients
      .addCase(fetchClients.pending, (state) => {
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
        state.status = 'failed';
        state.error = action.payload; // Payload comes from rejectWithValue
      })
      // Cases for fetching a single client by ID
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
      // Cases for creating a client
      .addCase(createClient.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(createClient.fulfilled, (state, action) => { state.status = 'succeeded'; state.clients.push(action.payload); }) // Add to list
      .addCase(createClient.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      // Cases for updating a client
      .addCase(updateClient.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(updateClient.fulfilled, (state, action) => { state.status = 'succeeded'; const index = state.clients.findIndex(c => c._id === action.payload._id); if (index !== -1) state.clients[index] = action.payload; }) // Update in list
      .addCase(updateClient.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      // Cases for deleting a client
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
      // Cases for downloading the clients report
      .addCase(downloadClients.pending, (state) => {
        state.downloadStatus = 'loading';
        state.downloadError = null;
      })
      .addCase(downloadClients.fulfilled, (state) => {
        state.downloadStatus = 'succeeded';
      })
      .addCase(downloadClients.rejected, (state, action) => {
        state.downloadStatus = 'failed';
        state.downloadError = action.payload;
      });
  },
});

// Export synchronous actions.
export const { clearClientError, clearDownloadStatus, clearCurrentClient } = clientSlice.actions; // Export synchronous actions
// Export the reducer to be included in the Redux store.
export default clientSlice.reducer;

// Selectors to access parts of the client state from components.
export const selectAllClients = (state) => state.clients.clients;
export const selectClientStatus = (state) => state.clients.status;
export const selectClientError = (state) => state.clients.error;
export const selectClientDeleteStatus = (state) => state.clients.deleteStatus;
export const selectClientDownloadStatus = (state) => state.clients.downloadStatus;
export const selectClientDownloadError = (state) => state.clients.downloadError;
export const selectCurrentClient = (state) => state.clients.currentClient;
export const selectCurrentClientStatus = (state) => state.clients.currentClientStatus;
export const selectCurrentClientError = (state) => state.clients.currentClientError;
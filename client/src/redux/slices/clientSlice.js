// src/redux/slices/clientSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5000/api' : 'https://timesheet-c4mj.onrender.com/api');

// Helpers
const getAuthHeaders = (token) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : {};
const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';

// Thunks
export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (_, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Not authorized, no token provided');
    try {
      const response = await axios.get(`${API_URL}/clients`, getAuthHeaders(token));
      return response.data || [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchClientById = createAsyncThunk(
  'clients/fetchClientById',
  async (clientId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const config = token ? getAuthHeaders(token) : {};
      const response = await axios.get(`${API_URL}/clients/${clientId}`, config);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createClient = createAsyncThunk(
  'clients/createClient',
  async (clientData, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.post(`${API_URL}/clients`, clientData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateClient = createAsyncThunk(
  'clients/updateClient',
  async ({ id, clientData }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.put(`${API_URL}/clients/${id}`, clientData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteClient = createAsyncThunk(
  'clients/deleteClient',
  async (clientId, { getState, rejectWithValue }) => {
    try {
      const { token, user } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      if (user?.role !== 'employer') return rejectWithValue('Only employers can delete clients.');
      await axios.delete(`${API_URL}/clients/${clientId}`, getAuthHeaders(token));
      return clientId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const downloadClients = createAsyncThunk(
  'clients/downloadClients',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      const config = token
        ? { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" }
        : { responseType: "blob" };
      const response = await axios.get(`${API_URL}/clients/download`, config);
      const contentDisposition = response.headers['content-disposition'];
      let filename = `clients_report.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
        if (filenameMatch && filenameMatch[1]) filename = decodeURIComponent(filenameMatch[1]);
      }
      return { blob: response.data, filename };
    } catch (error) {
      if (error.response?.data instanceof Blob && error.response?.data.type.includes('json')) {
        try {
          const errorJson = JSON.parse(await error.response.data.text());
          return rejectWithValue(errorJson.message || errorJson.error || 'Failed to download report');
        } catch {}
      }
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// State
const initialState = {
  clients: [],
  status: 'idle',
  error: null,
  deleteStatus: 'idle',
  downloadStatus: 'idle',
  downloadError: null,
  currentClient: null,
  currentClientStatus: 'idle',
  currentClientError: null,
};

// Slice
const clientSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    clearClientError: (state) => {
      state.error = null;
      if (state.status === 'failed') state.status = 'idle';
    },
    clearDownloadStatus: (state) => {
      state.downloadStatus = 'idle';
      state.downloadError = null;
    },
    clearCurrentClient: (state) => {
      state.currentClient = null;
      state.currentClientStatus = 'idle';
      state.currentClientError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.clients = action.payload;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        console.error("[clientSlice] Fetch clients error:", action.payload);
      })
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
        console.error("[clientSlice] Fetch client by ID error:", action.payload);
      })
      .addCase(createClient.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(createClient.fulfilled, (state, action) => { state.status = 'succeeded'; state.clients.push(action.payload); })
      .addCase(createClient.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; console.error("[clientSlice] Create client error:", action.payload); })
      .addCase(updateClient.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(updateClient.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.clients.findIndex(c => c._id === action.payload._id);
        if (index !== -1) state.clients[index] = action.payload;
      })
      .addCase(updateClient.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; console.error("[clientSlice] Update client error:", action.payload); })
      .addCase(deleteClient.pending, (state) => { console.log("[clientSlice] Deleting client..."); })
      .addCase(deleteClient.fulfilled, (state, action) => { console.log("[clientSlice] Client deleted."); })
      .addCase(deleteClient.rejected, (state, action) => {
        state.deleteStatus = 'failed';
        state.error = action.payload;
        console.error("[clientSlice] Delete client error:", action.payload);
      })
      .addCase(downloadClients.pending, (state) => {
        state.downloadStatus = 'loading';
        state.downloadError = null;
        console.log("[clientSlice] Downloading clients...");
      })
      .addCase(downloadClients.fulfilled, (state) => {
        state.downloadStatus = 'succeeded';
        console.log("[clientSlice] Clients downloaded.");
      })
      .addCase(downloadClients.rejected, (state, action) => {
        state.downloadStatus = 'failed';
        state.downloadError = action.payload;
        console.error("[clientSlice] Download clients error:", action.payload);
      });
  },
});

export const { clearClientError, clearDownloadStatus, clearCurrentClient } = clientSlice.actions;
export default clientSlice.reducer;

// Selectors
export const selectAllClients = (state) => state.clients.clients;
export const selectClientStatus = (state) => state.clients.status;
export const selectClientError = (state) => state.clients.error;
export const selectClientDeleteStatus = (state) => state.clients.deleteStatus;
export const selectClientDownloadStatus = (state) => state.clients.downloadStatus;
export const selectClientDownloadError = (state) => state.clients.downloadError;
export const selectCurrentClient = (state) => state.clients.currentClient;
export const selectCurrentClientStatus = (state) => state.clients.currentClientStatus;
export const selectCurrentClientError = (state) => state.clients.currentClientError;
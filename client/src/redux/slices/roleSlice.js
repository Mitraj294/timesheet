// /home/digilab/timesheet/client/src/redux/slices/roleSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
});

const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';

// --- Async Thunks ---

export const fetchRoles = createAsyncThunk(
  'roles/fetchRoles',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.get(`${API_URL}/roles`, getAuthHeaders(token));
      return response.data || [];
    } catch (error) {
      console.error("Error fetching roles:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchRoleById = createAsyncThunk(
  'roles/fetchRoleById',
  async (roleId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.get(`${API_URL}/roles/${roleId}`, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      console.error("Error fetching role by ID:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createRole = createAsyncThunk(
  'roles/createRole',
  async (roleData, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.post(`${API_URL}/roles`, roleData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      console.error("Error creating role:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateRole = createAsyncThunk(
  'roles/updateRole',
  async ({ id, roleData }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      const response = await axios.put(`${API_URL}/roles/${id}`, roleData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      console.error("Error updating role:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteRole = createAsyncThunk(
  'roles/deleteRole',
  async (roleId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      await axios.delete(`${API_URL}/roles/${roleId}`, getAuthHeaders(token));
      return roleId;
    } catch (error) {
      console.error("Error deleting role:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteRoleScheduleEntry = createAsyncThunk(
  'roles/deleteRoleScheduleEntry',
  async ({ roleId, scheduleEntryId }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      // Backend endpoint needs to match this structure
      await axios.delete(`${API_URL}/roles/${roleId}/schedule/${scheduleEntryId}`, getAuthHeaders(token));
      // Return IDs to update the specific role in the reducer
      return { roleId, scheduleEntryId };
    } catch (error) {
      console.error("Error deleting role schedule entry:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// --- Slice Definition ---

const initialState = {
  items: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  // State for the currently viewed/edited role
  currentRole: null,
  currentRoleStatus: 'idle',
  currentRoleError: null,
};

const roleSlice = createSlice({
  name: 'roles',
  initialState,
  reducers: {
    clearRoleError: (state) => {
      state.error = null;
      if (state.status === 'failed') state.status = 'idle';
    },
    clearRoles: () => initialState,
    clearCurrentRole: (state) => {
        state.currentRole = null;
        state.currentRoleStatus = 'idle';
        state.currentRoleError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchRoles.pending, (state) => { state.status = 'loading'; state.error = null; })
      .addCase(fetchRoles.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload; })
      .addCase(fetchRoles.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      // Fetch By ID
      .addCase(fetchRoleById.pending, (state) => { state.currentRoleStatus = 'loading'; state.currentRoleError = null; state.currentRole = null; })
      .addCase(fetchRoleById.fulfilled, (state, action) => { state.currentRoleStatus = 'succeeded'; state.currentRole = action.payload; })
      .addCase(fetchRoleById.rejected, (state, action) => { state.currentRoleStatus = 'failed'; state.currentRoleError = action.payload; })

      // Create
      .addCase(createRole.pending, (state) => { state.status = 'loading'; }) // Use general status for simplicity
      .addCase(createRole.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.push(action.payload);
      })
      .addCase(createRole.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      // Update
      .addCase(updateRole.pending, (state) => { state.status = 'loading'; })
      .addCase(updateRole.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(role => role._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(updateRole.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      // Delete
      .addCase(deleteRole.pending, (state) => { state.status = 'loading'; })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(role => role._id !== action.payload);
      })
      .addCase(deleteRole.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      // Delete Schedule Entry
      .addCase(deleteRoleScheduleEntry.pending, (state) => { state.status = 'loading'; }) // Could use a specific status
      .addCase(deleteRoleScheduleEntry.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { roleId, scheduleEntryId } = action.payload;
        const roleIndex = state.items.findIndex(role => role._id === roleId);
        if (roleIndex !== -1 && state.items[roleIndex].schedule) {
          state.items[roleIndex].schedule = state.items[roleIndex].schedule.filter(
            entry => entry._id !== scheduleEntryId
          );
        }
      })
      .addCase(deleteRoleScheduleEntry.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; });
  },
});

export const { clearRoleError, clearRoles, clearCurrentRole } = roleSlice.actions; // Added clearCurrentRole
export default roleSlice.reducer;

// --- Selectors ---
export const selectAllRoles = (state) => state.roles.items;
export const selectRoleStatus = (state) => state.roles.status;
export const selectRoleError = (state) => state.roles.error;
export const selectRoleById = (state, roleId) =>
  state.roles.items.find(role => role._id === roleId);
// Selectors for current role
export const selectCurrentRole = (state) => state.roles.currentRole;
export const selectCurrentRoleStatus = (state) => state.roles.currentRoleStatus;
export const selectCurrentRoleError = (state) => state.roles.currentRoleError;

// /home/digilab/timesheet/client/src/redux/slices/roleSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

// Creates authorization headers with Content-Type for JSON.
const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
});

// Extracts a user-friendly error message from an API error.
const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';

// --- Async Thunks ---
// Fetches all roles. Requires authentication.
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

// Fetches a single role by its ID. Requires authentication.
// roleId: The ID of the role.
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

// Creates a new role. Requires authentication.
// roleData: Data for the new role.
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

// Updates an existing role. Requires authentication.
// params.id: ID of the role to update.
// params.roleData: New data for the role.
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

// Deletes a role by its ID. Requires authentication.
// roleId: ID of the role to delete.
export const deleteRole = createAsyncThunk(
  'roles/deleteRole',
  async (roleId, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) return rejectWithValue('Authentication required.');
      await axios.delete(`${API_URL}/roles/${roleId}`, getAuthHeaders(token));
      return roleId;
    } catch (error) { // Return ID for reducer to identify and remove role.
      console.error("Error deleting role:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Deletes a specific schedule entry from a role. Requires authentication.
// params.roleId: ID of the role.
// params.scheduleEntryId: ID of the schedule entry to delete.
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
  items: [], // List of all roles.
  status: 'idle', // Loading status for the role list ('idle' | 'loading' | 'succeeded' | 'failed').
  error: null, // Error message for role list operations.

  currentRole: null, // Holds the currently selected/viewed role object.
  currentRoleStatus: 'idle', // Loading status for a single role ('idle' | 'loading' | 'succeeded' | 'failed').
  currentRoleError: null, // Error message for single role operations.
};

const roleSlice = createSlice({
  name: 'roles',
  initialState,
  reducers: {
    // Clears the main role list error and resets status if it was 'failed'.
    clearRoleError: (state) => {
      state.error = null;
      if (state.status === 'failed') state.status = 'idle';
    },
    // Resets the entire roles state to initial.
    clearRoles: () => initialState,
    clearCurrentRole: (state) => {
    // Clears the current role details, its status, and error.
      state.currentRole = null;
      state.currentRoleStatus = 'idle';
      state.currentRoleError = null;
    }
  },
  extraReducers: (builder) => { // Handles async thunk actions
    builder
      // Fetch
      .addCase(fetchRoles.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload || [];
        state.error = null;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.items = [];
      })
      // Fetch By ID
      .addCase(fetchRoleById.pending, (state) => {
        state.currentRoleStatus = 'loading';
        state.currentRoleError = null;
        state.currentRole = null;
      })
      .addCase(fetchRoleById.fulfilled, (state, action) => {
        state.currentRoleStatus = 'succeeded';
        state.currentRole = action.payload;
        state.currentRoleError = null;
      })
      .addCase(fetchRoleById.rejected, (state, action) => {
        state.currentRoleStatus = 'failed';
        state.currentRoleError = action.payload;
        state.currentRole = null;
      })

      // Create
      .addCase(createRole.pending, (state) => {
        state.status = 'loading'; // Use general status for simplicity
        state.error = null;
      })
      .addCase(createRole.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.push(action.payload);
        state.error = null;
      })
      .addCase(createRole.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Update
      .addCase(updateRole.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateRole.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(role => role._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
        // If the updated role is the currentRole, update it too.
        if (state.currentRole?._id === action.payload._id) {
            state.currentRole = action.payload;
        }
        state.error = null;
      })
      .addCase(updateRole.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Delete
      .addCase(deleteRole.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(role => role._id !== action.payload);
        // If the deleted role was the current one, clear it.
        if (state.currentRole?._id === action.payload) {
            state.currentRole = null;
            state.currentRoleStatus = 'idle';
            state.currentRoleError = null;
        }
        state.error = null;
      })
      .addCase(deleteRole.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Delete Schedule Entry
      .addCase(deleteRoleScheduleEntry.pending, (state) => {
        state.status = 'loading'; // Could use a specific status like 'updating' or 'processing'
        state.error = null;
      })
      .addCase(deleteRoleScheduleEntry.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { roleId, scheduleEntryId } = action.payload;
        const roleIndex = state.items.findIndex(role => role._id === roleId);
        if (roleIndex !== -1 && state.items[roleIndex].schedule) {
          state.items[roleIndex].schedule = state.items[roleIndex].schedule.filter(
            entry => entry._id !== scheduleEntryId
          );
          // Also update currentRole if it's the one being modified
          if (state.currentRole?._id === roleId && state.currentRole.schedule) {
            state.currentRole.schedule = state.currentRole.schedule.filter(
              entry => entry._id !== scheduleEntryId
            );
          }
        }
        state.error = null;
      })
      .addCase(deleteRoleScheduleEntry.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

// Export synchronous actions from the slice.
export const { clearRoleError, clearRoles, clearCurrentRole } = roleSlice.actions;
// Export the main reducer for the store.
export default roleSlice.reducer;

// --- Selectors ---
// Selects all role items.
export const selectAllRoles = (state) => state.roles.items;
// Selects the loading status of the role list.
export const selectRoleStatus = (state) => state.roles.status;
// Selects the error for the role list.
export const selectRoleError = (state) => state.roles.error;

// Selects a single role by its ID from the `items` array.
export const selectRoleById = (state, roleId) =>
  state.roles.items.find(role => role._id === roleId);

// Selects the current single role.
export const selectCurrentRole = (state) => state.roles.currentRole;
// Selects the loading status for the current single role.
export const selectCurrentRoleStatus = (state) => state.roles.currentRoleStatus;
// Selects the error for the current single role.
export const selectCurrentRoleError = (state) => state.roles.currentRoleError;

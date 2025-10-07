// /home/digilab/timesheet/client/src/redux/slices/roleSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// Helpers
const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
});
const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';

// Thunks
export const fetchRoles = createAsyncThunk(
  'roles/fetchRoles',
  async (_, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.get(`${API_URL}/roles`, getAuthHeaders(token));
      return response.data || [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchRoleById = createAsyncThunk(
  'roles/fetchRoleById',
  async (roleId, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.get(`${API_URL}/roles/${roleId}`, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createRole = createAsyncThunk(
  'roles/createRole',
  async (roleData, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.post(`${API_URL}/roles`, roleData, getAuthHeaders(token));
      return response.data.role;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateRole = createAsyncThunk(
  'roles/updateRole',
  async ({ id, roleData }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      const response = await axios.put(`${API_URL}/roles/${id}`, roleData, getAuthHeaders(token));
      return response.data.role;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteRole = createAsyncThunk(
  'roles/deleteRole',
  async (roleId, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      await axios.delete(`${API_URL}/roles/${roleId}`, getAuthHeaders(token));
      return roleId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteRoleScheduleEntry = createAsyncThunk(
  'roles/deleteRoleScheduleEntry',
  async ({ roleId, scheduleEntryId }, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required.');
    try {
      await axios.delete(`${API_URL}/roles/${roleId}/schedule/${scheduleEntryId}`, getAuthHeaders(token));
      return { roleId, scheduleEntryId };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const sendRoleUpdateNotificationEmail = createAsyncThunk(
  'roles/sendRoleUpdateNotificationEmail',
  async (notificationData, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Authentication required to send role notifications.');
    try {
      const response = await axios.post(`${API_URL}/notifications/email`, notificationData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// State
const initialState = {
  items: [],
  status: 'idle',
  error: null,
  currentRole: null,
  currentRoleStatus: 'idle',
  currentRoleError: null,
};

// Slice
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
      .addCase(createRole.pending, (state) => {
        state.status = 'loading';
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
      .addCase(updateRole.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateRole.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(role => role._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
        if (state.currentRole?._id === action.payload._id) {
          state.currentRole = action.payload;
        }
        state.error = null;
      })
      .addCase(updateRole.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(deleteRole.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(role => role._id !== action.payload);
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
      .addCase(deleteRoleScheduleEntry.pending, (state) => {
        state.status = 'loading';
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
      })
      .addCase(sendRoleUpdateNotificationEmail.fulfilled, (state, action) => {
        // No state change needed, just log if needed
      });
  },
});

export const { clearRoleError, clearRoles, clearCurrentRole } = roleSlice.actions;
export default roleSlice.reducer;

// Selectors
export const selectAllRoles = (state) => state.roles.items;
export const selectRoleStatus = (state) => state.roles.status;
export const selectRoleError = (state) => state.roles.error;
export const selectRoleById = (state, roleId) =>
  state.roles.items.find(role => role._id === roleId);
export const selectCurrentRole = (state) => state.roles.currentRole;
export const selectCurrentRoleStatus = (state) => state.roles.currentRoleStatus;
export const selectCurrentRoleError = (state) => state.roles.currentRoleError;

// /home/digilab/timesheet/client/src/redux/slices/projectSlice.js
import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

// Helpers
const getAuthHeaders = (token) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : {};
const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';

// Thunks
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (clientId = null, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth?.token;
      const url = clientId
        ? `${API_URL}/projects/client/${clientId}`
        : `${API_URL}/projects`;
      const response = await axios.get(url, getAuthHeaders(token));
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  'projects/fetchProjectById',
  async (projectId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth?.token;
      const config = token ? getAuthHeaders(token) : {};
      const response = await axios.get(`${API_URL}/projects/${projectId}`, config);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const createProject = createAsyncThunk(
  'projects/createProject',
  async ({ clientId, projectData }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth?.token;
      if (!token) return rejectWithValue('Authentication required.');
      if (!clientId) return rejectWithValue('Client ID is required to create a project.');
      const response = await axios.post(`${API_URL}/projects/client/${clientId}`, projectData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ projectId, projectData }, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth?.token;
      if (!token) return rejectWithValue('Authentication required.');
      if (!projectId) return rejectWithValue('Project ID is required to update a project.');
      const response = await axios.put(`${API_URL}/projects/${projectId}`, projectData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth?.token;
      if (!token) return rejectWithValue('Authentication required.');
      await axios.delete(`${API_URL}/projects/${projectId}`, getAuthHeaders(token));
      return projectId;
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
  currentProject: null,
  currentProjectStatus: 'idle',
  currentProjectError: null,
};

// Slice
const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    clearProjectError: (state) => {
      state.error = null;
      if (state.status === 'failed') state.status = 'idle';
    },
    clearProjects: (state) => {
      state.items = [];
      state.status = 'idle';
      state.error = null;
    },
    clearCurrentProject: (state) => {
      state.currentProject = null;
      state.currentProjectStatus = 'idle';
      state.currentProjectError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.items = [];
      })
      .addCase(fetchProjectById.pending, (state) => {
        state.currentProjectStatus = 'loading';
        state.currentProjectError = null;
        state.currentProject = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.currentProjectStatus = 'succeeded';
        state.currentProject = action.payload;
        state.currentProjectError = null;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.currentProjectStatus = 'failed';
        state.currentProjectError = action.payload;
        state.currentProject = null;
      })
      .addCase(createProject.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload?._id && !state.items.find(p => p._id === action.payload._id)) {
          state.items.push(action.payload);
        }
        state.error = null;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(updateProject.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload?._id) {
          const index = state.items.findIndex(p => p._id === action.payload._id);
          if (index !== -1) state.items[index] = action.payload;
          if (state.currentProject?._id === action.payload._id) {
            state.currentProject = action.payload;
          }
        }
        state.error = null;
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(deleteProject.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(p => p._id !== action.payload);
        if (state.currentProject?._id === action.payload) {
          state.currentProject = null;
          state.currentProjectStatus = 'idle';
          state.currentProjectError = null;
        }
        state.error = null;
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const { clearProjectError, clearProjects, clearCurrentProject } = projectSlice.actions;
export default projectSlice.reducer;

// Selectors
export const selectProjectItems = (state) => state.projects.items;
export const selectProjectStatus = (state) => state.projects.status;
export const selectProjectError = (state) => state.projects.error;
export const selectCurrentProject = (state) => state.projects.currentProject;
export const selectCurrentProjectStatus = (state) => state.projects.currentProjectStatus;
export const selectCurrentProjectError = (state) => state.projects.currentProjectError;
export const selectProjectById = (state, projectId) =>
  Array.isArray(selectProjectItems(state))
    ? selectProjectItems(state).find(p => p._id === projectId)
    : undefined;

// Memoized selector for projects by clientId
const selectClientIdArg = (_, clientId) => clientId;
export const selectProjectsByClientId = createSelector(
  [selectProjectItems, selectClientIdArg],
  (projects, clientId) => {
    if (!clientId) return [];
    return Array.isArray(projects)
      ? projects.filter(project => (project.clientId?._id || project.clientId) === clientId)
      : [];
  }
);

// /home/digilab/timesheet/client/src/redux/slices/projectSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Define the API URL
const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// Helper to get auth headers (assuming token is needed)
const getAuthHeaders = (token) => {
  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};
};

// Helper function to extract error messages
const getErrorMessage = (error) => {
    return error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';
}

// --- Async Thunks ---

// Fetch projects (can fetch all or by client ID)
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (clientId = null, { getState, rejectWithValue }) => { // Pass clientId or null/undefined for all
    try {
      const { token } = getState().auth; // Assuming auth is needed
      const url = clientId
        ? `${API_URL}/projects/client/${clientId}` // Fetch by client
        : `${API_URL}/projects`; // Fetch all
      const response = await axios.get(url, getAuthHeaders(token));
      return response.data || []; // Ensure array return
    } catch (error) {
      console.error("Error fetching projects:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Create a new project for a specific client
export const createProject = createAsyncThunk(
  'projects/createProject',
  async ({ clientId, projectData }, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!clientId) {
          return rejectWithValue('Client ID is required to create a project.');
      }
      const response = await axios.post(`${API_URL}/clients/${clientId}/projects`, projectData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      console.error("Error creating project:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Update an existing project
export const updateProject = createAsyncThunk(
  'projects/updateProject',
  async ({ projectId, projectData }, { getState, rejectWithValue }) => {
    // Note: The original action included clientId, but the route only uses projectId.
    // If clientId is needed for auth/validation on the backend, it should be handled there.
    // If you need clientId in the thunk for other reasons, pass it in the first argument object.
    try {
      const { token } = getState().auth;
      if (!projectId) {
          return rejectWithValue('Project ID is required to update a project.');
      }
      // Using the route defined in projectRoutes.js
      const response = await axios.put(`${API_URL}/projects/${projectId}`, projectData, getAuthHeaders(token));
      return response.data; // Return the updated project data
    } catch (error) {
      console.error("Error updating project:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// --- Slice Definition ---

const initialState = {
  projects: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    // Synchronous action to clear errors
    clearProjectError: (state) => {
      state.error = null;
      if (state.status === 'failed') {
          state.status = 'idle';
      }
    },
    // Action to manually clear projects if needed (e.g., when client changes in UI)
    clearProjects: (state) => {
        state.projects = [];
        state.status = 'idle';
        state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- fetchProjects ---
      .addCase(fetchProjects.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.projects = action.payload; // Replace or merge based on fetch type? For now, replace.
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // --- createProject ---
      .addCase(createProject.pending, (state) => {
        state.status = 'loading'; // Or a specific createStatus
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.projects.push(action.payload); // Add the new project
      })
      .addCase(createProject.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // --- updateProject ---
      .addCase(updateProject.pending, (state) => {
        state.status = 'loading'; // Or a specific updateStatus
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Find and update the project in the array
        const index = state.projects.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.projects[index] = action.payload;
        } else {
            // Optional: Add if not found? Depends on use case.
            // state.projects.push(action.payload);
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
      // Add cases for deleteProject if you implement that thunk
  },
});

// --- Exports ---
export const { clearProjectError, clearProjects } = projectSlice.actions; // Export synchronous actions

export default projectSlice.reducer; // Export the reducer

// Optional: Selectors
export const selectAllProjects = (state) => state.projects.projects; // Ensure store key is 'projects'
export const selectProjectStatus = (state) => state.projects.status;
export const selectProjectError = (state) => state.projects.error;
export const selectProjectById = (state, projectId) =>
  Array.isArray(state?.projects?.projects)
    ? state.projects.projects.find(p => p._id === projectId)
    : undefined;
// Selector to get projects filtered by client ID (useful in components)
export const selectProjectsByClientId = (state, clientId) =>
  Array.isArray(state?.projects?.projects)
    ? state.projects.projects.filter(p => (p.clientId?._id || p.clientId) === clientId)
    : [];


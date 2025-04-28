// /home/digilab/timesheet/client/src/redux/slices/projectSlice.js
import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'; // Import createSelector
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
      // Assuming token is stored in auth slice
      const token = getState().auth?.token; // Safely access token
      if (!token && clientId) { // Only strictly require token if fetching specific client projects? Adjust as needed.
          // If fetching all projects might be public, this check might differ.
          // For now, assume token is needed for client-specific fetch.
          // return rejectWithValue('Authentication required to fetch client projects.');
          // Or maybe allow fetching all projects without token? Depends on API design.
      }

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
      const token = getState().auth?.token; // Safely access token
      if (!token) return rejectWithValue('Authentication required.');
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
    try {
      const token = getState().auth?.token; // Safely access token
      if (!token) return rejectWithValue('Authentication required.');
      if (!projectId) {
          return rejectWithValue('Project ID is required to update a project.');
      }
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
  // Changed 'projects' key to 'items' to avoid naming collision with the slice name
  items: [],
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
        state.items = [];
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
        // Assuming fetchProjects always returns the relevant list (all or by client)
        // If fetching all, this replaces the list. If fetching by client,
        // consider if you need to merge or just display the client-specific list.
        // For simplicity now, it replaces the current items.
        state.items = action.payload;
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
        // Add the new project only if it's not already there (e.g., from a concurrent fetch)
        if (!state.items.find(p => p._id === action.payload._id)) {
            state.items.push(action.payload);
        }
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
        const index = state.items.findIndex(p => p._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        // If not found, maybe it wasn't fetched yet. Fetching might be better.
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

// --- Selectors ---
// Base selector for the projects array
const selectProjectItems = (state) => state.projects.items; // Use 'items' key

// Other simple selectors
export const selectProjectStatus = (state) => state.projects.status;
export const selectProjectError = (state) => state.projects.error;

// Selector to get a single project by ID (memoized by default if projectId doesn't change often)
export const selectProjectById = (state, projectId) =>
  Array.isArray(selectProjectItems(state))
    ? selectProjectItems(state).find(p => p._id === projectId)
    : undefined;

// Input selector for the clientId argument passed to the main selector
const selectClientIdArg = (_, clientId) => clientId;

// Memoized selector for filtering projects by client ID
export const selectProjectsByClientId = createSelector(
  [selectProjectItems, selectClientIdArg], // Input selectors: the projects array and the clientId argument
  (projects, clientId) => {
    // This calculation function only runs if 'projects' array reference changes
    // OR if the passed 'clientId' argument changes.
    // console.log("Selector running for client:", clientId); // For debugging memoization
    if (!clientId) {
      return []; // Return empty array if no client ID
    }
    // Ensure projects is an array before filtering
    return Array.isArray(projects)
      // Adjust filter logic based on how clientId is stored in your project objects
      // Assuming project object has a 'clientId' field which might be an object or string ID
      ? projects.filter(project => (project.clientId?._id || project.clientId) === clientId)
      : [];
  }
);

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
      // Removed token check - let API decide if auth is needed
      // if (!token && clientId) {
      //     return rejectWithValue('Authentication required to fetch client projects.');
      // }

      const url = clientId
        ? `${API_URL}/projects/client/${clientId}` // Fetch by client
        : `${API_URL}/projects`; // Fetch all

      const response = await axios.get(url, getAuthHeaders(token));
      // Ensure the response data is an array, default to empty array if not
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error("Error fetching projects:", error.response?.data || error.message); // Log more detailed error
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
      // Ensure the endpoint matches your backend routes
      const response = await axios.post(`${API_URL}/projects/client/${clientId}`, projectData, getAuthHeaders(token)); // Adjusted endpoint
      return response.data;
    } catch (error) {
      console.error("Error creating project:", error.response?.data || error.message);
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
      console.error("Error updating project:", error.response?.data || error.message);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// --- Slice Definition ---

const initialState = {
  // Use 'items' to store the array of projects
  items: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const projectSlice = createSlice({
  name: 'projects', // This name is used as the key in the root state (state.projects)
  initialState,
  reducers: {
    // Synchronous action to clear errors
    clearProjectError: (state) => {
      state.error = null;
      // Optionally reset status if it was 'failed'
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
        state.error = null; // Clear previous errors on new fetch
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Ensure payload is an array before assigning
        state.items = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.items = []; // Clear items on fetch failure
      })
      // --- createProject ---
      .addCase(createProject.pending, (state) => {
        state.status = 'loading'; // Or a specific createStatus
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Add the new project only if it's not already there and payload is valid
        if (action.payload?._id && !state.items.find(p => p._id === action.payload._id)) {
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
        // Find and update the project in the array if payload is valid
        if (action.payload?._id) {
            const index = state.items.findIndex(p => p._id === action.payload._id);
            if (index !== -1) {
              state.items[index] = action.payload;
            }
            // If not found, it might mean the project wasn't in the list.
            // Depending on the use case, you might add it or ignore it.
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

// --- Selectors ---
// Base selector for the projects array within the 'projects' state slice
// Corrected: Access state.projects.items
// Export this selector so it can be imported elsewhere
export const selectProjectItems = (state) => state.projects.items;

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

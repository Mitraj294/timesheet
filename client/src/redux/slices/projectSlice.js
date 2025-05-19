// /home/digilab/timesheet/client/src/redux/slices/projectSlice.js
import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

// Creates authorization headers if a token is provided.
const getAuthHeaders = (token) => {
  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};
};

// Extracts a user-friendly error message from an API error.
const getErrorMessage = (error) => {
    return error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';
}

// Fetches projects. Can be filtered by `clientId`.
// clientId: Optional client ID to filter projects.
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async (clientId = null, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth?.token; // Get token from auth state
      const url = clientId
        ? `${API_URL}/projects/client/${clientId}`
        : `${API_URL}/projects`;
      const response = await axios.get(url, getAuthHeaders(token));
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error("Error fetching projects:", error.response?.data || error.message);
      return rejectWithValue(getErrorMessage(error)); // Pass clean error message
    }
  }
);

// Fetches a single project by its ID.
// projectId: The ID of the project.
export const fetchProjectById = createAsyncThunk(
  'projects/fetchProjectById',
  async (projectId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth?.token;
      const config = token ? getAuthHeaders(token) : {};
      const response = await axios.get(`${API_URL}/projects/${projectId}`, config);
      return response.data;
    } catch (error) {
      console.error("Error fetching project by ID:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Creates a new project for a given client.
// params.clientId: Client ID for the new project.
// params.projectData: Data for the new project.
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
      console.error("Error creating project:", error.response?.data || error.message);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Updates an existing project.
// params.projectId: ID of the project to update.
// params.projectData: New data for the project.
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
      console.error("Error updating project:", error.response?.data || error.message);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Deletes a project by its ID.
// projectId: ID of the project to delete.
export const deleteProject = createAsyncThunk(
  'projects/deleteProject',
  async (projectId, { getState, rejectWithValue }) => {
    try {
      const token = getState().auth?.token;
      if (!token) return rejectWithValue('Authentication required.');
      await axios.delete(`${API_URL}/projects/${projectId}`, getAuthHeaders(token));
      return projectId; // Return ID for reducer to identify which project was deleted
    } catch (error) {
      console.error("Error deleting project:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Initial state for the projects slice.
const initialState = {
  items: [], // List of all projects.
  status: 'idle', // Loading status for the project list ('idle' | 'loading' | 'succeeded' | 'failed').
  error: null, // Error message for project list operations.

  currentProject: null, // Holds the currently selected/viewed project object.
  currentProjectStatus: 'idle', // Loading status for a single project ('idle' | 'loading' | 'succeeded' | 'failed').
  currentProjectError: null, // Error message for single project operations.
};

const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    // Clears the main project list error and resets status if it was 'failed'.
    clearProjectError: (state) => {
      state.error = null;
      if (state.status === 'failed') {
          state.status = 'idle'; // Allow new operations
      }
    },
    // Clears all project items, resets status, and clears error.
    clearProjects: (state) => {
        state.items = [];
        state.status = 'idle';
        state.error = null;
    },
    // Clears the current project details, its status, and error.
    clearCurrentProject: (state) => {
        state.currentProject = null;
        state.currentProjectStatus = 'idle';
        state.currentProjectError = null;
    }
  },
  // Handles async thunk actions.
  extraReducers: (builder) => {
    builder
      // Reducers for fetching all projects
      .addCase(fetchProjects.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = Array.isArray(action.payload) ? action.payload : [];
        state.error = null; // Clear previous errors
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.items = []; // Clear items on error
      })
      // Reducers for fetching a single project by ID
      .addCase(fetchProjectById.pending, (state) => {
        state.currentProjectStatus = 'loading';
        state.currentProjectError = null;
        state.currentProject = null; // Clear previous project
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.currentProjectStatus = 'succeeded';
        state.currentProject = action.payload;
        state.currentProjectError = null; // Clear previous error
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.currentProjectStatus = 'failed';
        state.currentProjectError = action.payload;
        state.currentProject = null; // Clear project data on failure
      })
      // Reducers for creating a project
      .addCase(createProject.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Add new project to the list if it has an ID and isn't already there.
        if (action.payload?._id && !state.items.find(p => p._id === action.payload._id)) {
            state.items.push(action.payload);
        }
        state.error = null;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Reducers for updating a project
      .addCase(updateProject.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload?._id) {
            // Find and update the project in the main list.
            const index = state.items.findIndex(p => p._id === action.payload._id);
            if (index !== -1) {
              state.items[index] = action.payload;
            }
            // If the updated project is the currentProject, update it too.
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
      // Reducers for deleting a project
      .addCase(deleteProject.pending, (state) => {
        state.status = 'loading'; // Could be 'deleting'
        state.error = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Remove the deleted project (action.payload is projectId) from the list.
        state.items = state.items.filter(p => p._id !== action.payload);
        // If the deleted project was the current one, clear it.
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

// Export synchronous actions from the slice.
export const { clearProjectError, clearProjects, clearCurrentProject } = projectSlice.actions;

// Export the main reducer for the store.
export default projectSlice.reducer;

// Selectors for accessing project state.

// Selects all project items.
export const selectProjectItems = (state) => state.projects.items;
// Selects the loading status of the project list.
export const selectProjectStatus = (state) => state.projects.status;
// Selects the error for the project list.
export const selectProjectError = (state) => state.projects.error;

// Selects the current single project.
export const selectCurrentProject = (state) => state.projects.currentProject;
// Selects the loading status for the current single project.
export const selectCurrentProjectStatus = (state) => state.projects.currentProjectStatus;
// Selects the error for the current single project.
export const selectCurrentProjectError = (state) => state.projects.currentProjectError;

// Selects a project by its ID from the `items` array.
export const selectProjectById = (state, projectId) =>
  Array.isArray(selectProjectItems(state))
    ? selectProjectItems(state).find(p => p._id === projectId)
    : undefined;

// Helper for createSelector to pass the clientId argument.
const selectClientIdArg = (_, clientId) => clientId;

// Memoized selector: filters projects by client ID.
export const selectProjectsByClientId = createSelector(
  [selectProjectItems, selectClientIdArg],
  (projects, clientId) => {
    if (!clientId) {
      return []; // Return empty if no clientId is provided
    }
    return Array.isArray(projects)
      // Filter by matching project.clientId (can be an object or string) with clientId.
      ? projects.filter(project => (project.clientId?._id || project.clientId) === clientId)
      : [];
  }
);

// /home/digilab/timesheet/client/src/redux/slices/employeeSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Define the API URL
const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// Helper to get auth headers (consider moving to a shared utility/service)
const getAuthHeaders = (token) => {
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    : {};
};

// Helper function to extract error messages
const getErrorMessage = (error) => {
    return error.response?.data?.message || error.response?.data || error.message || 'An unexpected error occurred';
}

// --- Async Thunks ---

// Fetch all employees
export const fetchEmployees = createAsyncThunk(
    'employees/fetchEmployees',
    async (_, { getState, rejectWithValue }) => {
      try {
        const { token } = getState().auth; // <<< Trying to get token here

        if (!token) { // <<< This check is failing
          console.error("fetchEmployees: No token found in Redux state (getState().auth.token)");
          return rejectWithValue('Not authorized, no token provided'); // <<< Error originates here
        }

        // Token exists, proceed with API call
        console.log("fetchEmployees: Token found, making API call."); // Added log
        const response = await axios.get(`${API_URL}/employees`, getAuthHeaders(token));
        return response.data || [];

      } catch (error) {
        // --- FIX: Added rejectWithValue in catch block ---
        console.error("Error fetching employees:", error);
        return rejectWithValue(getErrorMessage(error));
        // --- END FIX ---
      }
    }
);

// Add a new employee
export const addEmployee = createAsyncThunk(
  'employees/addEmployee',
  async (employeeData, { getState, rejectWithValue }) => {
    try {
      const { user, token } = getState().auth; // Get user and token
      if (!token) { // Added token check
        console.error("addEmployee: No token found.");
        return rejectWithValue('Not authorized, no token provided');
      }
      // Role check using Redux state
      if (user?.role !== 'employer') {
        return rejectWithValue('Access Denied: Only employers can add employees.');
      }
      const response = await axios.post(`${API_URL}/employees`, employeeData, getAuthHeaders(token)); // employeeData should include userId now
      return response.data;
    } catch (error) {
      console.error("Error adding employee:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Update an existing employee
export const updateEmployee = createAsyncThunk(
  'employees/updateEmployee',
  async ({ id, employeeData }, { getState, rejectWithValue }) => { // Pass id and data together
    try {
      const { user, token } = getState().auth;
      if (!token) { // Added token check
        console.error("updateEmployee: No token found.");
        return rejectWithValue('Not authorized, no token provided');
      }
      if (user?.role !== 'employer') {
        return rejectWithValue('Access Denied: Only employers can update employees.');
      }
      const response = await axios.put(`${API_URL}/employees/${id}`, employeeData, getAuthHeaders(token));
      return response.data; // Return the updated employee data
    } catch (error) {
      console.error("Error updating employee:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Delete an employee
export const deleteEmployee = createAsyncThunk(
  'employees/deleteEmployee',
  async (employeeId, { getState, rejectWithValue }) => { // Pass only the ID
    try {
      const { user, token } = getState().auth;
      if (!token) { // Added token check
        console.error("deleteEmployee: No token found.");
        return rejectWithValue('Not authorized, no token provided');
      }
      if (user?.role !== 'employer') {
        return rejectWithValue('Access Denied: Only employers can delete employees.');
      }
      await axios.delete(`${API_URL}/employees/${employeeId}`, getAuthHeaders(token));
      return employeeId; // Return the ID of the deleted employee for reducer logic
    } catch (error) {
      console.error("Error deleting employee:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// --- Slice Definition ---

const initialState = {
  employees: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const employeeSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    // Synchronous action to clear errors
    clearEmployeeError: (state) => {
      state.error = null;
      // Optionally reset status if needed
      if (state.status === 'failed') {
          state.status = 'idle';
      }
    },
    // resetEmployees: () => initialState, // Example reset action
  },
  extraReducers: (builder) => {
    builder
      // --- fetchEmployees ---
      .addCase(fetchEmployees.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.employees = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload; // Error message from rejectWithValue
      })
      // --- addEmployee ---
      .addCase(addEmployee.pending, (state) => {
        state.status = 'loading'; // Consider a specific addStatus if needed
        state.error = null;
      })
      .addCase(addEmployee.fulfilled, (state, action) => {
        state.status = 'succeeded'; // Reset general status or use addStatus
        state.employees.push(action.payload);
      })
      .addCase(addEmployee.rejected, (state, action) => {
        state.status = 'failed'; // Reset general status or use addStatus
        state.error = action.payload;
      })
      // --- updateEmployee ---
      .addCase(updateEmployee.pending, (state) => {
        state.status = 'loading'; // Consider a specific updateStatus
        state.error = null;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.status = 'succeeded'; // Reset general status or use updateStatus
        const index = state.employees.findIndex(emp => emp._id === action.payload._id);
        if (index !== -1) {
          state.employees[index] = action.payload;
        }
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.status = 'failed'; // Reset general status or use updateStatus
        state.error = action.payload;
      })
      // --- deleteEmployee ---
      .addCase(deleteEmployee.pending, (state) => {
        state.status = 'loading'; // Consider a specific deleteStatus
        state.error = null;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.status = 'succeeded'; // Reset general status or use deleteStatus
        state.employees = state.employees.filter(emp => emp._id !== action.payload);
      })
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.status = 'failed'; // Reset general status or use deleteStatus
        state.error = action.payload;
      });
  },
});

// --- Exports ---
export const { clearEmployeeError } = employeeSlice.actions; // Export synchronous actions

export default employeeSlice.reducer; // Export the reducer

// Optional: Selectors for cleaner component access
export const selectAllEmployees = (state) => state.employees.employees;
export const selectEmployeeStatus = (state) => state.employees.status;
export const selectEmployeeError = (state) => state.employees.error;
export const selectEmployeeById = (state, employeeId) =>
  // Ensure state.employees.employees is an array before finding
  Array.isArray(state?.employees?.employees)
    ? state.employees.employees.find(emp => emp._id === employeeId)
    : undefined;

// Selector to find an employee by their linked User ID
export const selectEmployeeByUserId = (state, userId) =>
  Array.isArray(state?.employees?.employees)
    ? state.employees.employees.find(emp => emp.userId === userId)
    : undefined;

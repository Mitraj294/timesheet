// /home/digilab/timesheet/client/src/redux/slices/employeeSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { setAlert } from './alertSlice'; // For dispatching success/error notifications
import apiClient from '../../api/authAPI'; // Import the configured apiClient


// Helper function to extract error messages
const getErrorMessage = (error) => {
    return error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred';
}

// Async Thunk for fetching all employees.
export const fetchEmployees = createAsyncThunk(
    'employees/fetchEmployees',
    async (_, { getState, rejectWithValue }) => {
      try {
        const { token } = getState().auth; // Getting the token from the auth state.

        if (!token) { // This check is important for protected routes.
          console.error("fetchEmployees: No token found in Redux state (getState().auth.token)");
          return rejectWithValue('Not authorized, no token provided'); // If no token, reject the promise.
        }

        // Token exists, so we can proceed with the API call.
        console.log("fetchEmployees: Token found, making API call."); // Added log
        // apiClient will use the baseURL and default Authorization header
        const response = await apiClient.get('/employees');
        return response.data || [];

      } catch (error) {
        console.error("Error fetching employees:", error);
        return rejectWithValue(getErrorMessage(error));
      }
    }
);

// Async Thunk for adding a new employee. Requires employer role.
export const addEmployee = createAsyncThunk(
  'employees/addEmployee',
  async (employeeData, { getState, rejectWithValue }) => {
    try {
      const { user, token } = getState().auth;
      if (!token) {
        console.error("addEmployee: No token found.");
        return rejectWithValue('Not authorized, no token provided');
      }
      // Role check using Redux state
      if (user?.role !== 'employer') {
        return rejectWithValue('Access Denied: Only employers can add employees.');
      }
      // apiClient will use the baseURL and default Authorization header
      const response = await apiClient.post('/employees', employeeData);
      return response.data;
    } catch (error) {
      console.error("Error adding employee:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for updating an existing employee. Requires employer role.
export const updateEmployee = createAsyncThunk(
  'employees/updateEmployee',
  async ({ id, employeeData }, { getState, rejectWithValue }) => {
    try {
      const { user, token } = getState().auth;
      if (!token) {
        console.error("updateEmployee: No token found.");
        return rejectWithValue('Not authorized, no token provided');
      }
      if (user?.role !== 'employer') {
        return rejectWithValue('Access Denied: Only employers can update employees.');
      }
      // apiClient will use the baseURL and default Authorization header
      const response = await apiClient.put(`/employees/${id}`, employeeData);
      return response.data;
    } catch (error) {
      console.error("Error updating employee:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for deleting an employee. Requires employer role.
export const deleteEmployee = createAsyncThunk(
  'employees/deleteEmployee',
  async (employeeId, { getState, rejectWithValue }) => {
    try {
      const { user, token } = getState().auth;
      if (!token) {
        console.error("deleteEmployee: No token found.");
        return rejectWithValue('Not authorized, no token provided');
      }
      if (user?.role !== 'employer') {
        return rejectWithValue('Access Denied: Only employers can delete employees.');
      }
      // apiClient will use the baseURL and default Authorization header
      await apiClient.delete(`/employees/${employeeId}`);
      return employeeId; // Return the ID for the reducer to remove it from the state.
    } catch (error) {
      console.error("Error deleting employee:", error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

// Async Thunk for updating notification preferences for multiple employees
export const updateEmployeesNotificationPreferences = createAsyncThunk(
  'employees/updateNotificationPreferences',
  async (employeePreferences, { getState, dispatch, rejectWithValue }) => {
    // employeePreferences is expected to be an array: [{ employeeId: 'id', receivesNotifications: true/false }, ...]
    try {
      const { token } = getState().auth;
      if (!token) {
        console.error("updateEmployeesNotificationPreferences: No token found.");
        return rejectWithValue('Not authorized, no token provided');
      }

      // The component sends { employeeId: empId, receivesNotifications: boolean }
      // The API might expect a slightly different structure, e.g., { preferences: [...] }
      // apiClient will use the baseURL and default Authorization header
      const response = await apiClient.patch(
        '/employees/batch-update-notifications', { preferences: employeePreferences }
      );

      dispatch(setAlert('Employee notification preferences updated successfully!', 'success'));
      // If the backend returns the updated employee objects, you can merge them here.
      // For example, if response.data is an array of updated employees:
      // return response.data; 
      return response.data; // Or simply a success message/status from backend
    } catch (error) {
      const message = getErrorMessage(error);
      dispatch(setAlert(message, 'error'));
      return rejectWithValue(message);
    }
  }
);

// Defines the initial state for the employees slice.
const initialState = {
  employees: [], // Holds the list of all employees.
  status: 'idle', // General status for async operations ('idle' | 'loading' | 'succeeded' | 'failed').
  error: null, // Stores any error message related to employee operations.
  updateNotificationStatus: 'idle', // Status for the batch notification update operation
};

// Creates the employee slice with reducers and extraReducers for async thunks.
const employeeSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    // Synchronous action to clear the employee error and reset status.
    clearEmployeeError: (state) => {
      state.error = null;
      // Optionally reset status if the last operation failed.
      if (state.status === 'failed') {
          state.status = 'idle';
      }
    },
    // resetEmployees: () => initialState, // Could add a reset action if needed.
  },
  // Handles actions dispatched by async thunks.
  extraReducers: (builder) => {
    builder
      // Cases for fetching all employees
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
        state.error = action.payload;
      })
      // Cases for adding an employee
      .addCase(addEmployee.pending, (state) => {
        state.status = 'loading'; // Using general status, could add specific addStatus if complex UI needed.
        state.error = null;
      })
      .addCase(addEmployee.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.employees.push(action.payload);
      })
      .addCase(addEmployee.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Cases for updating an employee
      .addCase(updateEmployee.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        const index = state.employees.findIndex(emp => emp._id === action.payload._id);
        if (index !== -1) {
          state.employees[index] = action.payload;
        }
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Cases for deleting an employee
      .addCase(deleteEmployee.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.employees = state.employees.filter(emp => emp._id !== action.payload);
      })
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Cases for updating employee notification preferences
      .addCase(updateEmployeesNotificationPreferences.pending, (state) => {
        state.updateNotificationStatus = 'loading';
        state.error = null; // Clear previous errors
      })
      .addCase(updateEmployeesNotificationPreferences.fulfilled, (state, action) => {
        state.updateNotificationStatus = 'succeeded';
        // If action.payload contains the updated employee details, merge them.
        // This is a simple merge assuming action.payload is an array of updated employees.
        if (Array.isArray(action.payload)) {
          action.payload.forEach(updatedEmp => {
            const index = state.employees.findIndex(emp => emp._id === updatedEmp._id);
            if (index !== -1) {
              state.employees[index] = { ...state.employees[index], ...updatedEmp };
            }
          });
        }
      })
      .addCase(updateEmployeesNotificationPreferences.rejected, (state, action) => {
        state.updateNotificationStatus = 'failed';
        state.error = action.payload;
      });
  },
});

// Export synchronous actions.
export const { clearEmployeeError } = employeeSlice.actions;

// Export the reducer to be included in the Redux store.
export default employeeSlice.reducer;

// Selectors to access parts of the employee state from components.
export const selectAllEmployees = (state) => state.employees.employees;
export const selectEmployeeStatus = (state) => state.employees.status;
export const selectEmployeeError = (state) => state.employees.error;
export const selectEmployeeById = (state, employeeId) =>
  Array.isArray(state?.employees?.employees)
    ? state.employees.employees.find(emp => emp._id === employeeId)
    : undefined;

// Selector to find an employee by their linked User ID
export const selectEmployeeByUserId = (state, userId) =>
  Array.isArray(state?.employees?.employees)
    ? state.employees.employees.find(emp => emp.userId === userId)
    : undefined;

// Selector for the status of the notification preferences update
export const selectEmployeeNotificationUpdateStatus = (state) => state.employees.updateNotificationStatus;

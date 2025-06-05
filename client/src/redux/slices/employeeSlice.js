// /home/digilab/timesheet/client/src/redux/slices/employeeSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { setAlert } from './alertSlice';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

// Helpers
const getAuthHeaders = (token) =>
  token
    ? { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    : {};
const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred';

// Thunks
export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async (_, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Not authorized, no token provided');
    try {
      const response = await axios.get(`${API_URL}/employees`, getAuthHeaders(token));
      return response.data || [];
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const addEmployee = createAsyncThunk(
  'employees/addEmployee',
  async (employeeData, { getState, rejectWithValue }) => {
    const { user, token } = getState().auth;
    if (!token) return rejectWithValue('Not authorized, no token provided');
    if (user?.role !== 'employer') return rejectWithValue('Only employers can add employees.');
    try {
      const response = await axios.post(`${API_URL}/employees`, employeeData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateEmployee = createAsyncThunk(
  'employees/updateEmployee',
  async ({ id, employeeData }, { getState, rejectWithValue }) => {
    const { user, token } = getState().auth;
    if (!token) return rejectWithValue('Not authorized, no token provided');
    if (user?.role !== 'employer') return rejectWithValue('Only employers can update employees.');
    try {
      const response = await axios.put(`${API_URL}/employees/${id}`, employeeData, getAuthHeaders(token));
      return response.data;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  'employees/deleteEmployee',
  async (employeeId, { getState, rejectWithValue }) => {
    const { user, token } = getState().auth;
    if (!token) return rejectWithValue('Not authorized, no token provided');
    if (user?.role !== 'employer') return rejectWithValue('Only employers can delete employees.');
    try {
      await axios.delete(`${API_URL}/employees/${employeeId}`, getAuthHeaders(token));
      return employeeId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const updateEmployeesNotificationPreferences = createAsyncThunk(
  'employees/updateNotificationPreferences',
  async (employeePreferences, { getState, dispatch, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Not authorized, no token provided');
    try {
      const response = await axios.patch(
        `${API_URL}/employees/batch-update-notifications`,
        { preferences: employeePreferences },
        getAuthHeaders(token)
      );
      dispatch(setAlert('Employee notification preferences updated successfully!', 'success'));
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      dispatch(setAlert(message, 'error'));
      return rejectWithValue(message);
    }
  }
);

// State
const initialState = {
  employees: [],
  status: 'idle',
  error: null,
  updateNotificationStatus: 'idle',
};

// Slice
const employeeSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    clearEmployeeError: (state) => {
      state.error = null;
      if (state.status === 'failed') state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
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
      .addCase(addEmployee.pending, (state) => {
        state.status = 'loading';
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
      .addCase(updateEmployee.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        const index = state.employees.findIndex(emp => emp._id === action.payload._id);
        if (index !== -1) state.employees[index] = action.payload;
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
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
      .addCase(updateEmployeesNotificationPreferences.pending, (state) => {
        state.updateNotificationStatus = 'loading';
        state.error = null;
      })
      .addCase(updateEmployeesNotificationPreferences.fulfilled, (state, action) => {
        state.updateNotificationStatus = 'succeeded';
        if (Array.isArray(action.payload)) {
          action.payload.forEach(updatedEmp => {
            const index = state.employees.findIndex(emp => emp._id === updatedEmp._id);
            if (index !== -1) state.employees[index] = { ...state.employees[index], ...updatedEmp };
          });
        }
      })
      .addCase(updateEmployeesNotificationPreferences.rejected, (state, action) => {
        state.updateNotificationStatus = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearEmployeeError } = employeeSlice.actions;
export default employeeSlice.reducer;

// Selectors
export const selectAllEmployees = (state) => state.employees.employees;
export const selectEmployeeStatus = (state) => state.employees.status;
export const selectEmployeeError = (state) => state.employees.error;
export const selectEmployeeById = (state, employeeId) =>
  Array.isArray(state?.employees?.employees)
    ? state.employees.employees.find(emp => emp._id === employeeId)
    : undefined;
export const selectEmployeeByUserId = (state, userId) =>
  Array.isArray(state?.employees?.employees)
    ? state.employees.employees.find(emp => emp.userId === userId)
    : undefined;
export const selectEmployeeNotificationUpdateStatus = (state) => state.employees.updateNotificationStatus;
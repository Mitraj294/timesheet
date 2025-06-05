// /home/digilab/timesheet/client/src/redux/slices/settingsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { setAlert } from './alertSlice';

// Helpers
const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});
const getErrorMessage = (error) =>
  error.response?.data?.message || error.response?.data?.error || error.message || 'An unexpected error occurred';

// Thunks
export const fetchEmployerSettings = createAsyncThunk(
  'settings/fetchEmployerSettings',
  async (_, { getState, rejectWithValue }) => {
    const { token } = getState().auth;
    if (!token) return rejectWithValue('Not authorized.');
    try {
      const response = await axios.get('/api/settings/employer', getAuthHeaders(token));
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      if (message.includes('Employer ID not found for this employee')) {
        return rejectWithValue('Could not retrieve settings: Employer information missing.');
      }
      return rejectWithValue(message);
    }
  }
);

export const updateEmployerSettings = createAsyncThunk(
  'settings/updateEmployerSettings',
  async (settingsData, { getState, dispatch, rejectWithValue }) => {
    const { token, user } = getState().auth;
    if (!token || user?.role !== 'employer') return rejectWithValue('Not authorized or not an employer.');
    try {
      const response = await axios.put('/api/settings/employer', settingsData, getAuthHeaders(token));
      dispatch(setAlert('Settings updated successfully!', 'success'));
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      dispatch(setAlert(`Failed to save settings: ${message}`, 'danger'));
      return rejectWithValue(message);
    }
  }
);

// State
const initialState = {
  employerSettings: {
    showVehiclesTabInSidebar: undefined,
    tabletViewRecordingType: 'Automatically Record',
    tabletViewPasswordRequired: false,
    timesheetStartDayOfWeek: 'Monday',
    timesheetStartDate: null,
    timesheetIsLunchBreakDefault: true,
    isTravelChargeByDefault: true,
    is24Hour: false,
    isProjectClient: false,
    isNoteNeeded: false,
    isWorkPerformed: false,
    reassignTimesheet: true,
    showXero: false,
    showLocation: false,
    employeeCanCreateProject: true,
    narrowTitles: true,
    timesheetHideWage: false,
    defaultTimesheetViewType: 'Weekly',
    reportColumns: [],
  },
  status: 'idle',
  error: null,
};

// Slice
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployerSettings.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchEmployerSettings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.employerSettings = { ...state.employerSettings, ...action.payload };
      })
      .addCase(fetchEmployerSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(updateEmployerSettings.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateEmployerSettings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.employerSettings = { ...state.employerSettings, ...action.payload };
      })
      .addCase(updateEmployerSettings.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default settingsSlice.reducer;

// Selectors
export const selectEmployerSettings = (state) => state.settings.employerSettings;
export const selectSettingsStatus = (state) => state.settings.status;
export const selectSettingsError = (state) => state.settings.error;
export const selectShowVehiclesTabInSidebar = (state) => state.settings.employerSettings.showVehiclesTabInSidebar;

// /home/digilab/timesheet/client/src/store/store.js
import { configureStore } from "@reduxjs/toolkit";

// Import your reducers
import authReducer from "../redux/slices/authSlice.js";
import employeeReducer from "../redux/slices/employeeSlice.js";
import clientReducer from "../redux/slices/clientSlice.js";
import projectReducer from "../redux/slices/projectSlice.js";
import timesheetReducer from "../redux/slices/timesheetSlice.js";
import alertReducer from "../redux/slices/alertSlice.js";
import roleReducer from '../redux/slices/roleSlice';
import scheduleReducer from '../redux/slices/scheduleSlice';
import vehicleReducer from '../redux/slices/vehicleSlice';
import vehicleReviewReducer from '../redux/slices/vehicleReviewSlice';
import settingsReducer from '../redux/slices/settingsSlice'; // Corrected import name to match common practice

const store = configureStore({
  reducer: {
    // Define the root reducer object
    // Keys here determine how the state is structured (e.g., state.auth, state.employees)
    auth: authReducer,
    employees: employeeReducer,
    clients: clientReducer,
    projects: projectReducer,
    timesheets: timesheetReducer,
    // Corrected the key name for the alert slice for consistency
    alert: alertReducer,
    roles: roleReducer,
    schedules: scheduleReducer,
    vehicles: vehicleReducer,
    vehicleReviews: vehicleReviewReducer,
    // Added the settings reducer
    settings: settingsReducer,
  },
  // Configure middleware, especially for handling non-serializable data like Blobs
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore specific action types that are known to contain non-serializable data
        ignoredActions: [
          'vehicleReviews/downloadReport/fulfilled',
          'vehicles/downloadVehicleReport/fulfilled',
          'vehicles/downloadAllVehiclesReport/fulfilled',
          'clients/downloadClients/fulfilled',
          'timesheets/downloadTimesheet/fulfilled',
          'timesheets/downloadProjectTimesheet/fulfilled',
          // Add any other action types that might carry non-serializable data
        ],
        // Alternatively, you could ignore specific paths within the action payload
        // ignoredActionPaths: ['payload.blob', 'meta.arg'],
        // Or ignore specific paths in the state (less common for this issue)
        // ignoredPaths: ['someSlice.nonSerializableField'],
      },
    }),
  // Enable Redux DevTools extension in development mode
  devTools: process.env.NODE_ENV !== "production",
});

export default store;

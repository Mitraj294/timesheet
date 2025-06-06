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
    // Each key here is a slice of your app's state
    auth: authReducer,
    employees: employeeReducer,
    clients: clientReducer,
    projects: projectReducer,
    timesheets: timesheetReducer,
    alert: alertReducer,
    roles: roleReducer,
    schedules: scheduleReducer,
    vehicles: vehicleReducer,
    vehicleReviews: vehicleReviewReducer,
    settings: settingsReducer,
  },
  // Configure middleware, especially for handling non-serializable data like Blobs
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore actions that may have files/blobs in payload
        ignoredActions: [
          'vehicleReviews/downloadReport/fulfilled',
          'vehicles/downloadVehicleReport/fulfilled',
          'vehicles/downloadAllVehiclesReport/fulfilled',
          'clients/downloadClients/fulfilled',
          'timesheets/downloadTimesheet/fulfilled',
          'timesheets/downloadProjectTimesheet/fulfilled',
        ],
      },
    }),
  // Enable Redux DevTools extension in development mode
  devTools: process.env.NODE_ENV !== "production",
});

console.log("[store] Redux store created.");

// This file creates the Redux store.
// The store holds all app state and connects all reducers.
// Without this file, Redux state will not work in  app.

export default store;

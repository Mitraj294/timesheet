// /home/digilab/timesheet/client/src/store/store.js
import { configureStore } from "@reduxjs/toolkit";



import authReducer from "../redux/slices/authSlice.js";
import clientReducer from "../redux/slices/clientSlice.js";
import employeeReducer from "../redux/slices/employeeSlice.js";
import projectReducer from "../redux/slices/projectSlice.js";
import timesheetReducer from "../redux/slices/timesheetSlice.js";
import alertReducer from "../redux/slices/alertSlice.js";
import roleReducer from '../redux/slices/roleSlice'; 
import scheduleReducer from '../redux/slices/scheduleSlice';
import vehicleReducer from '../redux/slices/vehicleSlice'; 
import vehicleReviewReducer from '../redux/slices/vehicleReviewSlice'; 
const store = configureStore({
  reducer: {

    alerts: alertReducer,
    employees: employeeReducer,
    timesheets: timesheetReducer,
    clients: clientReducer,
    projects: projectReducer,
    auth: authReducer,
    vehicles: vehicleReducer,
    vehicleReviews: vehicleReviewReducer, 
    roles: roleReducer,
    schedules: scheduleReducer,

  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types entirely
        ignoredActions: [
          'vehicleReviews/downloadReport/fulfilled',
          'vehicles/downloadVehicleReport/fulfilled',
          'vehicles/downloadAllVehiclesReport/fulfilled',
          'clients/downloadClients/fulfilled',
          'timesheets/downloadTimesheet/fulfilled',
          'timesheets/downloadProjectTimesheet/fulfilled',
          // Add any other action types that you know will carry non-serializable data like Blobs
        ],
        // Or, ignore specific paths in the action payload for all actions
        // ignoredActionPaths: ['payload.blob', 'meta.arg'],
        // Or, ignore specific paths in the state (less common for this issue)
        // ignoredPaths: ['someSlice.nonSerializableField'],
      },
    }),
  // Removed the extra comma here
  devTools: process.env.NODE_ENV !== "production",
});

export default store;

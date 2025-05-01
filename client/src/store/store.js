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
    vehicleReviews: vehicleReviewReducer,
    vehicles: vehicleReducer,
    roles: roleReducer,
    schedules: scheduleReducer,

  },
  devTools: process.env.NODE_ENV !== "production",
});

export default store;


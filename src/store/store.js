import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../redux/slices/authSlice.js";
import alertReducer from "../redux/reducers/alertReducer.js";
import employeeReducer from "../redux/reducers/employeeReducer.js";
import timesheetReducer from "../redux/reducers/timesheetReducer.js";
import clientReducer from "../redux/reducers/clientReducer.js";
import projectReducer from "../redux/reducers/projectReducer.js";


const store = configureStore({
  reducer: {
    alert: alertReducer,
    employees: employeeReducer,
    timesheet: timesheetReducer,
    clients : clientReducer,
    project:projectReducer,
    auth: authReducer,
  },
  devTools: process.env.NODE_ENV !== "production", // Enable Redux DevTools in development
});

export default store;

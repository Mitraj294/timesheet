import { combineReducers } from "redux";
import employeeReducer from "./employeeReducer";
import timesheetReducer from "./timesheetReducer"; 
import alertReducer from "./alertReducer";

export default combineReducers({
  employees: employeeReducer,
  timesheets: timesheetReducer, 
  alert: alertReducer,
});

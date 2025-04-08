import { combineReducers } from "redux";
import employeeReducer from "./employeeReducer";
import clientReducer from "./clientReducer";
import projectReducer from "./projectReducer";
import timesheetReducer from "./timesheetReducer";

export default combineReducers({
  employees: employeeReducer,
  clients: clientReducer,
  project: projectReducer,
  timesheets: timesheetReducer
});

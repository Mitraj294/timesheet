import { createStore, applyMiddleware, combineReducers } from "redux";
import { composeWithDevTools } from "redux-devtools-extension";
import { thunk }from "redux-thunk";
import alertReducer from "../reducers/alertReducer"; // ✅ Add alertReducer
import employeeReducer from "../reducers/employeeReducer"; // ✅ Add employeeReducer

const rootReducer = combineReducers({
  alert: alertReducer,
  employees: employeeReducer
});

const store = createStore(
  rootReducer,
  composeWithDevTools(applyMiddleware(thunk))
);

export default store;

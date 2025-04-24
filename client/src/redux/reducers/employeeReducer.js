// /home/digilab/timesheet/client/src/redux/reducers/employeeReducer.js
import {
  GET_EMPLOYEES,
  EMPLOYEES_ERROR,
  ADD_EMPLOYEE,
  UPDATE_EMPLOYEE,
  DELETE_EMPLOYEE,
  // Assuming you might have a request action type:
  // GET_EMPLOYEES_REQUEST
} from "../actions/types";


const initialState = {
  employees: [],
  loading: true, // Indicates data is expected on initial load
  error: null
};

export default function (state = initialState, action) {
  const { type, payload } = action; // Destructure type and payload

  switch (type) {
    // Optional: Handle request start if needed
    // case GET_EMPLOYEES_REQUEST:
    //   return {
    //     ...state,
    //     loading: true,
    //     error: null,
    //   };

    case GET_EMPLOYEES:
      // console.log(" Redux Employees Updated:", payload); // Keep if needed for debugging
      return {
        ...state,
        employees: payload || [], // Ensure payload is an array
        loading: false, // Set loading false on success
        error: null, // Clear any previous error
      };

    case ADD_EMPLOYEE:
      return {
        ...state,
        // Add the new employee only if it's not already present (optional check)
        employees: state.employees.some(emp => emp._id === payload._id)
                   ? state.employees
                   : [...state.employees, payload],
        loading: false // Assuming add doesn't require a global loading state change
      };

    case UPDATE_EMPLOYEE:
      return {
        ...state,
        employees: state.employees.map(emp =>
          emp._id === payload._id ? payload : emp
        ),
        loading: false
      };

    case DELETE_EMPLOYEE:
      return {
        ...state,
        employees: state.employees.filter(emp => emp._id !== payload), // payload is the ID here
        loading: false
      };

    case EMPLOYEES_ERROR:
      return {
        ...state,
        error: payload, // Store the error message
        loading: false, // Set loading false on error
        // Optionally clear employees on error or keep stale data:
        // employees: []
      };

    default:
      return state;
  }
}

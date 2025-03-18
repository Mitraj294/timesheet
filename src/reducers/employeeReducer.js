import {
    GET_EMPLOYEES,
    ADD_EMPLOYEE,
    UPDATE_EMPLOYEE,
    DELETE_EMPLOYEE,
    EMPLOYEES_ERROR
  } from "../types";
  
  const initialState = {
    employees: [],
    loading: true,
    error: null
  };
  
  export default function (state = initialState, action) {
    switch (action.type) {
      case GET_EMPLOYEES:
        return { ...state, employees: action.payload, loading: false };
      case ADD_EMPLOYEE:
        return { ...state, employees: [...state.employees, action.payload], loading: false };
      case UPDATE_EMPLOYEE:
        return {
          ...state,
          employees: state.employees.map(emp => emp._id === action.payload._id ? action.payload : emp),
          loading: false
        };
      case DELETE_EMPLOYEE:
        return {
          ...state,
          employees: state.employees.filter(emp => emp._id !== action.payload),
          loading: false
        };
      case EMPLOYEES_ERROR:
        return { ...state, error: action.payload, loading: false };
      default:
        return state;
    }
  }
  
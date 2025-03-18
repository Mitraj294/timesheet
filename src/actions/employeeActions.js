import axios from "axios";
import {
  GET_EMPLOYEES,
  ADD_EMPLOYEE,
  UPDATE_EMPLOYEE,
  DELETE_EMPLOYEE,
  EMPLOYEES_ERROR
} from "../types";

// Get all employees
export const getEmployees = () => async (dispatch) => {
  try {
    const res = await axios.get("http://localhost:5000/api/employees");
    dispatch({ type: GET_EMPLOYEES, payload: res.data });
  } catch (err) {
    dispatch({ type: EMPLOYEES_ERROR, payload: "Server Error" });
  }
};

// Add new employee
export const addEmployee = (employeeData) => async (dispatch) => {
  try {
    const res = await axios.post("http://localhost:5000/api/employees", employeeData);
    dispatch({ type: ADD_EMPLOYEE, payload: res.data });
  } catch (err) {
    dispatch({ type: EMPLOYEES_ERROR, payload: "Server Error" });
  }
};

// Update an employee
export const updateEmployee = (id, updatedData) => async (dispatch) => {
  try {
    const res = await axios.put(`http://localhost:5000/api/employees/${id}`, updatedData);
    dispatch({ type: UPDATE_EMPLOYEE, payload: res.data });
  } catch (err) {
    dispatch({ type: EMPLOYEES_ERROR, payload: "Server Error" });
  }
};

// Delete an employee
export const deleteEmployee = (id) => async (dispatch) => {
  try {
    await axios.delete(`http://localhost:5000/api/employees/${id}`);
    dispatch({ type: DELETE_EMPLOYEE, payload: id });
  } catch (err) {
    dispatch({ type: EMPLOYEES_ERROR, payload: "Server Error" });
  }
};

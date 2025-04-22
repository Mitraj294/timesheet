import axios from "axios";
import {
  GET_EMPLOYEES,
  EMPLOYEES_ERROR,
  ADD_EMPLOYEE,
  UPDATE_EMPLOYEE,
  DELETE_EMPLOYEE,
} from "./types";

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// Auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    : {};
};

// Get all employees
export const getEmployees = () => async (dispatch) => {
  try {
    const res = await axios.get(`${API_URL}/employees`, getAuthHeaders());
    console.log("API Response:", res.data);
    dispatch({ type: GET_EMPLOYEES, payload: res.data });
  } catch (err) {
    console.error("Error fetching employees:", err.response?.data?.message || err.message);
    dispatch({
      type: EMPLOYEES_ERROR,
      payload: err.response?.data?.message || "Server Error",
    });
  }
};

// Check employer role
const checkEmployerRole = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user?.role === "employer";
};

// Add employee
export const addEmployee = (employeeData) => async (dispatch) => {
  if (!checkEmployerRole()) {
    dispatch({
      type: EMPLOYEES_ERROR,
      payload: "Access Denied: Employers only.",
    });
    return;
  }

  try {
    const res = await axios.post(`${API_URL}/employees`, employeeData, getAuthHeaders());
    dispatch({ type: ADD_EMPLOYEE, payload: res.data });
  } catch (err) {
    console.error("Error adding employee:", err.response?.data?.message || err.message);
    dispatch({
      type: EMPLOYEES_ERROR,
      payload: err.response?.data?.message || "Server Error",
    });
  }
};

// Update employee
export const updateEmployee = (id, updatedData) => async (dispatch) => {
  if (!checkEmployerRole()) {
    dispatch({
      type: EMPLOYEES_ERROR,
      payload: "Access Denied: Employers only.",
    });
    return;
  }

  try {
    const res = await axios.put(`${API_URL}/employees/${id}`, updatedData, getAuthHeaders());
    dispatch({ type: UPDATE_EMPLOYEE, payload: res.data });
  } catch (err) {
    console.error("Error updating employee:", err.response?.data?.message || err.message);
    dispatch({
      type: EMPLOYEES_ERROR,
      payload: err.response?.data?.message || "Server Error",
    });
  }
};

// Delete employee
export const deleteEmployee = (id) => async (dispatch) => {
  if (!checkEmployerRole()) {
    dispatch({
      type: EMPLOYEES_ERROR,
      payload: "Access Denied: Employers only.",
    });
    return;
  }

  try {
    await axios.delete(`${API_URL}/employees/${id}`, getAuthHeaders());
    dispatch({ type: DELETE_EMPLOYEE, payload: id });
  } catch (err) {
    console.error("Error deleting employee:", err.response?.data?.message || err.message);
    dispatch({
      type: EMPLOYEES_ERROR,
      payload: err.response?.data?.message || "Server Error",
    });
  }
};

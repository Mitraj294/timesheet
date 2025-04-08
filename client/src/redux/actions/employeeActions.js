import axios from "axios";
import { GET_EMPLOYEES, EMPLOYEES_ERROR, ADD_EMPLOYEE, UPDATE_EMPLOYEE, DELETE_EMPLOYEE } from "./types";


const API_URL = "http://localhost:5000/api/employees";

// Function to get authentication headers
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

// Get all employees (Available for everyone)
export const getEmployees = () => async (dispatch) => {
  try {
    const res = await axios.get(API_URL, getAuthHeaders());
    console.log(" API Response:", res.data); 
    dispatch({ type: GET_EMPLOYEES, payload: res.data });
  } catch (err) {
    console.error(" Error fetching employees:", err.response?.data?.message || err.message);
    dispatch({ type: EMPLOYEES_ERROR, payload: err.response?.data?.message || "Server Error" });
  }
};

// Check if user is an employer before performing protected actions
const checkEmployerRole = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user?.role === "employer";
};

// Add new employee (Only for Employers)
export const addEmployee = (employeeData) => async (dispatch) => {
  if (!checkEmployerRole()) {
    console.error("Unauthorized: Only employers can add employees.");
    dispatch({ type: EMPLOYEES_ERROR, payload: "Access Denied: Employers only." });
    return;
  }

  try {
    const res = await axios.post(API_URL, employeeData, getAuthHeaders());
    dispatch({ type: ADD_EMPLOYEE, payload: res.data });
  } catch (err) {
    console.error("Error adding employee:", err.response?.data?.message || err.message);
    dispatch({ type: EMPLOYEES_ERROR, payload: err.response?.data?.message || "Server Error" });
  }
};

// Update an employee (Only for Employers)
export const updateEmployee = (id, updatedData) => async (dispatch) => {
  if (!checkEmployerRole()) {
    console.error("Unauthorized: Only employers can update employees.");
    dispatch({ type: EMPLOYEES_ERROR, payload: "Access Denied: Employers only." });
    return;
  }

  try {
    const res = await axios.put(`${API_URL}/${id}`, updatedData, getAuthHeaders());
    dispatch({ type: UPDATE_EMPLOYEE, payload: res.data });
  } catch (err) {
    console.error("Error updating employee:", err.response?.data?.message || err.message);
    dispatch({ type: EMPLOYEES_ERROR, payload: err.response?.data?.message || "Server Error" });
  }
};

// Delete an employee (Only for Employers)
export const deleteEmployee = (id) => async (dispatch) => {
  if (!checkEmployerRole()) {
    console.error("Unauthorized: Only employers can delete employees.");
    dispatch({ type: EMPLOYEES_ERROR, payload: "Access Denied: Employers only." });
    return;
  }

  try {
    await axios.delete(`${API_URL}/${id}`, getAuthHeaders());
    dispatch({ type: DELETE_EMPLOYEE, payload: id });
  } catch (err) {
    console.error("Error deleting employee:", err.response?.data?.message || err.message);
    dispatch({ type: EMPLOYEES_ERROR, payload: err.response?.data?.message || "Server Error" });
  }
};

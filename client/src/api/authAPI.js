import axios from "axios";

// Define the base API URL, consistent with authSlice.js
// Fallback to the production Render URL if the environment variable is not set.
const BASE_API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

// Specific endpoint for authentication routes handled by this module
const AUTH_ROUTES_ENDPOINT = `${BASE_API_URL}/auth`;

export const signup = async (userData) => {
  // Consider adding try...catch here if this function can be called directly
  // without external error handling provided by, for example, a Redux thunk.
  const response = await axios.post(`${AUTH_ROUTES_ENDPOINT}/signup`, userData);
  return response.data;
};

export const login = async (userData) => {
  const response = await axios.post(`${AUTH_ROUTES_ENDPOINT}/login`, userData);
  return response.data;
};
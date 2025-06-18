import axios from "axios";

// Use environment variable for API base URL, fallback to Render backend if not set
const BASE_API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';
const AUTH_API = `${BASE_API_URL}/auth`;

// Register a new user
export const signup = async (userData) => {
  const response = await axios.post(`${AUTH_API}/signup`, userData);
  return response.data;
};

// Log in a user
export const login = async (userData) => {
  const response = await axios.post(`${AUTH_API}/login`, userData);
  return response.data;
};
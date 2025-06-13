import axios from "axios";

// API base URL (change in .env for different servers)
// Update the base API URL to use the production server
const BASE_API_URL = 'https://192.168.1.47:5000/api';
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
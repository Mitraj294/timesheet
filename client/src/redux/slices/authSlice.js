import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Use environment variable for API_URL or fallback to default API URL
const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// Log the API_URL to confirm it's correct
console.log("API_URL:", API_URL);

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user"));

const initialState = {
  isAuthenticated: !!token,
  user: user || null,
  error: null,
  loading: false,
};

// 🔹 Login User
export const loginUser = createAsyncThunk("auth/login", async (userData, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, userData);
    
    // Log the response to verify it contains the token and user data
    console.log("Login Response:", response.data);

    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
    return response.data;
  } catch (error) {
    console.error("Login Error:", error); // Log full error
    return rejectWithValue(error.response?.data?.message || "Login failed");
  }
});

// 🔹 Register User
export const registerUser = createAsyncThunk("auth/register", async (userData, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, userData);
    
    // Log the response to verify it contains the token and user data
    console.log("Registration Response:", response.data);

    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
    return response.data;
  } catch (error) {
    console.error("Registration Error:", error); // Log full error
    return rejectWithValue(error.response?.data?.message || "Registration failed");
  }
});

// 🔹 Logout User (Fix Redux Reset)
export const logout = createAsyncThunk("auth/logout", async (_, { dispatch }) => {
  console.log("Logout function triggered in Redux!");

  // Remove token & user from local storage
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  dispatch(resetAuth()); // Reset Redux State
});

// 🔹 Redux Slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    resetAuth: () => {
      console.log("Resetting Redux State...");
      return { isAuthenticated: false, user: null, error: null, loading: false };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(logout.fulfilled, () => {
        console.log("Logout successful! Resetting Redux state...");
        return { isAuthenticated: false, user: null, error: null, loading: false };
      });
  },
});

export const { resetAuth } = authSlice.actions;
export default authSlice.reducer;

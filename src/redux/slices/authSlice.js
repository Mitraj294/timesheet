import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = "http://localhost:5000/api/auth";

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
    const response = await axios.post(`${API_URL}/login`, userData);
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Login failed");
  }
});

// 🔹 Register User
export const registerUser = createAsyncThunk("auth/register", async (userData, { rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_URL}/register`, userData);
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Registration failed");
  }
});

// 🔹 Logout User (Fix Redux Reset)
export const logout = createAsyncThunk("auth/logout", async (_, { dispatch }) => {
  console.log(" Logout function triggered in Redux!");

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
        console.log(" Logout successful! Resetting Redux state...");
        return { isAuthenticated: false, user: null, error: null, loading: false };
      });
  },
});

export const { resetAuth } = authSlice.actions;
export default authSlice.reducer;

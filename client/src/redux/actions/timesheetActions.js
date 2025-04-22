import axios from "axios";
import { GET_TIMESHEETS, TIMESHEET_ERROR } from "./types";
const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

export const getTimesheets = () => async (dispatch, getState) => {
  try {
    // Retrieve token from localStorage (instead of Redux state)
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("No authentication token found.");
      throw new Error("No authentication token found");
    }

    console.log("Debug: Retrieved Token:", token);  // Debugging token

    const res = await axios.get(`${API_URL}/timesheets`, {  // Use the API_URL constant
      headers: {
        Authorization: `Bearer ${token}`,  // Send token in request headers
      },
    });

    console.log("Full API Response:", res.data);

    dispatch({
      type: GET_TIMESHEETS,
      payload: res.data,  // Ensure API returns correct format
    });

  } catch (error) {
    console.error("Error fetching timesheets:", error.response?.data?.message || error.message);

    dispatch({
      type: TIMESHEET_ERROR,
      payload: error.response?.data?.message || "Server Error",
    });
  }
};


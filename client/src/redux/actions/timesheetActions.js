import axios from "axios";
import { GET_TIMESHEETS, TIMESHEET_ERROR } from "./types";

export const getTimesheets = () => async (dispatch, getState) => {
  try {
    // Retrieve token from localStorage (instead of Redux state)
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("No authentication token found.");
      throw new Error("No authentication token found");
    }

    console.log("Debug: Retrieved Token:", token);  // Debugging token

    const res = await axios.get("/api/timesheets", {
      headers: {
        Authorization: `Bearer ${token}`,  // end token in request
      },
    });

    console.log("Full API Response:", res.data);

    dispatch({
      type: GET_TIMESHEETS,
      payload: res.data,  // Ensure API returns correct format
    });

  } catch (error) {
    console.error(" Error fetching timesheets:", error.response?.data?.message || error.message);

    dispatch({
      type: TIMESHEET_ERROR,
      payload: error.response?.data?.message || "Server Error",
    });
  }
};

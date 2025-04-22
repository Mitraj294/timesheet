import axios from "axios";
import { GET_CLIENTS, CLIENT_ERROR } from "./types";

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

export const getClients = () => async (dispatch) => {
  try {
    const res = await axios.get(`${API_URL}/clients`); // Using the dynamic API_URL

    dispatch({
      type: GET_CLIENTS,
      payload: res.data,  
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    dispatch({
      type: CLIENT_ERROR,
      payload: error.response?.data || "Error fetching clients",
    });
  }
};

  
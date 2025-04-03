import axios from "axios";
import { GET_CLIENTS, CLIENT_ERROR } from "./types";
export const getClients = () => async (dispatch) => {
    try {
      const res = await axios.get("http://localhost:5000/api/clients");
   
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
  
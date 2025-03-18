import axios from "axios";
import { LOGIN_SUCCESS, LOGIN_FAIL, LOGOUT } from "../types";

export const login = (email, password) => async (dispatch) => {
  try {
    const res = await axios.post("http://localhost:5000/api/auth/login", { email, password });
    dispatch({ type: LOGIN_SUCCESS, payload: res.data });
  } catch (err) {
    dispatch({ type: LOGIN_FAIL });
  }
};

export const logout = () => (dispatch) => {
  dispatch({ type: LOGOUT });
};

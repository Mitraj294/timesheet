import { LOGIN_SUCCESS, LOGIN_FAIL, LOGOUT } from "../types";

const initialState = {
  token: localStorage.getItem("token"),
  isAuthenticated: null,
  user: null,
};

export default function (state = initialState, action) {
  switch (action.type) {
    case LOGIN_SUCCESS:
      localStorage.setItem("token", action.payload.token);
      return {
        ...state,
        ...action.payload,
        isAuthenticated: true,
      };
    case LOGIN_FAIL:
    case LOGOUT:
      localStorage.removeItem("token");
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        user: null,
      };
    default:
      return state;
  }
}

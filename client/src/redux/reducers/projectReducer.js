import { GET_PROJECTS, PROJECT_ERROR } from "../actions/types";
const initialState = { projects: [],  loading: true,
   error: null };

   export default function projectReducer(state = initialState, action) {
    const { type, payload } = action;   
  
    switch (type) {
      case "CREATE_PROJECT_SUCCESS":
        return { ...state, projects: [...state.projects, payload] };
      case "CREATE_PROJECT_ERROR":
        return { ...state, error: payload };
      case "FETCH_PROJECTS_SUCCESS":
        return { ...state, projects: payload };
      case "FETCH_PROJECTS_ERROR":
        return { ...state, error: payload };
      case GET_PROJECTS:
        return {
          ...state,
          projects: payload,  
          loading: false,
        };
      case PROJECT_ERROR:
        return {
          ...state,
          error: payload,
          loading: false,
        };
      default:
        return state;
    }
  }
  

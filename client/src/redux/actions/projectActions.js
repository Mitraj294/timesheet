import axios from "axios";
import { GET_PROJECTS, PROJECT_ERROR } from "./types";
const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// Create Project
export const createProject = (clientId, projectData) => async (dispatch) => {
  try {
    const response = await axios.post(`${API_URL}/clients/${clientId}/projects`, projectData);

    dispatch({ type: "CREATE_PROJECT_SUCCESS", payload: response.data });
  } catch (error) {
    console.error("Error creating project:", error);
    dispatch({
      type: "CREATE_PROJECT_ERROR",
      payload: error.response?.data?.message || "Something went wrong",
    });
  }
};

// Update Project
export const updateProject = (clientId, projectId, projectData) => async (dispatch) => {
  try {
    const response = await axios.put(
      `${API_URL}/clients/${clientId}/projects/${projectId}`,
      projectData
    );

    dispatch({ type: "UPDATE_PROJECT_SUCCESS", payload: response.data });
  } catch (error) {
    console.error("Error updating project:", error);
    dispatch({
      type: "UPDATE_PROJECT_ERROR",
      payload: error.response?.data?.message || "Error updating project",
    });
  }
};

// Fetch Projects
export const getProjects = (clientId = "") => async (dispatch) => {
  try {
    const url = clientId
      ? `${API_URL}/projects/client/${clientId}`
      : `${API_URL}/projects`;

    const response = await axios.get(url);

    dispatch({
      type: GET_PROJECTS,
      payload: response.data,
    });
  } catch (error) {
    console.error("Error fetching projects:", error.response?.data || error.message);
    dispatch({
      type: PROJECT_ERROR,
      payload: error.response?.data || "Error fetching projects",
    });
  }
};


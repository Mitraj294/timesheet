import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

// Create a dedicated Axios instance for your API.
// This is useful for setting up a common baseURL, headers, or interceptors.
// It will inherit global defaults like `axios.defaults.headers.common['Authorization']`
// if they are set before a request is made.
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// All paths here are relative to the baseURL defined above (e.g., '/auth/login')

export const login = async (credentials) => {
  try {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    console.error("Login API error:", error.response ? error.response.data : error.message, error);
    throw error; // Re-throw to be handled by the calling component/saga
  }
};

export const register = async (userData) => {
  try {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error("Register API error:", error.response ? error.response.data : error.message, error);
    throw error; // Re-throw to be handled by the calling component/saga
  }
};

export const changePassword = async (passwordData) => {
  try {
    // apiClient will use the default Authorization header if set
    const response = await apiClient.put('/auth/change-password', passwordData);
    return response.data;
  } catch (error) {
    console.error("Change Password API error:", error.response ? error.response.data : error.message, error);
    throw error;
  }
};

export const loadUser = async () => {
  try {
    // apiClient will use the default Authorization header if set
    const response = await apiClient.get('/auth/me');
    return response.data;
  } catch (error) {
    console.error("Load User API error:", error.response ? error.response.data : error.message, error);
    throw error;
  }
};

export const updateUserProfile = async (userData) => {
  try {
    const response = await apiClient.put('/users/profile', userData);
    return response.data;
  } catch (error) {
    console.error("Update Profile API error:", error.response ? error.response.data : error.message, error);
    throw error;
  }
};

export const forgotPassword = async (emailData) => {
  try {
    const response = await apiClient.post('/auth/forgot-password', emailData);
    return response.data;
  } catch (error) {
    console.error("Forgot Password API error:", error.response ? error.response.data : error.message, error);
    throw error;
  }
};

export const resetPassword = async ({ token, newPassword }) => {
  try {
    const response = await apiClient.put(`/auth/reset-password/${token}`, { newPassword });
    return response.data;
  } catch (error) {
    console.error("Reset Password API error:", error.response ? error.response.data : error.message, error);
    throw error;
  }
};

export const checkProspectiveEmployee = async (emailData) => {
  try {
    const response = await apiClient.post('/auth/check-prospective-employee', emailData);
    return response.data;
  } catch (error) {
    console.error("Check Prospective Employee API error:", error.response ? error.response.data : error.message, error);
    throw error;
  }
};

export const requestAccountDeletionLink = async () => {
  try {
    // apiClient will use the default Authorization header if set
    const response = await apiClient.post('/auth/request-deletion-link', {});
    return response.data;
  } catch (error) {
    console.error("Request Account Deletion Link API error:", error.response ? error.response.data : error.message, error);
    throw error;
  }
};

export const confirmAccountDeletion = async ({ token, password }) => {
  try {
    const response = await apiClient.post(`/auth/confirm-delete-account/${token}`, { password });
    return response.data;
  } catch (error) {
    console.error("Confirm Account Deletion API error:", error.response ? error.response.data : error.message, error);
    throw error;
  }
};

export const requestCompanyInvitation = async (invitationData) => {
  try {
    const response = await apiClient.post('/auth/request-invitation', invitationData);
    return response.data;
  } catch (error) {
    console.error("Request Company Invitation API error:", error.response ? error.response.data : error.message, error);
    throw error;
  }
};

export const checkUserByEmailForEmployer = async (emailData) => {
  try {
    // apiClient will use the default Authorization header if set
    const response = await apiClient.post('/auth/check-user', emailData);
    return response.data;
  } catch (error) {
    console.error("Check User By Email API error:", error.response ? error.response.data : error.message, error);
    throw error;
  }
};

// You might have other API functions to add here if they are called directly
// via axios in other slices. The principle is to centralize them in an API module
// like this one or dedicated ones (e.g., userAPI.js, projectAPI.js etc.)

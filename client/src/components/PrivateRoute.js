import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

// This component protects routes that require authentication.
const PrivateRoute = () => {
  // Get the authentication status from the Redux store.
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  // If authenticated, render the child routes (Outlet). Otherwise, redirect to the login page.
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

/**
 * PrivateRoute protects routes that require authentication.
 * If the user is authenticated, renders the nested routes (Outlet).
 * If not authenticated, redirects to the login page.
 *
 * Usage in your router:
 * <Route element={<PrivateRoute />}>
 *   <Route path="/dashboard" element={<Dashboard />} />
 *   ...
 * </Route>
 */
const PrivateRoute = () => {
  // Get authentication status from Redux store
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  // If authenticated, render child routes; else, redirect to login
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;

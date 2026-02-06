// src/components/PrivateRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Loader from "./Loader"; // 🔹 Use your new shared Loader!

const PrivateRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // 1. Handle the Loading State
  if (isLoading) {
    return <Loader message="Verifying your credentials..." />;
  }

  // 2. Handle Unauthenticated Access
  if (!isAuthenticated) {
    const message = sessionStorage.getItem("auth_message") || "Please log in to access this page.";
    sessionStorage.removeItem("auth_message");
    
    // Redirect to login, but save where they were trying to go
    return <Navigate to="/login" replace state={{ from: location, message }} />;
  }

  // 3. Handle Unauthorized Access (Role Check)
  // If a specific role is required (e.g., 'admin') and the user doesn't have it
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'superadmin') {
    return <Navigate to="/" replace state={{ message: "You do not have permission to view that page." }} />;
  }

  return children;
};

export default PrivateRoute;
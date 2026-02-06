// src/pages/GoogleCallbackPage.jsx
import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Spinner } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";

const GoogleCallbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { applyToken, fetchUser } = useAuth();

  useEffect(() => {
    const processGoogleLogin = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const token = params.get("token");
        const errorParam = params.get("error");

        // Google returned an error
        if (errorParam) {
          sessionStorage.setItem(
            "auth_message",
            errorParam === "access_denied"
              ? "Google sign-in was cancelled."
              : `Google login error: ${errorParam}`
          );
          navigate("/login", { replace: true });
          return;
        }

        if (!token) {
          sessionStorage.setItem(
            "auth_message",
            "Missing authentication token."
          );
          navigate("/login", { replace: true });
          return;
        }

        // Attach token globally
        applyToken(token);

        // Fetch & return user
        const user = await fetchUser(token); // MUST return user

        if (!user) {
          sessionStorage.setItem(
            "auth_message",
            "Could not load your profile."
          );
          navigate("/login", { replace: true });
          return;
        }

        // Redirect by role
        const redirectMap = {
          author: "/authors-dashboard",
          admin: "/admin-dashboard",
          superadmin: "/superadmin-dashboard",
          commentator: "/dashboard",
        };

        navigate(redirectMap[user.role] || "/dashboard", { replace: true });
      } catch (err) {
        console.error("❌ Google login flow failed:", err);
        sessionStorage.setItem(
          "auth_message",
          "Google authentication failed."
        );
        navigate("/login", { replace: true });
      }
    };

    processGoogleLogin();
  }, [location.search, navigate, applyToken, fetchUser]);

  return (
    <Container className="d-flex flex-column justify-content-center align-items-center vh-100">
      <Spinner animation="border" className="mb-2" />
      <p className="text-muted">Completing Google login…</p>
    </Container>
  );
};

export default GoogleCallbackPage;

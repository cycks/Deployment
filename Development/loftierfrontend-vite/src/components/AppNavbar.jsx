// src/components/AppNavbar.jsx
import React, { useState, useCallback } from "react";
import { Navbar, Nav, Form, FormControl, Button, Container, OverlayTrigger, Tooltip, Image } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../libs/api";

const AppNavbar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    try {
      const response = await api.get("/categories/search", { params: { q: trimmed } });
      navigate(`/search?q=${encodeURIComponent(trimmed)}`, { state: { results: response.data } });
    } catch (error) {
      console.error("❌ Search failed:", error);
    }
  }, [searchTerm, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      if (user?.auth_provider === "google") await api.post("/auth/google_logout");
    } catch (err) {
      console.warn("⚠ Google logout failed:", err);
    } finally {
      logout();
      navigate("/login", { replace: true });
    }
  }, [logout, user, navigate]);

  const getDashboardPath = useCallback(() => {
    if (user?.role === "author") return "/authors-dashboard";
    if (["admin", "superadmin"].includes(user?.role)) return "/admin-dashboard";
    return "/dashboard";
  }, [user]);

  const renderUserAvatar = () => {
    if (!user) return null;
    const imgUrl = user.auth_provider === "google" && user.profile_picture
        ? user.profile_picture
        : `https://api.dicebear.com/9.x/identicon/svg?seed=${user.username}`;

    return (
      <OverlayTrigger placement="bottom" overlay={<Tooltip>{user.username} ({user.role})</Tooltip>}>
        <Image
          roundedCircle
          src={imgUrl}
          width={36}
          height={36}
          className="me-lg-3 border border-primary shadow-sm avatar-hover"
          style={{ cursor: "pointer", objectFit: "cover" }}
          onClick={() => navigate(getDashboardPath())}
        />
      </OverlayTrigger>
    );
  };

  return (
    <>
      <Navbar bg="white" expand="lg" variant="light" fixed="top" className="shadow-sm py-2 px-lg-4">
        <Container fluid="xl">
          <Navbar.Brand as={Link} to="/" className="fw-bold text-primary" style={{ letterSpacing: "-0.5px" }}>
            Loftier Movies
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="navbar-nav" />

          <Navbar.Collapse id="navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">Home</Nav.Link>
              <Nav.Link as={Link} to="/blogs">Recommendations</Nav.Link>
              <Nav.Link as={Link} to="/categories">Categories</Nav.Link>
              <Nav.Link as={Link} to="/authors">Authors</Nav.Link>
              {isAuthenticated && (
                <Nav.Link as={Link} to={getDashboardPath()} className="text-primary fw-semibold">
                  Dashboard
                </Nav.Link>
              )}
            </Nav>

            <Form className="d-flex my-2 my-lg-0 mx-lg-3" onSubmit={handleSearch} style={{ flex: 1, maxWidth: "500px" }}>
              <FormControl
                type="search"
                placeholder="Search movies, authors..."
                className="rounded-pill px-3 shadow-none border-secondary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Form>

            <Nav className="ms-auto align-items-center gap-2">
              {isAuthenticated ? (
                <>
                  <div className="d-none d-lg-block">{renderUserAvatar()}</div>
                  <Button variant="link" onClick={handleLogout} className="text-danger fw-bold text-decoration-none p-0">
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Nav.Link as={Link} to="/login" className="fw-bold text-primary">Login</Nav.Link>
                  <Button as={Link} to="/signup" variant="primary" className="rounded-pill px-4 btn-sm">
                    Sign Up
                  </Button>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      {/* 🔹 Push content down so it doesn't hide behind fixed Navbar */}
      <div style={{ height: "70px" }}></div>

      <style>{`
        .avatar-hover:hover {
          transform: scale(1.1);
          transition: transform 0.2s ease;
        }
        .nav-link:hover {
          color: #0077cc !important;
        }
      `}</style>
    </>
  );
};

export default AppNavbar;
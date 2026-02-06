import React, { useState, useEffect } from "react";
import {
  Container, Row, Col, Card, Form, Button, Spinner, Alert, InputGroup,
} from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../libs/api";
import { BsEye, BsEyeSlash } from "react-icons/bs";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState("info");

  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user, isLoading: authLoading } = useAuth();

  // 1. STABLE REDIRECT LOGIC
  useEffect(() => {
    // Only redirect if we are authenticated AND the user data has arrived
    if (isAuthenticated && user && !authLoading) {
      const role = user.role?.toLowerCase();
      
      // Check if user was trying to go somewhere specific before being kicked to login
      const from = location.state?.from?.pathname;
      
      if (from) {
        navigate(from, { replace: true });
      } else if (role === "admin" || role === "superadmin") {
        navigate("/admin-dashboard", { replace: true });
      } else if (role === "author") {
        navigate("/authors-dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, authLoading, navigate, location]);

  // 2. INITIAL MESSAGE CHECK (e.g. "Session Expired")
  useEffect(() => {
    const authMessage = sessionStorage.getItem("auth_message");
    if (authMessage) {
      setMessage(authMessage);
      setVariant("warning");
      sessionStorage.removeItem("auth_message");
    }
  }, []);

  // 3. HANDLERS
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await api.post("/auth/login", { email, password });
      
      if (response.data.access_token && response.data.user) {
        // This calls applyToken and applyUser in AuthContext
        login(response.data.access_token, response.data.user);
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMsg = error.response?.data?.msg || "An error occurred. Please try again.";
      setMessage(error.response?.status === 401 ? "Invalid email or password." : errorMsg);
      setVariant("danger");
      setIsSubmitting(false); // Only stop submitting if it fails
    }
  };

  const handleGoogleLogin = () => {
    // Use the base URL from your axios instance if possible
    const backendUrl = api.defaults.baseURL || "http://localhost:5000/api";
    window.location.href = `${backendUrl}/auth/google_login`;
  };

  return (
    <Container className="my-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow-lg border-0 rounded-4">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="fw-bold mb-1">Welcome Back</h2>
                <p className="text-muted small">Please enter your details to sign in</p>
              </div>

              {message && (
                <Alert variant={variant} dismissible onClose={() => setMessage("")} className="rounded-3">
                  {message}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="py-2"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Password</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="py-2 border-end-0"
                    />
                    <Button
                      variant="outline-secondary"
                      className="border-start-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <BsEyeSlash /> : <BsEye />}
                    </Button>
                  </InputGroup>
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 mt-3 fw-bold py-2 shadow-sm"
                  disabled={isSubmitting || authLoading}
                >
                  {isSubmitting ? <Spinner size="sm" /> : "Sign In"}
                </Button>
              </Form>

              <div className="d-flex justify-content-between mt-3 small">
                <Link to="/signup" className="text-decoration-none">Create account</Link>
                <Link to="/forgot-password(not-available)" className="text-muted">Forgot password?</Link>
              </div>

              <div className="position-relative my-4">
                <hr />
                <span className="position-absolute top-50 start-50 translate-middle bg-white px-3 text-muted small">OR</span>
              </div>

              <Button
                variant="outline-dark"
                className="w-100 d-flex align-items-center justify-content-center py-2 rounded-3 border-secondary-subtle"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
              >
                <img
                  src="https://developers.google.com/identity/images/g-logo.png"
                  alt="Google"
                  style={{ width: "18px", marginRight: "10px" }}
                />
                Continue with Google
              </Button>
              
              <p className="text-center text-muted mt-3 mb-0" style={{ fontSize: '0.7rem' }}>
                By continuing, you agree to our Terms of Service.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LoginPage;
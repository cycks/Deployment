// src/pages/ConfirmEmailPage.js
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Alert, Spinner } from "react-bootstrap";
import { BsCheckCircleFill, BsExclamationCircleFill } from "react-icons/bs";
import api from "../libs/api"; // ✅ use centralized axios instance

const ConfirmEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Confirming your email...");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setMessage("No confirmation token found. Please check your email link.");
      setIsSuccess(false);
      setIsLoading(false);
      return;
    }

    const confirmEmail = async () => {
      console.log("✅ Confirm email page reached");
      try {
        const response = await api.get(`/auth/confirm/${token}`);
        const data = response.data;

        setMessage(data.msg || "Email confirmed successfully!");
        setIsSuccess(true);

        // Redirect after success
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } catch (error) {
        console.error("❌ Error confirming email:", error);
        const errMsg =
          error.response?.data?.msg ||
          "Failed to confirm email. The token might be invalid or expired.";
        setMessage(errMsg);
        setIsSuccess(false);

        // Handle expired token case
        if (
          errMsg.includes("Token has expired. Your account has been deleted.")
        ) {
          setTimeout(() => {
            navigate("/signup");
          }, 5000);
        }
      } finally {
        setIsLoading(false);
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  return (
    <Container className="my-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow-lg p-4 text-center">
            <Card.Body>
              {isLoading ? (
                <>
                  <Spinner animation="border" role="status" className="mb-3" />
                  <h2 className="mb-4">Confirming your Email...</h2>
                  <p>Please wait while we verify your account.</p>
                </>
              ) : (
                <>
                  {isSuccess ? (
                    <>
                      <BsCheckCircleFill
                        size={60}
                        className="text-success mb-3"
                      />
                      <h2 className="mb-4 text-success">
                        Registration Successful!
                      </h2>
                      <Alert variant="success" className="mb-3">
                        {message}
                      </Alert>
                      <p className="lead">
                        You're all set! We're redirecting you to the login page
                        now.
                      </p>
                      <p className="text-muted">
                        If you're not redirected automatically, click the link
                        below.
                      </p>
                      <a href="/login" className="btn btn-primary mt-3">
                        Go to Login
                      </a>
                    </>
                  ) : (
                    <>
                      <BsExclamationCircleFill
                        size={60}
                        className="text-danger mb-3"
                      />
                      <h2 className="mb-4 text-danger">Confirmation Failed</h2>
                      <Alert variant="danger" className="mb-3">
                        {message}
                      </Alert>
                      <p className="text-muted">
                        Please review the message above. If you believe this is
                        an error or need to re-register, use the links below.
                      </p>
                      <div className="d-grid gap-2 d-md-block mt-3">
                        {message.includes("Token has expired") ? (
                          <a
                            href="/signup"
                            className="btn btn-warning me-md-2"
                          >
                            Register Again
                          </a>
                        ) : (
                          <a
                            href="/login"
                            className="btn btn-primary me-md-2"
                          >
                            Go to Login
                          </a>
                        )}
                        <a href="/signup" className="btn btn-outline-secondary">
                          Sign Up
                        </a>
                      </div>
                    </>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ConfirmEmailPage;

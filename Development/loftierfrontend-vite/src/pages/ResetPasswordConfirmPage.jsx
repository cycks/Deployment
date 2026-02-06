// src/pages/ResetPasswordConfirmPage.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../libs/api'; // ✅ use centralized axios instance

const ResetPasswordConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [message, setMessage] = useState('');
  const [messageVariant, setMessageVariant] = useState('info');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // ✅ Extract token from URL
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      setMessage('Please enter and confirm your new password.');
      setMessageVariant('info');
    } else {
      setMessage(
        'No password reset token found in the URL. Please ensure you clicked the full link from your email or request a new one.'
      );
      setMessageVariant('danger');
    }
    setIsPageLoading(false);
  }, [searchParams]);

  // ✅ Validate inputs
  const validateForm = () => {
    let newErrors = {};
    let isValid = true;

    if (!newPassword) {
      newErrors.newPassword = 'New password is required.';
      isValid = false;
    } else {
      // ✅ Re-enforcing the high-security standard from SignUpPage
      // Must contain uppercase, lowercase, digit, special char, and be at least 15 chars
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{15,}$/;

      if (!passwordRegex.test(newPassword)) {
        newErrors.newPassword =
          'Password must be at least 15 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.';
        isValid = false;
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm password is required.';
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // ✅ Submit new password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage('');
    setMessageVariant('info');

    if (!token) {
      setMessage('A token is required to reset your password. Please request a new link.');
      setMessageVariant('danger');
      return;
    }

    if (validateForm()) {
      setIsLoading(true);
      try {
        const res = await api.post('/auth/reset-password/confirm', {
          token,
          new_password: newPassword,
        });

        setMessage(res.data.msg || 'Your password has been reset successfully! Redirecting to login...');
        setMessageVariant('success');
        setNewPassword('');
        setConfirmPassword('');

        // Redirect after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error) {
        console.error('API error during password reset:', error);
        setMessage(
          error.response?.data?.msg ||
            'Failed to reset password. The link might be invalid or expired. Please request a new one.'
        );
        setMessageVariant('danger');
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (isPageLoading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" role="status" className="mb-3" />
        <p>Checking password reset link...</p>
      </Container>
    );
  }

  return (
    <Container className="my-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow-lg p-4">
            <Card.Body>
              <h2 className="text-center mb-4">Set New Password</h2>

              {message && <Alert variant={messageVariant}>{message}</Alert>}

              {token ? (
                <Form onSubmit={handleSubmit} noValidate>
                  <Form.Group className="mb-3" controlId="formNewPassword">
                    <Form.Label>New Password</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      isInvalid={!!errors.newPassword}
                      disabled={isLoading}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.newPassword}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="formConfirmPassword">
                    <Form.Label>Confirm New Password</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      isInvalid={!!errors.confirmPassword}
                      disabled={isLoading}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.confirmPassword}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 mt-3"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                        />{' '}
                        Setting Password...
                      </>
                    ) : (
                      'Set Password'
                    )}
                  </Button>
                </Form>
              ) : (
                <p className="text-center">
                  Please <Link to="/forgot-password">request a new password reset link</Link>.
                </p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ResetPasswordConfirmPage;

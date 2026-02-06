// src/pages/ForgotPasswordPage.js
import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from '../libs/api';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [messageVariant, setMessageVariant] = useState('info');
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const validateForm = () => {
        let newErrors = {};
        let isValid = true;

        if (!email.trim()) {
            newErrors.email = 'Email address is required.';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email address is invalid.';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setMessage('');
        setMessageVariant('info');

        if (validateForm()) {
            setIsLoading(true);
            try {
                const response = await api.post('/auth/reset_password/request', { email });
                
                // 1. Polished Success Message
                const successMsg = response.data.msg || 
                    `A password reset link has been sent to your email address.
                     Please check your inbox and spam folder.`;

                setMessage(successMsg);
                setMessageVariant('success');
                setEmail(''); // Clear input on success
            } catch (error) {
                console.error('API error:', error);
                
                // Important: On server failure, display the server's error message if available
                const errorMsg = error.response?.data?.msg || 
                                 `Failed to request password reset. Please check the
                                  email and try again.`;
                
                setMessage(errorMsg);
                setMessageVariant('danger');
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <Container className="my-5">
            <Row className="justify-content-center">
                <Col md={6} lg={5}>
                    <Card className="shadow-lg p-4">
                        <Card.Body>
                            <h2 className="text-center mb-4">Forgot Your Password?</h2>
                            <p className="text-center text-muted mb-4 small">
                                Enter your email address below and we'll send you a link to reset your password.
                            </p>

                            {/* Display messages (Success/Error) */}
                            {message && <Alert variant={messageVariant}>{message}</Alert>}

                            <Form onSubmit={handleSubmit} noValidate>
                                <Form.Group className="mb-3" controlId="formEmail">
                                    <Form.Label>Email address</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        isInvalid={!!errors.email}
                                        disabled={isLoading}
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.email}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    className="w-100 mt-3 fw-bold" 
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            {/* 2. Simplified Spinner JSX for cleaner look */}
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            Sending Request...
                                        </>
                                    ) : (
                                        'Request Reset Link'
                                    )}
                                </Button>

                                <p className="text-center mt-3 mb-0">
                                    Remembered your password? <Link to="/login">Login</Link>
                                </p>
                                <p className="text-center mt-2">
                                    Don't have an account? <Link to="/signup">Sign Up</Link>
                                </p>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default ForgotPasswordPage;
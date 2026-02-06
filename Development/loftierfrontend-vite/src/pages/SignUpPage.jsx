// src/pages/SignUpPage.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { BsEye, BsEyeSlash } from 'react-icons/bs';
import api from '../libs/api';

const SignUpPage = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [errors, setErrors] = useState({});
    const [backendError, setBackendError] = useState(null); 
    const [isSubmitting, setIsSubmitting] = useState(false); 

    const navigate = useNavigate();

    // --- TEMPORARY DEBUGGING ---
    useEffect(() => {
        console.log("Form State Update:", { 
            username, 
            email, 
            passwordLength: password.length,
            passwordsMatch: password === confirmPassword 
        });
    }, [username, email, password, confirmPassword]);

    const validateForm = () => {
        let newErrors = {};
        let isValid = true;

        if (!username.trim()) {
            newErrors.username = 'Username is required.';
            isValid = false;
        }

        if (!email.trim()) {
            newErrors.email = 'Email is required.';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email address is invalid.';
            isValid = false;
        }

        if (!password) {
            newErrors.password = 'Password is required.';
            isValid = false;
        } else {
            // NOTE: Strict Regex (15+ chars, Upper, Lower, Num, Special)
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{15,}$/;
            if (!passwordRegex.test(password)) {
                newErrors.password = 'Password does not meet complexity requirements.';
                isValid = false;
            }
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Confirm Password is required.';
            isValid = false;
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match.';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("HandleSubmit triggered - Mode: FormData");

        // Reset previous states
        setErrors({});
        setBackendError(null);

        // 1. Client-side Validation
        const isValid = validateForm();
        if (!isValid) {
            console.warn("Client-side validation failed.");
            return; 
        }
        
        setIsSubmitting(true);

        // 2. Construct FormData (Required for Flask request.form)
        const data = new FormData();
        data.append("username", username.trim());
        data.append("email", email.trim().toLowerCase());
        data.append("password", password);
        data.append("role", 'commentator'); // Explicitly sending role for your backend logic

        console.log("Proceeding to API call with FormData entries...");

        try {
            // 3. API Call
            const response = await api.post('/auth/register', data);
            console.log("API Response Success:", response.status, response.data);
            
            if (response.status === 200 || response.status === 201) {
                navigate('/check-email'); 
            }
        } catch (error) {
            console.error("API Error caught:", error);

            // 4. Edge Case Error Handling
            if (error.response) {
                // Server responded with a status code outside the 2xx range
                const data = error.response.data;
                const status = error.response.status;
                const errorMsg = data.msg || 'An unknown error occurred.';

                if (status === 400 && errorMsg.includes("User already exists")) {
                    setErrors(prev => ({ 
                        ...prev, 
                        username: "Username already taken.",
                        email: "Email already registered."
                    }));
                } else if (status === 413) {
                    setBackendError("Payload too large. If you added an image, it's too big.");
                } else if (status === 429) {
                    setBackendError("Too many attempts. Please try again later.");
                } else {
                    setBackendError(errorMsg);
                }
            } else if (error.request) {
                // The request was made but no response was received
                console.error("No response received:", error.request);
                setBackendError('Server is currently unreachable. Please check your internet or try again later.');
            } else {
                // Something happened in setting up the request
                setBackendError('Error setting up the request. Please refresh and try again.');
            }
        } finally {
            setIsSubmitting(false);
            console.log("HandleSubmit lifecycle complete.");
        }
    };

    return (
        <Container className="my-5">
            <Row className="justify-content-center">
                <Col md={6} lg={5}>
                    <Card className="shadow-lg p-4 border-0 rounded-4">
                        <Card.Body>
                            <h2 className="text-center fw-bold mb-4">Create Account</h2>

                            {backendError && <Alert variant="danger" className="rounded-3">{backendError}</Alert>}

                            <Form onSubmit={handleSubmit} noValidate>
                                <Form.Group className="mb-3" controlId="formUsername">
                                    <Form.Label className="small fw-bold">Username</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Pick a unique username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        isInvalid={!!errors.username}
                                        disabled={isSubmitting}
                                        className="bg-light border-0"
                                    />
                                    <Form.Control.Feedback type="invalid">{errors.username}</Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formEmail">
                                    <Form.Label className="small fw-bold">Email address</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        isInvalid={!!errors.email}
                                        disabled={isSubmitting}
                                        className="bg-light border-0"
                                    />
                                    <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formPassword">
                                    <Form.Label className="small fw-bold">Password</Form.Label>
                                    <InputGroup hasValidation>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter strong password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            isInvalid={!!errors.password}
                                            disabled={isSubmitting}
                                            className="bg-light border-0"
                                        />
                                        <Button 
                                            variant="light"
                                            className="border-0 bg-light"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <BsEyeSlash /> : <BsEye />}
                                        </Button>
                                        <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
                                    </InputGroup>
                                    <Form.Text className="text-muted extra-small">
                                        Min 15 chars, Upper, Lower, Number & Symbol.
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group className="mb-4" controlId="formConfirmPassword">
                                    <Form.Label className="small fw-bold">Confirm Password</Form.Label>
                                    <InputGroup hasValidation>
                                        <Form.Control
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Repeat password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            isInvalid={!!errors.confirmPassword}
                                            disabled={isSubmitting}
                                            className="bg-light border-0"
                                        />
                                        <Button 
                                            variant="light"
                                            className="border-0 bg-light"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? <BsEyeSlash /> : <BsEye />}
                                        </Button>
                                        <Form.Control.Feedback type="invalid">{errors.confirmPassword}</Form.Control.Feedback>
                                    </InputGroup>
                                </Form.Group>

                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    className="w-100 rounded-pill py-2 fw-bold shadow-sm"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <><Spinner animation="border" size="sm" className="me-2" /> Creating Account...</>
                                    ) : (
                                        'Sign Up'
                                    )}
                                </Button>
                            </Form>
                            
                            <div className="text-center mt-4">
                                <p className="mb-0 text-muted small">
                                    Already have an account? <a href="/login" className="text-decoration-none fw-bold">Log In</a>
                                </p>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <style>{`
                .extra-small { font-size: 0.75rem; }
                .bg-light { background-color: #f8f9fa !important; }
            `}</style>
        </Container>
    );
};

export default SignUpPage;
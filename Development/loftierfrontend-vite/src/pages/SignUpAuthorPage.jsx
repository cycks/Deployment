// src/pages/SignUpAuthorPage.jsx
import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

// Assuming API_BASE_URL is correctly configured from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL;

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const SignUpAuthorPage = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profilePicture, setProfilePicture] = useState(null);
    const [errors, setErrors] = useState({});
    
    // ✅ FIX 3: Initialize backend error to null for clearer state
    const [backendError, setBackendError] = useState(null); 
    
    // ✅ FIX 1: Add state for loading
    const [isLoading, setIsLoading] = useState(false); 
    
    const navigate = useNavigate();

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
        } 
        else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email address is invalid.';
            isValid = false;
        } 
        // ✅ Enforce company domain
        else if (!email.toLowerCase().endsWith('@loftiermovies.com')) {
            newErrors.email = 'Author email must end with "@loftiermovies.com".';
            isValid = false;
        }

        if (!password) {
            newErrors.password = 'Password is required.';
            isValid = false;
        } 
        else {
            // ✅ Strong password rule:
            // At least one uppercase, one lowercase, one number, one special char, and 15+ characters
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{15,}$/;

            if (!passwordRegex.test(password)) {
                newErrors.password =
                    'Password must be at least 15 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.';
                isValid = false;
            }
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Confirm Password is required.';
            isValid = false;
        } 
        else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match.';
            isValid = false;
        }

        if (!profilePicture) {
            newErrors.profilePicture = 'Profile picture is required.';
            isValid = false;
        } 
        else if (profilePicture.size > MAX_FILE_SIZE) {
            newErrors.profilePicture = 'File size cannot exceed 2MB.';
            isValid = false;
        } 
        else if (!['image/jpeg', 'image/png', 'image/webp'].includes(profilePicture.type)) {
            newErrors.profilePicture = 'Only JPEG, PNG, or WebP images are allowed.';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setProfilePicture(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setBackendError(null);

        if (!validateForm()) {
            return; // Stop submission if client-side validation fails
        }

        setIsLoading(true); // ✅ Start loading

        const formData = new FormData();
        formData.append('username', username);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('role', 'author'); // The key difference
        formData.append('profile_picture', profilePicture);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                // Successful registration
                navigate('/check-email');
            } else {
                // Server-side validation/error response
                const errorMsg = data.msg || 'Sign Up Failed: An unknown error occurred on the server.';
                
                if (errorMsg.includes("User already exists")) {
                    setErrors(prev => ({ 
                        ...prev, 
                        username: "This username or email is already in use.", 
                        email: "This username or email is already in use."
                    }));
                } else {
                    setBackendError(errorMsg);
                }
                
                console.error('Registration Failed:', data);
            }
        } catch (error) {
            console.error('Network or API error during registration:', error);
            setBackendError('An unexpected network error occurred. Please ensure the server is running and accessible, then try again.');
        } finally {
            setIsLoading(false); // ✅ Stop loading
        }
    };

    return (
        <Container className="my-5">
            <Row className="justify-content-center">
                <Col md={6} lg={5}>
                    <Card className="shadow-lg p-4">
                        <Card.Body>
                            <h2 className="text-center mb-4">Sign Up as an Author</h2>

                            {backendError && <Alert variant="danger">{backendError}</Alert>}

                            <Form onSubmit={handleSubmit} noValidate>
                                
                                {/* Username */}
                                <Form.Group className="mb-3" controlId="formUsername">
                                    <Form.Label>Username</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        isInvalid={!!errors.username}
                                        disabled={isLoading} // ✅ Disabled while loading
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.username}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                {/* Email */}
                                <Form.Group className="mb-3" controlId="formEmail">
                                    <Form.Label>Email address</Form.Label>
                                    <Form.Control
                                        type="email"
                                        placeholder="Enter email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        isInvalid={!!errors.email}
                                        disabled={isLoading}
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.email}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                {/* Password */}
                                <Form.Group className="mb-3" controlId="formPassword">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        isInvalid={!!errors.password}
                                        disabled={isLoading}
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.password}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                {/* Confirm Password */}
                                <Form.Group className="mb-3" controlId="formConfirmPassword">
                                    <Form.Label>Confirm Password</Form.Label>
                                    <Form.Control
                                        type="password"
                                        placeholder="Confirm Password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        isInvalid={!!errors.confirmPassword}
                                        disabled={isLoading}
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.confirmPassword}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                {/* Profile Picture Upload */}
                                <Form.Group className="mb-3" controlId="formProfilePicture">
                                    <Form.Label>Profile Picture (Max 2MB, JPEG/PNG/WebP)</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleFileChange} // ✅ Use separate handler
                                        isInvalid={!!errors.profilePicture}
                                        disabled={isLoading}
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.profilePicture}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    className="w-100 mt-3 fw-bold"
                                    disabled={isLoading} // ✅ Button disabled when loading
                                >
                                    {isLoading ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            Registering...
                                        </>
                                    ) : (
                                        'Sign Up'
                                    )}
                                </Button>
                            </Form>
                            
                            <div className="text-center mt-3">
                                <p className="mb-0 text-muted small">
                                    Already have an account? <a href="/login">Log In</a>
                                </p>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default SignUpAuthorPage;
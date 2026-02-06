// src/pages/CheckEmailPage.js
import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom'; // Import Link for navigation

const CheckEmailPage = () => {
  return (
    <Container className="my-5">
      <Row className="justify-content-center">
        <Col md={6} lg={5}>
          <Card className="shadow-lg p-4 text-center">
            <Card.Body>
              <h2 className="mb-4">Check Your Email!</h2>
              <p className="lead">
                We've sent a confirmation link to your email address.
                Please check your inbox (and spam folder) to activate your account.
              </p>
              <p>
                Once you've confirmed your email, you can proceed to the login page.
              </p>
              <Link to="/login" className="btn btn-primary mt-3">Go to Login Page</Link>
              <hr />
              <p className="text-muted">
                Didn't receive the email?
                It might take a few minutes. Also, double-check your spam or junk folder.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CheckEmailPage;
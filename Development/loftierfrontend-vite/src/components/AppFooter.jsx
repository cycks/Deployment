// src/components/AppFooter.jsx
import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FaFacebookF, FaTwitter, FaInstagram } from "react-icons/fa"; // 🔹 Using react-icons for consistency

const AppFooter = () => {
  return (
    <footer
      className="mt-auto py-5" // 🔹 Added more padding for better breathability
      style={{ backgroundColor: "#0d6efd", color: "white" }}
      aria-label="Footer"
    >
      <Container>
        <Row className="gy-4 text-center text-md-start">
          
          {/* Brand + Description */}
          <Col md={4}>
            <h5 className="fw-bold text-white mb-3">Loftier Movies</h5>
            <p className="text-light small mb-0">
              Your ultimate destination for curated movie reviews and cinematic insights.
            </p>
            <p className="text-white-50 small mt-2">
              &copy; {new Date().getFullYear()} Loftier Movies.
            </p>
          </Col>

          {/* Navigation Links */}
          <Col md={4}>
            <h6 className="fw-bold text-white mb-3">Quick Links</h6>
            <nav aria-label="Footer Navigation">
              <ul className="list-unstyled m-0">
                <li className="mb-2">
                  <Link className="text-white text-decoration-none hover-link" to="/">
                    Home
                  </Link>
                </li>
                <li className="mb-2">
                  <Link className="text-white text-decoration-none hover-link" to="/contact-us">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link className="text-white text-decoration-none hover-link" to="/privacy-policy">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </nav>
          </Col>

          {/* Contact & Social */}
          <Col md={4}>
            <h6 className="fw-bold text-white mb-3">Connect With Us</h6>
            <ul className="list-unstyled m-0">
              <li className="mb-2 small">Email: info@loftiermovies.com</li>
              <li className="mb-3 small">Phone: Support coming soon</li>
              <li className="d-flex justify-content-center justify-content-md-start gap-3">
                <a href="https://facebook.com" aria-label="Facebook" className="text-white social-icon">
                  <FaFacebookF size={20} />
                </a>
                <a href="https://twitter.com" aria-label="Twitter" className="text-white social-icon">
                  <FaTwitter size={20} />
                </a>
                <a href="https://instagram.com" aria-label="Instagram" className="text-white social-icon">
                  <FaInstagram size={20} />
                </a>
              </li>
            </ul>
          </Col>
        </Row>
      </Container>

      <style>
        {`
          .hover-link:hover {
            color: #ffc107 !important; /* 🔹 Highlight color on hover */
            transition: color 0.2s ease-in-out;
          }
          .social-icon:hover {
            transform: translateY(-3px);
            transition: transform 0.2s ease-in-out;
            color: #ffc107 !important;
          }
          footer {
            border-top: 4px solid #0a58ca; /* 🔹 Subtle top border for depth */
          }
        `}
      </style>
    </footer>
  );
};

export default AppFooter;
// src/components/Loader.jsx

import React from 'react';
import { Spinner } from 'react-bootstrap';

const Loader = ({ fullPage = true, message = "Loading...", size = "lg" }) => {
  // 🔹 Define container styles based on whether it's full-screen or inline
  const containerStyle = fullPage 
    ? { minHeight: '80vh' } 
    : { padding: '20px 0' };

  return (
    <div 
      className={`d-flex flex-column justify-content-center align-items-center ${fullPage ? 'w-100' : ''}`} 
      style={containerStyle}
    >
      <Spinner 
        animation="border" 
        variant="primary" 
        size={size === "sm" ? "sm" : undefined}
        role="status"
        className="shadow-sm"
      >
        <span className="visually-hidden">Loading...</span>
      </Spinner>
      
      {message && (
        <p className={`mt-2 text-muted ${size === "sm" ? "small" : "fw-semibold"}`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default Loader;
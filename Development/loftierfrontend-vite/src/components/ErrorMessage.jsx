// src/components/ErrorMessage.jsx

import React from 'react';
import { Alert } from 'react-bootstrap';
import { BsExclamationTriangleFill } from 'react-icons/bs';

const ErrorMessage = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <Alert 
      variant="danger" 
      className="d-flex align-items-center shadow-sm border-start border-4 border-danger"
      onClose={onClose}
      dismissible={!!onClose} // Only show close button if an onClose function is provided
    >
      <BsExclamationTriangleFill className="me-2" size={20} />
      <div>
        <strong className="me-1">Error:</strong> {message}
      </div>
    </Alert>
  );
};

export default ErrorMessage;
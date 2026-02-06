// src/components/SuccessMessage.jsx

import React from 'react';
import { Alert } from 'react-bootstrap';
import { BsCheckCircleFill } from 'react-icons/bs';

const SuccessMessage = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <Alert 
      variant="success" 
      className="d-flex align-items-center shadow-sm border-start border-4 border-success"
      onClose={onClose}
      dismissible
    >
      <BsCheckCircleFill className="me-2" size={20} />
      <div>
        <strong className="me-1">Success!</strong> {message}
      </div>
    </Alert>
  );
};

export default SuccessMessage;
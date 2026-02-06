// src/components/MovieDetailsTable.jsx
import React from 'react';
import { Table, Alert, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { BsStarFill } from 'react-icons/bs';

const MovieDetailsTable = ({ title, movies }) => {
  // 🔹 Empty state handling
  if (!movies || movies.length === 0) {
    return (
      <Alert variant="info" className="mt-4 text-center shadow-sm">
        No {title.toLowerCase()} movies found in this collection.
      </Alert>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="mb-3 fw-bold text-dark border-bottom pb-2">{title}</h3>
      <div className="bg-white rounded shadow-sm overflow-hidden">
        <Table hover responsive className="mb-0 align-middle">
          <thead className="table-dark">
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>Movie Title</th>
              <th>Category</th>
              <th>Author</th>
              <th className="text-center">Rating</th>
            </tr>
          </thead>
          <tbody>
            {movies.map((movie, index) => (
              <tr key={movie.id}>
                <td className="text-muted small">{index + 1}</td>
                <td>
                  <Link 
                    to={`/blogs/${movie.id}`} 
                    className="fw-bold text-decoration-none text-primary"
                  >
                    {movie.title}
                  </Link>
                </td>
                <td>
                  <Badge bg="light" text="dark" className="border">
                    {movie.category || 'Uncategorized'}
                  </Badge>
                </td>
                <td>
                  <span className="small text-muted">
                    {movie.author?.username || 'Guest'}
                  </span>
                </td>
                <td className="text-center">
                  {movie.average_rating ? (
                    <div className="d-flex align-items-center justify-content-center text-warning">
                      <BsStarFill className="me-1" size={14} />
                      <span className="fw-bold text-dark">
                        {Number(movie.average_rating).toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted small">Not Rated</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
};

export default MovieDetailsTable;
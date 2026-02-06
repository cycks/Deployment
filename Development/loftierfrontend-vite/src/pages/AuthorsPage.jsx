// src.pages.AuthorsPage
import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Form, Button, InputGroup } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { BsSearch } from "react-icons/bs"; // Ensure react-icons is installed
import api from "../libs/api";

const AuthorsPage = () => {
  const [authors, setAuthors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [sort, setSort] = useState("posts");
  const [search, setSearch] = useState(""); // 1. New search state

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const perPage = 9;

  const navigate = useNavigate();

  // ✅ Fetch all authors with search param
  const fetchAuthors = async () => {
    setIsLoading(true);
    setAlert(null);
    try {
      const { data } = await api.get("posts/authors/get_all_authors", {
        // 2. Added 'search' to params
        params: { sort, page, per_page: perPage, search }, 
      });
      setAuthors(data.authors || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error(err);
      setAlert(err.response?.data?.error || "Failed to fetch authors.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 3. Optional: Add a small debounce if you want it to search as you type
    const delayDebounceFn = setTimeout(() => {
      fetchAuthors();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, page, search]); // 4. Listen for search changes

  const handleSortChange = (e) => {
    setSort(e.target.value);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1); // Reset to page 1 on new search
  };

  const handleAuthorClick = (authorId) => {
    navigate(`/authors/${authorId}/posts`);
  };

  return (
    <Container className="my-4">
      {/* 5. Enhanced Header with Search Bar */}
      <div className="mb-4">
        <h2 className="fw-bold mb-3">Our Authors</h2>
        <Row className="g-3">
          <Col md={8} lg={9}>
            <InputGroup>
              <InputGroup.Text className="bg-white border-end-0">
                <BsSearch className="text-muted" />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search authors by username..."
                value={search}
                onChange={handleSearchChange}
                className="border-start-0 ps-0"
                aria-label="Search authors"
              />
            </InputGroup>
          </Col>
          <Col md={4} lg={3}>
            <Form.Select
              value={sort}
              onChange={handleSortChange}
              aria-label="Sort authors"
              className="fw-semibold"
            >
              <option value="posts">Most Active</option>
              <option value="latest">Most Recent</option>
              <option value="name">A–Z</option>
            </Form.Select>
          </Col>
        </Row>
      </div>

      {alert && <Alert variant="danger">{alert}</Alert>}

      {isLoading ? (
        <div className="text-center my-5 py-5">
           <Spinner animation="border" variant="primary" />
           <p className="mt-2 text-muted">Finding authors...</p>
        </div>
      ) : authors.length === 0 ? (
        <Alert variant="info" className="text-center py-5">
          <p className="mb-0">No authors matching "<strong>{search}</strong>" were found.</p>
          <Button variant="link" onClick={() => setSearch("")} className="mt-2">Clear search</Button>
        </Alert>
      ) : (
        <>
          <Row xs={1} sm={2} md={3} lg={3} className="g-4">
            {authors.map((author) => (
              <Col key={author.id}>
                {/* ... existing Card code ... */}
                <Card
                  className="h-100 border-0 shadow-sm"
                  style={{
                    transform: "scale(0.95)", // Slightly larger default for visibility
                    borderRadius: "1rem",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                  }}
                  onClick={() => handleAuthorClick(author.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(0.98)";
                    e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(0.95)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <Card.Img
                    variant="top"
                    src={author.avatar_url || "/default-avatar.png"}
                    alt={`${author.username}'s avatar`}
                    style={{
                      height: "100px",
                      width: "100px",
                      objectFit: "cover",
                      borderRadius: "50%",
                      margin: "24px auto 8px",
                      display: "block",
                      border: "3px solid #f8f9fa"
                    }}
                  />
                  <Card.Body className="text-center">
                    <Card.Title className="fw-bold mb-1">{author.username}</Card.Title>
                    <Card.Text className="text-muted small mb-3">{author.email}</Card.Text>
                    <hr className="my-2 opacity-25" />
                    <div className="d-flex justify-content-around mt-3">
                        <div>
                            <small className="text-muted d-block text-uppercase" style={{fontSize: '0.6rem'}}>Posts</small>
                            <span className="fw-bold">{author.post_count}</span>
                        </div>
                        {author.latest_post_date && (
                            <div>
                                <small className="text-muted d-block text-uppercase" style={{fontSize: '0.6rem'}}>Latest</small>
                                <span className="fw-bold">{new Date(author.latest_post_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                            </div>
                        )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Pagination logic remains same */}
          {pagination.pages > 1 && (
            <div className="d-flex justify-content-center align-items-center gap-3 mt-5">
              <Button
                variant="outline-primary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                &larr; Previous
              </Button>
              <span className="small fw-bold text-muted">
                {pagination.page} / {pagination.pages}
              </span>
              <Button
                variant="outline-primary"
                size="sm"
                disabled={page === pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next &rarr;
              </Button>
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default AuthorsPage;
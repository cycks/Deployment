// src/pages/SearchResultsPage.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Pagination,
} from "react-bootstrap";
import api from "../libs/api";

const SearchResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search).get("q") || "";
  const pageFromUrl = parseInt(
    new URLSearchParams(location.search).get("page") || "1"
  );

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1,
    current_page: 1,
    per_page: 10,
  });

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) return;

      try {
        setLoading(true);
        setError(null);

        const res = await api.get(`/categories/search`, {
          params: { q: query, page: pageFromUrl },
        });

        setResults(res.data.results || []);
        setPagination({
          total: res.data.total,
          pages: res.data.pages,
          current_page: res.data.current_page,
          per_page: res.data.per_page,
        });
      } catch (err) {
        console.error("Search error:", err);
        setError("Something went wrong while searching.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, pageFromUrl]);

  const handlePageChange = (newPage) => {
    navigate(`/search?q=${encodeURIComponent(query)}&page=${newPage}`);
  };

  const renderPagination = () => {
    if (pagination.pages <= 1) return null;

    const items = [];
    items.push(
      <Pagination.Prev
        key="prev"
        disabled={pagination.current_page === 1}
        onClick={() => handlePageChange(pagination.current_page - 1)}
      />
    );

    const startPage = Math.max(1, pagination.current_page - 2);
    const endPage = Math.min(pagination.pages, pagination.current_page + 2);

    if (startPage > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => handlePageChange(1)}>
          1
        </Pagination.Item>
      );
      if (startPage > 2)
        items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === pagination.current_page}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    if (endPage < pagination.pages) {
      if (endPage < pagination.pages - 1)
        items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
      items.push(
        <Pagination.Item
          key={pagination.pages}
          onClick={() => handlePageChange(pagination.pages)}
        >
          {pagination.pages}
        </Pagination.Item>
      );
    }

    items.push(
      <Pagination.Next
        key="next"
        disabled={pagination.current_page === pagination.pages}
        onClick={() => handlePageChange(pagination.current_page + 1)}
      />
    );

    return (
      <Pagination className="justify-content-center mt-4">{items}</Pagination>
    );
  };

  return (
    <Container className="mt-0 pt-0">
      <h3 className="mb-4 text-center">
        Search Results for <strong>"{query}"</strong>
      </h3>

      {loading ? (
        <div className="d-flex justify-content-center mt-5">
          <Spinner animation="border" />
        </div>
      ) : error ? (
        <Alert variant="danger" className="mt-4 text-center">
          {error}
        </Alert>
      ) : results.length === 0 ? (
        <Alert variant="info" className="mt-4 text-center">
          No results found.
        </Alert>
      ) : (
        <>
          <Row>
            {results.map((post) => (
              <Col md={4} key={post.id} className="mb-4">
                <Card className="h-100 shadow-sm border-0">
                  <Link
                    to={`/blogs/${post.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {post.image_url && (
                      <Card.Img
                        variant="top"
                        src={post.image_url}
                        alt={post.title}
                        style={{ height: "200px", objectFit: "cover" }}
                      />
                    )}
                    <Card.Body>
                      <Card.Title>{post.title}</Card.Title>
                      <Card.Text
                        dangerouslySetInnerHTML={{
                          __html:
                            post.content.length > 100
                              ? post.content.substring(0, 100) + "..."
                              : post.content,
                        }}
                      />
                    </Card.Body>
                  </Link>

                  <Card.Footer className="bg-white border-0">
                    <small className="text-muted">
                      By:{" "}
                      <Link
                        to={`/authors/${post.author_id}/posts`}
                        style={{ textDecoration: "none", color: "#0077cc" }}
                      >
                        {post.author || "Unknown"}
                      </Link>
                    </small>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>

          {renderPagination()}
        </>
      )}
    </Container>
  );
};

export default SearchResultsPage;

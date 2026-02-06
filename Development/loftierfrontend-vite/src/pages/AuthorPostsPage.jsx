// src.pages.AuthorPostsPage

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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

// --- Sub-component for individual ads in the grid ---
const SidebarAdBox = ({ slot }) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, [slot]);

  return (
    <Col xs={12} md={4}>
      <div className="bg-white rounded-4 shadow-sm p-3 border h-100 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '280px' }}>
        <small className="text-muted mb-2" style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>Advertisement</small>
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%" }}
          data-ad-client="ca-pub-8507213923022182"
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    </Col>
  );
};

const AuthorPostsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [authorName, setAuthorName] = useState("");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1,
    current_page: 1,
    per_page: 9, // Strictly 9 per page
  });

  const pageFromUrl = parseInt(
    new URLSearchParams(window.location.search).get("page") || "1"
  );

  useEffect(() => {
    const fetchAuthorPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Explicitly passing limit: 9 to ensure the backend matches the frontend logic
        const res = await api.get(`/posts/authors/${id}/posts`, {
          params: { page: pageFromUrl, limit: 9 },
        });

        setAuthorName(res.data.author_name);
        setPosts(res.data.results || []);
        setPagination({
          total: res.data.total,
          pages: res.data.pages,
          current_page: res.data.current_page,
          per_page: res.data.per_page,
        });
      } catch (err) {
        console.error("Error fetching author posts:", err);
        setError("Failed to load author's posts.");
      } finally {
        setLoading(false);
      }
    };

    fetchAuthorPosts();
  }, [id, pageFromUrl]);

  const handlePageChange = (newPage) => {
    navigate(`/authors/${id}/posts?page=${newPage}`);
    window.scrollTo(0, 0); // Scroll to top on page change
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

    for (let i = 1; i <= pagination.pages; i++) {
      // Logic to show only a few page numbers if there are many
      if (i === 1 || i === pagination.pages || (i >= pagination.current_page - 2 && i <= pagination.current_page + 2)) {
        items.push(
          <Pagination.Item
            key={i}
            active={i === pagination.current_page}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </Pagination.Item>
        );
      } else if (i === pagination.current_page - 3 || i === pagination.current_page + 3) {
        items.push(<Pagination.Ellipsis key={`ellipsis-${i}`} />);
      }
    }

    items.push(
      <Pagination.Next
        key="next"
        disabled={pagination.current_page === pagination.pages}
        onClick={() => handlePageChange(pagination.current_page + 1)}
      />
    );

    return <Pagination className="justify-content-center mt-4">{items}</Pagination>;
  };

  return (
    <Container className="py-4">
      {loading ? (
        <div className="d-flex justify-content-center mt-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : error ? (
        <Alert variant="danger" className="text-center mt-4">
          {error}
        </Alert>
      ) : (
        <>
          <header className="mb-5 text-center">
            <h1 className="fw-bold">Stories by {authorName || "Author"}</h1>
            <p className="text-muted">Explore the latest written works</p>
          </header>

          {posts.length === 0 ? (
            <Alert variant="info" className="text-center">
              This author has no published posts yet.
            </Alert>
          ) : (
            <>
              <Row className="g-4 mb-5">
                {posts.map((post) => (
                  <Col md={6} lg={4} key={post.id}>
                    <Card className="h-100 shadow-sm border-0 overflow-hidden post-card">
                      <Link
                        to={`/blogs/${post.id}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <div style={{ height: "200px", overflow: "hidden" }}>
                          <Card.Img
                            variant="top"
                            src={post.image_url || `https://picsum.photos/seed/${post.id}/600/400`}
                            alt={post.title}
                            className="w-100 h-100 object-fit-cover"
                          />
                        </div>
                        <Card.Body>
                          <Card.Title className="fw-bold">{post.title}</Card.Title>
                          <Card.Text className="text-muted small">
                            {post.excerpt || (post.content ? post.content.substring(0, 100) + "..." : "")}
                          </Card.Text>
                        </Card.Body>
                      </Link>
                    </Card>
                  </Col>
                ))}
              </Row>

              {/* 🔹 Advertisement Row: 3 Slots at the bottom */}
              <Row className="g-4 mb-5">
                <SidebarAdBox slot="5781580688" />
                <SidebarAdBox slot="5941362781" />
                <SidebarAdBox slot="7924334774" />
              </Row>

              {renderPagination()}
            </>
          )}
        </>
      )}

      <style>{`
        .post-card { transition: transform 0.3s ease; }
        .post-card:hover { transform: translateY(-5px); }
        .object-fit-cover { object-fit: cover; }
      `}</style>
    </Container>
  );
};

export default AuthorPostsPage;
// src/pages/CategoriesPage.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Badge, Spinner, Alert, Form, InputGroup } from "react-bootstrap";
import api from "../libs/api";

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Fetches the overview list for this page
        const { data } = await api.get("/categories/with_post_count");
        const extractedData = data?.items || data?.categories || (Array.isArray(data) ? data : []);
        setCategories(extractedData);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load categories.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // REDIRECT LOGIC: This now points to your new dedicated results page
  const handleCategoryClick = (categoryId) => {
    navigate(`/category/${categoryId}`); 
  };

  if (isLoading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading Genres...</p>
      </Container>
    );
  }

  return (
    <Container className="pt-2 pb-5"> 
      <header className="mb-4 text-center">
        <h2 className="fw-bold display-5">Explore Genres</h2>
        <Row className="justify-content-center mt-3">
          <Col md={6}>
            <InputGroup className="shadow-sm rounded-pill overflow-hidden border">
              <InputGroup.Text className="bg-white border-0 ps-3">🔍</InputGroup.Text>
              <Form.Control
                placeholder="Find a category..."
                className="border-0 shadow-none py-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Col>
        </Row>
      </header>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-4">
        {filteredCategories.map((cat) => (
          <Col key={cat.id} xs={12} sm={6} md={4} lg={3}>
            <Card 
              className="h-100 border-0 shadow-sm category-card"
              style={{ cursor: "pointer", borderRadius: "15px", overflow: "hidden" }}
              onClick={() => handleCategoryClick(cat.id)}
            >
              <div style={{ height: "180px", overflow: "hidden" }}>
                <Card.Img 
                  variant="top" 
                  src={cat.image_url || `https://picsum.photos/seed/${cat.id}/400/300`} 
                  className="w-100 h-100 object-fit-cover card-zoom"
                />
              </div>
              <Card.Body className="text-center">
                <Card.Title className="fw-bold">{cat.name}</Card.Title>
                <Badge bg="dark" className="rounded-pill">
                  {cat.post_count} Posts
                </Badge>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <style>{`
        .category-card { transition: all 0.3s ease; }
        .category-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; }
        .card-zoom { transition: transform 0.5s ease; }
        .category-card:hover .card-zoom { transform: scale(1.1); }
        .object-fit-cover { object-fit: cover; }
      `}</style>
    </Container>
  );
};

export default CategoriesPage;
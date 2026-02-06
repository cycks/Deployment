// src/pages/HomePage.js
import React from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate

const HomePage = () => {
  const navigate = useNavigate(); // 2. Initialize the navigate function

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100vh' }}>
      
      {/* SECTION 1: Immersive Hero Section */}
      <div 
        className="position-relative d-flex align-items-center justify-content-center text-center"
        style={{
          height: '80vh',
          backgroundImage: `linear-gradient(rgba(0,0,0,0.3), #0a0a0a), url('/movies2.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderBottom: '2px solid #0077cc'
        }}
      >
        <Container>
          <Row>
            <Col lg={8} className="mx-auto">
              <Badge bg="primary" className="mb-3 px-3 py-2 text-uppercase" style={{ letterSpacing: '2px' }}>
                Cinematic Excellence
              </Badge>
              <h1 className="display-2 fw-bold mb-3" style={{ textShadow: '2px 2px 10px rgba(0,0,0,0.8)' }}>
                LOFTIER <span style={{ color: '#0077cc' }}>MOVIES</span>
              </h1>
              <p className="lead fs-4 mb-4 text-light-50">
                Stop scrolling. Start watching. Curated insights for the modern film lover.
              </p>
              <div className="d-flex gap-3 justify-content-center">
                <Button 
                  size="lg" 
                  variant="primary" 
                  className="px-5 py-3 fw-bold shadow"
                  onClick={() => navigate('/blogs')} // Redirects to movie/blog list
                >
                  Browse Now
                </Button>
                <Button 
                  size="lg" 
                  variant="outline-light" 
                  className="px-5 py-3 fw-bold"
                  onClick={() => navigate('/signup')} // 3. Add the redirect here
                >
                  Join Community
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* SECTION 2: Feature Cards */}
      <Container className="py-5" style={{ marginTop: '-5rem' }}>
        <Row className="g-4 justify-content-center">
          <Col md={5}>
            <Card className="border-0 shadow-lg text-white h-100" style={{ backgroundColor: '#1a1a1a', borderRadius: '15px' }}>
              <Card.Body className="p-4">
                <div className="mb-3" style={{ fontSize: '2rem', color: '#0077cc' }}>
                  <i className="bi bi-film"></i>
                </div>
                <Card.Title className="h3 mb-3 fw-bold">Discover Your Next Favorite Movie</Card.Title>
                <Card.Text className="text-secondary" style={{ lineHeight: '1.6' }}>
                  Loftier Movies is dedicated to helping you explore the vast world of cinema. We provide
                  curated insights and recommendations, ensuring you spend less time searching and more
                  time enjoying high-quality movies that truly resonate with your taste. 
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>

          <Col md={5}>
            <Card className="border-0 shadow-lg text-white h-100" style={{ backgroundColor: '#1a1a1a', borderRadius: '15px' }}>
              <Card.Body className="p-4">
                <div className="mb-3" style={{ fontSize: '2rem', color: '#0077cc' }}>
                  <i className="bi bi-star-fill"></i>
                </div>
                <Card.Title className="h3 mb-3 fw-bold">Unforgettable Experiences</Card.Title>
                <Card.Text className="text-secondary" style={{ lineHeight: '1.6' }}>
                  Looking for a great movie but not sure where to start? We’ve got you covered. Our handpicked
                  movie recommendations are more than just top-rated—they’re unforgettable experiences. No more endless
                  scrolling—just follow our recommendations and enjoy a film that's truly worth your time.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* SECTION 3: Social Proof / Stats */}
      <Container className="py-5 text-center">
        <Row className="text-secondary opacity-75">
          <Col xs={4}>
            <h2 className="fw-bold text-white">5k+</h2>
            <p className="small text-uppercase tracking-wider">Movies Reviewed</p>
          </Col>
          <Col xs={4}>
            <h2 className="fw-bold text-white">12k+</h2>
            <p className="small text-uppercase tracking-wider">Active Members</p>
          </Col>
          <Col xs={4}>
            <h2 className="fw-bold text-white">24/7</h2>
            <p className="small text-uppercase tracking-wider">Recommendations</p>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default HomePage;
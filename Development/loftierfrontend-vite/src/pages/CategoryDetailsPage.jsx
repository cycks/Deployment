import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button } from "react-bootstrap";
import api from "../libs/api";

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
            <div className="bg-white rounded-4 shadow-sm p-3 border h-100 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '300px' }}>
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

const CategoryDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [posts, setPosts] = useState([]);
    const [categoryInfo, setCategoryInfo] = useState(null);
    const [pagination, setPagination] = useState({});
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCategoryData = async () => {
            setIsLoading(true);
            try {
                const { data } = await api.get(`/categories/category_by_id/${id}`, {
                    params: { page: page, limit: 12 }
                });
                setCategoryInfo(data.category_info);
                setPagination(data.pagination);
                setPosts((prev) => (page === 1 ? data.posts : [...prev, ...data.posts]));
            } catch (err) {
                setError(err.response?.data?.message || "Failed to load category results.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchCategoryData();
    }, [id, page]);

    if (isLoading && page === 1) {
        return (
            <Container className="text-center mt-5">
                <Spinner animation="grow" variant="primary" />
                <p className="mt-3 text-muted">Fetching stories...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="mt-5">
                <Alert variant="danger">{error}</Alert>
                <Button variant="primary" onClick={() => navigate("/categories")}>Back to All Genres</Button>
            </Container>
        );
    }

    return (
        <Container className="pt-2 pb-5">
            {/* Header Section */}
            <header className="mb-4">
                {categoryInfo && (
                    <div className="d-flex justify-content-between align-items-baseline border-bottom pb-3">
                        {/* Title on the far Left */}
                        <div>
                            <h1 className="fw-bold display-5 mb-0">{categoryInfo.name}</h1>
                            <p className="text-muted mb-0 small">
                                Showing {posts.length} of {pagination.total_posts} results
                            </p>
                        </div>

                        {/* Buttons on the far Right */}
                        <div className="d-flex align-items-center gap-3">
                            <Button 
                                variant="link" 
                                className="text-decoration-none p-0 fw-medium" 
                                onClick={() => navigate("/categories")}
                            >
                                ← Back to Genres
                            </Button>
                            
                            {pagination.total_posts !== undefined && (
                                <Badge bg="primary" className="px-3 py-2 rounded-pill">
                                    {pagination.total_posts} Total Posts
                                </Badge>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* Posts Grid */}
            <Row className="g-4 mb-5">
                {posts.length > 0 ? (
                    posts.map((post) => (
                        <Col key={post.id} xs={12} md={6} lg={4}>
                            <Card className="h-100 border-0 shadow-sm post-card overflow-hidden">
                                <div className="position-relative" style={{ height: "220px" }}>
                                    <Card.Img 
                                        variant="top" 
                                        src={post.image_url || `https://picsum.photos/seed/${post.id}/600/400`} 
                                        className="w-100 h-100 object-fit-cover"
                                    />
                                </div>
                                <Card.Body className="d-flex flex-column">
                                    <Card.Title className="fw-bold h5">{post.title}</Card.Title>
                                    <Card.Text className="text-muted small">
                                        {post.excerpt || (post.content ? post.content.substring(0, 120) + "..." : "No description available.")}
                                    </Card.Text>
                                    <Button 
                                        variant="outline-dark" 
                                        size="sm" 
                                        className="rounded-pill mt-auto align-self-start"
                                        onClick={() => navigate(`/blogs/${post.id}`)}
                                    >
                                        Read Story
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))
                ) : (
                    <Col xs={12} className="text-center py-5">
                        <h3 className="text-muted">No posts found in this category yet.</h3>
                    </Col>
                )}
            </Row>

            {/* Advertisement Row */}
            {posts.length > 0 && (
                <Row className="g-4 mb-5">
                    <SidebarAdBox slot="5781580688" />
                    <SidebarAdBox slot="5941362781" />
                    <SidebarAdBox slot="7924334774" />
                </Row>
            )}

            {/* Load More Button */}
            {pagination.has_next && (
                <div className="text-center mt-5">
                    <Button 
                        variant="primary" 
                        size="lg" 
                        className="px-5 rounded-pill shadow-sm"
                        onClick={() => setPage(prev => prev + 1)}
                        disabled={isLoading}
                    >
                        {isLoading ? <Spinner size="sm" className="me-2" /> : null}
                        {isLoading ? "Loading..." : "Load More Stories"}
                    </Button>
                </div>
            )}

            <style>{`
                .post-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
                .post-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important; }
                .object-fit-cover { object-fit: cover; }
            `}</style>
        </Container>
    );
};

export default CategoryDetailsPage;
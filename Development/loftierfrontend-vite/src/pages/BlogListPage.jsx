// src/pages/BlogListPage.js
import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { Container, Row, Col, Card, Pagination, Spinner, Alert, Badge } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { BsCalendar3, BsPerson } from 'react-icons/bs';
import api from '../libs/api';

// --- Sub-component for individual ads in the grid ---
const SidebarAdBox = ({ slot }) => {
    useEffect(() => {
        try {
            // This replaces the <script> (adsbygoogle...).push({}) </script> part of your snippet
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
                    data-ad-client="ca-pub-8507213923022182" // 👈 Your Client ID applied here
                    data-ad-slot={slot}
                    data-ad-format="auto"
                    data-full-width-responsive="true"
                ></ins>
            </div>
        </Col>
    );
};

const BlogListPage = () => {
    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalPages, setTotalPages] = useState(1);
    const [searchParams, setSearchParams] = useSearchParams();

    const currentPage = parseInt(searchParams.get('page')) || 1;
    const perPage = 9;

    const truncateContent = (html, wordCount) => {
        if (!html) return "";
        const plainText = html.replace(/<[^>]+>/g, "");
        const words = plainText.split(/\s+/);
        return words.length <= wordCount ? plainText : words.slice(0, wordCount).join(" ") + "...";
    };

    const fetchPosts = useCallback(async (page) => {
        setIsLoading(true);
        setError(null);
        try {
            const searchQuery = searchParams.get('q') || '';
            const categoryId = searchParams.get('category_id') || '';

            const params = {
                page,
                per_page: perPage,
                ...(searchQuery && { q: searchQuery }),
                ...(categoryId && { category_id: categoryId })
            };

            const response = await api.get('/posts/posts_by_category', { params });
            setPosts(response.data.posts || []);
            setTotalPages(response.data.pages || 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setError(err.response?.data?.message || "Could not load posts.");
        } finally {
            setIsLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchPosts(currentPage);
    }, [currentPage, fetchPosts]);

    const handlePageChange = (pageNumber) => {
        setSearchParams(prev => {
            prev.set('page', pageNumber);
            return prev;
        });
    };

    const renderPaginationItems = () => {
        const items = [];
        const maxVisible = 2; 
        items.push(<Pagination.Item key={1} active={1 === currentPage} onClick={() => handlePageChange(1)}>1</Pagination.Item>);
        if (currentPage > maxVisible + 2) items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
        const start = Math.max(2, currentPage - maxVisible);
        const end = Math.min(totalPages - 1, currentPage + maxVisible);
        for (let i = start; i <= end; i++) {
            items.push(<Pagination.Item key={i} active={i === currentPage} onClick={() => handlePageChange(i)}>{i}</Pagination.Item>);
        }
        if (currentPage < totalPages - (maxVisible + 1)) items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
        if (totalPages > 1) items.push(<Pagination.Item key={totalPages} active={totalPages === currentPage} onClick={() => handlePageChange(totalPages)}>{totalPages}</Pagination.Item>);
        return items;
    };

    if (isLoading) {
        return (
            <Container className="d-flex flex-column justify-content-center align-items-center blog-list-container" style={{ height: '70vh' }}>
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted fw-bold">Loading amazing stories...</p>
            </Container>
        );
    }

    const headingText = searchParams.get('category_id') ? "Category Results" : "Recommended for You";

    return (
        <Container className="mt-4 pb-5 blog-list-container">
            <div className="d-flex justify-content-between align-items-end mb-4 border-bottom pb-3">
                <h2 className="fw-bold mb-0">{headingText}</h2>
                {posts.length > 0 && (
                    <span className="text-muted small">Showing Page {currentPage} of {totalPages}</span>
                )}
            </div>

            {posts.length === 0 ? (
                <div className="text-center py-5">
                    <h4 className="text-muted">No posts found.</h4>
                    <Link to="/blogs" className="btn btn-primary rounded-pill px-4 mt-3">View All Posts</Link>
                </div>
            ) : (
                <>
                    <Row xs={1} md={2} lg={3} className="g-4 mb-5">
                        {posts.map(post => (
                            <Col key={post.id}>
                                <Card className="h-100 border-0 shadow-sm hover-lift transition-all blog-card">
                                    <div className="position-relative overflow-hidden" style={{ height: '200px' }}>
                                        {post.images?.[0] ? (
                                            <Card.Img variant="top" src={post.images[0]} className="w-100 h-100" style={{ objectFit: 'cover' }} />
                                        ) : (
                                            <div className="bg-light d-flex align-items-center justify-content-center h-100 text-muted">No Preview</div>
                                        )}
                                        {post.categories?.[0] && (
                                            <Badge bg="primary" className="position-absolute top-0 start-0 m-3 shadow-sm">
                                                {post.categories[0].name}
                                            </Badge>
                                        )}
                                    </div>
                                    <Card.Body className="d-flex flex-column p-4">
                                        <Card.Title className="h5 fw-bold mb-2">
                                            <Link to={`/blogs/${post.id}`} className="text-decoration-none text-dark stretched-link">
                                                {post.title}
                                            </Link>
                                        </Card.Title>
                                        <Card.Text className="text-secondary small mb-3">
                                            {truncateContent(post.content, 18)}
                                        </Card.Text>
                                        <div className="mt-auto pt-3 border-top d-flex justify-content-between align-items-center text-muted small">
                                            <span><BsPerson className="me-1" /> {post.author}</span>
                                            <span><BsCalendar3 className="me-1" /> {new Date(post.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>

                    {/* 🔹 Final Row: 3 Boxes with shadows & ads */}
                    <Row className="g-4 mb-5">
                        {/* First Slot using your provided ID */}
                        <SidebarAdBox slot="5781580688" /> 
                        
                        {/* Replace these with your other slot IDs when ready */}
                        <SidebarAdBox slot="5941362781" />
                        <SidebarAdBox slot="7924334774" />
                    </Row>
                </>
            )}

            {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-5">
                    <Pagination className="shadow-sm">
                        <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                        {renderPaginationItems()}
                        <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                    </Pagination>
                </div>
            )}

            <style>{`
                .blog-list-container, .blog-list-container * {
                    font-family: var(--bs-body-font-family) !important;
                }
                .hover-lift { transition: transform 0.2s ease-in-out; }
                .hover-lift:hover { transform: translateY(-5px); }
                .pagination .page-link { color: #333; border: none; margin: 0 2px; border-radius: 8px; }
                .pagination .active .page-link { background-color: var(--bs-primary); border-radius: 8px; }
            `}</style>
        </Container>
    );
};

export default BlogListPage;
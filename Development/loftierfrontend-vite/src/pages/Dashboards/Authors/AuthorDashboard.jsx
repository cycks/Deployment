// src/pages/Dashboards/Authors/AuthorDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import { 
  Container, Table, Button, Form, Row, Col, 
  Badge, Spinner, Pagination, Card, Offcanvas 
} from "react-bootstrap";
import { 
  BsStarFill, BsEyeFill, BsPencilSquare,
  BsXCircle, BsArrowDownUp, 
  BsBook, BsBoxArrowUpRight, BsCalendar3,
  BsPlusLg, BsHouseDoor 
} from "react-icons/bs";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../libs/api";

const AuthorsDashboard = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  
  // Side Drawer State
  const [selectedPost, setSelectedPost] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  // Filter & Pagination State - Matching the logic of the Commentator Dashboard
  const [filters, setFilters] = useState({
    sortBy: "created_at",
    order: "desc",
    category: "", 
    status: "all",
    search: ""
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;

  // Optimized Fetcher - Dependency on [filters] ensures it stays updated
  const fetchAuthorPosts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get("/posts/author/posts", {
        params: {
          page: page,
          per_page: perPage,
          sort_by: filters.sortBy,
          order: filters.order,
          category: filters.category,
          status: filters.status,
          search: filters.search
        }
      });
      // Safety check for data structure
      setPosts(res.data.results || []);
      setTotalPages(res.data.pages || 1);
      setCurrentPage(res.data.current_page || 1);
      setTotalResults(res.data.total || 0);
    } catch (err) {
      console.error("Author dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial fetch and fetch on filter change
  useEffect(() => {
    fetchAuthorPosts(1);
  }, [fetchAuthorPosts]);

  const handleOpenPreview = async (post, e) => {
    if (e.target.closest('.action-btn')) return;
    
    setFetchingDetail(true);
    setShowDrawer(true);
    try {
      const res = await api.get(`/posts/${post.id}`);
      setSelectedPost(res.data);
    } catch (err) {
      console.error("Preview load error", err);
    } finally {
      setFetchingDetail(false);
    }
  };

  const handleSort = (column) => {
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      order: prev.sortBy === column && prev.order === "desc" ? "asc" : "desc"
    }));
  };

  const clearFilters = () => {
    setFilters({ sortBy: "created_at", order: "desc", category: "", status: "all", search: "" });
  };

  const startResult = (currentPage - 1) * perPage + 1;
  const endResult = Math.min(currentPage * perPage, totalResults);

  return (
    <Container fluid className="p-4 bg-light min-vh-100 mt-5">
      
      {/* NAVIGATION & HEADER */}
      <header className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-2" style={{ fontSize: '0.8rem' }}>
              <li className="breadcrumb-item"><Link to="/" className="text-decoration-none text-muted">Home</Link></li>
              <li className="breadcrumb-item active" aria-current="page">Author Dashboard</li>
            </ol>
          </nav>
          <h2 className="fw-bold mb-0">Author Dashboard</h2>
          <p className="text-muted small mb-0">Manage your articles, drafts, and track performance.</p>
        </div>

        <div className="d-flex gap-2">
          <Button as={Link} to="/write-blog" variant="primary" className="rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center">
            <BsPlusLg className="me-2" /> New Article
          </Button>
          <Button as={Link} to="/" variant="outline-dark" className="rounded-pill px-3 shadow-sm">
            <BsHouseDoor />
          </Button>
        </div>
      </header>

      {/* FILTER TOOLBAR - Logic synced with CommentatorDashboard */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 p-3 bg-white">
        <Row className="g-2 align-items-end">
          <Col lg={3} md={6}>
            <Form.Label className="small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>Search My Content</Form.Label>
            <Form.Control size="sm" placeholder="Title keywords..." value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} className="rounded-2 border-light-subtle" />
          </Col>
          <Col lg={2} md={6}>
            <Form.Label className="small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>Category</Form.Label>
            <Form.Control size="sm" placeholder="Topic..." value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})} className="rounded-2 border-light-subtle" />
          </Col>
          <Col lg={2} md={6}>
            <Form.Label className="small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>Status</Form.Label>
            <Form.Select size="sm" value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="rounded-2 border-light-subtle">
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
            </Form.Select>
          </Col>
          <Col lg={3} md={6}>
            <Form.Label className="small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>Sort By</Form.Label>
            <Form.Select size="sm" value={filters.sortBy} onChange={(e) => setFilters({...filters, sortBy: e.target.value})} className="rounded-2 border-light-subtle">
              <option value="created_at">Date Created</option>
              <option value="rating">Average Rating</option>
              <option value="title">Alphabetical</option>
            </Form.Select>
          </Col>
          <Col lg={2} md={12} className="d-flex gap-1">
            {/* The manual click triggers the effect via the dependency on 'filters' */}
            <Button variant="primary" size="sm" className="flex-grow-1 rounded-2 fw-bold shadow-sm" onClick={() => fetchAuthorPosts(1)}>Apply</Button>
            <Button variant="outline-secondary" size="sm" className="rounded-2 px-2" onClick={clearFilters}><BsXCircle size={14}/></Button>
          </Col>
        </Row>
      </Card>

      {/* RESULTS COUNTER */}
      {!loading && totalResults > 0 && (
        <div className="mb-3 ps-2 text-muted small fw-medium">
          Showing <span className="text-dark">{startResult}-{endResult}</span> of <span className="text-dark">{totalResults}</span> articles
        </div>
      )}

      {/* DATA TABLE */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        <Table hover responsive className="mb-0 align-middle">
          <thead className="bg-light border-bottom">
            <tr className="text-muted small text-uppercase fw-bold">
              <th className="ps-4 py-3 cursor-pointer" onClick={() => handleSort('title')}>Article Title <BsArrowDownUp size={10} className="ms-1"/></th>
              <th className="cursor-pointer" onClick={() => handleSort('created_at')}>Created <BsArrowDownUp size={10} className="ms-1"/></th>
              <th className="text-center cursor-pointer" onClick={() => handleSort('rating')}>Rating <BsArrowDownUp size={10} className="ms-1"/></th>
              <th>Status</th>
              <th>Categories</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
            ) : posts.length > 0 ? (
              posts.map(post => (
                <tr key={post.id} className="cursor-pointer" onClick={(e) => handleOpenPreview(post, e)}>
                  <td className="ps-4">
                    <div className="fw-bold text-dark">{post.title}</div>
                    <span className="extra-small text-muted d-flex align-items-center mt-1"><BsBook size={10} className="me-1"/> Click to preview</span>
                  </td>
                  <td className="small text-muted">{new Date(post.created_at).toLocaleDateString()}</td>
                  <td className="text-center">
                    <Badge bg="warning-subtle" text="warning" className="rounded-pill border border-warning px-3 py-1">
                      <BsStarFill className="me-1 mb-1" size={12}/> {post.average_rating ? post.average_rating.toFixed(1) : "0.0"}
                    </Badge>
                  </td>
                  <td>
                    {post.is_published ? (
                      <Badge bg="success-subtle" text="success" className="px-2 py-1 fw-medium">Published</Badge>
                    ) : (
                      <Badge bg="secondary-subtle" text="secondary" className="px-2 py-1 fw-medium">Draft</Badge>
                    )}
                  </td>
                  <td>
                    {post.categories?.map(c => (
                      <Badge key={c.id} bg="light" text="dark" className="border me-1 fw-normal">{c.name}</Badge>
                    ))}
                  </td>
                  <td className="text-center">
                    <div className="d-flex justify-content-center gap-2">
                      <Button variant="outline-primary" size="sm" className="action-btn p-1 border-0" onClick={() => navigate(`/blogs/edit/${post.id}`)}>
                        <BsPencilSquare size={18} />
                      </Button>
                      <Button variant="outline-secondary" size="sm" className="action-btn p-1 border-0" onClick={() => navigate(`/blogs/${post.id}`)}>
                        <BsEyeFill size={18} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" className="text-center py-5 text-muted">You haven't created any articles yet.</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <Pagination className="shadow-sm">
            <Pagination.Prev disabled={currentPage === 1} onClick={() => fetchAuthorPosts(currentPage - 1)} />
            {[...Array(totalPages)].map((_, i) => (
              <Pagination.Item key={i+1} active={i+1 === currentPage} onClick={() => fetchAuthorPosts(i+1)}>
                {i+1}
              </Pagination.Item>
            ))}
            <Pagination.Next disabled={currentPage === totalPages} onClick={() => fetchAuthorPosts(currentPage + 1)} />
          </Pagination>
        </div>
      )}

      {/* PREVIEW DRAWER */}
      <Offcanvas show={showDrawer} onHide={() => setShowDrawer(false)} placement="end" style={{ width: '450px' }}>
        <Offcanvas.Header closeButton className="bg-light border-bottom">
          <Offcanvas.Title className="fw-bold">Article Preview</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-4 d-flex flex-column">
          {fetchingDetail ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : selectedPost && (
            <>
              <div className="animate-fade-in flex-grow-1">
                <h3 className="fw-bold mb-3">{selectedPost.title}</h3>
                <div className="d-flex gap-3 mb-4 text-muted small border-bottom pb-2">
                  <span><BsCalendar3 className="me-1 mb-1" /> {new Date(selectedPost.created_at).toLocaleDateString()}</span>
                  <span>
                    {selectedPost.is_published ? 
                      <Badge bg="success">Live</Badge> : 
                      <Badge bg="secondary">Draft</Badge>
                    }
                  </span>
                </div>
                <div className="mb-5 lh-lg text-secondary" dangerouslySetInnerHTML={{ __html: selectedPost.content }} style={{ fontSize: '0.92rem' }} />
              </div>
              <div className="d-grid gap-2 mt-auto pt-3 border-top bg-white">
                <Button as={Link} to={`/blogs/edit/${selectedPost.id}`} variant="outline-primary" className="rounded-pill py-2 fw-bold">
                  <BsPencilSquare className="me-2" /> Edit Article
                </Button>
                <Button as={Link} to={`/blogs/${selectedPost.id}`} variant="primary" className="rounded-pill py-2 shadow-sm fw-bold">
                  <BsBoxArrowUpRight className="me-2" /> View Public Page
                </Button>
              </div>
            </>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      <style>{`
        .extra-small { font-size: 0.75rem; }
        .cursor-pointer { cursor: pointer; }
        .animate-fade-in { animation: fadeIn 0.3s ease-in; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </Container>
  );
};

export default AuthorsDashboard;
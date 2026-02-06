// src/pages/Dashboards/Commentors/CommentatorDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import { 
  Container, Table, Button, Form, Row, Col, 
  Badge, Spinner, Pagination, Card, Offcanvas 
} from "react-bootstrap";
import { 
  BsStarFill, BsPerson, BsEyeFill, BsEyeSlash, 
  BsFilterLeft, BsXCircle, BsArrowDownUp, 
  BsBook, BsBoxArrowUpRight, BsCalendar3,
  BsArrowLeft, BsHouseDoor 
} from "react-icons/bs";
import { Link } from "react-router-dom";
import api from "../../../libs/api";

const CommentatorDashboard = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  
  // Side Drawer State
  const [selectedPost, setSelectedPost] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  // Filter & Pagination State
  const [filters, setFilters] = useState({
    sortBy: "rating",
    order: "desc",
    category: "", 
    watch_status: "all", 
    author: "",
    search: ""
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;

  // Optimized Fetcher using Axios
  const fetchDashboardPosts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get("/posts/user_dashboard", {
        params: {
          page: page,
          per_page: perPage,
          sort_by: filters.sortBy,
          order: filters.order,
          category: filters.category,
          watch_status: filters.watch_status,
          author: filters.author,
          search: filters.search
        }
      });
      setPosts(res.data.results);
      setTotalPages(res.data.pages);
      setCurrentPage(res.data.current_page);
      setTotalResults(res.data.total);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDashboardPosts(1);
  }, [fetchDashboardPosts]);

  // Toggle Watch Logic
  const handleToggleWatch = async (e, post) => {
    e.stopPropagation(); 
    const isCurrentlyWatched = post.isWatched;
    const endpoint = `/watched/posts/${post.id}/${isCurrentlyWatched ? 'unwatch' : 'watch'}`;
    const method = isCurrentlyWatched ? 'delete' : 'post';

    try {
      await api[method](endpoint);
      setPosts(prev => prev.map(p => 
        p.id === post.id ? { ...p, isWatched: !isCurrentlyWatched } : p
      ));
    } catch (err) {
      console.error("Watch toggle failed", err);
    }
  };

  const handleOpenPreview = async (postId) => {
    setFetchingDetail(true);
    setShowDrawer(true);
    try {
      const res = await api.get(`/posts/${postId}`);
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
    setFilters({ sortBy: "rating", order: "desc", category: "", watch_status: "all", author: "", search: "" });
  };

  const startResult = (currentPage - 1) * perPage + 1;
  const endResult = Math.min(currentPage * perPage, totalResults);

  return (
    <Container fluid className="p-4 bg-light min-vh-100">
      
      {/* NAVIGATION & HEADER */}
      <header className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-2" style={{ fontSize: '0.8rem' }}>
              <li className="breadcrumb-item"><Link to="/" className="text-decoration-none text-muted">Home</Link></li>
              <li className="breadcrumb-item active" aria-current="page">Dashboard</li>
            </ol>
          </nav>
          <h2 className="fw-bold mb-0">Commentator Dashboard</h2>
          <p className="text-muted small mb-0">Discover content and track your reading journey.</p>
        </div>

        <div className="d-flex gap-2">
          <Button as={Link} to="/blogs" variant="outline-primary" className="rounded-pill px-3 fw-bold shadow-sm d-flex align-items-center">
            <BsArrowLeft className="me-2" /> Back to Feed
          </Button>
          <Button as={Link} to="/" variant="primary" className="rounded-pill px-3 shadow-sm" title="Home">
            <BsHouseDoor />
          </Button>
        </div>
      </header>

      {/* FILTER TOOLBAR */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 p-3 bg-white">
        <Row className="g-2 align-items-end">
          <Col lg={2} md={4}>
            <Form.Label className="small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>Search Title</Form.Label>
            <Form.Control size="sm" placeholder="Keywords..." value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})} className="rounded-2 border-light-subtle" />
          </Col>
          <Col lg={2} md={4}>
            <Form.Label className="small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>Author</Form.Label>
            <Form.Control size="sm" placeholder="Name..." value={filters.author} onChange={(e) => setFilters({...filters, author: e.target.value})} className="rounded-2 border-light-subtle" />
          </Col>
          <Col lg={2} md={4}>
            <Form.Label className="small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>Category</Form.Label>
            <Form.Control size="sm" placeholder="Topic..." value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})} className="rounded-2 border-light-subtle" />
          </Col>
          <Col lg={2} md={6}>
            <Form.Label className="small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>Watch Status</Form.Label>
            <Form.Select size="sm" value={filters.watch_status} onChange={(e) => setFilters({...filters, watch_status: e.target.value})} className="rounded-2 border-light-subtle">
              <option value="all">All Posts</option>
              <option value="watched">Watched</option>
              <option value="unwatched">Unwatched</option>
            </Form.Select>
          </Col>
          <Col lg={2} md={6}>
            <Form.Label className="small fw-bold text-muted text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>Sort By</Form.Label>
            <Form.Select size="sm" value={filters.sortBy} onChange={(e) => setFilters({...filters, sortBy: e.target.value})} className="rounded-2 border-light-subtle">
              <option value="rating">Top Rated</option>
              <option value="created_at">Date</option>
              <option value="title">Alphabetical</option>
            </Form.Select>
          </Col>
          <Col lg={2} md={12} className="d-flex gap-1">
            <Button variant="primary" size="sm" className="flex-grow-1 rounded-2 fw-bold shadow-sm" onClick={() => fetchDashboardPosts(1)}>Apply</Button>
            <Button variant="outline-secondary" size="sm" className="rounded-2 px-2" onClick={clearFilters}><BsXCircle size={14}/></Button>
          </Col>
        </Row>
      </Card>

      {/* RESULTS COUNTER */}
      {!loading && totalResults > 0 && (
        <div className="mb-3 ps-2 text-muted small fw-medium">
          Showing <span className="text-dark">{startResult}-{endResult}</span> of <span className="text-dark">{totalResults}</span> results
        </div>
      )}

      {/* DATA TABLE */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        <Table hover responsive className="mb-0 align-middle">
          <thead className="bg-light border-bottom">
            <tr className="text-muted small text-uppercase fw-bold">
              <th className="ps-4 py-3 cursor-pointer" onClick={() => handleSort('title')}>Title <BsArrowDownUp size={10} className="ms-1"/></th>
              <th>Author</th>
              <th className="cursor-pointer" onClick={() => handleSort('created_at')}>Date <BsArrowDownUp size={10} className="ms-1"/></th>
              <th className="text-center cursor-pointer" onClick={() => handleSort('rating')}>Rating <BsArrowDownUp size={10} className="ms-1"/></th>
              <th>Category</th>
              <th className="text-center">Watched</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-5"><Spinner animation="border" variant="primary" /></td></tr>
            ) : posts.length > 0 ? (
              posts.map(post => (
                <tr key={post.id} className="cursor-pointer" onClick={() => handleOpenPreview(post.id)}>
                  <td className="ps-4">
                    <div className="fw-bold text-dark">{post.title}</div>
                    <span className="extra-small text-muted d-flex align-items-center mt-1"><BsBook size={10} className="me-1"/> Click for summary</span>
                  </td>
                  <td><BsPerson className="me-1 text-muted"/> {post.author.username}</td>
                  <td className="small text-muted">{new Date(post.created_at).toLocaleDateString()}</td>
                  <td className="text-center">
                    <Badge bg="warning-subtle" text="warning" className="rounded-pill border border-warning px-3 py-2">
                      <BsStarFill className="me-1 mb-1" size={12}/> {post.average_rating || "0.0"}
                    </Badge>
                  </td>
                  <td>
                    {post.categories.map(c => (
                      <Badge key={c.id} bg="light" text="dark" className="border me-1 fw-normal">{c.name}</Badge>
                    ))}
                  </td>
                  <td className="text-center">
                    <Button variant="link" className="p-0 text-decoration-none shadow-none" onClick={(e) => handleToggleWatch(e, post)}>
                      {post.isWatched ? <BsEyeFill className="text-primary fs-5" /> : <BsEyeSlash className="text-muted opacity-25 fs-5" />}
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" className="text-center py-5 text-muted">No posts found for the current criteria.</td></tr>
            )}
          </tbody>
        </Table>
      </Card>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <Pagination className="shadow-sm">
            <Pagination.Prev disabled={currentPage === 1} onClick={() => fetchDashboardPosts(currentPage - 1)} />
            {[...Array(totalPages)].map((_, i) => (
              <Pagination.Item key={i+1} active={i+1 === currentPage} onClick={() => fetchDashboardPosts(i+1)}>
                {i+1}
              </Pagination.Item>
            ))}
            <Pagination.Next disabled={currentPage === totalPages} onClick={() => fetchDashboardPosts(currentPage + 1)} />
          </Pagination>
        </div>
      )}

      {/* PREVIEW DRAWER */}
      <Offcanvas show={showDrawer} onHide={() => setShowDrawer(false)} placement="end" style={{ width: '450px' }}>
        <Offcanvas.Header closeButton className="bg-light border-bottom">
          <Offcanvas.Title className="fw-bold">Article Preview</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-4">
          {fetchingDetail ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : selectedPost && (
            <div className="animate-fade-in">
              <h3 className="fw-bold mb-3">{selectedPost.title}</h3>
              <div className="d-flex gap-3 mb-4 text-muted small border-bottom pb-2">
                <span><BsPerson /> {selectedPost.author}</span>
                <span><BsCalendar3 /> {new Date(selectedPost.created_at).toLocaleDateString()}</span>
              </div>
              <div className="mb-5 lh-lg text-secondary" dangerouslySetInnerHTML={{ __html: selectedPost.content }} style={{ fontSize: '0.92rem' }} />
              <div className="d-grid mt-auto pt-3 border-top sticky-bottom bg-white">
                <Button as={Link} to={`/blogs/${selectedPost.id}`} variant="primary" className="rounded-pill py-2 shadow-sm fw-bold">
                  <BsBoxArrowUpRight className="me-2" /> Open Full Post
                </Button>
              </div>
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </Container>
  );
};

export default CommentatorDashboard;
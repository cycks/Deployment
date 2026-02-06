// src/pages/Dashboards/Admin/PostManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Card, Table, Button, Badge, Spinner, 
  Form, Nav, InputGroup, Modal, Pagination, Row, Col, Tooltip, OverlayTrigger
} from "react-bootstrap";
import {
  BsSearch, BsFilePost, BsCheckCircle, 
  BsTrash, BsPencilSquare, BsChevronLeft, 
  BsChevronRight, BsEye, BsArrowRepeat, BsStarFill, BsPerson, BsPlusLg
} from "react-icons/bs";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../libs/api";

const PostManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [authorFilter, setAuthorFilter] = useState("");
  const navigate = useNavigate();

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showConfirm, setShowConfirm] = useState(false);
  const [modalConfig, setModalConfig] = useState({ post: null, action: "", variant: "primary" });

  // -----------------------------
  // Fetch Posts
  // -----------------------------
  const fetchPosts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get("/posts/admin_list", {
        params: {
          page: page,
          per_page: 10,
          search: searchTerm,
          author: authorFilter,
          status: activeTab === "all" ? "" : activeTab 
        },
      });

      setPosts(res.data.results || []);
      setTotalPages(res.data.pages || 1);
      setCurrentPage(res.data.current_page || page);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, authorFilter]);

  useEffect(() => {
    setCurrentPage(1);
    const timeout = setTimeout(() => fetchPosts(1), 400);
    return () => clearTimeout(timeout);
  }, [activeTab, searchTerm, authorFilter, fetchPosts]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchPosts(newPage);
  };

  const openConfirm = (post, action) => {
    setModalConfig({
      post,
      action,
      variant: action === "delete" ? "danger" : "success",
    });
    setShowConfirm(true);
  };

  const executeAction = async () => {
    const { post, action } = modalConfig;
    setShowConfirm(false);

    try {
      if (action === "delete") {
        await api.delete(`/posts/${post.id}`);
        fetchPosts(currentPage);
      }
    } catch (err) {
      alert(err.response?.data?.msg || `Failed to ${action} post`);
    }
  };

  const getStatusBadge = (post) => {
    return post.is_published ? (
      <Badge bg="success-subtle" text="success" className="border px-3 rounded-pill shadow-none">Published</Badge>
    ) : (
      <Badge bg="secondary-subtle" text="secondary" className="border px-3 rounded-pill shadow-none">Draft</Badge>
    );
  };

  return (
    <div className="p-2 p-lg-4 animate-fade-in">
      {/* Header */}
      <div className="mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h2 className="fw-bold mb-1">Content Management</h2>
          <p className="text-muted small mb-0">Manage movie blogs, moderate content, and view analytics.</p>
        </div>
        <div className="d-flex gap-2">
          <Button 
            variant="primary" 
            className="rounded-pill px-4 d-flex align-items-center shadow-sm"
            onClick={() => navigate("/write-blog")}
          >
            <BsPlusLg className="me-2" /> Write Blog
          </Button>
          <Button variant="light" className="rounded-circle shadow-sm border" onClick={() => fetchPosts(currentPage)}>
            <BsArrowRepeat />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Header className="bg-white border-0 pt-3 px-3">
          <Nav variant="pills" activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="gap-2">
            <Nav.Item><Nav.Link eventKey="all" className="rounded-pill">All</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="published" className="rounded-pill">Published</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="draft" className="rounded-pill">Drafts</Nav.Link></Nav.Item>
          </Nav>
        </Card.Header>
        <Card.Body className="px-3 pb-3">
          <Row className="g-3">
            <Col md={6}>
              <InputGroup className="shadow-sm rounded-pill overflow-hidden border">
                <InputGroup.Text className="bg-white border-0 ps-3"><BsSearch className="text-muted"/></InputGroup.Text>
                <Form.Control
                  className="border-0 shadow-none"
                  placeholder="Search titles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={6}>
              <InputGroup className="shadow-sm rounded-pill overflow-hidden border">
                <InputGroup.Text className="bg-white border-0 ps-3"><BsPerson className="text-muted"/></InputGroup.Text>
                <Form.Control
                  className="border-0 shadow-none"
                  placeholder="Filter by author..."
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                />
              </InputGroup>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Content Table */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-5">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : (
            <>
              <Table responsive hover className="mb-0 align-middle">
                <thead className="bg-light">
                  <tr>
                    <th className="ps-4 py-3 small fw-bold text-muted text-uppercase">Title & Genre</th>
                    <th className="small fw-bold text-muted text-uppercase">Author</th>
                    <th className="small fw-bold text-muted text-uppercase text-center">Rating</th>
                    <th className="small fw-bold text-muted text-uppercase text-center">Status</th>
                    <th className="text-end pe-4 small fw-bold text-muted text-uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.length > 0 ? posts.map((post) => (
                    <tr key={post.id}>
                      <td className="ps-4 py-3">
                        <div className="fw-bold text-dark">{post.title}</div>
                        <div className="text-muted x-small">
                           {post.categories?.map(c => c.name).join(", ") || 'General'}
                        </div>
                      </td>
                      <td>
                        <span className="fw-medium text-secondary">{post.author?.username}</span>
                      </td>
                      <td className="text-center">
                        {post.average_rating ? (
                          <div className="text-warning fw-bold small">
                            <BsStarFill className="me-1" /> {post.average_rating}
                          </div>
                        ) : (
                          <span className="text-muted x-small">No rating</span>
                        )}
                      </td>
                      <td className="text-center">{getStatusBadge(post)}</td>
                      <td className="text-end pe-4">
                        <div className="d-flex justify-content-end gap-2">
                          <OverlayTrigger overlay={<Tooltip>Preview</Tooltip>}>
                            <Button as={Link} to={`/blogs/${post.id}`} variant="light" size="sm" className="rounded-circle border">
                              <BsEye size={14}/>
                            </Button>
                          </OverlayTrigger>

                          {/* 🔹 EDIT BUTTON LINKING TO YOUR ROUTE */}
                          <OverlayTrigger overlay={<Tooltip>Edit Post</Tooltip>}>
                            <Button 
                              as={Link} 
                              to={`/blogs/edit/${post.id}`} 
                              variant="light" 
                              size="sm" 
                              className="rounded-circle border"
                            >
                              <BsPencilSquare size={14} className="text-primary"/>
                            </Button>
                          </OverlayTrigger>

                          <OverlayTrigger overlay={<Tooltip>Delete</Tooltip>}>
                            <Button variant="light" size="sm" className="rounded-circle border" onClick={() => openConfirm(post, "delete")}>
                              <BsTrash size={14} className="text-danger"/>
                            </Button>
                          </OverlayTrigger>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="text-center py-5 text-muted">No posts found.</td></tr>
                  )}
                </tbody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-center py-4 border-top bg-light bg-opacity-10">
                  <Pagination className="mb-0 shadow-sm rounded-pill overflow-hidden">
                    <Pagination.Prev disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} />
                    {[...Array(totalPages)].map((_, idx) => (
                      <Pagination.Item key={idx + 1} active={idx + 1 === currentPage} onClick={() => handlePageChange(idx + 1)}>
                        {idx + 1}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Delete Confirmation */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered contentClassName="border-0 shadow-lg rounded-4">
        <Modal.Header closeButton className="border-0 pb-0 px-4 pt-4">
          <Modal.Title className="fw-bold">Delete Post</Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-3">
          Are you sure you want to delete <strong className="text-danger">"{modalConfig.post?.title}"</strong>? This will remove all data and images associated with it.
        </Modal.Body>
        <Modal.Footer className="border-0 px-4 pb-4">
          <Button variant="light" className="rounded-pill px-4" onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button variant="danger" className="rounded-pill px-4" onClick={executeAction}>Delete Permanently</Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        .x-small { font-size: 0.75rem; }
        .bg-success-subtle { background-color: #d1e7dd !important; }
        .bg-secondary-subtle { background-color: #e9ecef !important; }
        .animate-fade-in { animation: fadeIn 0.5s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default PostManagement;
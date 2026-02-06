// src/pages/Dashboards/CategoryManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Card, Table, Button, Spinner, Form,
  InputGroup, Row, Col, Badge, Pagination
} from "react-bootstrap";
import {
  BsPlusLg, BsSearch, BsPencil, BsTrash,
  BsXCircle, BsImage
} from "react-icons/bs";
import api from "../../../libs/api";

const CategoryManagement = () => {
  // --- Data State ---
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  // --- Form State ---
  const [formData, setFormData] = useState({ name: "", image: null });
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 1. Fetch Categories (Backend Paginated) ---
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/categories/with_post_count", {
        params: { 
          page: currentPage, 
          per_page: itemsPerPage,
          search: searchTerm // Assuming backend supports search filtering
        }
      });
      // The backend now returns an object { items, total, pages, ... }
      setCategories(res.data.items || []);
      setTotalPages(res.data.pages || 1);
      setTotalItems(res.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Reset to page 1 when user searches
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // --- 2. Action Handlers ---
  const handleFileChange = (e) => {
    setFormData({ ...formData, image: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    const data = new FormData();
    data.append("name", formData.name);
    if (formData.image) data.append("image", formData.image);

    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/categories/update_category/${editingId}`, data);
      } else {
        await api.post("/categories/create_category", data);
      }
      setFormData({ name: "", image: null });
      setEditingId(null);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.msg || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, image: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", image: null });
  };

  const handleDelete = async (cat) => {
    if (window.confirm(`Are you sure you want to delete "${cat.name}"? This will remove its cover image and topic association.`)) {
      try {
        await api.delete(`/categories/delete_category/${cat.id}`);
        fetchCategories(); 
      } catch (err) {
        alert(err.response?.data?.msg || "Delete failed");
      }
    }
  };

  // --- 3. UI Helpers ---
  const renderPagination = () => {
    let items = [];
    for (let number = 1; number <= totalPages; number++) {
      items.push(
        <Pagination.Item 
          key={number} 
          active={number === currentPage}
          onClick={() => setCurrentPage(number)}
        >
          {number}
        </Pagination.Item>
      );
    }
    return totalPages > 1 ? (
      <div className="d-flex justify-content-between align-items-center p-3 border-top bg-light">
        <span className="small text-muted">Total Results: {totalItems}</span>
        <Pagination size="sm" className="mb-0">{items}</Pagination>
      </div>
    ) : null;
  };

  return (
    <div className="p-2 p-lg-4 animate-fade-in">
      <div className="mb-4">
        <h2 className="fw-bold mb-1 text-dark">Category Management</h2>
        <p className="text-muted small">Manage topics and category cover images.</p>
      </div>

      <Row className="g-4">
        {/* --- FORM COLUMN --- */}
        <Col lg={4}>
          <Card className="border-0 shadow-sm rounded-4 p-4 sticky-top" style={{ top: '20px' }}>
            <h5 className="fw-bold mb-3">
              {editingId ? <><BsPencil className="text-warning me-2"/>Edit Category</> : <><BsPlusLg className="text-primary me-2"/>New Category</>}
            </h5>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-muted">NAME</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Category name..."
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold text-muted">COVER IMAGE</Form.Label>
                <Form.Control
                  key={editingId || "new"} // Resets input when switching modes
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  required={!editingId}
                />
                {editingId && <Form.Text className="text-info d-block mt-1">Leave blank to keep current image.</Form.Text>}
              </Form.Group>

              <div className="d-grid gap-2">
                <Button variant="primary" type="submit" disabled={isSubmitting} className="rounded-pill fw-bold py-2 shadow-sm">
                  {isSubmitting ? <Spinner size="sm"/> : editingId ? "Update Category" : "Create Category"}
                </Button>
                {editingId && (
                  <Button variant="light" onClick={cancelEdit} className="rounded-pill">Cancel Edit</Button>
                )}
              </div>
            </Form>
          </Card>
        </Col>

        {/* --- TABLE COLUMN --- */}
        <Col lg={8}>
          <Card className="border-0 shadow-sm rounded-4 mb-3">
            <Card.Body className="p-2">
              <InputGroup className="border-0 bg-light rounded-pill px-2">
                <InputGroup.Text className="bg-transparent border-0 text-muted">
                  <BsSearch />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search existing categories..."
                  className="bg-transparent border-0 shadow-none py-2"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                {searchTerm && (
                  <Button variant="link" className="text-muted border-0 shadow-none" onClick={() => {setSearchTerm(""); setCurrentPage(1);}}>
                    <BsXCircle />
                  </Button>
                )}
              </InputGroup>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
              ) : (
                <>
                  <Table hover responsive className="mb-0 align-middle text-nowrap">
                    <thead className="bg-light">
                      <tr>
                        <th className="ps-4 py-3 small text-muted">CATEGORY</th>
                        <th className="small text-muted text-center">POSTS</th>
                        <th className="text-end pe-4 small text-muted">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <tr key={cat.id}>
                            <td className="ps-4 py-3">
                              <div className="d-flex align-items-center gap-3">
                                {cat.image_url ? (
                                  <img 
                                    src={cat.image_url} 
                                    alt="" 
                                    className="rounded-3 shadow-sm border"
                                    style={{ width: '45px', height: '45px', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div className="bg-secondary-subtle rounded-3 d-flex align-items-center justify-content-center border" style={{ width: '45px', height: '45px' }}>
                                    <BsImage className="text-muted" />
                                  </div>
                                )}
                                <div>
                                  <div className="fw-bold text-dark">{cat.name}</div>
                                  <div className="extra-small text-muted" style={{fontSize: '0.7rem'}}>ID: #{cat.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="text-center">
                              <Badge bg="primary-subtle" text="primary" className="rounded-pill px-3 fw-bold">
                                {cat.post_count}
                              </Badge>
                            </td>
                            <td className="text-end pe-4">
                              <Button 
                                variant="outline-primary" 
                                size="sm" 
                                className="rounded-circle me-2 border-0"
                                onClick={() => startEdit(cat)}
                              >
                                <BsPencil />
                              </Button>
                              <Button 
                                variant="outline-danger" 
                                size="sm" 
                                className="rounded-circle border-0"
                                onClick={() => handleDelete(cat)}
                              >
                                <BsTrash />
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="text-center py-5 text-muted">
                            No categories found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                  {renderPagination()}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CategoryManagement;
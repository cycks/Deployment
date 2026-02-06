import React, { useState, useEffect, useCallback } from "react";
import { 
  Row, Col, Card, Form, Button, Spinner, Image, Badge, Container 
} from "react-bootstrap";
import Select from "react-select";
import { 
  BsArrowLeft, BsImage, BsCloudUpload, BsExclamationTriangle, BsShieldLock 
} from "react-icons/bs";
import { useNavigate, useParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import api from "../libs/api";

// Assuming you have a way to get the current user. 
// If using context: const { user } = useAuth();
// For this example, we will simulate getting the role from localStorage.
const getCurrentUserRole = () => localStorage.getItem("user_role"); // e.g., 'admin', 'author'

const EditBlogPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const userRole = getCurrentUserRole();
  
  // --- UI & Feedback State ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // --- Data State ---
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    is_published: false,
    selectedCategories: [] 
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // --- Initialization ---
  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [postRes, catRes] = await Promise.all([
        api.get(`/posts/get_post/${id}`),
        api.get("/categories/list_categories") 
      ]);

      const post = postRes.data;
      const allCats = catRes.data.map(c => ({ value: c.id, label: c.name }));
      const selected = post.categories.map(c => ({ value: c.id, label: c.name }));

      setCategories(allCats);
      setFormData({
        title: post.title || "",
        content: post.content || "",
        is_published: post.is_published || false,
        selectedCategories: selected
      });
      
      setPreviewUrl(post.image_url);
      setIsDirty(false); 
    } catch (err) {
      console.error("Fetch error", err);
      setError("Failed to load post data. It may have been deleted.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (formData.title) {
      document.title = `Editing: ${formData.title}`;
    }
  }, [formData.title]);

  // --- Cleanup Blob URLs ---
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // --- Exit Prevention Logic ---
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ""; 
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // --- Handlers ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleTogglePublish = async () => {
    // Permission Check: Author restriction logic
    if (userRole === 'author') {
      toast.error(
        "Only Admins and Superadmins can publish or unpublish posts.",
        { id: 'auth-error', duration: 4000 }
      );
      return; // Stop execution, keeping user on the page
    }

    const action = formData.is_published ? "unpublish" : "publish";
    setSaving(true);

    const togglePromise = api.put(`/posts/${id}/${action}`);

    toast.promise(togglePromise, {
      loading: `${action === 'publish' ? 'Publishing' : 'Unpublishing'}...`,
      success: (res) => {
        setFormData(prev => ({ ...prev, is_published: res.data.is_published }));
        setSaving(false);
        return `Article status updated!`;
      },
      error: (err) => {
        setSaving(false);
        return err.response?.data?.msg || `Failed to ${action} post`;
      },
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 1 * 1024 * 1024; // 1MB
      if (file.size > maxSize) {
        setImageError("Image exceeds 1MB.");
        toast.error("File too large (Max 1MB)");
        return;
      }
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setImageError("");
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsDirty(true);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formData.title.trim()) return toast.error("Title is required");
    
    setSaving(true);
    const data = new FormData();
    data.append("title", formData.title);
    data.append("content", formData.content);
    formData.selectedCategories.forEach(c => data.append("categories", c.value));
    
    if (imageFile) {
        data.append("main_image", imageFile);
    }

    const savePromise = api.put(`/posts/edit_post/${id}`, data);

    toast.promise(savePromise, {
      loading: 'Saving changes...',
      success: () => {
        setIsDirty(false);
        setSaving(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return <b>Article updated successfully!</b>;
      },
      error: (err) => {
        setSaving(false);
        return err.response?.data?.msg || "Failed to save changes";
      }
    });
  };

  if (loading) return (
    <Container className="text-center py-5 edit-post-font">
      <Spinner animation="border" variant="primary" />
      <p className="mt-3 text-muted">Loading article editor...</p>
    </Container>
  );

  if (error) return (
    <Container className="py-5 text-center edit-post-font">
      <Card className="border-0 shadow-sm p-5">
        <h4 className="text-danger">{error}</h4>
        <Button variant="primary" className="mt-3 rounded-pill px-4" onClick={() => navigate(-1)}>Go Back</Button>
      </Card>
    </Container>
  );

  return (
    <div className="container py-4 edit-post-font">
      <Toaster position="top-right" reverseOrder={false} />
      
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <Button variant="light" className="rounded-circle border shadow-sm" onClick={() => navigate(-1)}>
            <BsArrowLeft />
          </Button>
          <div>
            <h2 className="fw-bold m-0">Edit Article</h2>
            <div className="d-flex align-items-center gap-2">
               <small className="text-muted">Ref: {id}</small>
               {isDirty && <Badge bg="light" text="dark" className="border text-warning"><BsExclamationTriangle className="me-1"/> Unsaved</Badge>}
            </div>
          </div>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => navigate(-1)}>Exit</Button>
          <Button variant="primary" className="rounded-pill px-4 shadow-sm" onClick={handleSubmit} disabled={saving}>
            {saving ? <Spinner size="sm" className="me-2" /> : <BsCloudUpload className="me-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <Form onSubmit={handleSubmit}>
        <Row className="g-4">
          <Col lg={8}>
            <Card className="border-0 shadow-sm rounded-4 p-4 mb-4">
              <Form.Group className="mb-4">
                <Form.Label className="fw-bold text-muted small text-uppercase">Title</Form.Label>
                <Form.Control 
                  size="lg" 
                  name="title" 
                  value={formData.title} 
                  onChange={handleInputChange} 
                  className="bg-light border-0 fw-bold custom-font-input"
                  placeholder="Enter title..."
                />
              </Form.Group>

              <Form.Group>
                <Form.Label className="fw-bold text-muted small text-uppercase">Body Content</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={18} 
                  name="content" 
                  value={formData.content} 
                  onChange={handleInputChange} 
                  className="bg-light border-0 custom-font-input"
                  placeholder="Start writing..."
                />
              </Form.Group>
            </Card>
          </Col>

          <Col lg={4}>
            <div className="sticky-top" style={{ top: "1.5rem", zIndex: 10 }}>
              {/* Visibility Settings - Restricted for Authors */}
              <Card className="border-0 shadow-sm rounded-4 p-4 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold m-0">Visibility</h6>
                  <Badge bg={formData.is_published ? "success" : "warning"} className="rounded-pill">
                    {formData.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
                
                <Form.Check 
                  type="switch" 
                  id="publish-switch"
                  label={formData.is_published ? "Unpublish" : "Publish"}
                  checked={formData.is_published}
                  onChange={handleTogglePublish}
                  disabled={saving} // Notice: Logic handles the error on change
                  className="fw-medium"
                />

                {userRole === 'author' && (
                  <div className="mt-3 p-2 bg-light rounded border d-flex align-items-start gap-2">
                    <BsShieldLock className="text-muted mt-1" />
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Publishing control is restricted to Admins. Your edits can still be saved as changes to the current state.
                    </small>
                  </div>
                )}
              </Card>

              <Card className="border-0 shadow-sm rounded-4 p-4 mb-4">
                <h6 className="fw-bold mb-3">Categories</h6>
                <Select
                  isMulti
                  options={categories}
                  value={formData.selectedCategories}
                  onChange={(selected) => {
                    setFormData(prev => ({ ...prev, selectedCategories: selected || [] }));
                    setIsDirty(true);
                  }}
                  styles={{ 
                    control: (b) => ({ ...b, borderRadius: '10px', border: 'none', backgroundColor: '#f8f9fa' }),
                  }}
                />
              </Card>

              <Card className="border-0 shadow-sm rounded-4 p-4">
                <h6 className="fw-bold mb-3"><BsImage className="me-2"/>Featured Image</h6>

                {previewUrl ? (
                  <div className="mb-3 text-center">
                    <Image src={previewUrl} fluid className="rounded shadow-sm border mb-2 w-100" style={{ maxHeight: '200px', objectFit: 'cover' }} />
                    <Button variant="link" size="sm" className="text-danger text-decoration-none fw-bold" 
                      onClick={() => { 
                        setPreviewUrl(null); 
                        setImageFile(null); 
                        setIsDirty(true);
                      }}>
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div className="bg-light rounded border-dashed p-4 text-center mb-3 text-muted small">
                    No featured image
                  </div>
                )}
                
                <Form.Group>
                  <Form.Label className="small fw-bold text-muted">Upload New</Form.Label>
                  <Form.Control 
                    type="file" 
                    size="sm" 
                    isInvalid={!!imageError} 
                    onChange={handleFileChange} 
                    accept="image/*"
                  />
                  <Form.Control.Feedback type="invalid">{imageError}</Form.Control.Feedback>
                </Form.Group>
              </Card>
            </div>
          </Col>
        </Row>
      </Form>

      <style>{`
        .edit-post-font, .edit-post-font * {
          font-family: var(--bs-body-font-family) !important;
        }
        .custom-font-input:focus {
          background-color: #fff !important;
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.08);
          border: 1px solid #dee2e6 !important;
        }
        .border-dashed { border: 2px dashed #dee2e6 !important; }
      `}</style>
    </div>
  );
};

export default EditBlogPost;
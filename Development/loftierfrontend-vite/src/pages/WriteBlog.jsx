// src/pages/WriteBlog.jsx
import React, { useState, useEffect } from "react";
import axios from "axios"; 
import Select from "react-select";
import { Modal, Button } from "react-bootstrap"; // Added Bootstrap components
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import javascript from "highlight.js/lib/languages/javascript";
import { useNavigate } from "react-router-dom";
import { 
    BsTypeBold, BsTypeItalic, BsTypeUnderline, 
    BsImage, BsArrowLeft, BsCheckCircleFill, BsXCircleFill, BsSearch, BsPlusCircle, BsExclamationTriangleFill
} from "react-icons/bs";
import "highlight.js/styles/github.css";

const lowlight = createLowlight();
lowlight.register("javascript", javascript);
const API_BASE_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
    const token = localStorage.getItem("jwt_token");
    return { Authorization: token ? `Bearer ${token}` : '' };
};

const WriteBlog = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem("jwt_token");

    // --- Core Blog State ---
    const [title, setTitle] = useState("");
    const [titleError, setTitleError] = useState("");
    const [mainImage, setMainImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [imageError, setImageError] = useState("");
    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [categoryError, setCategoryError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Rejection Manager State ---
    const [checkTitleInput, setCheckTitleInput] = useState("");
    const [rejectTitleInput, setRejectTitleInput] = useState("");
    const [rejectionLoading, setRejectionLoading] = useState(false);
    const [rejectionFeedback, setRejectionFeedback] = useState({ msg: "", type: "" });
    
    // --- Modal State ---
    const [showRejectModal, setShowRejectModal] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ codeBlock: false, link: false, underline: false }),
            Link.configure({ openOnClick: false }),
            Image,
            Underline,
            CodeBlockLowlight.configure({ lowlight }),
        ],
        content: "<h2>Tell your story...</h2>",
    });

    useEffect(() => {
        const fetchCategories = async () => {
            if (!token) return;
            try {
                const res = await axios.get(`${API_BASE_URL}/categories/list_categories`, {
                    headers: getAuthHeaders()
                });
                setCategories(res.data || []);
            } catch (error) { 
                console.error("Failed to load categories", error); 
            }
        };
        fetchCategories();
    }, [token]);

    // --- Rejection Logic ---

    const handleCheckExistence = async () => {
        if (!checkTitleInput.trim()) return;
        setRejectionLoading(true);
        setRejectionFeedback({ msg: "", type: "" });

        try {
            const res = await axios.post(`${API_BASE_URL}/posts/check_existence`, 
                { title: checkTitleInput },
                { headers: getAuthHeaders() }
            );

            if (res.data.exists) {
                setRejectionFeedback({ msg: "⚠️ This title is already rejected.", type: "danger" });
            } else {
                setRejectionFeedback({ msg: "✅ Not found in rejection list.", type: "success" });
            }
        } catch (err) {
            setRejectionFeedback({ msg: "Error checking database.", type: "danger" });
        } finally {
            setRejectionLoading(false);
        }
    };

    const handlePushRejection = async () => {
        setRejectionLoading(true);
        setRejectionFeedback({ msg: "", type: "" });

        try {
            await axios.post(`${API_BASE_URL}/posts/reject`, 
                { title: rejectTitleInput },
                { headers: getAuthHeaders() }
            );
            setRejectionFeedback({ msg: "Title successfully blacklisted!", type: "success" });
            setRejectTitleInput(""); 
            setShowRejectModal(false);
        } catch (err) {
            setRejectionFeedback({ msg: err.response?.data?.msg || "Failed to reject.", type: "danger" });
            setShowRejectModal(false);
        } finally {
            setRejectionLoading(false);
        }
    };

    const handleTitleChange = async (e) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        if (newTitle.trim().length === 0) return;
        try {
            const res = await axios.post(`${API_BASE_URL}/posts/check-title`, 
                { title: newTitle }, { headers: getAuthHeaders() }
            );
            setTitleError(res.data.exists ? "Title already taken." : "");
        } catch (error) { setTitleError("Validation failed."); }
    };

    const handleMainImageChange = (e) => {
        const file = e.target.files[0];
        if (file && file.size <= 1024 * 1024) {
            setMainImage(file);
            setImagePreview(URL.createObjectURL(file));
            setImageError("");
        } else {
            setImageError("Image must be under 1MB.");
        }
    };

    const handleSubmit = async (isPublished) => {
        if (!title.trim() || !mainImage || selectedCategories.length === 0) {
            alert("Please complete all required fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("content", editor.getHTML());
            formData.append("main_image", mainImage);
            formData.append("is_published", isPublished);
            selectedCategories.forEach(c => formData.append("categories", c.value));

            const res = await axios.post(`${API_BASE_URL}/posts/create_post`, formData, { 
                headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
            });
            if (res.status === 201 || res.status === 200) navigate(`/post/${res.data.post_id}`);
        } catch (error) {
            setRejectionFeedback({ msg: error.response?.data?.msg || "Submission failed", type: "danger" });
        } finally { setIsSubmitting(false); }
    };

    if (!editor) return null;

    return (
        <div className="bg-light min-vh-100 pb-5">
            {/* Modal for Rejection Confirmation */}
            <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fs-5 fw-bold text-danger">Confirm Rejection</Modal.Title>
                </Modal.Header>
                <Modal.Body className="py-0">
                    <div className="d-flex align-items-center gap-3 p-3 bg-light rounded-3 mb-3">
                        <BsExclamationTriangleFill size={30} className="text-warning" />
                        <div>
                            <p className="mb-0 small fw-bold">Are you sure you want to blacklist:</p>
                            <p className="mb-0 text-secondary italic">"{rejectTitleInput}"</p>
                        </div>
                    </div>
                    <p className="x-small text-muted">This action will prevent this title from being used in future requests.</p>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="link" className="text-dark text-decoration-none" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                    <Button variant="danger" className="rounded-pill px-4" onClick={handlePushRejection}>Reject Title</Button>
                </Modal.Footer>
            </Modal>

            <header className="bg-white border-bottom sticky-top py-2 px-4 shadow-sm z-3">
                <div className="container-fluid d-flex justify-content-between align-items-center">
                    <button onClick={() => navigate(-1)} className="btn btn-link text-dark p-0"><BsArrowLeft size={24} /></button>
                    <div className="d-flex gap-2">
                        <button className="btn btn-outline-secondary btn-sm rounded-pill px-4" onClick={() => handleSubmit(false)}>Draft</button>
                        <button className="btn btn-dark btn-sm rounded-pill px-4" onClick={() => handleSubmit(true)} disabled={isSubmitting}>Publish</button>
                    </div>
                </div>
            </header>

            <div className="container mt-4">
                <div className="row g-4">
                    <div className="col-lg-8">
                        <div className="bg-white rounded-4 shadow-sm p-4">
                            <textarea
                                className="form-control border-0 fs-1 fw-bold mb-2 shadow-none p-0"
                                placeholder="Post Title"
                                value={title}
                                onChange={handleTitleChange}
                                rows="1"
                                style={{ resize: 'none' }}
                            />
                            <div className="editor-toolbar mb-3 border-bottom pb-2 d-flex gap-2">
                                <button className="btn btn-sm btn-light" onClick={() => editor.chain().focus().toggleBold().run()}><BsTypeBold /></button>
                                <button className="btn btn-sm btn-light" onClick={() => editor.chain().focus().toggleItalic().run()}><BsTypeItalic /></button>
                            </div>
                            <div className="prose-editor"><EditorContent editor={editor} /></div>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm rounded-4 mb-3">
                            <div className="card-body">
                                <h6 className="fw-bold mb-3">Settings</h6>
                                <Select
                                    isMulti
                                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                                    value={selectedCategories}
                                    onChange={(val) => setSelectedCategories(val)}
                                    className="mb-3"
                                />
                                <label className="image-upload-placeholder d-flex flex-column align-items-center justify-content-center border border-dashed rounded-3 p-3 cursor-pointer">
                                    {imagePreview ? <img src={imagePreview} className="img-fluid rounded" alt="Preview" /> : <BsImage size={24} />}
                                    <input type="file" hidden onChange={handleMainImageChange} />
                                </label>
                            </div>
                        </div>

                        {/* REJECTION MANAGER */}
                        <div className="card border-0 shadow-sm rounded-4 mb-3">
                            <div className="card-body">
                                <h6 className="fw-bold mb-3">Rejection Manager</h6>
                                
                                <div className="mb-3">
                                    <label className="x-small fw-bold text-muted text-uppercase mb-1 d-block">Check Existence</label>
                                    <div className="input-group">
                                        <input type="text" className="form-control form-control-sm" placeholder="Check title..." value={checkTitleInput} onChange={(e) => setCheckTitleInput(e.target.value)} />
                                        <button className="btn btn-sm btn-outline-dark" onClick={handleCheckExistence}><BsSearch /></button>
                                    </div>
                                </div>

                                <div className="mb-2">
                                    <label className="x-small fw-bold text-danger text-uppercase mb-1 d-block">Add to Blacklist</label>
                                    <div className="input-group">
                                        <input type="text" className="form-control form-control-sm border-danger-subtle" placeholder="Reject title..." value={rejectTitleInput} onChange={(e) => setRejectTitleInput(e.target.value)} />
                                        <button className="btn btn-sm btn-danger" onClick={() => setShowRejectModal(true)} disabled={!rejectTitleInput.trim()}><BsPlusCircle /></button>
                                    </div>
                                </div>

                                {rejectionFeedback.msg && (
                                    <div className={`mt-3 p-2 rounded x-small d-flex align-items-center gap-2 alert-${rejectionFeedback.type === 'success' ? 'success' : 'danger'}`}>
                                        {rejectionFeedback.type === 'success' ? <BsCheckCircleFill /> : <BsXCircleFill />}
                                        <span className="fw-bold">{rejectionFeedback.msg}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .cursor-pointer { cursor: pointer; }
                .image-upload-placeholder { min-height: 120px; background: #f8f9fa; }
                .prose-editor .tiptap:focus { outline: none; }
                .prose-editor .tiptap { min-height: 300px; font-size: 1.1rem; }
                .x-small { font-size: 0.7rem; }
            `}</style>
        </div>
    );
};

export default WriteBlog;
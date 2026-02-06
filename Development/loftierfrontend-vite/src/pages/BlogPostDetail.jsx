// src/pages/BlogPostDetail.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Container, Spinner, Alert, Form, Button, Row, Col, Card } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { FaStar, FaRegStar, FaClock, FaUser, FaInfoCircle } from "react-icons/fa";
import api from "../libs/api";
import { useAuth } from "../contexts/AuthContext";

// --- 1. AdUnit Component for Google Adsense ---
const AdUnit = ({ slot }) => {
  useEffect(() => {
    try {
      // Pushes the ad to the specific <ins> tag when the component mounts
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, [slot]);

  return (
    <div className="py-2" style={{ overflow: 'hidden', minWidth: '250px' }}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-YOUR_PUBLISHER_ID" // 👈 MAKE SURE TO REPLACE WITH YOUR REAL PUB ID
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

const BlogPostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // --- State ---
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [userRating, setUserRating] = useState(null);
  const [commentPage, setCommentPage] = useState(1);
  const [alerts, setAlerts] = useState([]);
  const [commentAlerts, setCommentAlerts] = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const commentsPerPage = 5;
  const isLoggedIn = !!user;

  // --- Helpers ---
  const getWordCount = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0);
  const wordCount = getWordCount(newComment);
  const isOverLimit = wordCount > 50;

  const canEditPost = () => {
    if (!user || !post) return false;
    return user.id === post.author_id || ["admin", "superadmin"].includes(user.role);
  };

  const addAlert = (message, variant = "success") => {
    setAlerts([{ id: Date.now(), message, variant }]);
    setTimeout(() => setAlerts([]), 4000);
  };

  const addCommentAlert = (commentId, message, variant = "success") => {
    setCommentAlerts((prev) => ({
      ...prev,
      [commentId]: [{ id: Date.now(), message, variant }],
    }));
    setTimeout(() => setCommentAlerts((prev) => ({ ...prev, [commentId]: [] })), 4000);
  };

  // --- Handlers ---
  const fetchPost = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/posts/${id}`, {
        params: { page: commentPage, per_page: commentsPerPage }
      });
      if (data.rating !== null) data.rating = Number(data.rating);
      setPost(data);
      setUserRating(data.user_rating ? Number(data.user_rating) : null);
    } catch (err) {
      addAlert("Failed to load post.", "danger");
    } finally {
      setIsLoading(false);
    }
  }, [id, commentPage]);

  useEffect(() => { fetchPost(); }, [fetchPost]);

  const handleRatingSubmit = async (val) => {
    if (!isLoggedIn) return addAlert("Please login to rate this post.", "warning");
    try {
      const { data } = await api.post(`/posts/rate/${id}`, { value: val });
      setUserRating(val);
      setPost((prev) => ({ ...prev, rating: Number(data.rating) }));
      addAlert("Rating updated!");
    } catch (err) { addAlert("Failed to submit rating.", "danger"); }
  };

  const handleCommentReaction = (commentId, emoji) => {
    if (!isLoggedIn) return addCommentAlert(commentId, "Login to give your reaction.", "warning");
    addCommentAlert(commentId, `You reacted with ${emoji}`);
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (isOverLimit || !newComment.trim()) return;
    try {
      await api.post(`/comments/add_comment/${id}`, { content: newComment });
      setNewComment("");
      addAlert("Comment posted!");
      fetchPost();
    } catch (err) { addAlert("Submission failed.", "danger"); }
  };

  const handleCommentRating = async (commentId, val) => {
    if (!isLoggedIn) return addCommentAlert(commentId, "Login to rate this comment.", "warning");
    try {
      await api.post(`/comments/rate/${commentId}`, { value: val });
      addCommentAlert(commentId, `You rated this comment ${val} stars!`, "success");
      fetchPost();
    } catch (err) { 
      addCommentAlert(commentId, "Rating failed.", "danger"); 
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this?")) return;
    try {
      await api.delete(`/comments/delete_comment/${commentId}`);
      fetchPost();
    } catch (err) { addCommentAlert(commentId, "Delete failed.", "danger"); }
  };

  if (isLoading) return <Container className="d-flex justify-content-center align-items-center vh-100"><Spinner animation="border" variant="primary" /></Container>;
  if (!post) return <Container className="mt-5"><Alert variant="danger">Post not found.</Alert></Container>;

  return (
    <Container className="py-0 mt-0">
      {/* --- Global Floating Alerts --- */}
      <div className="position-fixed top-0 start-50 translate-middle-x mt-4 w-50" style={{ zIndex: 9999 }}>
        {alerts.map(a => <Alert key={a.id} variant={a.variant} className="shadow-sm border-0 small">{a.message}</Alert>)}
      </div>

      <Row className="g-4">
        {/* --- LEFT SIDEBAR: Author & Interactive Rating --- */}
        <Col lg={2} className="d-none d-lg-block text-center border-end">
          <div className="sticky-top" style={{ top: "100px" }}>
             <FaUser size={30} className="text-muted mb-2" />
             <p className="fw-bold small mb-1">{post.author}</p>
             <p className="text-muted mb-4" style={{fontSize: "0.75rem"}}>Author</p>
             
             <hr className="w-50 mx-auto" />
             
             <p className="fw-bold small text-muted text-uppercase mb-2">Current Rating</p>
             <h4 className="fw-bold text-primary mb-1">{Number(post.rating || 0).toFixed(1)}</h4>
             
             {/* Display Stars: Redirects user to the blue button if clicked */}
             <div 
                className="text-warning small mb-3" 
                style={{ cursor: 'pointer' }} 
                onClick={() => addAlert("Please rate this blog using the blue button below the stars.", "info")}
                title="Click blue box below to rate"
             >
                {[...Array(5)].map((_, i) => (post.rating >= i + 1 ? <FaStar key={i} /> : <FaRegStar key={i} />))}
             </div>

             {/* The Actual Interactive Rating UI */}
             <Card className="border-0 shadow-sm rounded-3 bg-primary text-white p-3">
              <p className="small fw-bold mb-1">Rate this article</p>
              <div className="d-flex justify-content-between">
                {[1, 2, 3, 4, 5].map(v => (
                  <Button 
                    key={v} size="sm" 
                    variant={userRating === v ? "warning" : "outline-light"} 
                    onClick={() => handleRatingSubmit(v)}
                    className="p-1 px-2 border-0" style={{fontSize: "0.75rem"}}
                  >{v}</Button>
                ))}
              </div>
            </Card>
          </div>
        </Col>

        {/* --- CENTER COLUMN: Article & Comments --- */}
        <Col lg={7} md={9}>
          <header className="mb-4">
            <h2 className="fw-bold mb-3" style={{ fontSize: '1.85rem', lineHeight: '1.3' }}>{post.title}</h2>
            
            <div className="d-flex align-items-center flex-wrap gap-2 text-muted" style={{ fontSize: '0.85rem' }}>
              {/* Date Created */}
              <span className="d-flex align-items-center">
                <FaClock className="me-1" /> {new Date(post.created_at).toLocaleDateString()}
              </span>

              {/* Vertical Divider (shows if categories exist) */}
              {post.categories && post.categories.length > 0 && (
                <div className="vr d-none d-sm-block mx-1" style={{ height: '14px', alignSelf: 'center' }} />
              )}

              {/* Categories Display */}
              <div className="d-flex align-items-center gap-1">
                {post.categories?.map((cat) => (
                  <span 
                    key={cat.id} 
                    className="text-primary fw-bold" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/category/${cat.id}`)} // Or your specific category route
                  >
                    #{cat.name}
                  </span>
                ))}
              </div>

              {/* Edit Button Section */}
              {canEditPost() && (
                <>
                  <div className="vr d-none d-sm-block mx-1" style={{ height: '14px', alignSelf: 'center' }} />
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 text-primary text-decoration-none fw-bold" 
                    onClick={() => navigate(`/blogs/edit/${post.id}`)}
                  >
                    Edit Article
                  </Button>
                </>
              )}
            </div>
          </header>

          {post.images?.[0] && (
            <img 
              src={post.images[0]} 
              className="w-100 rounded-3 shadow-sm mb-4" 
              style={{ maxHeight: "400px", objectFit: "cover" }} 
              alt="Featured"
            />
          )}

          <div className="article-content mb-5" style={{ lineHeight: '1.7', color: '#444', fontSize: '1rem' }} dangerouslySetInnerHTML={{ __html: post.content }} />

          <hr className="my-5" />

          {/* Discussion Section */}
          <section>
            <h5 className="fw-bold mb-4 small text-uppercase">Discussion ({post.comments?.total || 0})</h5>

            {isLoggedIn ? (
              <Form onSubmit={handleCommentSubmit} className="mb-5">
                <div className="d-flex justify-content-between mb-2 small fw-bold">
                  <span className="text-muted">Join the conversation</span>
                  <span className={isOverLimit ? 'text-danger' : 'text-muted'}>{wordCount}/50</span>
                </div>
                <Form.Control 
                  as="textarea" rows={2} 
                  value={newComment} 
                  onChange={(e) => setNewComment(e.target.value)} 
                  className="bg-light border-0 small mb-2" 
                  placeholder="Share a thought..." 
                />
                <div className="d-flex justify-content-end">
                    <Button type="submit" size="sm" disabled={!newComment.trim() || isOverLimit} className="rounded-pill px-4">Post</Button>
                </div>
              </Form>
            ) : (
              <Alert variant="light" className="border small text-center"><FaInfoCircle className="me-1" /> Login to participate.</Alert>
            )}

            <div className="comment-list mt-4">
              {post.comments?.items?.map(comment => (
                <div key={comment.id} className="pb-4 mb-4 border-bottom">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="fw-bold small text-primary">@{comment.author}</span>
                    <span className="text-muted" style={{fontSize: "0.7rem"}}>{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-secondary small mb-3">{comment.content}</p>
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                      <div className="d-flex gap-2">
                        {['👍', '❤️', '🔥'].map(emoji => (
                          <span key={emoji} onClick={() => handleCommentReaction(comment.id, emoji)} style={{ cursor: 'pointer', fontSize: '0.9rem' }}>{emoji}</span>
                        ))}
                      </div>
                      <div className="vr text-muted opacity-25" />
                      <div className="d-flex text-warning" style={{fontSize: "0.75rem"}}>
                        {[...Array(5)].map((_, i) => (
                          <span key={i} onClick={() => handleCommentRating(comment.id, i + 1)} style={{ cursor: 'pointer' }}>
                            {i < (comment.user_rating || 0) ? <FaStar /> : <FaRegStar />}
                          </span>
                        ))}
                      </div>
                    </div>
                    {comment.can_delete && <Button variant="link" size="sm" className="text-danger p-0 text-decoration-none small" onClick={() => handleDeleteComment(comment.id)}>Delete</Button>}
                  </div>
                  {commentAlerts[comment.id]?.map(a => <div key={a.id} className="text-success mt-1 fw-bold" style={{fontSize: "0.65rem"}}>{a.message}</div>)}
                </div>
              ))}
            </div>
          </section>
        </Col>

        {/* --- RIGHT COLUMN: Sticky Google Ads --- */}
        <Col lg={3} className="d-none d-lg-block">
          <div className="sticky-top" style={{ top: "100px" }}>
            
            {/* Top Sidebar Ad */}
            <Card className="border-0 shadow-sm rounded-4 mb-4 text-center p-3 bg-white">
              <p className="text-muted fw-bold mb-2" style={{fontSize: "0.6rem", letterSpacing: "1px", opacity: 0.6}}>ADVERTISEMENT</p>
              <AdUnit slot="4675871822" />
            </Card>

            {/* Bottom Sidebar Ad */}
            <Card className="border-0 shadow-sm rounded-4 mb-4 text-center p-3 bg-white">
              <p className="text-muted fw-bold mb-2" style={{fontSize: "0.6rem", letterSpacing: "1px", opacity: 0.6}}>ADVERTISEMENT</p>
              <AdUnit slot="4138823387" />
            </Card>
            
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default BlogPostDetail;
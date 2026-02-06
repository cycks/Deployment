// src/pages/Dashboards/MessageManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import { 
  Card, Table, Button, Badge, Spinner, 
  Modal, Nav, Form, InputGroup, Pagination 
} from "react-bootstrap";
import { 
  BsEnvelope, BsEnvelopeOpen, BsSearch, 
  BsEye, BsReply, BsArrowRepeat, BsCheckCircle,
  BsChevronLeft, BsChevronRight 
} from "react-icons/bs";
import api from "../../../libs/api";

const MessageManagement = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch logic wrapped in useCallback to prevent unnecessary re-renders
  const fetchMessages = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      let endpoint = "/contact/messages";
      // Map filters to endpoints
      if (filter === "unread") endpoint = "/contact/messages/unread";
      if (filter === "unactioned") endpoint = "/contact/messages/unactioned";
      if (filter === "actioned") endpoint = "/contact/messages/actioned";
      
      const res = await api.get(`${endpoint}?page=${page}&limit=10`);
      
      /** * Handle multiple backend response formats:
       * 1. Flask-SQLAlchemy Pagination: res.data.items / res.data.pages
       * 2. Custom JSON: res.data.messages / res.data.total_pages
       */
      const data = res.data;
      setMessages(data.items || data.messages || (Array.isArray(data) ? data : []));
      setTotalPages(data.pages || data.total_pages || 1);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Combined Effect: Listens for page or filter changes
  useEffect(() => {
    fetchMessages(currentPage);
  }, [currentPage, fetchMessages]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1); // Resetting page triggers the useEffect
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return fetchMessages(1);
    
    setLoading(true);
    try {
      const res = await api.get(`/contact/messages/search?q=${searchTerm}&page=1`);
      const data = res.data;
      setMessages(data.items || data.messages || []);
      setTotalPages(data.pages || 1);
      setCurrentPage(1);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (msgId, actionType) => {
    try {
      await api.put(`/contact/mark_${actionType}/${msgId}`);
      fetchMessages(currentPage); 
      if (selectedMsg?.id === msgId) setShowModal(false);
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const openMessage = (msg) => {
    setSelectedMsg(msg);
    setShowModal(true);
    if (!msg.is_read) {
      handleStatusUpdate(msg.id, "read");
    }
  };

  return (
    <div className="animate-fade-in p-1">
      {/* Header & Search Area */}
      <div className="d-md-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">User Inquiries</h3>
          <p className="text-muted small mb-0">Review and manage contact form submissions.</p>
        </div>
        
        <Form onSubmit={handleSearch} className="mt-3 mt-md-0" style={{ maxWidth: '350px' }}>
          <InputGroup className="shadow-sm rounded-pill overflow-hidden border">
            <Form.Control
              placeholder="Search email/subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 px-4"
            />
            <Button variant="primary" type="submit" className="px-4 border-0">
              <BsSearch />
            </Button>
          </InputGroup>
        </Form>
      </div>

      {/* Filter Navigation */}
      <div className="d-flex align-items-center mb-4 overflow-auto">
        <Nav variant="pills" activeKey={filter} onSelect={handleFilterChange} className="gap-2">
          <Nav.Item><Nav.Link eventKey="all" className="rounded-pill px-4 border">All</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="unread" className="rounded-pill px-4 border">Unread</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="unactioned" className="rounded-pill px-4 border text-warning">Pending</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="actioned" className="rounded-pill px-4 border text-success">Actioned</Nav.Link></Nav.Item>
        </Nav>
        <Button variant="light" className="rounded-circle ms-auto shadow-sm border" onClick={() => fetchMessages(currentPage)}>
          <BsArrowRepeat />
        </Button>
      </div>

      {/* Messages List Table */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
        {loading ? (
          <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>
        ) : (
          <>
            <Table hover responsive className="mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4 py-3 small text-muted text-uppercase fw-bold">Sender</th>
                  <th className="small text-muted text-uppercase fw-bold">Subject</th>
                  <th className="small text-muted text-uppercase fw-bold">Status</th>
                  <th className="text-end pe-4 small text-muted text-uppercase fw-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {messages.length > 0 ? messages.map((msg) => (
                  <tr key={msg.id} className={!msg.is_read ? "fw-bold border-start border-primary border-4 bg-primary-subtle bg-opacity-10" : "opacity-75"}>
                    <td className="ps-4 py-3">
                      <div className="d-flex align-items-center">
                        <div className={`me-3 p-2 rounded-circle d-flex ${msg.is_read ? 'bg-light text-muted' : 'bg-primary text-white shadow-sm'}`}>
                          {msg.is_read ? <BsEnvelopeOpen /> : <BsEnvelope />}
                        </div>
                        <div>
                          <div className="text-dark">{msg.email}</div>
                          <div className="small text-muted fw-normal">
                            {new Date(msg.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><span className="text-truncate d-inline-block" style={{ maxWidth: '250px' }}>{msg.subject}</span></td>
                    <td>
                      {msg.is_actioned ? (
                        <Badge bg="success-subtle" text="success" className="rounded-pill px-3 py-2 fw-medium">
                          <BsCheckCircle className="me-1"/> Actioned
                        </Badge>
                      ) : (
                        <Badge bg="warning-subtle" text="warning" className="rounded-pill px-3 py-2 fw-medium">Pending</Badge>
                      )}
                    </td>
                    <td className="text-end pe-4">
                      <Button variant="outline-dark" size="sm" className="rounded-pill px-3" onClick={() => openMessage(msg)}>
                        <BsEye className="me-1"/> View
                      </Button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" className="text-center py-5">No messages found.</td></tr>
                )}
              </tbody>
            </Table>

            {/* Pagination UI */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-center py-4 border-top bg-light bg-opacity-50">
                <Pagination className="mb-0 shadow-sm rounded-pill overflow-hidden">
                  <Pagination.Prev 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    <BsChevronLeft />
                  </Pagination.Prev>
                  
                  {[...Array(totalPages)].map((_, idx) => (
                    <Pagination.Item 
                      key={idx + 1} 
                      active={idx + 1 === currentPage}
                      onClick={() => setCurrentPage(idx + 1)}
                    >
                      {idx + 1}
                    </Pagination.Item>
                  ))}

                  <Pagination.Next 
                    disabled={currentPage === totalPages} 
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    <BsChevronRight />
                  </Pagination.Next>
                </Pagination>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Message Detail Modal */}
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        centered 
        size="lg" 
        contentClassName="border-0 shadow-lg rounded-4 overflow-hidden"
      >
        <Modal.Header closeButton className="bg-light border-0 px-4 pt-4">
          <Modal.Title className="fw-bold h5 mb-0 text-primary d-flex align-items-center">
            <BsEnvelope className="me-2" /> 
            <span>Message Details</span>
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="px-4 py-4">
          {selectedMsg && (
            <>
              <div className="d-flex justify-content-between align-items-start mb-4 border-bottom pb-3">
                <div>
                  <h6 className="fw-bold mb-1 text-dark">From: {selectedMsg.email}</h6>
                  <div className="text-muted small">
                    Subject: <span className="text-dark fw-medium">{selectedMsg.subject}</span>
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-muted small">{new Date(selectedMsg.created_at).toLocaleString()}</div>
                  {selectedMsg.is_actioned ? (
                    <Badge bg="success-subtle" text="success" className="rounded-pill mt-1 border border-success">Actioned</Badge>
                  ) : (
                    <Badge bg="warning-subtle" text="warning" className="rounded-pill mt-1 border border-warning">Pending</Badge>
                  )}
                </div>
              </div>

              <div 
                className="p-4 bg-light rounded-4 border mb-4 shadow-sm" 
                style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto', 
                  whiteSpace: 'pre-wrap',
                  backgroundColor: '#f8f9fa'
                }}
              >
                <p className="mb-0 text-dark lh-base font-monospace" style={{ fontSize: '0.95rem' }}>
                  {selectedMsg.message}
                </p>
              </div>

              <div className="d-flex flex-wrap gap-2">
                {!selectedMsg.is_actioned && (
                  <Button 
                    variant="success" 
                    className="rounded-pill px-4 shadow-sm fw-bold border-0"
                    onClick={() => handleStatusUpdate(selectedMsg.id, "actioned")}
                  >
                    <BsCheckCircle className="me-1" /> Mark as Actioned
                  </Button>
                )}
                <Button 
                  variant="primary" 
                  className="rounded-pill px-4 shadow-sm fw-bold border-0"
                  href={`mailto:${selectedMsg.email}?subject=Re: ${selectedMsg.subject}`}
                >
                  <BsReply className="me-1" /> Reply via Email
                </Button>
                <Button 
                  variant="outline-secondary" 
                  className="rounded-pill px-4 ms-auto" 
                  onClick={() => setShowModal(false)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default MessageManagement;
// src/pages/Dashboards/UserManagement.jsx

import React, { useState, useEffect, useCallback } from "react";
import { 
  Card, Table, Button, Badge, Spinner, Form, Nav, 
  InputGroup, Pagination, Row, Col, Modal 
} from "react-bootstrap";
import { 
  BsSearch, BsPeople, BsHourglassSplit, BsShieldSlash, 
  BsPersonCircle, BsXCircle, BsCheckCircle, BsSlashCircle,
  BsExclamationTriangle, BsTrash 
} from "react-icons/bs";
import { useAuth } from "../../../contexts/AuthContext";
import api from "../../../libs/api";

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all-users");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State for Hierarchy Restrictions
  const [showRestriction, setShowRestriction] = useState(false);
  const [restrictionMsg, setRestrictionMsg] = useState("");

  // Modal State for Confirmation
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState({ action: "", user: null });

  const isSuperAdmin = currentUser?.role?.toLowerCase() === "superadmin";
  const isAdmin = currentUser?.role?.toLowerCase() === "admin";

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      let endpoint = "/users/all-users";
      if (activeTab === "blocked") endpoint = "/users/blocked_users";
      else if (activeTab === "awaiting-approval") endpoint = "/users/awaiting-approval";

      const res = await api.get(endpoint, {
        params: { 
          search: searchTerm, 
          role: roleFilter !== "all" ? roleFilter : undefined,
          page: page,
          per_page: 10
        },
      });
      setUsers(res.data.results || []);
      setTotalPages(res.data.pages || 1);
      setCurrentPage(res.data.current_page || page);
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, activeTab]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => fetchUsers(currentPage), 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, roleFilter, activeTab, currentPage, fetchUsers]);

  // 1. INITIAL ACTION CHECK
  const initiateAction = (action, targetUser) => {
    // A. Hierarchy Validation (Restriction Check)
    if (isAdmin) {
      if (action === "delete") {
        setRestrictionMsg("Access Denied: Only Superadmins can permanently delete accounts.");
        setShowRestriction(true);
        return;
      }
      if ((action === "block" || action === "unblock") && targetUser.role !== "commentator") {
        setRestrictionMsg(`Permission Denied: Admins can only ${action} commentators. Please contact a Superadmin for ${targetUser.role} management.`);
        setShowRestriction(true);
        return;
      }
    }

    // B. If valid, show Confirmation Modal for destructive actions
    if (action === "delete" || action === "block") {
      setConfirmData({ action, user: targetUser });
      setShowConfirm(true);
    } else {
      // Execute non-destructive actions (unblock, approve) directly
      executeAction(action, targetUser);
    }
  };

  // 2. ACTUAL API EXECUTION
  const executeAction = async (action, targetUser) => {
    try {
      let endpoint = "";
      if (action === "approve") endpoint = `/users/approve/${targetUser.role}/${targetUser.id}`;
      else if (action === "block") endpoint = `/users/block/${targetUser.id}`;
      else if (action === "unblock") endpoint = `/users/unblock/${targetUser.id}`;
      else if (action === "delete") endpoint = `/users/delete/${targetUser.id}`;

      const method = action === "delete" ? "delete" : "put";
      await api[method](endpoint);
      setShowConfirm(false);
      fetchUsers(currentPage);
    } catch (err) {
      alert(err.response?.data?.msg || "Action failed");
    }
  };

  return (
    <div className="p-4">
      {/* ----------------- MODAL: RESTRICTION ----------------- */}
      <Modal show={showRestriction} onHide={() => setShowRestriction(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="text-warning"><BsExclamationTriangle className="me-2"/> Restriction</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">{restrictionMsg}</Modal.Body>
        <Modal.Footer className="border-0 justify-content-center pb-4">
          <Button variant="secondary" className="rounded-pill px-4" onClick={() => setShowRestriction(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* ----------------- MODAL: CONFIRMATION ----------------- */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header className="border-0 pb-0" closeButton>
          <Modal.Title className="fw-bold">Confirm {confirmData.action === 'delete' ? 'Deletion' : 'Block'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-3">
          Are you sure you want to <strong>{confirmData.action}</strong> user <strong>{confirmData.user?.username}</strong>? 
          {confirmData.action === "delete" && " This action is permanent."}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" className="rounded-pill" onClick={() => setShowConfirm(false)}>Cancel</Button>
          <Button 
            variant={confirmData.action === "delete" ? "danger" : "warning"} 
            className="rounded-pill px-4"
            onClick={() => executeAction(confirmData.action, confirmData.user)}
          >
            Confirm {confirmData.action.capitalize?.() || confirmData.action}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* UI CONTENT */}
      <div className="mb-4">
        <h2 className="fw-bold">User Management</h2>
        <p className="text-muted">Monitor and manage user access permissions.</p>
      </div>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white border-0 pt-3">
          <Nav variant="pills" activeKey={activeTab} onSelect={(k) => {setActiveTab(k); setCurrentPage(1);}}>
            <Nav.Item><Nav.Link eventKey="all-users"><BsPeople className="me-2"/>All</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="awaiting-approval"><BsHourglassSplit className="me-2"/>Awaiting</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="blocked"><BsShieldSlash className="me-2"/>Blocked</Nav.Link></Nav.Item>
          </Nav>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={8}>
              <InputGroup className="rounded-pill border overflow-hidden">
                <InputGroup.Text className="bg-white border-0 ps-3"><BsSearch/></InputGroup.Text>
                <Form.Control
                  className="border-0 shadow-none"
                  placeholder="Search username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={4}>
              <Form.Select className="rounded-pill shadow-none" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="commentator">Commentators</option>
                <option value="author">Authors</option>
                {isSuperAdmin && <option value="admin">Admins</option>}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* TABLE */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table hover responsive className="mb-0">
          <thead className="bg-light text-uppercase small fw-bold">
            <tr>
              <th className="ps-4 py-3">User info</th>
              <th>Role</th>
              <th>Status</th>
              <th className="text-end pe-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="text-center py-5"><Spinner animation="border" variant="primary"/></td></tr>
            ) : users.map(user => (
              <tr key={user.id} className="align-middle">
                <td className="ps-4">
                  <div className="d-flex align-items-center">
                    <BsPersonCircle size={30} className="text-secondary me-3"/>
                    <div>
                      <div className="fw-bold">{user.username}</div>
                      <div className="small text-muted">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td><Badge bg="secondary-subtle" text="dark" className="border">{user.role}</Badge></td>
                <td>
                  {user.blocked ? <Badge bg="danger">Blocked</Badge> : <Badge bg="success">Active</Badge>}
                </td>
                <td className="text-end pe-4">
                  <div className="d-flex justify-content-end gap-2">
                    {!user.approved && (
                      <Button variant="success" size="sm" onClick={() => initiateAction("approve", user)}>Approve</Button>
                    )}
                    {user.id !== currentUser.id && (
                      <>
                        <Button 
                          variant={user.blocked ? "outline-warning" : "outline-danger"} 
                          size="sm" 
                          onClick={() => initiateAction(user.blocked ? "unblock" : "block", user)}
                        >
                          {user.blocked ? "Unblock" : "Block"}
                        </Button>
                        <Button variant="link" className="text-danger p-0 ms-2" onClick={() => initiateAction("delete", user)}>
                          <BsTrash size={18}/>
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <div className="mt-4">
        {totalPages > 1 && (
          <Pagination className="justify-content-center">
            <Pagination.First disabled={currentPage === 1} onClick={() => setCurrentPage(1)} />
            <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} />
            
            {[...Array(totalPages)].map((_, i) => (
              <Pagination.Item 
                key={i + 1} 
                active={i + 1 === currentPage}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Pagination.Item>
            ))}

            <Pagination.Next disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} />
            <Pagination.Last disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} />
          </Pagination>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
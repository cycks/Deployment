// src/components/DashboardLayout.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
// 🔹 Import Button from react-bootstrap to prevent the "Blank Screen" error
import { Button } from "react-bootstrap"; 
import { 
  BsGrid, 
  BsPeople, 
  BsFileText, 
  BsTags, 
  BsEnvelope, 
  BsBoxArrowRight, 
  BsPersonCircle, 
  BsArrowLeftShort 
} from "react-icons/bs";

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Define sidebar links based on the user role
  const isAdmin = ["admin", "superadmin"].includes(user?.role);

  const adminLinks = [
    { name: "Overview", path: "/admin-dashboard", icon: <BsGrid /> },
    { name: "Posts", path: "/admin-dashboard/posts", icon: <BsFileText /> },
    { name: "Categories", path: "/admin-dashboard/categories", icon: <BsTags /> },
    { name: "Users", path: "/admin-dashboard/users", icon: <BsPeople /> },
    { name: "Messages", path: "/admin-dashboard/messages", icon: <BsEnvelope /> },
  ];

  const userLinks = [
    { name: "My Feed", path: "/dashboard", icon: <BsGrid /> },
    { name: "My Comments", path: "/dashboard/comments", icon: <BsFileText /> },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      
      {/* --- 1. THE SIDEBAR (Fixed Left) --- */}
      <nav 
        className="bg-dark text-white p-3 shadow" 
        style={{ 
          width: "250px", 
          position: "fixed", 
          top: 0, 
          left: 0, 
          height: "100vh", 
          zIndex: 1050 
        }}
      >
        <div className="mb-5 mt-2 text-center">
          <h4 className="fw-bold text-primary mb-0">LOFTIER</h4>
          <small className="text-muted text-uppercase" style={{ letterSpacing: '1px' }}>
            {user?.role} Portal
          </small>
        </div>

        <ul className="nav nav-pills flex-column mb-auto">
          {links.map((link) => (
            <li className="nav-item mb-2" key={link.path}>
              <Link
                to={link.path}
                className={`nav-link text-white d-flex align-items-center gap-3 border-0 ${
                  location.pathname === link.path ? "active bg-primary" : ""
                }`}
              >
                {link.icon} <span>{link.name}</span>
              </Link>
            </li>
          ))}
        </ul>

        <hr className="bg-secondary" />
        <button 
          onClick={handleLogout} 
          className="btn btn-link nav-link text-danger d-flex align-items-center gap-3 w-100 border-0 text-start"
        >
          <BsBoxArrowRight /> <span>Logout</span>
        </button>
      </nav>

      {/* --- 2. THE CONTENT WRAPPER (Shifted Right to avoid overlap) --- */}
      <div 
        className="d-flex flex-column flex-grow-1" 
        style={{ 
          marginLeft: "250px", 
          width: "calc(100% - 250px)",
          minHeight: "100vh"
        }}
      >
        
        {/* --- 3. DASHBOARD HEADER (Sticky Top) --- */}
        <header 
          className="bg-white border-bottom py-2 px-4 d-flex justify-content-between align-items-center sticky-top shadow-sm"
          style={{ height: "65px", zIndex: 1000 }}
        >
          <div className="d-flex align-items-center gap-2">
            <Button 
              variant="outline-secondary" 
              size="sm" 
              onClick={() => navigate("/")} 
              className="d-flex align-items-center rounded-pill px-3"
            >
              <BsArrowLeftShort size={20}/> Back to Site
            </Button>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="text-end d-none d-md-block">
              <p className="small mb-0 fw-bold">{user?.username || "Admin"}</p>
              <p className="text-muted mb-0" style={{ fontSize: '10px' }}>{user?.email}</p>
            </div>
            <BsPersonCircle size={30} className="text-primary shadow-sm rounded-circle" />
          </div>
        </header>

        {/* --- 4. MAIN PAGE CONTENT --- */}
        <main className="flex-grow-1 p-4 p-md-5 bg-light">
          {children}
        </main>

        {/* --- 5. MINI DASHBOARD FOOTER --- */}
        <footer className="py-3 bg-white border-top text-center text-muted">
          <small>
            &copy; {new Date().getFullYear()} <strong>Loftier Movies</strong> | Admin Control Panel
          </small>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import AppNavbar from "./components/AppNavbar";
import AppFooter from "./components/AppFooter";
import PrivateRoute from "./components/PrivateRoute";
import DashboardLayout from "./components/DashboardLayout"; // Import once here

// Pages
import AuthorPostsPage from "./pages/AuthorPostsPage";
import AuthorsPage from "./pages/AuthorsPage";
import BlogListPage from "./pages/BlogListPage";
import BlogPostDetail from "./pages/BlogPostDetail";
import CategoryDetailsPage from "./pages/CategoryDetailsPage";
import CategoriesPage from "./pages/CategoriesPage";
import CheckEmailPage from "./pages/CheckEmailPage";
import ConfirmEmailPage from "./pages/ConfirmEmailPage";
import ContactUsPage from "./pages/ContactUsPage";
import EditBlogPost from "./pages/EditBlogPost";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import GoogleCallbackPage from "./pages/GoogleCallbackPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import ResetPasswordConfirmPage from "./pages/ResetPasswordConfirmPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import SignUpAuthorPage from "./pages/SignUpAuthorPage";
import SignUpPage from "./pages/SignUpPage";
import WriteBlog from "./pages/WriteBlog";

// Dashboard Sub-pages
import CategoryManagement from "./pages/Dashboards/Admin/CategoryManagement"; 
import PostManagement from "./pages/Dashboards/Admin/PostManagement";
import UserManagement from "./pages/Dashboards/Admin/UserManagement";
import DashboardOverview from "./pages/Dashboards/Admin/DashboardOverview";
import MessageManagement from "./pages/Dashboards/Admin/MessageManagement";


import CommentatorDashboard from "./pages/Dashboards/Commentors/CommentatorDashboard";
import AuthorDashboard from "./pages/Dashboards/Authors/AuthorDashboard";

const AppContent = () => {
  const location = useLocation();

  const isDashboard = 
    location.pathname.startsWith('/admin-dashboard') || 
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/authors-dashboard');

  return (
    <div className="d-flex flex-column min-vh-100">
      {!isDashboard && <AppNavbar />}

      <main className={!isDashboard ? "pt-1 flex-grow-1" : "flex-grow-1"}>
        <Routes>
          {/* --- Public Routes --- */}
          <Route path="/" element={<HomePage />} />
          <Route path="/blogs" element={<BlogListPage />} />
          <Route path="/blogs/:id" element={<BlogPostDetail />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/category/:id" element={<CategoryDetailsPage />} />
          <Route path="/authors" element={<AuthorsPage />} />
          <Route path="/authors/:id/posts" element={<AuthorPostsPage />} />
          <Route path="/contact-us" element={<ContactUsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/search" element={<SearchResultsPage />} />

          {/* --- Auth Routes --- */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/signup-author" element={<SignUpAuthorPage />} />
          <Route path="/check-email" element={<CheckEmailPage />} />
          <Route path="/confirm" element={<ConfirmEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordConfirmPage />} />
          <Route path="/google-callback" element={<GoogleCallbackPage />} />

          {/* --- 🔹 ADMIN DASHBOARD: NESTED ROUTES 🔹 --- */}
          <Route 
            path="/admin-dashboard" 
            element={
              <PrivateRoute>
                <DashboardLayout>
                  <Outlet /> {/* 👈 This renders the sub-pages below */}
                </DashboardLayout>
              </PrivateRoute>
            }
          >
            {/* These paths are relative to /admin-dashboard */}
            <Route index element={<DashboardOverview />} /> 
            <Route path="overview" element={<DashboardOverview />} />
            <Route path="categories" element={<CategoryManagement />} />
            <Route path="posts" element={<PostManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="messages" element={<MessageManagement />} />
          </Route>

          {/* --- Other Dashboards --- */}
          <Route path="/authors-dashboard" element={<PrivateRoute><AuthorDashboard /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><CommentatorDashboard /></PrivateRoute>} />
          
          {/* --- Private Content Routes --- */}
          <Route path="/blogs/edit/:id"  element={<PrivateRoute><EditBlogPost /></PrivateRoute>} />
          <Route path="/write-blog" element={<PrivateRoute><WriteBlog /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {!isDashboard && <AppFooter />}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
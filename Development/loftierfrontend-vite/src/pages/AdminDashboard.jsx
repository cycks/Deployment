// src/pages/AdminDashboard.jsx
import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import DashboardOverview from "./Dashboards/DashboardOverview"; 

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <DashboardLayout>
      {/* Tab Controls */}
      <div className="btn-group mb-4 shadow-sm rounded-pill p-1 bg-white">
        <button 
          className={`btn rounded-pill px-4 ${activeTab === 'overview' ? 'btn-primary' : 'btn-light'}`}
          onClick={() => setActiveTab("overview")}
        >Overview</button>
      </div>

      {/* Conditional Rendering Area */}
      <div>
        {activeTab === "overview" && <DashboardOverview />}
        {activeTab === "users" && <UserManagement />}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
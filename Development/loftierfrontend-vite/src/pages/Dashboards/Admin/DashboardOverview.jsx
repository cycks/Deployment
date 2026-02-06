// src/pages/Dashboards/DashboardOverview.jsx
import React, { useState, useEffect } from "react";
import { Row, Col, Card, Spinner, Table, Badge } from "react-bootstrap";
import { 
  BsPeople, BsFilePost, BsHourglassSplit, 
  BsShieldX, BsCheck2Circle, BsPencilFill 
} from "react-icons/bs";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import api from "../../../libs/api";

const DashboardOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/users/dashboard-summary");
        setData(res.data);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>;
  if (!data) return <div className="alert alert-danger">Failed to load system metrics.</div>;

  const statCards = [
    { title: "Total Users", value: data.stats.users.total, icon: <BsPeople/>, color: "primary" },
    { title: "Pending Approval", value: data.stats.users.pending, icon: <BsHourglassSplit/>, color: "warning" },
    { title: "Blocked Users", value: data.stats.users.blocked, icon: <BsShieldX/>, color: "danger" },
    { title: "Published Posts", value: data.stats.posts.published, icon: <BsCheck2Circle/>, color: "success" },
    { title: "Drafts", value: data.stats.posts.drafts, icon: <BsPencilFill/>, color: "secondary" },
    { title: "All Time Posts", value: data.stats.posts.total, icon: <BsFilePost/>, color: "info" },
  ];

  return (
    <> {/* No DashboardLayout here! */}
      <div className="mb-4">
        <h3 className="fw-bold">System Metrics</h3>
        <p className="text-muted small">Real-time data from your database.</p>
      </div>

      <Row className="g-4 mb-4">
        {statCards.map((item, idx) => (
          <Col key={idx} xs={12} md={6} xl={4}>
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="d-flex align-items-center p-4">
                <div className={`bg-${item.color}-subtle text-${item.color} p-3 rounded-4 me-3 fs-3 d-flex`}>
                  {item.icon}
                </div>
                <div>
                  <h6 className="text-muted mb-0 small text-uppercase">{item.title}</h6>
                  <h2 className="fw-bold mb-0">{item.value}</h2>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm rounded-4 p-4" style={{ minHeight: '400px' }}>
            <h5 className="fw-bold mb-4">Post Upload Trends</h5>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.chart_data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="posts" stroke="#0d6efd" fill="#0d6efd" fillOpacity={0.1} strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Header className="bg-white border-0 pt-4 px-4"><h5 className="fw-bold">New Signups</h5></Card.Header>
            <Table hover responsive className="mb-0">
              <thead><tr className="bg-light"><th>User</th><th>Role</th></tr></thead>
              <tbody>
                {data.recent_users.map((u, i) => (
                  <tr key={i}>
                    <td className="ps-4"><strong>{u.username}</strong><br/><small className="text-muted">{u.created_at}</small></td>
                    <td><Badge bg="light" text="dark" className="border">{u.role}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default DashboardOverview;
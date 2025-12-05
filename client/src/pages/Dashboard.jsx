import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentEmails, setRecentEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monitoringActive, setMonitoringActive] = useState(true);
  const [toggling, setToggling] = useState(false);

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data.stats);
      setRecentEmails(response.data.recentEmails);
      setMonitoringActive(user?.organizations?.is_active !== false);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMonitoring = async () => {
    setToggling(true);
    try {
      const response = await api.post('/dashboard/toggle-monitoring');
      setMonitoringActive(response.data.is_active);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to toggle monitoring');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        {isAdmin && (
          <button
            className={`btn ${monitoringActive ? 'btn-danger' : 'btn-success'}`}
            onClick={toggleMonitoring}
            disabled={toggling}
          >
            {toggling ? 'Updating...' : monitoringActive ? '⏸ Pause Monitoring' : '▶ Resume Monitoring'}
          </button>
        )}
      </div>

      {!monitoringActive && (
        <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
          ⚠️ Monitoring is currently paused. No calls will be made for new emails.
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalEmails}</div>
          <div className="stat-label">Total Emails</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats.emailsToday}</div>
          <div className="stat-label">Emails Today</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats.totalCalls}</div>
          <div className="stat-label">Total Calls</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats.confirmedCalls}</div>
          <div className="stat-label">Confirmed Calls</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats.callSuccessRate}%</div>
          <div className="stat-label">Success Rate</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats.activePhoneNumbers}</div>
          <div className="stat-label">Active Numbers</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '30px' }}>
        <h2>Recent Emails</h2>
        {recentEmails.length === 0 ? (
          <p className="empty-state">No emails received yet</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>From</th>
                <th>Received</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentEmails.map((email) => (
                <tr key={email.id}>
                  <td>
                    <strong>{email.subject}</strong>
                    <div className="email-preview">{email.body_preview?.substring(0, 100)}...</div>
                  </td>
                  <td>{email.sender}</td>
                  <td>{new Date(email.received_at).toLocaleString()}</td>
                  <td>
                    {email.processed ? (
                      <span className="badge badge-success">Processed</span>
                    ) : (
                      <span className="badge badge-warning">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

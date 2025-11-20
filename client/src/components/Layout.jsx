import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <h1>PagerDuty Clone</h1>
          </div>

          <div className="navbar-links">
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/emails" className="nav-link">Emails</Link>
            <Link to="/phone-numbers" className="nav-link">Phone Numbers</Link>
          </div>

          <div className="navbar-user">
            <span className="user-email">{user?.email}</span>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;

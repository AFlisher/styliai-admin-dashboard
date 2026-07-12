import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AnalyticsPage from './pages/AnalyticsPage';
import StyleManagerPage from './pages/StyleManagerPage';
import { Loader } from './components/Loader';

const AppContent: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'manager'>('analytics');

  if (isLoading) {
    return <Loader type="page" />;
  }

  // Redirect to Login if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="container">
      <header>
        <div className="logo-container">
          <div className="logo-icon">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
          </div>
          <div className="logo-text">
            <h1>StyliAI Admin</h1>
            <p>Manage styles, categories and analytics</p>
          </div>
        </div>

        <div className="nav-actions-container">
          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <i className="fa-solid fa-chart-line"></i> Analytics
            </button>
            <button
              className={`tab-btn ${activeTab === 'manager' ? 'active' : ''}`}
              onClick={() => setActiveTab('manager')}
            >
              <i className="fa-solid fa-sliders"></i> Style Manager
            </button>
          </div>

          <div className="user-profile-signout">
            <span className="user-name-tag">
              <i className="fa-solid fa-user-shield"></i> {user.fullName || 'Admin'}
            </span>
            <button className="btn secondary signout-btn" onClick={logout} title="Sign Out">
              <i className="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="main-content-layout">
        {activeTab === 'analytics' ? <AnalyticsPage /> : <StyleManagerPage />}
      </main>

      <footer className="admin-footer">
        <p>© {new Date().getFullYear()} StyliAI Admin Console. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AnalyticsPage from './pages/AnalyticsPage';
import StyleManagerPage from './pages/StyleManagerPage';
import UserCreditsPage from './pages/UserCreditsPage';
import CreditPacksPage from './pages/CreditPacksPage';
import { Loader } from './components/Loader';

const AppContent: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'manager' | 'credits' | 'packs'>('analytics');

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
            <button
              className={`tab-btn ${activeTab === 'credits' ? 'active' : ''}`}
              onClick={() => setActiveTab('credits')}
            >
              <i className="fa-solid fa-coins"></i> Credits
            </button>
            <button
              className={`tab-btn ${activeTab === 'packs' ? 'active' : ''}`}
              onClick={() => setActiveTab('packs')}
            >
              <i className="fa-solid fa-box-open"></i> Credit Packs
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
        {activeTab === 'analytics' && <AnalyticsPage />}
        {activeTab === 'manager' && <StyleManagerPage />}
        {activeTab === 'credits' && <UserCreditsPage />}
        {activeTab === 'packs' && <CreditPacksPage />}
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

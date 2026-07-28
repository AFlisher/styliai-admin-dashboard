import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AnalyticsPage from './pages/AnalyticsPage';
import StyleManagerPage from './pages/StyleManagerPage';
import UserCreditsPage from './pages/UserCreditsPage';
import CreditPacksPage from './pages/CreditPacksPage';
import UsersByCountryPage from './pages/UsersByCountryPage';
import GenerationAnalyticsPage from './pages/GenerationAnalyticsPage';
import { Loader } from './components/Loader';
import { adminRoleOf, roleSatisfies, type AdminRole } from './utils/adminRoles';

type TabKey = 'analytics' | 'manager' | 'credits' | 'packs' | 'country' | 'generationAnalytics';

/**
 * SEC-15.4: minimum role each tab needs, mirroring the server's route policy.
 * Presentational only - hiding a tab is a convenience so an under-privileged
 * admin isn't handed buttons that only ever 403. The server re-decides every
 * request regardless of what is rendered here.
 */
const TAB_MIN_ROLE: Record<TabKey, AdminRole> = {
  analytics: 'viewer',
  country: 'viewer',
  generationAnalytics: 'viewer',
  manager: 'editor',
  credits: 'superadmin',
  packs: 'superadmin',
};

const AppContent: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('analytics');

  const adminRole = adminRoleOf(user);
  const can = (tab: TabKey) => roleSatisfies(adminRole, TAB_MIN_ROLE[tab]);

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
            {can('analytics') && (
              <button
                className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                <i className="fa-solid fa-chart-line"></i> Analytics
              </button>
            )}
            {can('manager') && (
              <button
                className={`tab-btn ${activeTab === 'manager' ? 'active' : ''}`}
                onClick={() => setActiveTab('manager')}
              >
                <i className="fa-solid fa-sliders"></i> Style Manager
              </button>
            )}
            {can('credits') && (
              <button
                className={`tab-btn ${activeTab === 'credits' ? 'active' : ''}`}
                onClick={() => setActiveTab('credits')}
              >
                <i className="fa-solid fa-coins"></i> Credits
              </button>
            )}
            {can('packs') && (
              <button
                className={`tab-btn ${activeTab === 'packs' ? 'active' : ''}`}
                onClick={() => setActiveTab('packs')}
              >
                <i className="fa-solid fa-box-open"></i> Credit Packs
              </button>
            )}
            {can('country') && (
              <button
                className={`tab-btn ${activeTab === 'country' ? 'active' : ''}`}
                onClick={() => setActiveTab('country')}
              >
                <i className="fa-solid fa-earth-americas"></i> Users by Country
              </button>
            )}
            {can('generationAnalytics') && (
              <button
                className={`tab-btn ${activeTab === 'generationAnalytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('generationAnalytics')}
              >
                <i className="fa-solid fa-star-half-stroke"></i> Generation Analytics
              </button>
            )}
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
        {/* The panel is gated on the same check as its tab, not just on
            activeTab: the default tab is 'analytics', so a role that cannot
            even view analytics would otherwise still render that page and fire
            its requests, producing a screenful of 403s. */}
        {!can(activeTab) ? (
          <div className="panel">
            <p>Your admin role does not have access to this section.</p>
          </div>
        ) : (
          <>
            {activeTab === 'analytics' && <AnalyticsPage />}
            {activeTab === 'manager' && <StyleManagerPage />}
            {activeTab === 'credits' && <UserCreditsPage />}
            {activeTab === 'packs' && <CreditPacksPage />}
            {activeTab === 'country' && <UsersByCountryPage />}
            {activeTab === 'generationAnalytics' && <GenerationAnalyticsPage />}
          </>
        )}
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

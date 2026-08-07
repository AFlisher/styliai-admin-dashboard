import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import AnalyticsPage from './pages/AnalyticsPage';
import StyleManagerPage from './pages/StyleManagerPage';
import UserCreditsPage from './pages/UserCreditsPage';
import CreditPacksPage from './pages/CreditPacksPage';
import UsersByCountryPage from './pages/UsersByCountryPage';
import GenerationAnalyticsPage from './pages/GenerationAnalyticsPage';
import UsersPage from './pages/UsersPage';
import { Loader } from './components/Loader';
import { adminRoleOf, roleSatisfies, type AdminRole } from './utils/adminRoles';

type TabKey = 'analytics' | 'manager' | 'users' | 'credits' | 'packs' | 'country' | 'generationAnalytics';

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
  // Same tier as GET /api/admin/users(/:id) in adminRoutePolicy.js - this tab
  // reads user PII and can suspend/delete accounts, the same class of action
  // as balance adjustment.
  users: 'superadmin',
  credits: 'superadmin',
  packs: 'superadmin',
};

/**
 * Single source of truth for each tab's label/icon, shared by the nav pill
 * and the page header so the two can never drift out of sync.
 */
const TAB_META: Record<TabKey, { label: string; icon: string }> = {
  analytics: { label: 'Analytics', icon: 'fa-solid fa-chart-line' },
  manager: { label: 'Style Manager', icon: 'fa-solid fa-sliders' },
  users: { label: 'Users', icon: 'fa-solid fa-user-shield' },
  credits: { label: 'Credits', icon: 'fa-solid fa-coins' },
  packs: { label: 'Credit Packs', icon: 'fa-solid fa-box-open' },
  country: { label: 'Users by Country', icon: 'fa-solid fa-earth-americas' },
  generationAnalytics: { label: 'Generation Analytics', icon: 'fa-solid fa-star-half-stroke' },
};

const TAB_ORDER: TabKey[] = ['analytics', 'manager', 'users', 'credits', 'packs', 'country', 'generationAnalytics'];

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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">
            <i className="fa-solid fa-wand-magic-sparkles"></i>
          </div>
          <div className="logo-text">
            <h1>StyliAI Admin</h1>
            <p>Manage styles, categories and analytics</p>
          </div>
        </div>

        <nav className="sidebar-nav" role="tablist" aria-label="Admin sections" aria-orientation="vertical">
          {TAB_ORDER.filter(can).map((tab) => (
            <button
              key={tab}
              id={`tab-${tab}`}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tabpanel-${tab}`}
              className={`sidebar-nav-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              <i className={TAB_META[tab].icon}></i>
              <span>{TAB_META[tab].label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-signout">
            <span className="user-name-tag">
              <i className="fa-solid fa-user-shield"></i> {user.fullName || 'Admin'}
            </span>
            <button className="btn secondary signout-btn" onClick={logout} title="Sign Out">
              <i className="fa-solid fa-arrow-right-from-bracket"></i> Sign Out
            </button>
          </div>
        </div>
      </aside>

      <div className="content-area">
        <div className="container">
          <main
            className="main-content-layout"
            id={`tabpanel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
          >
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
                <div className="page-header">
                  <i className={TAB_META[activeTab].icon}></i>
                  <h2>{TAB_META[activeTab].label}</h2>
                </div>
                {activeTab === 'analytics' && <AnalyticsPage />}
                {activeTab === 'manager' && <StyleManagerPage />}
                {activeTab === 'users' && <UsersPage />}
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
      </div>
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

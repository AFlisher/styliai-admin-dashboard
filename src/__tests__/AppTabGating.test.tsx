// SEC-15.4: tabs render per role.
//
// Renders the real App against a session restored from localStorage, so this
// exercises the same path a returning admin takes.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import App from '../App';

// The pages are stubbed rather than their API layer: this suite is about which
// tabs render for which role, and a real page crashing on empty mock data would
// tear down the tree and make the tab assertions fail for unrelated reasons.
vi.mock('../pages/AnalyticsPage', () => ({ default: () => <div>analytics page</div> }));
vi.mock('../pages/StyleManagerPage', () => ({ default: () => <div>style manager page</div> }));
vi.mock('../pages/UsersPage', () => ({ default: () => <div>users page</div> }));
vi.mock('../pages/UserCreditsPage', () => ({ default: () => <div>credits page</div> }));
vi.mock('../pages/CreditPacksPage', () => ({ default: () => <div>packs page</div> }));
vi.mock('../pages/UsersByCountryPage', () => ({ default: () => <div>country page</div> }));
vi.mock('../pages/GenerationAnalyticsPage', () => ({
  default: () => <div>generation analytics page</div>,
}));

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return { ...actual, setupAuthInterceptor: vi.fn(), apiService: {} };
});

afterEach(cleanup);

function signInAs(adminRole?: string) {
  localStorage.setItem('styli_access_token', 'token-123');
  localStorage.setItem(
    'styli_admin_user',
    JSON.stringify({
      id: 'admin-1',
      email: 'admin@example.com',
      fullName: 'Test Admin',
      role: 'admin',
      ...(adminRole ? { adminRole } : {}),
    })
  );
}

const ALL_TABS = [
  /^analytics$/i,
  /style manager/i,
  /^users$/i,
  /^credits$/i,
  /credit packs/i,
  /users by country/i,
  /generation analytics/i,
];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('superadmin', () => {
  it('sees every tab', async () => {
    signInAs('superadmin');
    render(<App />);

    for (const tab of ALL_TABS) {
      expect(await screen.findByRole('tab', { name: tab })).toBeInTheDocument();
    }
  });
});

describe('editor', () => {
  it('sees the catalog and read-only tabs', async () => {
    signInAs('editor');
    render(<App />);

    expect(await screen.findByRole('tab', { name: /style manager/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^analytics$/i })).toBeInTheDocument();
  });

  it('does not see money, pricing, or user-management tabs', async () => {
    signInAs('editor');
    render(<App />);

    await screen.findByRole('tab', { name: /style manager/i });
    expect(screen.queryByRole('tab', { name: /^credits$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /credit packs/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^users$/i })).not.toBeInTheDocument();
  });
});

describe('viewer', () => {
  it('sees only the read-only tabs', async () => {
    signInAs('viewer');
    render(<App />);

    expect(await screen.findByRole('tab', { name: /^analytics$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /users by country/i })).toBeInTheDocument();

    expect(screen.queryByRole('tab', { name: /style manager/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^credits$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /credit packs/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^users$/i })).not.toBeInTheDocument();
  });
});

describe('a session that predates roles', () => {
  it('shows no privileged tabs and refuses to render the default panel', async () => {
    // The cached user object in localStorage has no adminRole. Their token
    // would be refused by every guarded route, so rendering pages that fire
    // requests would just produce a screenful of 403s.
    signInAs(undefined);
    render(<App />);

    await waitFor(() =>
      expect(screen.getByText(/does not have access to this section/i)).toBeInTheDocument()
    );

    for (const tab of ALL_TABS) {
      expect(screen.queryByRole('tab', { name: tab })).not.toBeInTheDocument();
    }
  });

  it('still offers sign out, so the fix is one click away', async () => {
    signInAs(undefined);
    render(<App />);

    expect(await screen.findByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });
});

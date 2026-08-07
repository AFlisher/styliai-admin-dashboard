// Operations Center: covers tab switching (each tab hits the right endpoint
// with the right filter), the merged Timeline, search/pagination on the
// audit-log-backed tabs, and the detail drawer for all three entry kinds.
// All backend calls go through the mocked apiService.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OperationsCenterPage from '../pages/OperationsCenterPage';

vi.mock('../services/api', () => ({
  apiService: {
    listAuditLog: vi.fn(),
    listSecurityEvents: vi.fn(),
    listPurchaseVerifications: vi.fn(),
  },
}));

import { apiService } from '../services/api';

const mockedApi = apiService as unknown as {
  listAuditLog: ReturnType<typeof vi.fn>;
  listSecurityEvents: ReturnType<typeof vi.fn>;
  listPurchaseVerifications: ReturnType<typeof vi.fn>;
};

const auditEntry = {
  id: 'audit-1',
  adminId: 'admin-1',
  adminEmail: 'admin@example.com',
  action: 'POST /api/admin/users/:id/suspend',
  targetType: 'users',
  targetId: 'user-9',
  before: null,
  after: { reason: 'abuse' },
  ip: '203.0.113.7',
  requestUrl: '/api/admin/users/user-9/suspend',
  statusCode: 200,
  createdAt: '2026-01-03T00:00:00.000Z',
};

const securityEvent = {
  id: 'event-1',
  eventType: 'auth_failure' as const,
  reason: 'wrong_password',
  subject: 'user-9',
  method: 'POST',
  endpoint: '/api/auth/login',
  ip: '198.51.100.4',
  userId: 'user-9',
  adminId: null,
  requestId: 'req-1',
  detail: null,
  createdAt: '2026-01-02T00:00:00.000Z',
};

const purchaseEntry = {
  id: 'tx-1',
  source: 'ad_reward' as const,
  userId: 'user-9',
  amount: 5,
  description: 'AdMob rewarded-ad verification',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function emptyAudit() {
  return { entries: [], total: 0, limit: 25, offset: 0 };
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.listAuditLog.mockResolvedValue({ entries: [auditEntry], total: 1, limit: 25, offset: 0 });
  mockedApi.listSecurityEvents.mockResolvedValue({ events: [securityEvent], total: 1, limit: 25, offset: 0 });
  mockedApi.listPurchaseVerifications.mockResolvedValue({
    entries: [purchaseEntry],
    total: 1,
    limit: 25,
    offset: 0,
    note: 'no real IAP flow yet',
  });
});

describe('OperationsCenterPage - Timeline', () => {
  it('merges all three sources sorted by most recent first', async () => {
    render(<OperationsCenterPage />);

    await screen.findByText('admin@example.com');
    const cards = document.querySelectorAll('.finding-card');
    expect(cards.length).toBe(3);
    // audit (Jan 3) should render before security (Jan 2) before purchase (Jan 1).
    expect(cards[0].textContent).toContain('admin@example.com');
    expect(cards[1].textContent).toContain('wrong_password');
    expect(cards[2].textContent).toContain('user-9');
  });

  it('opens the audit drawer when a timeline card is clicked', async () => {
    const user = userEvent.setup();
    render(<OperationsCenterPage />);
    await screen.findByText(/wrong_password/);

    const cards = document.querySelectorAll('.finding-card');
    await user.click(cards[0]);

    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('/api/admin/users/user-9/suspend', { exact: false })).toBeInTheDocument();
  });
});

describe('OperationsCenterPage - Admin Actions tab', () => {
  it('loads with no action filter and opens the drawer with before/after', async () => {
    const user = userEvent.setup();
    render(<OperationsCenterPage />);
    await user.click(screen.getByRole('button', { name: /^admin actions$/i }));

    await waitFor(() =>
      expect(mockedApi.listAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: undefined, limit: 25, offset: 0 })
      )
    );

    await user.click(await screen.findByText('admin@example.com'));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('abuse', { exact: false })).toBeInTheDocument();
  });

  it('debounces the search box into the q param', async () => {
    const user = userEvent.setup();
    render(<OperationsCenterPage />);
    await user.click(screen.getByRole('button', { name: /^admin actions$/i }));
    await screen.findByText('admin@example.com');
    mockedApi.listAuditLog.mockClear();

    await user.type(screen.getByLabelText(/search audit log/i), 'jane');

    expect(mockedApi.listAuditLog).not.toHaveBeenCalled();
    await waitFor(
      () => expect(mockedApi.listAuditLog).toHaveBeenCalledWith(expect.objectContaining({ q: 'jane' })),
      { timeout: 1000 }
    );
  });

  it('pages forward and back', async () => {
    const user = userEvent.setup();
    mockedApi.listAuditLog.mockResolvedValue({ entries: [auditEntry], total: 60, limit: 25, offset: 0 });
    render(<OperationsCenterPage />);
    await user.click(screen.getByRole('button', { name: /^admin actions$/i }));
    await screen.findByText('admin@example.com');

    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await waitFor(() =>
      expect(mockedApi.listAuditLog).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 25 }))
    );

    await user.click(screen.getByRole('button', { name: /^previous$/i }));
    await waitFor(() =>
      expect(mockedApi.listAuditLog).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 0 }))
    );
  });
});

describe('OperationsCenterPage - filtered audit tabs', () => {
  it('Account Deletions filters on the delete action', async () => {
    const user = userEvent.setup();
    mockedApi.listAuditLog.mockResolvedValue(emptyAudit());
    render(<OperationsCenterPage />);

    await user.click(screen.getByRole('button', { name: /account deletions/i }));

    await waitFor(() =>
      expect(mockedApi.listAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'POST /api/admin/users/:id/delete' })
      )
    );
  });

  it('Credit Adjustments filters on the adjust-balance action', async () => {
    const user = userEvent.setup();
    mockedApi.listAuditLog.mockResolvedValue(emptyAudit());
    render(<OperationsCenterPage />);

    await user.click(screen.getByRole('button', { name: /credit adjustments/i }));

    await waitFor(() =>
      expect(mockedApi.listAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'POST /api/admin/users/:id/adjust-balance' })
      )
    );
  });

  it('Suspensions & Reinstatements filters on both actions', async () => {
    const user = userEvent.setup();
    mockedApi.listAuditLog.mockResolvedValue(emptyAudit());
    render(<OperationsCenterPage />);

    await user.click(screen.getByRole('button', { name: /suspensions & reinstatements/i }));

    await waitFor(() =>
      expect(mockedApi.listAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'POST /api/admin/users/:id/suspend,POST /api/admin/users/:id/reinstate',
        })
      )
    );
  });

  it('shows an empty state when a filtered tab has nothing', async () => {
    const user = userEvent.setup();
    mockedApi.listAuditLog.mockResolvedValue(emptyAudit());
    render(<OperationsCenterPage />);

    await user.click(screen.getByRole('button', { name: /account deletions/i }));

    expect(await screen.findByText(/no account deletions recorded yet/i)).toBeInTheDocument();
  });
});

describe('OperationsCenterPage - Security Events / Failed Logins tabs', () => {
  it('Security Events loads with no eventType filter', async () => {
    const user = userEvent.setup();
    render(<OperationsCenterPage />);

    await user.click(screen.getByRole('button', { name: /^security events$/i }));

    await waitFor(() =>
      expect(mockedApi.listSecurityEvents).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: undefined })
      )
    );

    await user.click(await screen.findByText('wrong_password'));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('198.51.100.4')).toBeInTheDocument();
  });

  it('Failed Logins filters on eventType=auth_failure', async () => {
    const user = userEvent.setup();
    render(<OperationsCenterPage />);

    await user.click(screen.getByRole('button', { name: /^failed logins$/i }));

    await waitFor(() =>
      expect(mockedApi.listSecurityEvents).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'auth_failure' })
      )
    );
  });
});

describe('OperationsCenterPage - Purchase Verification tab', () => {
  it('lists entries, shows the honesty note, and filters by source', async () => {
    const user = userEvent.setup();
    render(<OperationsCenterPage />);

    await user.click(screen.getByRole('button', { name: /purchase verification/i }));

    expect(await screen.findByText(/no real iap flow yet/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/^source$/i), 'ad_reward');
    await waitFor(() =>
      expect(mockedApi.listPurchaseVerifications).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'ad_reward' })
      )
    );
  });

  it('opens the drawer for a purchase entry', async () => {
    const user = userEvent.setup();
    render(<OperationsCenterPage />);
    await user.click(screen.getByRole('button', { name: /purchase verification/i }));

    await user.click(await screen.findByText('user-9'));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('5 credits')).toBeInTheDocument();
  });
});

// User Management & Moderation module - covers the Users page's search/filter/
// pagination list, opening the detail drawer, the suspend/unsuspend/delete
// actions, and the Pending Review queue's review actions. All backend calls
// go through the mocked apiService, so this suite is about the page's own
// logic (debounce, state, which endpoint gets called with what) rather than
// re-testing the API layer.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UsersPage from '../pages/UsersPage';

vi.mock('../services/api', () => ({
  apiService: {
    listUsers: vi.fn(),
    getUserDetail: vi.fn(),
    listAbuseFindings: vi.fn(),
    listUserSessions: vi.fn(),
    suspendUser: vi.fn(),
    reinstateUser: vi.fn(),
    deleteUserAccount: vi.fn(),
    reviewAbuseFinding: vi.fn(),
  },
}));

import { apiService } from '../services/api';

const mockedApi = apiService as unknown as {
  listUsers: ReturnType<typeof vi.fn>;
  getUserDetail: ReturnType<typeof vi.fn>;
  listAbuseFindings: ReturnType<typeof vi.fn>;
  listUserSessions: ReturnType<typeof vi.fn>;
  suspendUser: ReturnType<typeof vi.fn>;
  reinstateUser: ReturnType<typeof vi.fn>;
  deleteUserAccount: ReturnType<typeof vi.fn>;
  reviewAbuseFinding: ReturnType<typeof vi.fn>;
};

const activeUser = {
  id: 'u-1',
  email: 'jane@example.com',
  fullName: 'Jane Doe',
  status: 'active' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  countryCode: 'US',
  balance: 42,
  riskScore: 12,
};

function makeUserDetail(overrides: Partial<typeof activeUser> = {}) {
  const user = { ...activeUser, ...overrides };
  return {
    user: {
      ...user,
      statusReason: null,
      statusChangedAt: null,
      emailVerified: true,
      riskFactors: null,
      riskComputedAt: null,
    },
    credits: { balance: user.balance, recentTransactions: [] },
  };
}

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.listUsers.mockResolvedValue({ users: [activeUser], total: 1, limit: 25, offset: 0 });
  mockedApi.getUserDetail.mockResolvedValue(makeUserDetail());
  mockedApi.listAbuseFindings.mockResolvedValue({ findings: [], autoSuspendEnabled: false });
  mockedApi.listUserSessions.mockResolvedValue({ sessions: [] });
});

describe('UsersPage - list, search and filters', () => {
  it('loads and renders users on mount', async () => {
    render(<UsersPage />);

    expect(await screen.findByText('jane@example.com')).toBeInTheDocument();
    expect(mockedApi.listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ q: '', status: 'all', sort: 'newest', limit: 25, offset: 0 })
    );
  });

  it('debounces search input into the q param', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    await screen.findByText('jane@example.com');
    mockedApi.listUsers.mockClear();

    await user.type(screen.getByLabelText(/search users/i), 'jane');

    // Typing alone (before the debounce elapses) must not have re-queried yet.
    expect(mockedApi.listUsers).not.toHaveBeenCalled();

    await waitFor(
      () => expect(mockedApi.listUsers).toHaveBeenCalledWith(expect.objectContaining({ q: 'jane' })),
      { timeout: 1000 }
    );
  });

  it('re-queries with the selected status filter and resets to the first page', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    await screen.findByText('jane@example.com');
    mockedApi.listUsers.mockClear();

    await user.selectOptions(screen.getByLabelText(/^status$/i), 'suspended');

    await waitFor(() =>
      expect(mockedApi.listUsers).toHaveBeenCalledWith(expect.objectContaining({ status: 'suspended', offset: 0 }))
    );
  });

  it('shows an empty state when nothing matches', async () => {
    mockedApi.listUsers.mockResolvedValue({ users: [], total: 0, limit: 25, offset: 0 });
    render(<UsersPage />);

    expect(await screen.findByText(/no users match this search/i)).toBeInTheDocument();
  });
});

describe('UsersPage - detail drawer', () => {
  it('opens the drawer with profile, credits and risk score on row click', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    await user.click(await screen.findByText('jane@example.com'));

    const drawer = await screen.findByRole('dialog');
    expect(mockedApi.getUserDetail).toHaveBeenCalledWith('u-1');
    expect(within(drawer).getByText('Jane Doe')).toBeInTheDocument();
    expect(within(drawer).getByText('42')).toBeInTheDocument(); // credits balance
    expect(drawer.querySelector('.risk-score-value')?.textContent).toBe('12/100');
  });

  it('suspends an active account and refreshes the list', async () => {
    const user = userEvent.setup();
    mockedApi.suspendUser.mockResolvedValue({ id: 'u-1', email: 'jane@example.com', status: 'suspended', tokenVersion: 1 });
    render(<UsersPage />);
    await user.click(await screen.findByText('jane@example.com'));
    const drawer = await screen.findByRole('dialog');

    await user.click(within(drawer).getByRole('button', { name: /^suspend$/i }));
    const confirmDialog = await screen.findByRole('dialog', { name: /suspend account/i });
    await user.click(within(confirmDialog).getByRole('button', { name: /confirm/i }));

    await waitFor(() => expect(mockedApi.suspendUser).toHaveBeenCalledWith('u-1', 'suspended', undefined));
    // The row and the drawer both re-fetch after a status change.
    await waitFor(() => expect(mockedApi.getUserDetail).toHaveBeenCalledTimes(2));
  });

  it('deletes an account and closes the drawer', async () => {
    const user = userEvent.setup();
    mockedApi.deleteUserAccount.mockResolvedValue({ id: 'u-1', email: 'jane@example.com', status: 'deleted', tokenVersion: 1 });
    render(<UsersPage />);
    await user.click(await screen.findByText('jane@example.com'));
    const drawer = await screen.findByRole('dialog');

    await user.click(within(drawer).getByRole('button', { name: /delete account/i }));
    const confirmDialog = await screen.findByRole('dialog', { name: /delete account/i });
    await user.click(within(confirmDialog).getByRole('button', { name: /^delete account$/i }));

    await waitFor(() => expect(mockedApi.deleteUserAccount).toHaveBeenCalledWith('u-1', undefined));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('surfaces unreviewed abuse findings with review actions', async () => {
    const user = userEvent.setup();
    mockedApi.listAbuseFindings.mockResolvedValue({
      findings: [
        {
          id: 'f-1',
          userId: 'u-1',
          detector: 'origin_siblings',
          severity: 'high',
          evidence: { siblingCount: 12 },
          originHash: 'abc123',
          action: 'flagged',
          reviewedAt: null,
          reviewOutcome: null,
          windowStart: '2026-01-01T00:00:00.000Z',
          windowEnd: '2026-01-01T01:00:00.000Z',
          createdAt: '2026-01-01T01:00:00.000Z',
        },
      ],
      autoSuspendEnabled: false,
    });
    mockedApi.reviewAbuseFinding.mockResolvedValue({ id: 'f-1', reviewOutcome: 'confirmed' });

    render(<UsersPage />);
    await user.click(await screen.findByText('jane@example.com'));
    const drawer = await screen.findByRole('dialog');

    expect(within(drawer).getByText('origin_siblings')).toBeInTheDocument();
    await user.click(within(drawer).getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => expect(mockedApi.reviewAbuseFinding).toHaveBeenCalledWith('f-1', 'confirmed'));
  });
});

describe('UsersPage - Pending Review tab', () => {
  it('lists unreviewed findings independent of a specific user', async () => {
    const user = userEvent.setup();
    mockedApi.listAbuseFindings.mockResolvedValue({
      findings: [
        {
          id: 'f-2',
          userId: 'u-1',
          detector: 'reward_ratio',
          severity: 'medium',
          evidence: {},
          originHash: null,
          action: 'flagged',
          reviewedAt: null,
          reviewOutcome: null,
          windowStart: '2026-01-01T00:00:00.000Z',
          windowEnd: '2026-01-01T01:00:00.000Z',
          createdAt: '2026-01-01T01:00:00.000Z',
        },
      ],
      autoSuspendEnabled: false,
    });

    render(<UsersPage />);
    await user.click(screen.getByRole('button', { name: /pending review/i }));

    expect(await screen.findByText('reward_ratio')).toBeInTheDocument();
    expect(mockedApi.listAbuseFindings).toHaveBeenCalledWith(
      expect.objectContaining({ includeReviewed: false })
    );
  });

  it('removes a finding from the queue once reviewed', async () => {
    const user = userEvent.setup();
    mockedApi.listAbuseFindings.mockResolvedValue({
      findings: [
        {
          id: 'f-3',
          userId: null,
          detector: 'signup_burst',
          severity: 'low',
          evidence: {},
          originHash: 'xyz',
          action: 'flagged',
          reviewedAt: null,
          reviewOutcome: null,
          windowStart: '2026-01-01T00:00:00.000Z',
          windowEnd: '2026-01-01T01:00:00.000Z',
          createdAt: '2026-01-01T01:00:00.000Z',
        },
      ],
      autoSuspendEnabled: false,
    });
    mockedApi.reviewAbuseFinding.mockResolvedValue({ id: 'f-3', reviewOutcome: 'ignored' });

    render(<UsersPage />);
    await user.click(screen.getByRole('button', { name: /pending review/i }));
    await screen.findByText('signup_burst');

    await user.click(screen.getByRole('button', { name: /^ignore$/i }));

    await waitFor(() => expect(mockedApi.reviewAbuseFinding).toHaveBeenCalledWith('f-3', 'ignored'));
    await waitFor(() => expect(screen.queryByText('signup_burst')).not.toBeInTheDocument());
  });
});

// System Health module: covers the Overview status cards + detail drawer,
// manual and auto refresh, the merged Timeline, and the Incidents tab's
// search/filter/pagination. All backend calls go through the mocked
// apiService, so this suite is about the page's own logic rather than
// re-testing the API layer.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SystemHealthPage from '../pages/SystemHealthPage';

vi.mock('../services/api', () => ({
  apiService: {
    getSystemHealth: vi.fn(),
    listSystemIncidents: vi.fn(),
  },
}));

import { apiService } from '../services/api';

const mockedApi = apiService as unknown as {
  getSystemHealth: ReturnType<typeof vi.fn>;
  listSystemIncidents: ReturnType<typeof vi.fn>;
};

function makeHealth(overrides: Record<string, any> = {}) {
  return {
    status: 'ok',
    generatedAt: '2026-01-03T00:00:00.000Z',
    backend: {
      status: 'ok',
      uptimeSeconds: 3725,
      nodeVersion: 'v20.10.0',
      nodeEnv: 'production',
      requests: { total: 1000, byStatusClass: { '2xx': 950 }, errorRate: 0.02, serverErrorRate: 0.001 },
    },
    database: { status: 'ok', latencyMs: 12, pool: { total: 5, idle: 3, waiting: 0 } },
    storage: { status: 'ok', megabytes: 512.3, objectCount: 210, truncated: false, asOf: '2026-01-03T00:00:00.000Z', cached: true },
    email: { status: 'ok', provider: 'resend', configured: true, note: null },
    imageProvider: { status: 'ok', provider: 'fal', recentIncidentCount: 0, lastIncidentAt: null },
    queue: { available: false, status: 'not_applicable', note: 'No job queue exists in this codebase.' },
    scheduledJobs: [
      { name: 'abuse_detection_sweep', description: 'abuse sweep', enabled: true, intervalMs: 900000, lastSweepAt: '2026-01-02T23:00:00.000Z', sweeping: false },
      { name: 'integrity_ledger_sweep', description: 'integrity sweep', enabled: true, intervalMs: 3600000, lastSweepAt: null, sweeping: false },
    ],
    environment: {
      nodeEnv: 'production',
      imageProvider: 'fal',
      logLevel: 'info',
      abuseDetection: { sweepEnabled: true, sweepIntervalMs: 900000, autoSuspendEnabled: false },
      playIntegrity: { enforcement: 'log', sweepIntervalMs: 3600000, configured: false },
      servicesConfigured: { email: true, stabilityAI: false, gemini: true, fal: true, turnstile: false },
    },
    version: { app: '1.0.0', commit: 'abc1234' },
    lastMigration: { filename: 'migration_x.sql', appliedAt: '2026-01-01T00:00:00.000Z', lastRunAt: '2026-01-01T00:00:00.000Z', runCount: 1, durationMs: 20 },
    recentMigrations: [{ filename: 'migration_x.sql', appliedAt: '2026-01-01T00:00:00.000Z', lastRunAt: '2026-01-01T00:00:00.000Z', runCount: 1, durationMs: 20 }],
    migrationsError: null,
    lastBackup: {
      database: { id: 'run-1', kind: 'database', status: 'success', bytes: 2048, objectCount: null, durationMs: 900, detail: { sha256: 'abc' }, createdAt: '2026-01-02T00:00:00.000Z' },
      storage: null,
    },
    recentBackups: [{ id: 'run-1', kind: 'database', status: 'success', bytes: 2048, objectCount: null, durationMs: 900, detail: { sha256: 'abc' }, createdAt: '2026-01-02T00:00:00.000Z' }],
    backupsError: null,
    ...overrides,
  };
}

const incident = {
  id: 'incident-1',
  source: 'image_provider',
  severity: 'error',
  provider: 'fal',
  phase: 'provider',
  kind: 'rate_limited',
  message: 'upstream 429',
  statusCode: 429,
  requestId: 'req-1',
  userId: null,
  endpoint: 'POST /api/generate',
  detail: { errorName: 'ApiError' },
  createdAt: '2026-01-02T12:00:00.000Z',
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.getSystemHealth.mockResolvedValue(makeHealth());
  mockedApi.listSystemIncidents.mockResolvedValue({ incidents: [incident], total: 1, limit: 25, offset: 0 });
});

describe('SystemHealthPage - Overview', () => {
  it('loads and renders status cards for every section', async () => {
    render(<SystemHealthPage />);

    await screen.findByText('Backend');
    const grid = document.querySelector('.stats-grid') as HTMLElement;
    expect(within(grid).getByText('Backend')).toBeInTheDocument();
    expect(within(grid).getByText('Database')).toBeInTheDocument();
    expect(within(grid).getByText('Storage')).toBeInTheDocument();
    expect(within(grid).getByText('Email')).toBeInTheDocument();
    expect(within(grid).getByText('Image provider')).toBeInTheDocument();
    expect(within(grid).getByText('Queue')).toBeInTheDocument();
    expect(mockedApi.getSystemHealth).toHaveBeenCalledTimes(1);
  });

  it('opens the detail drawer with pool stats when the Database card is clicked', async () => {
    const user = userEvent.setup();
    render(<SystemHealthPage />);
    await screen.findByText('Database');

    await user.click(screen.getByText('Database'));

    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('12 ms')).toBeInTheDocument();
  });

  it('lists scheduled jobs with their enabled state', async () => {
    render(<SystemHealthPage />);

    expect(await screen.findByText('abuse detection sweep')).toBeInTheDocument();
    expect(screen.getByText('integrity ledger sweep')).toBeInTheDocument();
    expect(screen.getAllByText('enabled').length).toBeGreaterThan(0);
  });

  it('shows an inline error banner but keeps stale data visible when a refresh fails', async () => {
    render(<SystemHealthPage />);
    await screen.findByText('Backend');

    mockedApi.getSystemHealth.mockRejectedValueOnce(new Error('network down'));
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /refresh/i }));

    expect(await screen.findByText(/last refresh failed/i)).toBeInTheDocument();
    // Stale data is still on screen, not replaced with an error page.
    expect(screen.getByText('Backend')).toBeInTheDocument();
  });

  it('shows a full-page error state when the very first load fails', async () => {
    mockedApi.getSystemHealth.mockReset().mockRejectedValue(new Error('boom'));
    render(<SystemHealthPage />);

    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(screen.queryByText('Backend')).not.toBeInTheDocument();
  });
});

describe('SystemHealthPage - manual and auto refresh', () => {
  it('manual refresh re-fetches system health', async () => {
    const user = userEvent.setup();
    render(<SystemHealthPage />);
    await screen.findByText('Backend');
    mockedApi.getSystemHealth.mockClear();

    await user.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => expect(mockedApi.getSystemHealth).toHaveBeenCalledTimes(1));
  });

  it('auto-refreshes on the 30s interval while enabled', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<SystemHealthPage />);
    await vi.waitFor(() => expect(mockedApi.getSystemHealth).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(30000);
    await vi.waitFor(() => expect(mockedApi.getSystemHealth).toHaveBeenCalledTimes(2));
  });

  it('stops auto-refreshing once the toggle is switched off', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SystemHealthPage />);
    await vi.waitFor(() => expect(mockedApi.getSystemHealth).toHaveBeenCalledTimes(1));

    await user.click(screen.getByLabelText(/auto refresh/i));
    mockedApi.getSystemHealth.mockClear();

    await vi.advanceTimersByTimeAsync(60000);
    expect(mockedApi.getSystemHealth).not.toHaveBeenCalled();
  });
});

describe('SystemHealthPage - Timeline', () => {
  it('merges incidents, migrations and backups sorted by most recent first', async () => {
    const user = userEvent.setup();
    render(<SystemHealthPage />);
    await screen.findByText('Backend');

    await user.click(screen.getByRole('button', { name: /^timeline$/i }));

    await waitFor(() => expect(mockedApi.listSystemIncidents).toHaveBeenCalled());
    const cards = await screen.findAllByText(/upstream 429|migration_x\.sql|database backup/i);
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });

  it('opens the incident drawer from a timeline card', async () => {
    const user = userEvent.setup();
    render(<SystemHealthPage />);
    await screen.findByText('Backend');
    await user.click(screen.getByRole('button', { name: /^timeline$/i }));

    const card = await screen.findByText('upstream 429');
    await user.click(card);

    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('req-1', { exact: false })).toBeInTheDocument();
  });
});

describe('SystemHealthPage - Incidents tab', () => {
  it('loads incidents scoped to image_provider and shows severity/message', async () => {
    const user = userEvent.setup();
    render(<SystemHealthPage />);
    await screen.findByText('Backend');

    await user.click(screen.getByRole('button', { name: /^incidents$/i }));

    await waitFor(() =>
      expect(mockedApi.listSystemIncidents).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'image_provider', severity: 'all' })
      )
    );
    expect(await screen.findByText('upstream 429')).toBeInTheDocument();
  });

  it('debounces the search box into the q param', async () => {
    const user = userEvent.setup();
    render(<SystemHealthPage />);
    await screen.findByText('Backend');
    await user.click(screen.getByRole('button', { name: /^incidents$/i }));
    await screen.findByText('upstream 429');
    mockedApi.listSystemIncidents.mockClear();

    await user.type(screen.getByLabelText(/search incidents/i), 'timeout');

    expect(mockedApi.listSystemIncidents).not.toHaveBeenCalled();
    await waitFor(
      () => expect(mockedApi.listSystemIncidents).toHaveBeenCalledWith(expect.objectContaining({ q: 'timeout' })),
      { timeout: 1000 }
    );
  });

  it('re-queries with the selected severity filter and resets to the first page', async () => {
    const user = userEvent.setup();
    render(<SystemHealthPage />);
    await screen.findByText('Backend');
    await user.click(screen.getByRole('button', { name: /^incidents$/i }));
    await screen.findByText('upstream 429');
    mockedApi.listSystemIncidents.mockClear();

    await user.selectOptions(screen.getByLabelText(/^severity$/i), 'warning');

    await waitFor(() =>
      expect(mockedApi.listSystemIncidents).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warning', offset: 0 }))
    );
  });

  it('shows an empty state when nothing matches', async () => {
    mockedApi.listSystemIncidents.mockResolvedValue({ incidents: [], total: 0, limit: 25, offset: 0 });
    const user = userEvent.setup();
    render(<SystemHealthPage />);
    await screen.findByText('Backend');

    await user.click(screen.getByRole('button', { name: /^incidents$/i }));

    expect(await screen.findByText(/no image-provider incidents recorded yet/i)).toBeInTheDocument();
  });

  it('paginates forward and back', async () => {
    const user = userEvent.setup();
    mockedApi.listSystemIncidents.mockResolvedValue({ incidents: [incident], total: 60, limit: 25, offset: 0 });
    render(<SystemHealthPage />);
    await screen.findByText('Backend');
    await user.click(screen.getByRole('button', { name: /^incidents$/i }));
    await screen.findByText('upstream 429');

    await user.click(screen.getByRole('button', { name: /^next$/i }));
    await waitFor(() =>
      expect(mockedApi.listSystemIncidents).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 25 }))
    );

    await user.click(screen.getByRole('button', { name: /^previous$/i }));
    await waitFor(() =>
      expect(mockedApi.listSystemIncidents).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 0 }))
    );
  });

  it('opens the detail drawer with full incident fields on row click', async () => {
    const user = userEvent.setup();
    render(<SystemHealthPage />);
    await screen.findByText('Backend');
    await user.click(screen.getByRole('button', { name: /^incidents$/i }));

    await user.click(await screen.findByText('upstream 429'));

    const drawer = await screen.findByRole('dialog');
    // "rate_limited" is both the drawer title (h3) and the Kind field's value.
    expect(within(drawer).getAllByText('rate_limited')).toHaveLength(2);
    expect(within(drawer).getByText('POST /api/generate')).toBeInTheDocument();
  });
});

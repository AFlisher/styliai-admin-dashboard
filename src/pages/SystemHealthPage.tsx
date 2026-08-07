import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../services/api';
import {
  SystemHealthResponse,
  SystemIncident,
  SystemIncidentSource,
  SystemIncidentSeverity,
  HealthStatus,
  MigrationRecord,
  BackupRun,
} from '../types';
import { Badge, BadgeTone } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Loader } from '../components/Loader';
import { Drawer } from '../components/Drawer';

const AUTO_REFRESH_MS = 30000;
const PAGE_SIZE = 25;

type DisplayStatus = HealthStatus | 'not_applicable';

const STATUS_TONE: Record<DisplayStatus, BadgeTone> = {
  ok: 'success',
  degraded: 'warning',
  down: 'danger',
  not_applicable: 'neutral',
};

const STATUS_LABEL: Record<DisplayStatus, string> = {
  ok: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
  not_applicable: 'N/A',
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function formatMegabytes(mb: number | null | undefined): string {
  if (mb === null || mb === undefined) return '—';
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—';
  return formatMegabytes(bytes / (1024 * 1024));
}

function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (d || h) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function formatAgo(date: Date | null): string {
  if (!date) return 'never';
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined || (typeof value === 'object' && Object.keys(value).length === 0)) {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }
  return <pre className="finding-evidence">{JSON.stringify(value, null, 2)}</pre>;
}

const StatusCard: React.FC<{
  title: string;
  status: DisplayStatus;
  value: string;
  detail: string;
  onClick: () => void;
}> = ({ title, status, value, detail, onClick }) => (
  <div
    className="stat-card"
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
    style={{ cursor: 'pointer' }}
  >
    <div className="stat-header">
      <span className="stat-title">{title}</span>
      <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
    </div>
    <div className="stat-value">{value}</div>
    <div className="stat-trend">{detail}</div>
  </div>
);

const PaginationBar: React.FC<{
  from: number;
  to: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}> = ({ from, to, total, onPrev, onNext }) => (
  <div className="pagination-bar">
    <span className="pagination-bar-summary">
      {from}–{to} of {total}
    </span>
    <div className="pagination-bar-controls">
      <button className="btn secondary btn-small" onClick={onPrev} disabled={from <= 1}>
        Previous
      </button>
      <button className="btn secondary btn-small" onClick={onNext} disabled={to >= total}>
        Next
      </button>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Detail drawer - one drawer, one renderer per section kind, picked by what
// was clicked. Same "one Drawer, content varies by kind" shape as
// UserDetailDrawer and Operations Center's detail drawer.
// ---------------------------------------------------------------------------

type SelectedItem =
  | { kind: 'backend'; data: SystemHealthResponse['backend'] }
  | { kind: 'database'; data: SystemHealthResponse['database'] }
  | { kind: 'storage'; data: SystemHealthResponse['storage'] }
  | { kind: 'email'; data: SystemHealthResponse['email'] }
  | { kind: 'imageProvider'; data: SystemHealthResponse['imageProvider'] }
  | { kind: 'queue'; data: SystemHealthResponse['queue'] }
  | { kind: 'incident'; data: SystemIncident }
  | { kind: 'migration'; data: MigrationRecord }
  | { kind: 'backup'; data: BackupRun }
  | null;

function drawerTitle(selected: SelectedItem): string {
  if (!selected) return '';
  switch (selected.kind) {
    case 'backend':
      return 'Backend';
    case 'database':
      return 'Database';
    case 'storage':
      return 'Storage';
    case 'email':
      return 'Email service';
    case 'imageProvider':
      return 'Image provider';
    case 'queue':
      return 'Queue';
    case 'incident':
      return selected.data.kind || 'Incident';
    case 'migration':
      return selected.data.filename;
    case 'backup':
      return `${selected.data.kind === 'database' ? 'Database' : 'Storage'} backup`;
    default:
      return '';
  }
}

const SystemHealthDetailDrawer: React.FC<{ selected: SelectedItem; onClose: () => void }> = ({
  selected,
  onClose,
}) => (
  <Drawer title={drawerTitle(selected)} isOpen={selected !== null} onClose={onClose}>
    {selected?.kind === 'backend' && (
      <section>
        <div className="drawer-meta-grid">
          <div className="drawer-meta-item">
            <label>Uptime</label>
            <span>{formatUptime(selected.data.uptimeSeconds)}</span>
          </div>
          <div className="drawer-meta-item">
            <label>Node version</label>
            <span>{selected.data.nodeVersion}</span>
          </div>
          <div className="drawer-meta-item">
            <label>NODE_ENV</label>
            <span>{selected.data.nodeEnv || '—'}</span>
          </div>
          <div className="drawer-meta-item">
            <label>Requests (since restart)</label>
            <span>{selected.data.requests.total.toLocaleString()}</span>
          </div>
          <div className="drawer-meta-item">
            <label>Error rate</label>
            <span>{(selected.data.requests.errorRate * 100).toFixed(2)}%</span>
          </div>
          <div className="drawer-meta-item">
            <label>Server error rate (5xx)</label>
            <span>{(selected.data.requests.serverErrorRate * 100).toFixed(2)}%</span>
          </div>
        </div>
      </section>
    )}

    {selected?.kind === 'database' && (
      <section>
        <div className="drawer-meta-grid">
          <div className="drawer-meta-item">
            <label>Latency</label>
            <span>{formatDuration(selected.data.latencyMs)}</span>
          </div>
          <div className="drawer-meta-item">
            <label>Pool - total</label>
            <span>{selected.data.pool?.total ?? '—'}</span>
          </div>
          <div className="drawer-meta-item">
            <label>Pool - idle</label>
            <span>{selected.data.pool?.idle ?? '—'}</span>
          </div>
          <div className="drawer-meta-item">
            <label>Pool - waiting</label>
            <span>{selected.data.pool?.waiting ?? '—'}</span>
          </div>
        </div>
        {selected.data.error && (
          <p style={{ marginTop: 'var(--space-12)', fontSize: 'var(--font-size-12)', color: 'var(--danger)' }}>
            {selected.data.error}
          </p>
        )}
      </section>
    )}

    {selected?.kind === 'storage' && (
      <section>
        <div className="drawer-meta-grid">
          <div className="drawer-meta-item">
            <label>Used</label>
            <span>{formatMegabytes(selected.data.megabytes)}</span>
          </div>
          <div className="drawer-meta-item">
            <label>Objects</label>
            <span>{selected.data.objectCount?.toLocaleString() ?? '—'}</span>
          </div>
          <div className="drawer-meta-item">
            <label>As of</label>
            <span>{formatDateTime(selected.data.asOf)}</span>
          </div>
          <div className="drawer-meta-item">
            <label>Cached / stale / truncated</label>
            <span>
              {selected.data.cached ? 'cached' : 'fresh'}
              {selected.data.stale ? ' · stale' : ''}
              {selected.data.truncated ? ' · truncated' : ''}
            </span>
          </div>
        </div>
        {selected.data.error && (
          <p style={{ marginTop: 'var(--space-12)', fontSize: 'var(--font-size-12)', color: 'var(--danger)' }}>
            {selected.data.error}
          </p>
        )}
      </section>
    )}

    {selected?.kind === 'email' && (
      <section>
        <div className="drawer-meta-grid">
          <div className="drawer-meta-item">
            <label>Provider</label>
            <span>{selected.data.provider}</span>
          </div>
          <div className="drawer-meta-item">
            <label>Configured</label>
            <span>{selected.data.configured ? 'Yes' : 'No'}</span>
          </div>
        </div>
        {selected.data.note && (
          <p style={{ marginTop: 'var(--space-12)', fontSize: 'var(--font-size-12)', color: 'var(--text-muted)' }}>
            {selected.data.note}
          </p>
        )}
      </section>
    )}

    {selected?.kind === 'imageProvider' && (
      <section>
        <div className="drawer-meta-grid">
          <div className="drawer-meta-item">
            <label>Provider</label>
            <span>{selected.data.provider}</span>
          </div>
          <div className="drawer-meta-item">
            <label>Incidents (24h)</label>
            <span>{selected.data.recentIncidentCount ?? '—'}</span>
          </div>
          <div className="drawer-meta-item">
            <label>Last incident</label>
            <span>{formatDateTime(selected.data.lastIncidentAt)}</span>
          </div>
        </div>
      </section>
    )}

    {selected?.kind === 'queue' && (
      <section>
        <p style={{ fontSize: 'var(--font-size-13)', color: 'var(--text-main)' }}>{selected.data.note}</p>
      </section>
    )}

    {selected?.kind === 'incident' && (
      <>
        <section>
          <div className="drawer-meta-grid">
            <div className="drawer-meta-item">
              <label>Source</label>
              <span>{selected.data.source}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Severity</label>
              <span>{selected.data.severity}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Provider</label>
              <span>{selected.data.provider || '—'}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Phase</label>
              <span>{selected.data.phase || '—'}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Kind</label>
              <span>{selected.data.kind || '—'}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Status code</label>
              <span>{selected.data.statusCode ?? '—'}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Endpoint</label>
              <span>{selected.data.endpoint || '—'}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Request ID</label>
              <span>{selected.data.requestId || '—'}</span>
            </div>
            <div className="drawer-meta-item">
              <label>When</label>
              <span>{formatDateTime(selected.data.createdAt)}</span>
            </div>
          </div>
        </section>
        <section>
          <div className="drawer-section-title">Message</div>
          <p style={{ fontSize: 'var(--font-size-13)' }}>{selected.data.message || '—'}</p>
        </section>
        <section>
          <div className="drawer-section-title">Detail</div>
          <JsonBlock value={selected.data.detail} />
        </section>
      </>
    )}

    {selected?.kind === 'migration' && (
      <section>
        <div className="drawer-meta-grid">
          <div className="drawer-meta-item">
            <label>Filename</label>
            <span>{selected.data.filename}</span>
          </div>
          <div className="drawer-meta-item">
            <label>First applied</label>
            <span>{formatDateTime(selected.data.appliedAt)}</span>
          </div>
          <div className="drawer-meta-item">
            <label>Last run</label>
            <span>{formatDateTime(selected.data.lastRunAt)}</span>
          </div>
          <div className="drawer-meta-item">
            <label>Run count</label>
            <span>{selected.data.runCount}</span>
          </div>
          <div className="drawer-meta-item">
            <label>Duration</label>
            <span>{formatDuration(selected.data.durationMs)}</span>
          </div>
        </div>
      </section>
    )}

    {selected?.kind === 'backup' && (
      <>
        <section>
          <div className="drawer-meta-grid">
            <div className="drawer-meta-item">
              <label>Kind</label>
              <span>{selected.data.kind}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Status</label>
              <Badge tone={selected.data.status === 'success' ? 'success' : 'danger'}>{selected.data.status}</Badge>
            </div>
            <div className="drawer-meta-item">
              <label>Size</label>
              <span>{formatBytes(selected.data.bytes)}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Objects</label>
              <span>{selected.data.objectCount ?? '—'}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Duration</label>
              <span>{formatDuration(selected.data.durationMs)}</span>
            </div>
            <div className="drawer-meta-item">
              <label>When</label>
              <span>{formatDateTime(selected.data.createdAt)}</span>
            </div>
          </div>
        </section>
        <section>
          <div className="drawer-section-title">Detail</div>
          <JsonBlock value={selected.data.detail} />
        </section>
      </>
    )}
  </Drawer>
);

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

const OverviewTab: React.FC<{ health: SystemHealthResponse; onSelect: (item: SelectedItem) => void }> = ({
  health,
  onSelect,
}) => (
  <>
    <div className="stats-grid">
      <StatusCard
        title="Backend"
        status={health.backend.status}
        value={formatUptime(health.backend.uptimeSeconds)}
        detail={`${health.backend.requests.total.toLocaleString()} requests since restart`}
        onClick={() => onSelect({ kind: 'backend', data: health.backend })}
      />
      <StatusCard
        title="Database"
        status={health.database.status}
        value={formatDuration(health.database.latencyMs)}
        detail={health.database.pool ? `pool: ${health.database.pool.total} total, ${health.database.pool.idle} idle` : 'unreachable'}
        onClick={() => onSelect({ kind: 'database', data: health.database })}
      />
      <StatusCard
        title="Storage"
        status={health.storage.status}
        value={formatMegabytes(health.storage.megabytes)}
        detail={`${health.storage.objectCount?.toLocaleString() ?? '—'} objects`}
        onClick={() => onSelect({ kind: 'storage', data: health.storage })}
      />
      <StatusCard
        title="Email"
        status={health.email.status}
        value={health.email.configured ? 'Configured' : 'Simulated'}
        detail={health.email.provider}
        onClick={() => onSelect({ kind: 'email', data: health.email })}
      />
      <StatusCard
        title="Image provider"
        status={health.imageProvider.status}
        value={health.imageProvider.provider}
        detail={`${health.imageProvider.recentIncidentCount ?? 0} incidents (24h)`}
        onClick={() => onSelect({ kind: 'imageProvider', data: health.imageProvider })}
      />
      <StatusCard
        title="Queue"
        status="not_applicable"
        value="Not applicable"
        detail="No job queue in this codebase"
        onClick={() => onSelect({ kind: 'queue', data: health.queue })}
      />
    </div>

    <section style={{ marginTop: 'var(--space-28)' }}>
      <div className="drawer-section-title">Scheduled jobs</div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th scope="col">Job</th>
              <th scope="col">Enabled</th>
              <th scope="col">Interval</th>
              <th scope="col">Last run</th>
            </tr>
          </thead>
          <tbody>
            {health.scheduledJobs.map((job) => (
              <tr key={job.name}>
                <td>
                  <div className="user-id-cell">
                    <span className="user-email">{job.name.replace(/_/g, ' ')}</span>
                    <span className="user-name">{job.description}</span>
                  </div>
                </td>
                <td>
                  <Badge tone={job.enabled ? 'success' : 'neutral'}>{job.enabled ? 'enabled' : 'disabled'}</Badge>
                </td>
                <td>{formatDuration(job.intervalMs)}</td>
                <td>
                  {job.sweeping ? 'running now' : formatDateTime(job.lastSweepAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <section style={{ marginTop: 'var(--space-28)' }}>
      <div className="drawer-section-title">Version &amp; environment</div>
      <div className="drawer-meta-grid">
        <div className="drawer-meta-item">
          <label>App version</label>
          <span>{health.version.app || '—'}</span>
        </div>
        <div className="drawer-meta-item">
          <label>Commit</label>
          <span>{health.version.commit || '—'}</span>
        </div>
        <div className="drawer-meta-item">
          <label>NODE_ENV</label>
          <span>{health.environment.nodeEnv || '—'}</span>
        </div>
        <div className="drawer-meta-item">
          <label>Image provider</label>
          <span>{health.environment.imageProvider || '—'}</span>
        </div>
        <div className="drawer-meta-item">
          <label>Abuse sweep</label>
          <span>
            {health.environment.abuseDetection.sweepEnabled ? 'enabled' : 'disabled'} · auto-suspend{' '}
            {health.environment.abuseDetection.autoSuspendEnabled ? 'on' : 'off'}
          </span>
        </div>
        <div className="drawer-meta-item">
          <label>Play Integrity</label>
          <span>{health.environment.playIntegrity.enforcement}</span>
        </div>
        <div className="drawer-meta-item">
          <label>Services configured</label>
          <span>
            {Object.entries(health.environment.servicesConfigured)
              .filter(([, v]) => v)
              .map(([k]) => k)
              .join(', ') || 'none'}
          </span>
        </div>
      </div>
    </section>

    <section style={{ marginTop: 'var(--space-28)' }}>
      <div className="drawer-section-title">Last successful backup &amp; migration</div>
      <div className="drawer-meta-grid">
        <div className="drawer-meta-item">
          <label>Database backup</label>
          <span>{formatDateTime(health.lastBackup.database?.createdAt)}</span>
        </div>
        <div className="drawer-meta-item">
          <label>Storage backup</label>
          <span>{formatDateTime(health.lastBackup.storage?.createdAt)}</span>
        </div>
        <div className="drawer-meta-item">
          <label>Last migration</label>
          <span>{health.lastMigration ? health.lastMigration.filename : '—'}</span>
        </div>
        <div className="drawer-meta-item">
          <label>Last migration run</label>
          <span>{formatDateTime(health.lastMigration?.lastRunAt)}</span>
        </div>
      </div>
      {health.backupsError && <p style={{ marginTop: 'var(--space-8)', fontSize: 'var(--font-size-12)', color: 'var(--danger)' }}>{health.backupsError}</p>}
      {health.migrationsError && <p style={{ marginTop: 'var(--space-8)', fontSize: 'var(--font-size-12)', color: 'var(--danger)' }}>{health.migrationsError}</p>}
    </section>
  </>
);

// ---------------------------------------------------------------------------
// Timeline tab - merges incidents (freshly fetched) with the recentBackups/
// recentMigrations already present in the system-health payload, the same
// "merge existing feeds client-side" approach Operations Center's Timeline
// tab uses.
// ---------------------------------------------------------------------------

type TimelineItem =
  | { kind: 'incident'; at: string; data: SystemIncident }
  | { kind: 'migration'; at: string; data: MigrationRecord }
  | { kind: 'backup'; at: string; data: BackupRun };

const TIMELINE_INCIDENT_LIMIT = 15;

const TimelineTab: React.FC<{ health: SystemHealthResponse; onSelect: (item: SelectedItem) => void; refreshKey: number }> = ({
  health,
  onSelect,
  refreshKey,
}) => {
  const [items, setItems] = useState<TimelineItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    apiService
      .listSystemIncidents({ limit: TIMELINE_INCIDENT_LIMIT })
      .then((res) => {
        if (cancelled) return;
        const merged: TimelineItem[] = [
          ...res.incidents.map((data): TimelineItem => ({ kind: 'incident', at: data.createdAt, data })),
          ...health.recentMigrations.map((data): TimelineItem => ({ kind: 'migration', at: data.lastRunAt, data })),
          ...health.recentBackups.map((data): TimelineItem => ({ kind: 'backup', at: data.createdAt, data })),
        ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
        setItems(merged);
      })
      .catch((err: any) => setError(err.message || 'Failed to load the timeline.'));
    return () => {
      cancelled = true;
    };
  }, [health, refreshKey]);

  if (error) return <EmptyState tone="error" message={error} />;
  if (items === null) return <Loader type="skeleton-list" count={6} />;
  if (items.length === 0) return <EmptyState message="Nothing has happened recently." icon="fa-solid fa-clock" dashed />;

  return (
    <div>
      {items.map((item) => {
        if (item.kind === 'incident') {
          return (
            <div
              className="finding-card"
              key={`incident-${item.data.id}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelect({ kind: 'incident', data: item.data })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect({ kind: 'incident', data: item.data });
              }}
            >
              <div className="finding-card-header">
                <span>{item.data.message || item.data.kind || 'Provider incident'}</span>
                <Badge tone={item.data.severity === 'error' ? 'danger' : 'warning'}>{item.data.severity}</Badge>
              </div>
              <div className="finding-meta">
                {formatDateTime(item.at)} · {item.data.provider || 'unknown provider'}
              </div>
            </div>
          );
        }
        if (item.kind === 'migration') {
          return (
            <div
              className="finding-card"
              key={`migration-${item.data.filename}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelect({ kind: 'migration', data: item.data })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect({ kind: 'migration', data: item.data });
              }}
            >
              <div className="finding-card-header">
                <span>{item.data.filename}</span>
                <Badge tone="blue">migration</Badge>
              </div>
              <div className="finding-meta">{formatDateTime(item.at)} · run {item.data.runCount}×</div>
            </div>
          );
        }
        return (
          <div
            className="finding-card"
            key={`backup-${item.data.id}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect({ kind: 'backup', data: item.data })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelect({ kind: 'backup', data: item.data });
            }}
          >
            <div className="finding-card-header">
              <span>{item.data.kind} backup</span>
              <Badge tone={item.data.status === 'success' ? 'success' : 'danger'}>{item.data.status}</Badge>
            </div>
            <div className="finding-meta">
              {formatDateTime(item.at)} · {formatBytes(item.data.bytes)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Incidents tab - searchable/filterable/paginated, mirrors Operations
// Center's audit-log tab shape.
// ---------------------------------------------------------------------------

const IncidentsTab: React.FC<{ onSelect: (item: SelectedItem) => void; refreshKey: number }> = ({
  onSelect,
  refreshKey,
}) => {
  const [incidents, setIncidents] = useState<SystemIncident[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [severity, setSeverity] = useState<SystemIncidentSeverity | 'all'>('all');
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedQ, severity]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiService
      .listSystemIncidents({ source: 'image_provider' as SystemIncidentSource, severity, q: debouncedQ, limit: PAGE_SIZE, offset })
      .then((res) => {
        if (cancelled) return;
        setIncidents(res.incidents);
        setTotal(res.total);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'Failed to load incidents.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [severity, debouncedQ, offset, refreshKey]);

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <>
      <div className="filter-controls-bar">
        <div className="search-box-container">
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <input
            type="text"
            placeholder="Search by message, provider or endpoint..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="search-input"
            aria-label="Search incidents"
          />
        </div>
        <div className="select-filters-group">
          <div className="filter-dropdown">
            <label htmlFor="incident-severity-filter">Severity</label>
            <select
              id="incident-severity-filter"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as SystemIncidentSeverity | 'all')}
            >
              <option value="all">All</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <Loader type="skeleton-list" count={6} />}

      {!loading && error && <EmptyState tone="error" message={error} actionLabel="Retry" onAction={() => setOffset((o) => o)} />}

      {!loading && !error && incidents.length === 0 && (
        <EmptyState message="No image-provider incidents recorded yet." icon="fa-solid fa-circle-check" dashed />
      )}

      {!loading && !error && incidents.length > 0 && (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">Severity</th>
                  <th scope="col">Message</th>
                  <th scope="col">Provider</th>
                  <th scope="col">Endpoint</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="users-table-row"
                    onClick={() => onSelect({ kind: 'incident', data: incident })}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for incident ${incident.id}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect({ kind: 'incident', data: incident });
                      }
                    }}
                  >
                    <td>
                      <Badge tone={incident.severity === 'error' ? 'danger' : 'warning'}>{incident.severity}</Badge>
                    </td>
                    <td>{incident.message || '—'}</td>
                    <td>{incident.provider || '—'}</td>
                    <td>{incident.endpoint || '—'}</td>
                    <td>{formatDateTime(incident.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationBar
            from={from}
            to={to}
            total={total}
            onPrev={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            onNext={() => setOffset((o) => o + PAGE_SIZE)}
          />
        </>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

type HealthTabKey = 'overview' | 'timeline' | 'incidents';

const TAB_LABEL: Record<HealthTabKey, string> = {
  overview: 'Overview',
  timeline: 'Timeline',
  incidents: 'Incidents',
};

const TAB_ORDER: HealthTabKey[] = ['overview', 'timeline', 'incidents'];

export const SystemHealthPage: React.FC = () => {
  const [tab, setTab] = useState<HealthTabKey>('overview');
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasLoadedRef = useRef(false);

  const load = useCallback((isManual = false) => {
    if (isManual) setRefreshing(true);
    else if (!hasLoadedRef.current) setLoading(true);
    setError(null);
    apiService
      .getSystemHealth()
      .then((res) => {
        setHealth(res);
        setLastUpdated(new Date());
        hasLoadedRef.current = true;
        setRefreshKey((k) => k + 1);
      })
      .catch((err: any) => setError(err.message || 'Failed to load system health.'))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => load(), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  return (
    <div>
      <div className="panel-title-row">
        <h2>System Health</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
          <span style={{ fontSize: 'var(--font-size-12)', color: 'var(--text-muted)' }}>
            Updated {formatAgo(lastUpdated)}
          </span>
          <div className="checkbox-item">
            <input
              type="checkbox"
              id="auto-refresh-toggle"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <label htmlFor="auto-refresh-toggle" style={{ fontSize: 'var(--font-size-12)' }}>
              Auto refresh
            </label>
          </div>
          <button className="btn secondary btn-small" onClick={() => load(true)} disabled={refreshing}>
            <i className={`fa-solid fa-arrows-rotate ${refreshing ? 'fa-spin' : ''}`}></i> Refresh
          </button>
        </div>
      </div>

      <div className="panel-title-row">
        <div className="tabs">
          {TAB_ORDER.map((key) => (
            <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
              {TAB_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        {loading && <Loader type="skeleton-list" count={6} />}

        {!loading && error && !health && (
          <EmptyState tone="error" message={error} actionLabel="Retry" onAction={() => load()} />
        )}

        {!loading && health && (
          <>
            {error && (
              <div style={{ marginBottom: 'var(--space-16)' }}>
                <EmptyState tone="error" variant="inline" message={`Last refresh failed: ${error}. Showing data from ${formatAgo(lastUpdated)}.`} />
              </div>
            )}
            {tab === 'overview' && <OverviewTab health={health} onSelect={setSelected} />}
            {tab === 'timeline' && <TimelineTab health={health} onSelect={setSelected} refreshKey={refreshKey} />}
            {tab === 'incidents' && <IncidentsTab onSelect={setSelected} refreshKey={refreshKey} />}
          </>
        )}
      </div>

      <SystemHealthDetailDrawer selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default SystemHealthPage;

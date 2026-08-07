import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import {
  AuditLogEntry,
  SecurityEvent,
  SecurityEventType,
  PurchaseVerificationEntry,
  PurchaseVerificationSource,
} from '../types';
import { Badge, BadgeTone } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Loader } from '../components/Loader';
import { Drawer } from '../components/Drawer';

const PAGE_SIZE = 25;
// The Timeline tab merges the three feeds client-side rather than adding a
// fourth endpoint - each source's own tab already exists for deep paging, so
// the timeline only needs enough of each to interleave a useful recent view.
const TIMELINE_SOURCE_LIMIT = 15;

const SUSPEND_REINSTATE_ACTIONS =
  'POST /api/admin/users/:id/suspend,POST /api/admin/users/:id/reinstate';
const DELETE_ACTION = 'POST /api/admin/users/:id/delete';
const ADJUST_BALANCE_ACTION = 'POST /api/admin/users/:id/adjust-balance';

/** Route-shaped action names (see adminAuditModel.js) mapped to a human label + tone. */
function describeAction(action: string): { label: string; tone: BadgeTone } {
  switch (action) {
    case 'POST /api/admin/users/:id/suspend':
      return { label: 'Suspended', tone: 'danger' };
    case 'POST /api/admin/users/:id/reinstate':
      return { label: 'Reinstated', tone: 'success' };
    case DELETE_ACTION:
      return { label: 'Account deleted', tone: 'danger' };
    case ADJUST_BALANCE_ACTION:
      return { label: 'Credit adjustment', tone: 'warning' };
    default:
      return { label: action, tone: 'neutral' };
  }
}

const SECURITY_EVENT_TONE: Record<SecurityEventType, BadgeTone> = {
  auth_failure: 'warning',
  authz_failure: 'danger',
};

const SECURITY_EVENT_LABEL: Record<SecurityEventType, string> = {
  auth_failure: 'Auth failure',
  authz_failure: 'Authorization failure',
};

const PURCHASE_SOURCE_TONE: Record<PurchaseVerificationSource, BadgeTone> = {
  purchase: 'blue',
  ad_reward: 'purple',
};

const PURCHASE_SOURCE_LABEL: Record<PurchaseVerificationSource, string> = {
  purchase: 'In-app purchase',
  ad_reward: 'Ad-reward verification',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined || (typeof value === 'object' && Object.keys(value).length === 0)) {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }
  return <pre className="finding-evidence">{JSON.stringify(value, null, 2)}</pre>;
}

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
// Audit-log-backed tabs: Admin Actions, Account Deletions, Credit
// Adjustments, Suspensions & Reinstatements are all the same admin_audit_log
// table with a different `action` filter - one component serves all four so
// there is exactly one query shape and one row renderer to keep correct.
// ---------------------------------------------------------------------------

const AuditLogTab: React.FC<{
  actionFilter?: string;
  emptyMessage: string;
  searchPlaceholder: string;
  onOpenEntry: (entry: AuditLogEntry) => void;
  refreshKey: number;
}> = ({ actionFilter, emptyMessage, searchPlaceholder, onOpenEntry, refreshKey }) => {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedQ, actionFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiService
      .listAuditLog({ action: actionFilter, q: debouncedQ, limit: PAGE_SIZE, offset })
      .then((res) => {
        if (cancelled) return;
        setEntries(res.entries);
        setTotal(res.total);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'Failed to load the audit log.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [actionFilter, debouncedQ, offset, refreshKey]);

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <>
      <div className="filter-controls-bar">
        <div className="search-box-container">
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="search-input"
            aria-label="Search audit log"
          />
        </div>
      </div>

      {loading && <Loader type="skeleton-list" count={6} />}

      {!loading && error && (
        <EmptyState tone="error" message={error} actionLabel="Retry" onAction={() => setOffset((o) => o)} />
      )}

      {!loading && !error && entries.length === 0 && <EmptyState message={emptyMessage} dashed />}

      {!loading && !error && entries.length > 0 && (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">Action</th>
                  <th scope="col">Admin</th>
                  <th scope="col">Target</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const { label, tone } = describeAction(entry.action);
                  return (
                    <tr
                      key={entry.id}
                      className="users-table-row"
                      onClick={() => onOpenEntry(entry)}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for ${label}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpenEntry(entry);
                        }
                      }}
                    >
                      <td>
                        <Badge tone={tone}>{label}</Badge>
                      </td>
                      <td>{entry.adminEmail || entry.adminId}</td>
                      <td>
                        {entry.targetType
                          ? `${entry.targetType}${entry.targetId ? ` · ${entry.targetId}` : ''}`
                          : '—'}
                      </td>
                      <td>{formatDateTime(entry.createdAt)}</td>
                    </tr>
                  );
                })}
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
// security_events-backed tabs: Security Events (all) and Failed Login Events
// (auth_failure only) are the same table with a different eventType filter.
// ---------------------------------------------------------------------------

const SecurityEventsTab: React.FC<{
  eventTypeFilter?: SecurityEventType;
  emptyMessage: string;
  onOpenEvent: (event: SecurityEvent) => void;
  refreshKey: number;
}> = ({ eventTypeFilter, emptyMessage, onOpenEvent, refreshKey }) => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedQ, eventTypeFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiService
      .listSecurityEvents({ eventType: eventTypeFilter, q: debouncedQ, limit: PAGE_SIZE, offset })
      .then((res) => {
        if (cancelled) return;
        setEvents(res.events);
        setTotal(res.total);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'Failed to load security events.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventTypeFilter, debouncedQ, offset, refreshKey]);

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <>
      <div className="filter-controls-bar">
        <div className="search-box-container">
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <input
            type="text"
            placeholder="Search by reason, endpoint or IP..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="search-input"
            aria-label="Search security events"
          />
        </div>
      </div>

      {loading && <Loader type="skeleton-list" count={6} />}

      {!loading && error && (
        <EmptyState tone="error" message={error} actionLabel="Retry" onAction={() => setOffset((o) => o)} />
      )}

      {!loading && !error && events.length === 0 && <EmptyState message={emptyMessage} dashed />}

      {!loading && !error && events.length > 0 && (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Endpoint</th>
                  <th scope="col">IP</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="users-table-row"
                    onClick={() => onOpenEvent(event)}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${SECURITY_EVENT_LABEL[event.eventType]}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenEvent(event);
                      }
                    }}
                  >
                    <td>
                      <Badge tone={SECURITY_EVENT_TONE[event.eventType]}>
                        {SECURITY_EVENT_LABEL[event.eventType]}
                      </Badge>
                    </td>
                    <td>{event.reason || '—'}</td>
                    <td>{event.endpoint || '—'}</td>
                    <td>{event.ip || '—'}</td>
                    <td>{formatDateTime(event.createdAt)}</td>
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
// Purchase Verification History
// ---------------------------------------------------------------------------

const PurchaseVerificationTab: React.FC<{
  onOpenEntry: (entry: PurchaseVerificationEntry) => void;
  refreshKey: number;
}> = ({ onOpenEntry, refreshKey }) => {
  const [entries, setEntries] = useState<PurchaseVerificationEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<PurchaseVerificationSource | 'all'>('all');
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [source]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiService
      .listPurchaseVerifications({ source, limit: PAGE_SIZE, offset })
      .then((res) => {
        if (cancelled) return;
        setEntries(res.entries);
        setTotal(res.total);
        setNote(res.note);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'Failed to load purchase verification history.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, offset, refreshKey]);

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <>
      <div className="filter-controls-bar">
        <div className="select-filters-group">
          <div className="filter-dropdown">
            <label htmlFor="purchase-source-filter">Source</label>
            <select
              id="purchase-source-filter"
              value={source}
              onChange={(e) => setSource(e.target.value as PurchaseVerificationSource | 'all')}
            >
              <option value="all">All</option>
              <option value="purchase">In-app purchase</option>
              <option value="ad_reward">Ad-reward verification</option>
            </select>
          </div>
        </div>
      </div>

      {note && <EmptyState variant="inline" message={note} />}

      {loading && <Loader type="skeleton-list" count={6} />}

      {!loading && error && (
        <EmptyState tone="error" message={error} actionLabel="Retry" onAction={() => setOffset((o) => o)} />
      )}

      {!loading && !error && entries.length === 0 && (
        <EmptyState message="No verification history for this filter." dashed />
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col">User</th>
                  <th scope="col">Amount</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={`${entry.source}-${entry.id}`}
                    className="users-table-row"
                    onClick={() => onOpenEntry(entry)}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${PURCHASE_SOURCE_LABEL[entry.source]}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenEntry(entry);
                      }
                    }}
                  >
                    <td>
                      <Badge tone={PURCHASE_SOURCE_TONE[entry.source]}>
                        {PURCHASE_SOURCE_LABEL[entry.source]}
                      </Badge>
                    </td>
                    <td>{entry.userId}</td>
                    <td>{entry.amount.toLocaleString()} credits</td>
                    <td>{formatDateTime(entry.createdAt)}</td>
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
// Timeline: a merged, read-only feed across all three sources. Each source's
// own tab is where an operator pages deeply; this is "what's happened
// recently, across everything" in one scroll.
// ---------------------------------------------------------------------------

type TimelineItem =
  | { kind: 'audit'; at: string; entry: AuditLogEntry }
  | { kind: 'security'; at: string; entry: SecurityEvent }
  | { kind: 'purchase'; at: string; entry: PurchaseVerificationEntry };

const TimelineTab: React.FC<{
  onOpenAudit: (entry: AuditLogEntry) => void;
  onOpenSecurity: (event: SecurityEvent) => void;
  onOpenPurchase: (entry: PurchaseVerificationEntry) => void;
  refreshKey: number;
}> = ({ onOpenAudit, onOpenSecurity, onOpenPurchase, refreshKey }) => {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      apiService.listAuditLog({ limit: TIMELINE_SOURCE_LIMIT }),
      apiService.listSecurityEvents({ limit: TIMELINE_SOURCE_LIMIT }),
      apiService.listPurchaseVerifications({ limit: TIMELINE_SOURCE_LIMIT }),
    ])
      .then(([audit, security, purchases]) => {
        if (cancelled) return;
        const merged: TimelineItem[] = [
          ...audit.entries.map((entry): TimelineItem => ({ kind: 'audit', at: entry.createdAt, entry })),
          ...security.events.map((entry): TimelineItem => ({ kind: 'security', at: entry.createdAt, entry })),
          ...purchases.entries.map((entry): TimelineItem => ({ kind: 'purchase', at: entry.createdAt, entry })),
        ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
        setItems(merged);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'Failed to load the timeline.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) return <Loader type="skeleton-list" count={6} />;
  if (error) {
    return <EmptyState tone="error" message={error} actionLabel="Retry" onAction={() => setItems((i) => i)} />;
  }
  if (items.length === 0) {
    return <EmptyState message="Nothing has happened recently." icon="fa-solid fa-clock" dashed />;
  }

  return (
    <div>
      {items.map((item) => {
        if (item.kind === 'audit') {
          const { label, tone } = describeAction(item.entry.action);
          return (
            <div
              className="finding-card"
              key={`audit-${item.entry.id}`}
              role="button"
              tabIndex={0}
              onClick={() => onOpenAudit(item.entry)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenAudit(item.entry);
                }
              }}
            >
              <div className="finding-card-header">
                <span>{item.entry.adminEmail || item.entry.adminId}</span>
                <Badge tone={tone}>{label}</Badge>
              </div>
              <div className="finding-meta">
                {formatDateTime(item.at)}
                {item.entry.targetType ? ` · ${item.entry.targetType}${item.entry.targetId ? ` · ${item.entry.targetId}` : ''}` : ''}
              </div>
            </div>
          );
        }
        if (item.kind === 'security') {
          return (
            <div
              className="finding-card"
              key={`security-${item.entry.id}`}
              role="button"
              tabIndex={0}
              onClick={() => onOpenSecurity(item.entry)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenSecurity(item.entry);
                }
              }}
            >
              <div className="finding-card-header">
                <span>{item.entry.reason || item.entry.endpoint || 'Security event'}</span>
                <Badge tone={SECURITY_EVENT_TONE[item.entry.eventType]}>
                  {SECURITY_EVENT_LABEL[item.entry.eventType]}
                </Badge>
              </div>
              <div className="finding-meta">
                {formatDateTime(item.at)}
                {item.entry.ip ? ` · ${item.entry.ip}` : ''}
              </div>
            </div>
          );
        }
        return (
          <div
            className="finding-card"
            key={`purchase-${item.entry.source}-${item.entry.id}`}
            role="button"
            tabIndex={0}
            onClick={() => onOpenPurchase(item.entry)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenPurchase(item.entry);
              }
            }}
          >
            <div className="finding-card-header">
              <span>{item.entry.userId}</span>
              <Badge tone={PURCHASE_SOURCE_TONE[item.entry.source]}>
                {PURCHASE_SOURCE_LABEL[item.entry.source]}
              </Badge>
            </div>
            <div className="finding-meta">
              {formatDateTime(item.at)} · {item.entry.amount.toLocaleString()} credits
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Detail drawer: one drawer, three renderers, picked by the selected item's
// kind - the same "one Drawer, content varies" shape UserDetailDrawer uses.
// ---------------------------------------------------------------------------

type SelectedItem =
  | { kind: 'audit'; entry: AuditLogEntry }
  | { kind: 'security'; entry: SecurityEvent }
  | { kind: 'purchase'; entry: PurchaseVerificationEntry }
  | null;

function drawerTitle(selected: SelectedItem): string {
  if (!selected) return '';
  if (selected.kind === 'audit') return describeAction(selected.entry.action).label;
  if (selected.kind === 'security') return SECURITY_EVENT_LABEL[selected.entry.eventType];
  return PURCHASE_SOURCE_LABEL[selected.entry.source];
}

const OperationsDetailDrawer: React.FC<{ selected: SelectedItem; onClose: () => void }> = ({
  selected,
  onClose,
}) => (
  <Drawer title={drawerTitle(selected)} isOpen={selected !== null} onClose={onClose}>
    {selected?.kind === 'audit' && (
      <>
        <section>
          <div className="drawer-meta-grid">
            <div className="drawer-meta-item">
              <label>Admin</label>
              <span>{selected.entry.adminEmail || selected.entry.adminId}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Action</label>
              <span>{selected.entry.action}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Target</label>
              <span>
                {selected.entry.targetType
                  ? `${selected.entry.targetType}${selected.entry.targetId ? ` · ${selected.entry.targetId}` : ''}`
                  : '—'}
              </span>
            </div>
            <div className="drawer-meta-item">
              <label>IP</label>
              <span>{selected.entry.ip || '—'}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Request</label>
              <span>
                {selected.entry.requestUrl || '—'}
                {selected.entry.statusCode ? ` · ${selected.entry.statusCode}` : ''}
              </span>
            </div>
            <div className="drawer-meta-item">
              <label>When</label>
              <span>{formatDateTime(selected.entry.createdAt)}</span>
            </div>
          </div>
        </section>
        <section>
          <div className="drawer-section-title">Before</div>
          <JsonBlock value={selected.entry.before} />
        </section>
        <section>
          <div className="drawer-section-title">After</div>
          <JsonBlock value={selected.entry.after} />
        </section>
      </>
    )}

    {selected?.kind === 'security' && (
      <>
        <section>
          <div className="drawer-meta-grid">
            <div className="drawer-meta-item">
              <label>Reason</label>
              <span>{selected.entry.reason || '—'}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Subject</label>
              <span>{selected.entry.subject || '—'}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Request</label>
              <span>
                {selected.entry.method || ''} {selected.entry.endpoint || '—'}
              </span>
            </div>
            <div className="drawer-meta-item">
              <label>IP</label>
              <span>{selected.entry.ip || '—'}</span>
            </div>
            <div className="drawer-meta-item">
              <label>Identity</label>
              <span>
                {selected.entry.userId && `user ${selected.entry.userId}`}
                {selected.entry.adminId && `admin ${selected.entry.adminId}`}
                {!selected.entry.userId && !selected.entry.adminId && '—'}
              </span>
            </div>
            <div className="drawer-meta-item">
              <label>When</label>
              <span>{formatDateTime(selected.entry.createdAt)}</span>
            </div>
          </div>
        </section>
        <section>
          <div className="drawer-section-title">Detail</div>
          <JsonBlock value={selected.entry.detail} />
        </section>
      </>
    )}

    {selected?.kind === 'purchase' && (
      <section>
        <div className="drawer-meta-grid">
          <div className="drawer-meta-item">
            <label>Source</label>
            <Badge tone={PURCHASE_SOURCE_TONE[selected.entry.source]}>
              {PURCHASE_SOURCE_LABEL[selected.entry.source]}
            </Badge>
          </div>
          <div className="drawer-meta-item">
            <label>User</label>
            <span>{selected.entry.userId}</span>
          </div>
          <div className="drawer-meta-item">
            <label>Amount</label>
            <span>{selected.entry.amount.toLocaleString()} credits</span>
          </div>
          <div className="drawer-meta-item">
            <label>Description</label>
            <span>{selected.entry.description || '—'}</span>
          </div>
          <div className="drawer-meta-item">
            <label>When</label>
            <span>{formatDateTime(selected.entry.createdAt)}</span>
          </div>
        </div>
      </section>
    )}
  </Drawer>
);

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

type OpsTabKey =
  | 'timeline'
  | 'adminActions'
  | 'deletions'
  | 'creditAdjustments'
  | 'suspensions'
  | 'securityEvents'
  | 'failedLogins'
  | 'purchases';

const TAB_ORDER: OpsTabKey[] = [
  'timeline',
  'adminActions',
  'deletions',
  'creditAdjustments',
  'suspensions',
  'securityEvents',
  'failedLogins',
  'purchases',
];

const TAB_LABEL: Record<OpsTabKey, string> = {
  timeline: 'Timeline',
  adminActions: 'Admin Actions',
  deletions: 'Account Deletions',
  creditAdjustments: 'Credit Adjustments',
  suspensions: 'Suspensions & Reinstatements',
  securityEvents: 'Security Events',
  failedLogins: 'Failed Logins',
  purchases: 'Purchase Verification',
};

export const OperationsCenterPage: React.FC = () => {
  const [tab, setTab] = useState<OpsTabKey>('timeline');
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [refreshKey] = useState(0);

  const openAudit = (entry: AuditLogEntry) => setSelected({ kind: 'audit', entry });
  const openSecurity = (entry: SecurityEvent) => setSelected({ kind: 'security', entry });
  const openPurchase = (entry: PurchaseVerificationEntry) => setSelected({ kind: 'purchase', entry });

  return (
    <div>
      <div className="panel-title-row">
        <h2>Operations Center</h2>
        <div className="tabs">
          {TAB_ORDER.map((key) => (
            <button
              key={key}
              className={`tab-btn ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {TAB_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        {tab === 'timeline' && (
          <TimelineTab
            onOpenAudit={openAudit}
            onOpenSecurity={openSecurity}
            onOpenPurchase={openPurchase}
            refreshKey={refreshKey}
          />
        )}
        {tab === 'adminActions' && (
          <AuditLogTab
            emptyMessage="No admin actions recorded yet."
            searchPlaceholder="Search by admin, action or target id..."
            onOpenEntry={openAudit}
            refreshKey={refreshKey}
          />
        )}
        {tab === 'deletions' && (
          <AuditLogTab
            actionFilter={DELETE_ACTION}
            emptyMessage="No account deletions recorded yet."
            searchPlaceholder="Search by admin or target id..."
            onOpenEntry={openAudit}
            refreshKey={refreshKey}
          />
        )}
        {tab === 'creditAdjustments' && (
          <AuditLogTab
            actionFilter={ADJUST_BALANCE_ACTION}
            emptyMessage="No manual credit adjustments recorded yet."
            searchPlaceholder="Search by admin or target id..."
            onOpenEntry={openAudit}
            refreshKey={refreshKey}
          />
        )}
        {tab === 'suspensions' && (
          <AuditLogTab
            actionFilter={SUSPEND_REINSTATE_ACTIONS}
            emptyMessage="No suspensions or reinstatements recorded yet."
            searchPlaceholder="Search by admin or target id..."
            onOpenEntry={openAudit}
            refreshKey={refreshKey}
          />
        )}
        {tab === 'securityEvents' && (
          <SecurityEventsTab
            emptyMessage="No security events recorded yet."
            onOpenEvent={openSecurity}
            refreshKey={refreshKey}
          />
        )}
        {tab === 'failedLogins' && (
          <SecurityEventsTab
            eventTypeFilter="auth_failure"
            emptyMessage="No failed logins recorded yet."
            onOpenEvent={openSecurity}
            refreshKey={refreshKey}
          />
        )}
        {tab === 'purchases' && <PurchaseVerificationTab onOpenEntry={openPurchase} refreshKey={refreshKey} />}
      </div>

      <OperationsDetailDrawer selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default OperationsCenterPage;

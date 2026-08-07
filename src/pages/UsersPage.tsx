import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { AbuseFinding, AbuseReviewOutcome, AccountStatus, UserListItem } from '../types';
import { Badge, BadgeTone } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { Loader } from '../components/Loader';
import { UserDetailDrawer } from '../components/UserDetailDrawer';

const PAGE_SIZE = 25;

const STATUS_TONE: Record<AccountStatus, BadgeTone> = {
  active: 'success',
  suspended: 'warning',
  banned: 'danger',
  deleted: 'neutral',
};

const SEVERITY_TONE: Record<AbuseFinding['severity'], BadgeTone> = {
  low: 'blue',
  medium: 'warning',
  high: 'danger',
};

function riskTone(score: number): 'low' | 'medium' | 'high' {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function RiskCell({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="risk-score-value">—</span>;
  }
  return (
    <div className="risk-cell">
      <div className="risk-meter-track">
        <div className={`risk-meter-fill ${riskTone(score)}`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className="risk-score-value">{score}</span>
    </div>
  );
}

const UsersTab: React.FC<{ onSelectUser: (id: string) => void; refreshKey: number }> = ({
  onSelectUser,
  refreshKey,
}) => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [status, setStatus] = useState<AccountStatus | 'all'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'risk'>('newest');
  const [offset, setOffset] = useState(0);

  // Search is server-side (the users table isn't fetched in full like the
  // style catalog), so keystrokes are debounced rather than firing one
  // request each - the same reasoning TimeRangeFilter-style controls don't
  // need, since those are discrete clicks, not typed text.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedQ, status, sort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiService
      .listUsers({ q: debouncedQ, status, sort, limit: PAGE_SIZE, offset })
      .then((res) => {
        if (cancelled) return;
        setUsers(res.users);
        setTotal(res.total);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'Failed to load users.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, status, sort, offset, refreshKey]);

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <>
      <div className="filter-controls-bar">
        <div className="search-box-container">
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <input
            type="text"
            placeholder="Search by email or name..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="search-input"
            aria-label="Search users"
          />
        </div>

        <div className="select-filters-group">
          <div className="filter-dropdown">
            <label htmlFor="user-status-filter">Status</label>
            <select
              id="user-status-filter"
              value={status}
              onChange={(e) => setStatus(e.target.value as AccountStatus | 'all')}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>

          <div className="filter-dropdown">
            <label htmlFor="user-sort">Sort by</label>
            <select id="user-sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="risk">Highest risk</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <Loader type="skeleton-list" count={6} />}

      {!loading && error && (
        <EmptyState tone="error" message={error} actionLabel="Retry" onAction={() => setOffset((o) => o)} />
      )}

      {!loading && !error && users.length === 0 && (
        <EmptyState message="No users match this search." dashed />
      )}

      {!loading && !error && users.length > 0 && (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Status</th>
                  <th scope="col">Balance</th>
                  <th scope="col">Risk</th>
                  <th scope="col">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="users-table-row"
                    onClick={() => onSelectUser(u.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${u.email}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectUser(u.id);
                      }
                    }}
                  >
                    <td>
                      <div className="user-id-cell">
                        <span className="user-email">{u.email}</span>
                        {u.fullName && <span className="user-name">{u.fullName}</span>}
                      </div>
                    </td>
                    <td>
                      <Badge tone={STATUS_TONE[u.status]}>{u.status}</Badge>
                    </td>
                    <td>{u.balance.toLocaleString()}</td>
                    <td>
                      <RiskCell score={u.riskScore} />
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-bar">
            <span className="pagination-bar-summary">
              {from}–{to} of {total}
            </span>
            <div className="pagination-bar-controls">
              <button
                className="btn secondary btn-small"
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                disabled={offset === 0}
              >
                Previous
              </button>
              <button
                className="btn secondary btn-small"
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
                disabled={to >= total}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};

const PendingReviewTab: React.FC<{ onSelectUser: (id: string) => void; refreshKey: number }> = ({
  onSelectUser,
  refreshKey,
}) => {
  const [findings, setFindings] = useState<AbuseFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiService
      .listAbuseFindings({ includeReviewed: false, limit: 100 })
      .then((res) => setFindings(res.findings))
      .catch((err: any) => setError(err.message || 'Failed to load the review queue.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [refreshKey]);

  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const review = async (findingId: string, outcome: AbuseReviewOutcome) => {
    setReviewingId(findingId);
    try {
      await apiService.reviewAbuseFinding(findingId, outcome);
      setFindings((prev) => prev.filter((f) => f.id !== findingId));
    } catch (err: any) {
      setError(err.message || 'Failed to record review.');
    } finally {
      setReviewingId(null);
    }
  };

  if (loading) return <Loader type="skeleton-list" count={4} />;
  if (error) return <EmptyState tone="error" message={error} actionLabel="Retry" onAction={load} />;
  if (findings.length === 0) {
    return <EmptyState message="Nothing waiting on review." icon="fa-solid fa-circle-check" dashed />;
  }

  return (
    <div>
      {findings.map((f) => (
        <div className="finding-card" key={f.id}>
          <div className="finding-card-header">
            <button
              className="icon-btn-text"
              onClick={() => f.userId && onSelectUser(f.userId)}
              disabled={!f.userId}
              title={f.userId ? 'Open this account' : 'No account associated'}
            >
              {f.detector}
            </button>
            <Badge tone={SEVERITY_TONE[f.severity]}>{f.severity}</Badge>
          </div>
          <pre className="finding-evidence">{JSON.stringify(f.evidence, null, 2)}</pre>
          <div className="finding-meta">
            {new Date(f.createdAt).toLocaleString()} · action: {f.action}
          </div>
          <div className="finding-actions">
            <button
              className="btn secondary btn-small"
              onClick={() => review(f.id, 'confirmed')}
              disabled={reviewingId === f.id}
            >
              Confirm
            </button>
            <button
              className="btn secondary btn-small"
              onClick={() => review(f.id, 'false_positive')}
              disabled={reviewingId === f.id}
            >
              False positive
            </button>
            <button
              className="btn secondary btn-small"
              onClick={() => review(f.id, 'ignored')}
              disabled={reviewingId === f.id}
            >
              Ignore
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export const UsersPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'all' | 'pending'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <div className="panel-title-row">
        <h2>Users</h2>
        <div className="tabs">
          <button
            className={`tab-btn ${subTab === 'all' ? 'active' : ''}`}
            onClick={() => setSubTab('all')}
          >
            All Users
          </button>
          <button
            className={`tab-btn ${subTab === 'pending' ? 'active' : ''}`}
            onClick={() => setSubTab('pending')}
          >
            Pending Review
          </button>
        </div>
      </div>

      <div className="panel">
        {subTab === 'all' ? (
          <UsersTab onSelectUser={setSelectedUserId} refreshKey={refreshKey} />
        ) : (
          <PendingReviewTab onSelectUser={setSelectedUserId} refreshKey={refreshKey} />
        )}
      </div>

      <UserDetailDrawer
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onChanged={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
};

export default UsersPage;

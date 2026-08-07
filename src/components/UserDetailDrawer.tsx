import React, { useCallback, useEffect, useState } from 'react';
import { Drawer } from './Drawer';
import { Modal } from './Modal';
import { Badge, BadgeTone } from './Badge';
import { Loader } from './Loader';
import { EmptyState } from './EmptyState';
import { apiService } from '../services/api';
import { AbuseFinding, AbuseReviewOutcome, AccountStatus, UserDetailResponse, UserSession } from '../types';
import { countryCodeToFlagEmoji } from '../utils/countryFlag';

interface UserDetailDrawerProps {
  userId: string | null;
  onClose: () => void;
  /** Called after any action that changes the account (suspend/reinstate/delete), so the list row can refresh. */
  onChanged: () => void;
}

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

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({ userId, onClose, onChanged }) => {
  const [detail, setDetail] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [findings, setFindings] = useState<AbuseFinding[] | null>(null);
  const [sessions, setSessions] = useState<UserSession[] | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'suspend' | 'delete' | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback((id: string) => {
    setLoading(true);
    setLoadError(null);
    Promise.all([
      apiService.getUserDetail(id),
      apiService.listAbuseFindings({ userId: id, includeReviewed: true, limit: 20 }),
      apiService.listUserSessions(id).catch(() => ({ sessions: [] })),
    ])
      .then(([detailRes, findingsRes, sessionsRes]) => {
        setDetail(detailRes);
        setFindings(findingsRes.findings);
        setSessions(sessionsRes.sessions);
      })
      .catch((err: any) => setLoadError(err.message || 'Failed to load user.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (userId) {
      setDetail(null);
      setFindings(null);
      setSessions(null);
      setActionError(null);
      setReason('');
      load(userId);
    }
  }, [userId, load]);

  const refresh = () => {
    if (userId) load(userId);
    onChanged();
  };

  const handleSuspendToggle = async () => {
    if (!userId || !detail) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (detail.user.status === 'active') {
        await apiService.suspendUser(userId, 'suspended', reason.trim() || undefined);
      } else {
        await apiService.reinstateUser(userId);
      }
      setConfirmAction(null);
      setReason('');
      refresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update account status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await apiService.deleteUserAccount(userId, reason.trim() || undefined);
      setConfirmAction(null);
      setReason('');
      onChanged();
      onClose();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete account.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewFinding = async (findingId: string, outcome: AbuseReviewOutcome) => {
    if (!userId) return;
    try {
      await apiService.reviewAbuseFinding(findingId, outcome);
      const res = await apiService.listAbuseFindings({ userId, includeReviewed: true, limit: 20 });
      setFindings(res.findings);
    } catch (err: any) {
      setActionError(err.message || 'Failed to record review.');
    }
  };

  const user = detail?.user;
  const isOpen = !!userId;

  return (
    <>
      <Drawer title={user ? user.email : 'User details'} isOpen={isOpen} onClose={onClose}>
        {loading && <Loader type="skeleton-list" count={4} />}

        {!loading && loadError && (
          <EmptyState tone="error" message={loadError} actionLabel="Retry" onAction={() => userId && load(userId)} />
        )}

        {!loading && user && (
          <>
            {/* Profile summary */}
            <section>
              <div className="drawer-profile-header">
                <div className="drawer-profile-avatar">
                  {(user.fullName || user.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="drawer-profile-name">{user.fullName || 'No name on file'}</div>
                  <div className="drawer-profile-email">{user.email}</div>
                </div>
              </div>

              <div className="drawer-meta-grid" style={{ marginTop: 'var(--space-16)' }}>
                <div className="drawer-meta-item">
                  <label>Joined</label>
                  <span>{formatDate(user.createdAt)}</span>
                </div>
                <div className="drawer-meta-item">
                  <label>Country</label>
                  <span>{user.countryCode ? `${countryCodeToFlagEmoji(user.countryCode)} ${user.countryCode}` : '—'}</span>
                </div>
                <div className="drawer-meta-item">
                  <label>Email verified</label>
                  <span>{user.emailVerified ? 'Yes' : 'No'}</span>
                </div>
                <div className="drawer-meta-item">
                  <label>User ID</label>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 'var(--font-size-11)' }}>{user.id}</span>
                </div>
              </div>
            </section>

            {/* Account status */}
            <section>
              <div className="drawer-section-title">Account status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)', marginBottom: 'var(--space-12)' }}>
                <Badge tone={STATUS_TONE[user.status]}>{user.status}</Badge>
                {user.statusChangedAt && (
                  <span style={{ fontSize: 'var(--font-size-12)', color: 'var(--text-muted)' }}>
                    since {formatDate(user.statusChangedAt)}
                  </span>
                )}
              </div>
              {user.statusReason && (
                <p style={{ fontSize: 'var(--font-size-12)', color: 'var(--text-muted)', marginBottom: 'var(--space-12)' }}>
                  Reason: {user.statusReason}
                </p>
              )}

              {actionError && <div className="modal-error" role="alert">{actionError}</div>}

              <div className="drawer-actions">
                {user.status !== 'deleted' && (
                  <button
                    className="btn secondary"
                    onClick={() => setConfirmAction('suspend')}
                    disabled={actionLoading}
                  >
                    <i className={user.status === 'active' ? 'fa-solid fa-ban' : 'fa-solid fa-rotate-left'}></i>
                    {user.status === 'active' ? 'Suspend' : 'Unsuspend'}
                  </button>
                )}
                {user.status !== 'deleted' && (
                  <button className="btn danger" onClick={() => setConfirmAction('delete')} disabled={actionLoading}>
                    <i className="fa-solid fa-trash"></i> Delete account
                  </button>
                )}
              </div>

              {sessions && sessions.length > 0 && (
                <div style={{ marginTop: 'var(--space-16)' }}>
                  <div className="drawer-section-title">Active sessions ({sessions.length})</div>
                  {sessions.map((s) => (
                    <div className="session-row" key={s.familyId}>
                      <span className="session-origin">{s.deviceLabel || s.originHash.slice(0, 12)}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{formatDate(s.issuedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Credits summary */}
            <section>
              <div className="drawer-section-title">Credits</div>
              <div className="drawer-credits-row">
                <span className="drawer-credits-balance">{detail.credits.balance}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-12)' }}>credits</span>
              </div>
              {detail.credits.recentTransactions.length > 0 ? (
                <div className="drawer-tx-list">
                  {detail.credits.recentTransactions.map((tx) => (
                    <div className="drawer-tx-row" key={tx.id}>
                      <span className="drawer-tx-desc">{tx.description || tx.type}</span>
                      <span className={`drawer-tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                        {tx.amount >= 0 ? '+' : ''}
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState variant="inline" compact message="No transactions yet." />
              )}
            </section>

            {/* Risk score */}
            <section>
              <div className="drawer-section-title">Risk score</div>
              {user.riskScore !== null ? (
                <>
                  <div className="risk-cell" style={{ minWidth: 0 }}>
                    <div className="risk-meter-track" style={{ width: '100%' }}>
                      <div
                        className={`risk-meter-fill ${riskTone(user.riskScore)}`}
                        style={{ width: `${Math.min(100, user.riskScore)}%` }}
                      />
                    </div>
                    <span className="risk-score-value">{user.riskScore}/100</span>
                  </div>
                  {user.riskFactors && Object.keys(user.riskFactors).length > 0 && (
                    <div className="risk-factor-list">
                      {Object.entries(user.riskFactors).map(([key, value]) => (
                        <div className="risk-factor-row" key={key}>
                          <span>{key}</span>
                          <strong>{String(value)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="risk-note">
                    Ranking aid for human review, not a probability - never used for automated decisions.
                  </p>
                </>
              ) : (
                <EmptyState variant="inline" compact message="No risk score computed yet." />
              )}
            </section>

            {/* Abuse findings */}
            <section>
              <div className="drawer-section-title">Abuse findings</div>
              {findings === null && <Loader type="skeleton-list" count={2} />}
              {findings && findings.length === 0 && (
                <EmptyState variant="inline" compact message="No findings recorded for this account." />
              )}
              {findings && findings.map((f) => (
                <div className="finding-card" key={f.id}>
                  <div className="finding-card-header">
                    <span className="finding-detector">{f.detector}</span>
                    <Badge tone={SEVERITY_TONE[f.severity]}>{f.severity}</Badge>
                  </div>
                  <pre className="finding-evidence">{JSON.stringify(f.evidence, null, 2)}</pre>
                  <div className="finding-meta">
                    {formatDate(f.createdAt)} · action: {f.action}
                    {f.reviewOutcome && ` · reviewed: ${f.reviewOutcome}`}
                  </div>
                  {!f.reviewedAt && (
                    <div className="finding-actions">
                      <button className="btn secondary btn-small" onClick={() => handleReviewFinding(f.id, 'confirmed')}>
                        Confirm
                      </button>
                      <button className="btn secondary btn-small" onClick={() => handleReviewFinding(f.id, 'false_positive')}>
                        False positive
                      </button>
                      <button className="btn secondary btn-small" onClick={() => handleReviewFinding(f.id, 'ignored')}>
                        Ignore
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </section>
          </>
        )}
      </Drawer>

      <Modal
        title={confirmAction === 'delete' ? 'Delete account' : user?.status === 'active' ? 'Suspend account' : 'Unsuspend account'}
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        size="small"
      >
        <div className="form-layout">
          {confirmAction === 'delete' ? (
            <p>
              This ends every active session for <strong>{user?.email}</strong> immediately and blocks sign-in.
              Their credit and generation history is kept for records; the account cannot sign back in.
            </p>
          ) : (
            <p>
              {user?.status === 'active' ? (
                <>Suspend <strong>{user?.email}</strong>? This ends every active session immediately.</>
              ) : (
                <>Restore access for <strong>{user?.email}</strong>?</>
              )}
            </p>
          )}

          {(confirmAction === 'delete' || user?.status === 'active') && (
            <div className="form-group">
              <label>Reason (optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Repeated policy violations"
              />
            </div>
          )}

          {actionError && <div className="modal-error" role="alert">{actionError}</div>}

          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setConfirmAction(null)} disabled={actionLoading}>
              Cancel
            </button>
            <button
              className={confirmAction === 'delete' ? 'btn danger' : 'btn'}
              onClick={confirmAction === 'delete' ? handleDelete : handleSuspendToggle}
              disabled={actionLoading}
            >
              {actionLoading ? 'Working...' : confirmAction === 'delete' ? 'Delete account' : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default UserDetailDrawer;

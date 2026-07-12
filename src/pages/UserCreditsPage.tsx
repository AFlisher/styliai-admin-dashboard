import React, { useState } from 'react';
import { apiService } from '../services/api';
import { AdminUserSearchResult } from '../types';
import { Modal } from '../components/Modal';

export const UserCreditsPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<AdminUserSearchResult | null>(null);

  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!email.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setSuccessMessage(null);
    setFoundUser(null);
    try {
      const user = await apiService.searchUserByEmail(email.trim());
      setFoundUser(user);
    } catch (err: any) {
      setSearchError(err.message || 'Failed to find user.');
    } finally {
      setIsSearching(false);
    }
  };

  const parsedAmount = Number(amount);
  const isValidAmount = Number.isInteger(parsedAmount) && parsedAmount !== 0;

  const handleRequestAdjustment = () => {
    setActionError(null);
    if (!isValidAmount) {
      setActionError('Amount must be a non-zero whole number.');
      return;
    }
    if (!reason.trim()) {
      setActionError('A reason is required.');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmAdjustment = async () => {
    if (!foundUser) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const result = await apiService.adjustUserBalance(foundUser.id, parsedAmount, reason.trim());
      setFoundUser({ ...foundUser, balance: result.balance });
      setSuccessMessage(`Balance updated to ${result.balance} credits.`);
      setAmount('');
      setReason('');
      setShowConfirm(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to apply adjustment.');
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="panel">
        <h3 className="panel-title">Manual Credit Adjustment</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
          Search for a user by email to manually add or deduct credits. Every adjustment is recorded
          in that user's transaction history as an admin-type entry with the reason you provide.
        </p>

        <div className="form-layout">
          <div className="form-group form-row">
            <input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button className="btn" onClick={handleSearch} disabled={isSearching || !email.trim()}>
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {searchError && <div className="modal-error">{searchError}</div>}

        {foundUser && (
          <div className="form-layout" style={{ marginTop: '20px' }}>
            <div className="panel-error-alert" style={{ background: 'var(--surface-2, #1a1a2e)', color: 'inherit' }}>
              <strong>{foundUser.email}</strong>
              {foundUser.fullName && <span> ({foundUser.fullName})</span>}
              <br />
              Current balance: <strong>{foundUser.balance}</strong> credits
            </div>

            <div className="form-group">
              <label>Adjustment Amount</label>
              <input
                type="number"
                placeholder="e.g. 5 to add, -5 to deduct"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Reason</label>
              <input
                type="text"
                placeholder="e.g. Customer support goodwill credit"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {actionError && <div className="modal-error">{actionError}</div>}
            {successMessage && <div style={{ color: 'var(--success, green)', fontSize: '13px' }}>{successMessage}</div>}

            <button className="btn" onClick={handleRequestAdjustment} disabled={isSubmitting}>
              Apply Adjustment
            </button>
          </div>
        )}
      </div>

      <Modal
        title="Confirm Credit Adjustment"
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        size="small"
      >
        <div className="form-layout">
          <p>
            {isValidAmount && parsedAmount > 0 ? 'Add' : 'Deduct'} <strong>{Math.abs(parsedAmount)}</strong> credits
            {foundUser && <> {parsedAmount > 0 ? 'to' : 'from'} <strong>{foundUser.email}</strong></>}?
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Reason: {reason}</p>

          {actionError && <div className="modal-error">{actionError}</div>}

          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setShowConfirm(false)} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="btn" onClick={handleConfirmAdjustment} disabled={isSubmitting}>
              {isSubmitting ? 'Applying...' : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserCreditsPage;

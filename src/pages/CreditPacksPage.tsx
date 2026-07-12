import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { CreditPack } from '../types';
import { Modal } from '../components/Modal';
import { Loader } from '../components/Loader';

export const CreditPacksPage: React.FC = () => {
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingPack, setEditingPack] = useState<CreditPack | null>(null);
  const [name, setName] = useState('');
  const [credits, setCredits] = useState(10);
  const [priceDisplay, setPriceDisplay] = useState('');
  const [badge, setBadge] = useState('');
  const [description, setDescription] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchPacks = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await apiService.getCreditPacks();
      setPacks([...data].sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load credit packs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPacks();
  }, []);

  const handleOpenAdd = () => {
    setEditingPack(null);
    setName('');
    setCredits(10);
    setPriceDisplay('');
    setBadge('');
    setDescription('');
    setIsEnabled(true);
    setActionError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (pack: CreditPack) => {
    setEditingPack(pack);
    setName(pack.name);
    setCredits(pack.credits);
    setPriceDisplay(pack.priceDisplay);
    setBadge(pack.badge || '');
    setDescription(pack.description || '');
    setIsEnabled(pack.isEnabled);
    setActionError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    setActionError(null);
    if (!name.trim()) {
      setActionError('Pack name is required.');
      return;
    }
    if (!Number.isInteger(credits) || credits <= 0) {
      setActionError('Credits must be a positive whole number.');
      return;
    }
    if (!priceDisplay.trim()) {
      setActionError('Price display text is required.');
      return;
    }

    const payload = {
      name: name.trim(),
      credits,
      priceDisplay: priceDisplay.trim(),
      badge: badge.trim() || null,
      description: description.trim() || null,
      isEnabled,
    };

    try {
      if (editingPack) {
        const updated = await apiService.updateCreditPack(editingPack.id, {
          ...payload,
          sortOrder: editingPack.sortOrder,
        });
        setPacks(packs.map((p) => (p.id === editingPack.id ? updated : p)));
      } else {
        const created = await apiService.addCreditPack(payload);
        setPacks([...packs, created]);
      }
      setShowModal(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save credit pack.');
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null);
    setActionError(null);
    try {
      await apiService.deleteCreditPack(id);
      setPacks(packs.filter((p) => p.id !== id));
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete credit pack.');
    }
  };

  const handleToggleEnabled = async (pack: CreditPack) => {
    try {
      const updated = await apiService.updateCreditPack(pack.id, {
        name: pack.name,
        credits: pack.credits,
        priceDisplay: pack.priceDisplay,
        badge: pack.badge,
        description: pack.description,
        isEnabled: !pack.isEnabled,
        sortOrder: pack.sortOrder,
      });
      setPacks(packs.map((p) => (p.id === pack.id ? updated : p)));
    } catch (err: any) {
      setActionError(err.message || 'Failed to update pack status.');
    }
  };

  return (
    <div>
      <div className="panel">
        <div className="panel-header-with-action">
          <h3 className="panel-title">Credit Packs</h3>
          <button className="btn" onClick={handleOpenAdd}>
            <i className="fa-solid fa-plus"></i> Add Pack
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
          These packs are what the mobile app's paywall screen displays. `productId` is empty for
          every pack until real App Store / Google Play products are configured (Roadmap Item 4.1).
        </p>

        {actionError && <div className="panel-error-alert">{actionError}</div>}

        {isLoading ? (
          <Loader type="skeleton-list" count={3} />
        ) : loadError ? (
          <div className="error-panel">
            <p>{loadError}</p>
            <button className="btn" onClick={fetchPacks}>Retry</button>
          </div>
        ) : packs.length === 0 ? (
          <div className="empty-panel">
            <p>No credit packs yet.</p>
          </div>
        ) : (
          <div className="form-layout">
            {packs.map((pack) => (
              <div
                key={pack.id}
                className="panel-error-alert"
                style={{
                  background: 'var(--surface-2, #1a1a2e)',
                  color: 'inherit',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: pack.isEnabled ? 1 : 0.5,
                }}
              >
                <div>
                  <strong>{pack.name}</strong> — {pack.credits} credits for {pack.priceDisplay}
                  {pack.badge && <span className="badge purple" style={{ marginLeft: '8px' }}>{pack.badge}</span>}
                  {!pack.isEnabled && <span className="badge" style={{ marginLeft: '8px' }}>Disabled</span>}
                  {pack.description && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {pack.description}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn secondary btn-small" onClick={() => handleToggleEnabled(pack)}>
                    {pack.isEnabled ? 'Disable' : 'Enable'}
                  </button>
                  <button className="btn secondary btn-small" onClick={() => handleOpenEdit(pack)}>
                    Edit
                  </button>
                  <button className="btn secondary btn-small" onClick={() => setConfirmDeleteId(pack.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        title={editingPack ? 'Edit Credit Pack' : 'New Credit Pack'}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        size="small"
      >
        <div className="form-layout">
          <div className="form-group">
            <label>Pack Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Starter Pack" />
          </div>
          <div className="form-group">
            <label>Credits</label>
            <input
              type="number"
              value={credits}
              onChange={(e) => setCredits(Number(e.target.value))}
              min={1}
            />
          </div>
          <div className="form-group">
            <label>Price Display</label>
            <input type="text" value={priceDisplay} onChange={(e) => setPriceDisplay(e.target.value)} placeholder="e.g. $4.99" />
          </div>
          <div className="form-group">
            <label>Badge (optional)</label>
            <input type="text" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="e.g. Best Value" />
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-group form-row">
            <input
              type="checkbox"
              id="pack-enabled-chk"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="custom-checkbox"
            />
            <label htmlFor="pack-enabled-chk">Enabled (visible in the mobile app)</label>
          </div>

          {actionError && <div className="modal-error">{actionError}</div>}

          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn" onClick={handleSave}>{editingPack ? 'Update Pack' : 'Create Pack'}</button>
          </div>
        </div>
      </Modal>

      <Modal
        title="Delete Credit Pack"
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        size="small"
      >
        <div className="form-layout">
          <p>Are you sure you want to delete this credit pack? This won't affect users who already purchased it in the past.</p>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
            <button className="btn" onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>Confirm</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CreditPacksPage;

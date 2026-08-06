import React from 'react';

/**
 * One component for every "nothing to show here" moment: full failed-fetch
 * panels with an icon/title/retry (variant="panel"), and the small inline
 * notices inside a chart, table, or sidebar list (variant="inline"). These
 * were six separately hand-rolled treatments before; the two shapes here
 * reproduce each of them exactly via props rather than introducing a new look.
 * Bakes in the P1 accessibility roles: role="alert" for tone="error",
 * role="status" otherwise, so callers no longer set it by hand.
 */
interface EmptyStateProps {
  variant?: 'panel' | 'inline';
  message: React.ReactNode;
  icon?: string;
  title?: string;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
  tone?: 'default' | 'error';
  /** panel variant only - the dashed, transparent treatment (e.g. "no styles match this filter"). */
  dashed?: boolean;
  /** inline variant only - the compact sidebar-list treatment instead of the fixed-height chart/table one. */
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'panel',
  message,
  icon,
  title,
  actionLabel,
  actionIcon,
  onAction,
  tone = 'default',
  dashed = false,
  compact = false,
}) => {
  if (variant === 'inline') {
    return (
      <div className={['empty-state-inline', compact ? 'empty-state-inline--compact' : ''].filter(Boolean).join(' ')}>
        {message}
      </div>
    );
  }

  return (
    <div
      className={['empty-state-panel', dashed ? 'empty-state-panel--dashed' : ''].filter(Boolean).join(' ')}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {icon && (
        <i className={[icon, 'empty-state-icon', tone === 'error' ? 'empty-state-icon--error' : ''].filter(Boolean).join(' ')}></i>
      )}
      {title && <h3>{title}</h3>}
      <p>{message}</p>
      {actionLabel && onAction && (
        <button className="btn" onClick={onAction}>
          {actionIcon && <i className={actionIcon}></i>} {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

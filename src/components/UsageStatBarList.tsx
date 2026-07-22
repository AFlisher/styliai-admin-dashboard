import React from 'react';

export interface UsageStatBarRow {
  key: string;
  name: string;
  count: number;
  percentage: number;
}

interface UsageStatBarListProps {
  rows: UsageStatBarRow[];
  countLabel?: string;
}

/**
 * Horizontal bar list shared by "Most Used Styles" and "Most Used
 * Categories" - each row is a name, a generation count, a percentage, and a
 * proportional bar.
 */
export const UsageStatBarList: React.FC<UsageStatBarListProps> = ({ rows, countLabel = 'generations' }) => {
  return (
    <div className="hbar-list">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="hbar-row-label">
            <span className="hbar-row-name">{row.name}</span>
            <span className="hbar-row-meta">
              {row.count.toLocaleString()} {countLabel} ({row.percentage.toFixed(1)}%)
            </span>
          </div>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${Math.min(row.percentage, 100)}%` }}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UsageStatBarList;

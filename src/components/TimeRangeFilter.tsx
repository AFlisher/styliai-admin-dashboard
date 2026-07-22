import React from 'react';

// Shared by every dashboard analytics page that filters by the same
// Today/Last 7 Days/Last 30 Days/All Time window (Users by Country,
// Generation Analytics, ...) - keep this the single source of truth for
// that range union rather than letting each page redeclare its own.
export type TimeRangeFilterValue = 'today' | 'last7days' | 'last30days' | 'allTime';

interface TimeRangeFilterProps {
  value: TimeRangeFilterValue;
  onChange: (range: TimeRangeFilterValue) => void;
  className?: string;
}

const RANGE_OPTIONS: Array<{ value: TimeRangeFilterValue; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'allTime', label: 'All Time' },
];

export const TimeRangeFilter: React.FC<TimeRangeFilterProps> = ({ value, onChange, className }) => {
  return (
    <div className={`tabs time-range-filter ${className ?? ''}`}>
      {RANGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          className={`tab-btn ${value === option.value ? 'active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default TimeRangeFilter;

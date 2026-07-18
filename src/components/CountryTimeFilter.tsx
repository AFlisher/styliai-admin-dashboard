import React from 'react';
import { CountryStatsRange } from '../types';

interface CountryTimeFilterProps {
  value: CountryStatsRange;
  onChange: (range: CountryStatsRange) => void;
}

const RANGE_OPTIONS: Array<{ value: CountryStatsRange; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'allTime', label: 'All Time' },
];

export const CountryTimeFilter: React.FC<CountryTimeFilterProps> = ({ value, onChange }) => {
  return (
    <div className="tabs country-time-filter">
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

export default CountryTimeFilter;

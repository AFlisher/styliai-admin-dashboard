import React, { useMemo, useState } from 'react';
import { CountryStat } from '../types';
import { countryCodeToFlagEmoji } from '../utils/countryFlag';

const MAX_SLICES = 7;
const RADIUS = 70;
const STROKE_WIDTH = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SLICE_COLORS = ['#7c3aed', '#e735f6', '#3b82f6', '#f59e0b', '#22c55e', '#06b6d4', '#ef4444'];
const OTHER_COLOR = '#71717a';

interface PieSlice {
  countryCode: string;
  countryName: string;
  userCount: number;
  percentage: number;
  color: string;
}

interface CountryPieChartProps {
  countries: CountryStat[];
}

export const CountryPieChart: React.FC<CountryPieChartProps> = React.memo(({ countries }) => {
  const [activeSlice, setActiveSlice] = useState<PieSlice | null>(null);

  const slices: PieSlice[] = useMemo(() => {
    const top = countries.slice(0, MAX_SLICES).map((c, i) => ({
      countryCode: c.countryCode,
      countryName: c.countryName,
      userCount: c.userCount,
      percentage: c.percentage,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }));

    const rest = countries.slice(MAX_SLICES);
    const otherCount = rest.reduce((sum, c) => sum + c.userCount, 0);
    if (otherCount > 0) {
      const otherPercentage = rest.reduce((sum, c) => sum + c.percentage, 0);
      top.push({
        countryCode: 'OTHER',
        countryName: 'Other',
        userCount: otherCount,
        percentage: otherPercentage,
        color: OTHER_COLOR,
      });
    }

    return top;
  }, [countries]);

  const totalUsers = useMemo(
    () => countries.reduce((sum, c) => sum + c.userCount, 0),
    [countries]
  );

  const segments = useMemo(() => {
    let cumulative = 0;
    return slices.map((slice) => {
      const length = (slice.percentage / 100) * CIRCUMFERENCE;
      const segment = { ...slice, length, offset: cumulative };
      cumulative += length;
      return segment;
    });
  }, [slices]);

  return (
    <div className="pie-chart-wrap">
      <svg viewBox="0 0 200 200" className="pie-chart-svg" role="img" aria-label="User distribution by country">
        <g transform="rotate(-90 100 100)">
          {segments.map((seg) => (
            <circle
              key={seg.countryCode}
              cx={100}
              cy={100}
              r={RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={`${seg.length} ${CIRCUMFERENCE - seg.length}`}
              strokeDashoffset={-seg.offset}
              className="pie-segment"
              onMouseEnter={() => setActiveSlice(seg)}
              onMouseLeave={() => setActiveSlice(null)}
            />
          ))}
        </g>
        <text x="100" y="96" textAnchor="middle" className="pie-center-value">
          {activeSlice ? `${activeSlice.percentage.toFixed(1)}%` : totalUsers.toLocaleString()}
        </text>
        <text x="100" y="118" textAnchor="middle" className="pie-center-label">
          {activeSlice ? activeSlice.countryName : 'Total Users'}
        </text>
      </svg>

      <ul className="pie-legend">
        {segments.map((seg) => (
          <li
            key={seg.countryCode}
            className={`pie-legend-item ${activeSlice?.countryCode === seg.countryCode ? 'active' : ''}`}
            onMouseEnter={() => setActiveSlice(seg)}
            onMouseLeave={() => setActiveSlice(null)}
          >
            <span className="pie-legend-swatch" style={{ background: seg.color }}></span>
            <span className="pie-legend-name">
              {seg.countryCode !== 'OTHER' && countryCodeToFlagEmoji(seg.countryCode)} {seg.countryName}
            </span>
            <span className="pie-legend-percentage">{seg.percentage.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
});

CountryPieChart.displayName = 'CountryPieChart';

export default CountryPieChart;

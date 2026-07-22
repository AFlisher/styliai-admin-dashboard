import React from 'react';
import { FeedbackSummaryStats } from '../types';

interface RatingDistributionChartProps {
  summary: FeedbackSummaryStats;
}

const STARS: Array<5 | 4 | 3 | 2 | 1> = [5, 4, 3, 2, 1];

export const RatingDistributionChart: React.FC<RatingDistributionChartProps> = ({ summary }) => {
  const distribution = summary.distribution || {};
  const total = summary.totalFeedback || 0;

  return (
    <div>
      <div className="rating-summary-header">
        <span className="rating-summary-value">{summary.avgRating != null ? summary.avgRating.toFixed(2) : '—'}</span>
        <span className="rating-summary-stars">★★★★★</span>
        <span className="rating-summary-count">{total.toLocaleString()} rating{total === 1 ? '' : 's'}</span>
      </div>

      <div className="hbar-list">
        {STARS.map((star) => {
          const count = (distribution as Record<string, number>)[String(star)] ?? 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star}>
              <div className="hbar-row-label">
                <span className="hbar-row-name">{'★'.repeat(star)}</span>
                <span className="hbar-row-meta">{count.toLocaleString()}</span>
              </div>
              <div className="hbar-track">
                <div className="hbar-fill rating" style={{ width: `${percentage}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RatingDistributionChart;

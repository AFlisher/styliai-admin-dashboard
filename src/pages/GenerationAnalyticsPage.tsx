import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../services/api';
import { GenerationOverviewStats, GenerationAnalyticsSummary, GenerationAnalyticsRange } from '../types';
import { TimeRangeFilter } from '../components/TimeRangeFilter';
import { UsageStatBarList, UsageStatBarRow } from '../components/UsageStatBarList';
import { RatingDistributionChart } from '../components/RatingDistributionChart';
import { EmptyState } from '../components/EmptyState';
import { TwoColumnLayout } from '../components/TwoColumnLayout';

function formatMs(ms: number | null | undefined): string {
  if (ms == null) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function formatRating(rating: number | null | undefined): string {
  return rating != null ? rating.toFixed(2) : '—';
}

export const GenerationAnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<GenerationOverviewStats | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [range, setRange] = useState<GenerationAnalyticsRange>('allTime');
  const [summary, setSummary] = useState<GenerationAnalyticsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Keyed by range so switching back to a filter already fetched this
  // session reuses the cached payload instead of re-hitting the backend.
  const summaryCacheRef = useRef<Partial<Record<GenerationAnalyticsRange, GenerationAnalyticsSummary>>>({});

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const data = await apiService.getGenerationOverview();
      setOverview(data);
    } catch (err: any) {
      setOverviewError(err.message || 'Failed to fetch generation overview. Make sure the backend is available.');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async (targetRange: GenerationAnalyticsRange, options?: { force?: boolean }) => {
    const cached = !options?.force && summaryCacheRef.current[targetRange];
    if (cached) {
      setSummary(cached);
      setSummaryError(null);
      setSummaryLoading(false);
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await apiService.getGenerationAnalyticsSummary(targetRange);
      summaryCacheRef.current[targetRange] = data;
      setSummary(data);
    } catch (err: any) {
      setSummaryError(err.message || 'Failed to fetch generation analytics. Make sure the backend is available.');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    fetchSummary(range);
  }, [range, fetchSummary]);

  const handleRetryOverview = () => fetchOverview();
  const handleRetrySummary = () => {
    delete summaryCacheRef.current[range];
    fetchSummary(range, { force: true });
  };

  const topStyleRows: UsageStatBarRow[] = (summary?.topStyles ?? []).map((s, i) => ({
    key: s.styleId ?? `style-${i}`,
    name: s.styleName,
    count: s.count,
    percentage: s.percentage,
  }));

  const topCategoryRows: UsageStatBarRow[] = (summary?.topCategories ?? []).map((c, i) => ({
    key: c.categoryId ?? `category-${i}`,
    name: c.categoryName,
    count: c.count,
    percentage: c.percentage,
  }));

  return (
    <div>
      <div className="panel-title-row">
        <h2>Generation Analytics</h2>
        <TimeRangeFilter value={range} onChange={setRange} />
      </div>

      {overviewLoading && (
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="stat-card skeleton pulse" style={{ height: '120px' }}></div>
          ))}
        </div>
      )}

      {!overviewLoading && overviewError && (
        <EmptyState
          tone="error"
          icon="fa-solid fa-triangle-exclamation"
          title="Unable to Load Overview"
          message={overviewError}
          actionLabel="Try Again"
          actionIcon="fa-solid fa-rotate-right"
          onAction={handleRetryOverview}
        />
      )}

      {!overviewLoading && !overviewError && overview && (
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Total Generations</span>
              <div className="stat-icon purple"><i className="fa-solid fa-wand-magic-sparkles"></i></div>
            </div>
            <span className="stat-value">{overview.totalGenerations.toLocaleString()}</span>
            <span className="stat-trend neutral">All-time successful generations</span>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Today</span>
              <div className="stat-icon blue"><i className="fa-solid fa-calendar-day"></i></div>
            </div>
            <span className="stat-value">{overview.todayGenerations.toLocaleString()}</span>
            <span className="stat-trend neutral">Generations today</span>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">This Week</span>
              <div className="stat-icon green"><i className="fa-solid fa-calendar-week"></i></div>
            </div>
            <span className="stat-value">{overview.thisWeekGenerations.toLocaleString()}</span>
            <span className="stat-trend neutral">Generations this week</span>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">This Month</span>
              <div className="stat-icon orange"><i className="fa-solid fa-calendar"></i></div>
            </div>
            <span className="stat-value">{overview.thisMonthGenerations.toLocaleString()}</span>
            <span className="stat-trend neutral">Generations this month</span>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Active Users Today</span>
              <div className="stat-icon pink"><i className="fa-solid fa-user-check"></i></div>
            </div>
            <span className="stat-value">{overview.activeUsersToday.toLocaleString()}</span>
            <span className="stat-trend neutral">Users who generated today</span>
          </div>

          <div className="stat-card">
            <div className="stat-header">
              <span className="stat-title">Active Users This Month</span>
              <div className="stat-icon blue"><i className="fa-solid fa-users"></i></div>
            </div>
            <span className="stat-value">{overview.activeUsersThisMonth.toLocaleString()}</span>
            <span className="stat-trend neutral">Users who generated this month</span>
          </div>
        </div>
      )}

      {summaryLoading && (
        <div className="analytics-loading-view">
          <TwoColumnLayout ratio="1-1" style={{ marginBottom: '24px' }}>
            <div className="panel skeleton pulse" style={{ height: '300px' }}></div>
            <div className="panel skeleton pulse" style={{ height: '300px' }}></div>
          </TwoColumnLayout>
          <TwoColumnLayout ratio="1-1" style={{ marginBottom: '24px' }}>
            <div className="panel skeleton pulse" style={{ height: '260px' }}></div>
            <div className="panel skeleton pulse" style={{ height: '260px' }}></div>
          </TwoColumnLayout>
          <div className="panel skeleton pulse" style={{ height: '300px' }}></div>
        </div>
      )}

      {!summaryLoading && summaryError && (
        <EmptyState
          tone="error"
          icon="fa-solid fa-triangle-exclamation"
          title="Unable to Load Generation Analytics"
          message={summaryError}
          actionLabel="Try Again"
          actionIcon="fa-solid fa-rotate-right"
          onAction={handleRetrySummary}
        />
      )}

      {!summaryLoading && !summaryError && summary && (
        <>
          <TwoColumnLayout ratio="1-1" style={{ marginBottom: '24px' }}>
            <div className="panel">
              <h3 className="panel-title">Most Used Styles</h3>
              {topStyleRows.length === 0 ? (
                <EmptyState variant="inline" message="No style generations in this range." />
              ) : (
                <UsageStatBarList rows={topStyleRows} />
              )}
            </div>
            <div className="panel">
              <h3 className="panel-title">Most Used Categories</h3>
              {topCategoryRows.length === 0 ? (
                <EmptyState variant="inline" message="No category generations in this range." />
              ) : (
                <UsageStatBarList rows={topCategoryRows} />
              )}
            </div>
          </TwoColumnLayout>

          <TwoColumnLayout ratio="1-1" style={{ marginBottom: '24px' }}>
            <div className="panel">
              <h3 className="panel-title">Highest Rated Styles</h3>
              {summary.highestRatedStyles.length === 0 ? (
                <EmptyState variant="inline" message={`No styles have at least ${summary.minFeedbackCount} ratings yet.`} />
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Style</th>
                        <th scope="col">Avg Rating</th>
                        <th scope="col">Feedback Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.highestRatedStyles.map((s, i) => (
                        <tr key={s.styleId ?? `highest-${i}`}>
                          <td>{s.styleName}</td>
                          <td>{formatRating(s.avgRating)} ★</td>
                          <td>{s.feedbackCount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="panel">
              <h3 className="panel-title">Lowest Rated Styles</h3>
              {summary.lowestRatedStyles.length === 0 ? (
                <EmptyState variant="inline" message={`No styles have at least ${summary.minFeedbackCount} ratings yet.`} />
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Style</th>
                        <th scope="col">Avg Rating</th>
                        <th scope="col">Feedback Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.lowestRatedStyles.map((s, i) => (
                        <tr key={s.styleId ?? `lowest-${i}`}>
                          <td>{s.styleName}</td>
                          <td>{formatRating(s.avgRating)} ★</td>
                          <td>{s.feedbackCount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TwoColumnLayout>

          <TwoColumnLayout ratio="1-1" style={{ marginBottom: '24px' }}>
            <div className="panel">
              <h3 className="panel-title">Average Generation Time</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-title">Average</span>
                    <div className="stat-icon blue"><i className="fa-solid fa-stopwatch"></i></div>
                  </div>
                  <span className="stat-value">{formatMs(summary.generationTime.avgMs)}</span>
                  <span className="stat-trend neutral">{summary.generationTime.sampleCount.toLocaleString()} samples</span>
                </div>
                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-title">Fastest Style</span>
                    <div className="stat-icon green"><i className="fa-solid fa-gauge-high"></i></div>
                  </div>
                  <span className="stat-value">{formatMs(summary.generationTime.fastestStyle?.avgMs)}</span>
                  <span className="stat-trend neutral">{summary.generationTime.fastestStyle?.styleName ?? '—'}</span>
                </div>
                <div className="stat-card">
                  <div className="stat-header">
                    <span className="stat-title">Slowest Style</span>
                    <div className="stat-icon orange"><i className="fa-solid fa-hourglass-half"></i></div>
                  </div>
                  <span className="stat-value">{formatMs(summary.generationTime.slowestStyle?.avgMs)}</span>
                  <span className="stat-trend neutral">{summary.generationTime.slowestStyle?.styleName ?? '—'}</span>
                </div>
              </div>
            </div>

            <div className="panel">
              <h3 className="panel-title">Feedback Summary</h3>
              <RatingDistributionChart summary={summary.feedbackSummary} />
            </div>
          </TwoColumnLayout>

          <div className="panel">
            <h3 className="panel-title">Recent Feedback</h3>
            {summary.recentFeedback.length === 0 ? (
              <EmptyState variant="inline" message="No feedback submitted in this range yet." />
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">User</th>
                      <th scope="col">Style</th>
                      <th scope="col">Rating</th>
                      <th scope="col">Comment</th>
                      <th scope="col">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentFeedback.map((f) => (
                      <tr key={f.id}>
                        <td>{f.userEmail}</td>
                        <td>{f.styleName}</td>
                        <td>{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</td>
                        <td style={{ maxWidth: '320px' }}>
                          {f.comment || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(f.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GenerationAnalyticsPage;

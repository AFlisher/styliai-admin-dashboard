import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { AdminStats } from '../types';
import { Badge, BadgeTone } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { TwoColumnLayout } from '../components/TwoColumnLayout';

function badgeToneForType(type: string): BadgeTone {
  switch (type) {
    case 'generation':
      return 'purple';
    case 'reward':
      return 'success';
    case 'purchase':
      return 'blue';
    default:
      return 'neutral';
  }
}

export const AnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics statistics. Make sure the backend is available.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="analytics-loading-view">
        <div className="stats-grid">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="stat-card skeleton pulse" style={{ height: '140px' }}></div>
          ))}
        </div>
        <TwoColumnLayout ratio="2-1" style={{ marginTop: '24px' }}>
          <div className="panel skeleton pulse" style={{ height: '300px' }}></div>
          <div className="panel skeleton pulse" style={{ height: '300px' }}></div>
        </TwoColumnLayout>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        tone="error"
        icon="fa-solid fa-triangle-exclamation"
        title="Unable to Load Analytics"
        message={error}
        actionLabel="Try Again"
        actionIcon="fa-solid fa-rotate-right"
        onAction={fetchStats}
      />
    );
  }

  if (!stats) {
    return (
      <EmptyState
        icon="fa-regular fa-folder-open"
        title="No Analytics Data"
        message="No statistics are currently available for this platform."
        actionLabel="Refresh"
        actionIcon="fa-solid fa-rotate-right"
        onAction={fetchStats}
      />
    );
  }

  // Find max value in chart data to scale bars
  const chartValues = stats.chartData?.map((d) => d.value) || [];
  const maxChartValue = chartValues.length > 0 ? Math.max(...chartValues) : 100;

  return (
    <div>
      <div className="stats-grid stats-grid-5">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Users</span>
            <div className="stat-icon blue"><i className="fa-solid fa-users"></i></div>
          </div>
          <span className="stat-value">{stats.totalUsers.toLocaleString()}</span>
          <span className="stat-trend neutral">All registered accounts</span>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Active Today</span>
            <div className="stat-icon green"><i className="fa-solid fa-user-check"></i></div>
          </div>
          <span className="stat-value">{stats.activeToday.toLocaleString()}</span>
          <span className="stat-trend neutral">Users with wallet activity today</span>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Images Generated</span>
            <div className="stat-icon purple"><i className="fa-solid fa-wand-magic-sparkles"></i></div>
          </div>
          <span className="stat-value">{stats.imagesGenerated.toLocaleString()}</span>
          <span className="stat-trend neutral">Total style prints</span>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Credits Used</span>
            <div className="stat-icon orange"><i className="fa-solid fa-coins"></i></div>
          </div>
          <span className="stat-value">{stats.creditsUsed.toLocaleString()}</span>
          <span className="stat-trend neutral">Credit burning total</span>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Storage Used</span>
            <div className="stat-icon pink"><i className="fa-solid fa-database"></i></div>
          </div>
          <span className="stat-value">{stats.storageUsedMB.toLocaleString()} MB</span>
          <span className="stat-trend neutral">Style cover images bucket</span>
        </div>
      </div>

      <TwoColumnLayout ratio="2-1">
        <div className="panel">
          <h3 className="panel-title">Daily Style Generates</h3>
          {!stats.chartData || stats.chartData.length === 0 ? (
            <EmptyState variant="inline" message="No daily data available." />
          ) : (
            <div className="bar-chart">
              {stats.chartData.map((bar, i) => {
                const percent = maxChartValue > 0 ? (bar.value / maxChartValue) * 85 : 0; // scale max to 85% height
                return (
                  <div key={i} className="chart-bar-container">
                    <div className="chart-bar" style={{ height: `${percent}%` }}>
                      <span className="chart-tooltip">{bar.value.toLocaleString()} images</span>
                    </div>
                    <span className="chart-label">{bar.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel">
          <h3 className="panel-title">Recent Wallet Activity</h3>
          {!stats.recentActivity || stats.recentActivity.length === 0 ? (
            <EmptyState variant="inline" message="No wallet activity yet." />
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th scope="col">User</th>
                    <th scope="col">Type</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentActivity.map((a) => (
                    <tr key={a.id}>
                      <td>{a.userEmail}</td>
                      <td>
                        <Badge tone={badgeToneForType(a.type)}>{a.type}</Badge>
                      </td>
                      <td>{a.amount > 0 ? `+${a.amount}` : a.amount}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(a.date).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </TwoColumnLayout>
    </div>
  );
};

export default AnalyticsPage;

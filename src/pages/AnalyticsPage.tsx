import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { AdminStats } from '../types';

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
        <div className="chart-section" style={{ marginTop: '24px' }}>
          <div className="panel skeleton pulse" style={{ height: '300px' }}></div>
          <div className="panel skeleton pulse" style={{ height: '300px' }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-panel">
        <i className="fa-solid fa-triangle-exclamation error-icon"></i>
        <h3>Unable to Load Analytics</h3>
        <p>{error}</p>
        <button className="btn" onClick={fetchStats}>
          <i className="fa-solid fa-rotate-right"></i> Try Again
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="empty-panel">
        <i className="fa-regular fa-folder-open empty-icon"></i>
        <h3>No Analytics Data</h3>
        <p>No statistics are currently available for this platform.</p>
        <button className="btn" onClick={fetchStats}>
          <i className="fa-solid fa-rotate-right"></i> Refresh
        </button>
      </div>
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
          <span className="stat-value">{stats.activeUsersToday.toLocaleString()}</span>
          <span className="stat-trend neutral">Active sessions in last 24h</span>
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
          <span className="stat-value">{stats.storageUsed}</span>
          <span className="stat-trend neutral">S3 / Cloud files size</span>
        </div>
      </div>

      <div className="chart-section">
        <div className="panel">
          <h3 className="panel-title">Daily Style Generates</h3>
          {!stats.chartData || stats.chartData.length === 0 ? (
            <div className="chart-empty">No daily data available.</div>
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
          <h3 className="panel-title">Recent System Transactions</h3>
          {!stats.recentPayments || stats.recentPayments.length === 0 ? (
            <div className="table-empty">No transaction history.</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Detail</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPayments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.user}</td>
                      <td>
                        <span className={`badge ${p.plan.includes('Yearly') || p.plan.includes('100') ? 'purple' : 'blue'}`}>
                          {p.plan}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiService } from '../services/api';
import { CountryStat, CountryStatsRange } from '../types';
import { TimeRangeFilter } from '../components/TimeRangeFilter';
import { CountryWorldMap } from '../components/CountryWorldMap';
import { CountryPieChart } from '../components/CountryPieChart';
import { CountryTable } from '../components/CountryTable';
import { EmptyState } from '../components/EmptyState';
import { TwoColumnLayout } from '../components/TwoColumnLayout';

export const UsersByCountryPage: React.FC = () => {
  const [range, setRange] = useState<CountryStatsRange>('allTime');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<CountryStat[] | null>(null);

  // Keyed by range so switching back to a filter already fetched this
  // session reuses the cached rows instead of re-hitting the backend.
  const cacheRef = useRef<Partial<Record<CountryStatsRange, CountryStat[]>>>({});

  const fetchForRange = useCallback(async (targetRange: CountryStatsRange, options?: { force?: boolean }) => {
    const cached = !options?.force && cacheRef.current[targetRange];
    if (cached) {
      setCountries(cached);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getUsersByCountry(targetRange);
      cacheRef.current[targetRange] = data.countries;
      setCountries(data.countries);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch country analytics. Make sure the backend is available.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForRange(range);
  }, [range, fetchForRange]);

  const handleRetry = () => {
    delete cacheRef.current[range];
    fetchForRange(range, { force: true });
  };

  const totalUsers = useMemo(
    () => (countries ?? []).reduce((sum, c) => sum + c.userCount, 0),
    [countries]
  );

  return (
    <div>
      <div className="panel-title-row">
        <h2>Users by Country</h2>
        <TimeRangeFilter value={range} onChange={setRange} />
      </div>

      {isLoading && (
        <div className="analytics-loading-view">
          <TwoColumnLayout ratio="3-2">
            <div className="panel skeleton pulse" style={{ height: '360px' }}></div>
            <div className="panel skeleton pulse" style={{ height: '360px' }}></div>
          </TwoColumnLayout>
          <div className="panel skeleton pulse" style={{ height: '280px', marginTop: '24px' }}></div>
        </div>
      )}

      {!isLoading && error && (
        <EmptyState
          tone="error"
          icon="fa-solid fa-triangle-exclamation"
          title="Unable to Load Country Analytics"
          message={error}
          actionLabel="Try Again"
          actionIcon="fa-solid fa-rotate-right"
          onAction={handleRetry}
        />
      )}

      {!isLoading && !error && countries && countries.length === 0 && (
        <EmptyState
          icon="fa-solid fa-earth-americas"
          title="No Country Data Yet"
          message="No users with a resolved country were found for this time range."
          actionLabel="Refresh"
          actionIcon="fa-solid fa-rotate-right"
          onAction={handleRetry}
        />
      )}

      {!isLoading && !error && countries && countries.length > 0 && (
        <>
          <TwoColumnLayout ratio="3-2">
            <div className="panel world-map-panel">
              <h3 className="panel-title">World Map</h3>
              <CountryWorldMap countries={countries} />
            </div>
            <div className="panel">
              <h3 className="panel-title">Distribution by Country</h3>
              <CountryPieChart countries={countries} />
            </div>
          </TwoColumnLayout>

          <div className="panel" style={{ marginTop: '24px' }}>
            <h3 className="panel-title">Top Countries ({totalUsers.toLocaleString()} users)</h3>
            <CountryTable countries={countries} />
          </div>
        </>
      )}
    </div>
  );
};

export default UsersByCountryPage;

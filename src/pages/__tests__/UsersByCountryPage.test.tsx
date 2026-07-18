import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { UsersByCountryPage } from '../UsersByCountryPage';
import { apiService } from '../../services/api';

vi.mock('../../services/api', () => ({
  apiService: {
    getUsersByCountry: vi.fn(),
  },
}));

// react-simple-maps fetches its topojson from a CDN URL - stub it out so
// tests don't depend on network access and stay focused on page behavior.
vi.mock('react-simple-maps', () => ({
  ComposableMap: ({ children }: any) => <svg>{children}</svg>,
  Geographies: ({ children }: any) => children({ geographies: [] }),
  Geography: () => null,
}));

const ALL_TIME_ROWS = [
  { countryCode: 'US', countryName: 'United States', userCount: 8, percentage: 80 },
  { countryCode: 'CA', countryName: 'Canada', userCount: 2, percentage: 20 },
];

const TODAY_ROWS = [
  { countryCode: 'GB', countryName: 'United Kingdom', userCount: 1, percentage: 100 },
];

describe('UsersByCountryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('shows a loading skeleton, then renders the map/pie/table panels once data resolves', async () => {
    (apiService.getUsersByCountry as any).mockResolvedValue({ range: 'allTime', countries: ALL_TIME_ROWS });

    render(<UsersByCountryPage />);

    expect(document.querySelector('.country-stats-grid .skeleton')).toBeTruthy();

    await screen.findByText('World Map');
    expect(screen.getByText('Distribution by Country')).toBeTruthy();
    expect(screen.getByText(/Top Countries/)).toBeTruthy();
    expect(screen.getAllByText('United States').length).toBeGreaterThan(0);
    expect(apiService.getUsersByCountry).toHaveBeenCalledWith('allTime');
  });

  it('shows the empty state when no country has been resolved for the range', async () => {
    (apiService.getUsersByCountry as any).mockResolvedValue({ range: 'allTime', countries: [] });

    render(<UsersByCountryPage />);

    await screen.findByText('No Country Data Yet');
  });

  it('shows the error state with a retry button on failure, and retrying re-fetches', async () => {
    (apiService.getUsersByCountry as any).mockRejectedValueOnce(new Error('backend unreachable'));

    render(<UsersByCountryPage />);

    await screen.findByText('Unable to Load Country Analytics');
    expect(screen.getByText('backend unreachable')).toBeTruthy();

    (apiService.getUsersByCountry as any).mockResolvedValueOnce({ range: 'allTime', countries: ALL_TIME_ROWS });
    fireEvent.click(screen.getByText(/Try Again/));

    await screen.findByText('World Map');
    expect(apiService.getUsersByCountry).toHaveBeenCalledTimes(2);
  });

  it('fetches once per filter and reuses cached data when switching back', async () => {
    (apiService.getUsersByCountry as any).mockImplementation((range: string) =>
      Promise.resolve({
        range,
        countries: range === 'today' ? TODAY_ROWS : ALL_TIME_ROWS,
      })
    );

    render(<UsersByCountryPage />);
    await screen.findAllByText('United States');
    expect(apiService.getUsersByCountry).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Today'));
    await screen.findAllByText('United Kingdom');
    expect(apiService.getUsersByCountry).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByText('All Time'));
    await screen.findAllByText('United States');
    // Switching back to a filter already fetched this session must not
    // trigger another network call.
    expect(apiService.getUsersByCountry).toHaveBeenCalledTimes(2);

    await waitFor(() => expect(screen.queryByText('United Kingdom')).toBeNull());
  });
});

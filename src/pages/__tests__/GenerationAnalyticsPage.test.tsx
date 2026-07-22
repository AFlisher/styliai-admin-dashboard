import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { GenerationAnalyticsPage } from '../GenerationAnalyticsPage';
import { apiService } from '../../services/api';

vi.mock('../../services/api', () => ({
  apiService: {
    getGenerationOverview: vi.fn(),
    getGenerationAnalyticsSummary: vi.fn(),
  },
}));

const OVERVIEW = {
  totalGenerations: 500,
  todayGenerations: 12,
  thisWeekGenerations: 80,
  thisMonthGenerations: 300,
  activeUsersToday: 5,
  activeUsersThisMonth: 40,
};

const ALL_TIME_SUMMARY = {
  range: 'allTime' as const,
  minFeedbackCount: 10,
  topStyles: [{ styleId: 's1', styleName: 'Anime Style', count: 100, percentage: 50 }],
  topCategories: [{ categoryId: 'c1', categoryName: 'Fun', count: 200, percentage: 60 }],
  highestRatedStyles: [{ styleId: 's1', styleName: 'Top Rated Style', avgRating: 4.8, feedbackCount: 20 }],
  lowestRatedStyles: [{ styleId: 's2', styleName: 'Retro', avgRating: 2.1, feedbackCount: 15 }],
  generationTime: {
    avgMs: 4200,
    sampleCount: 500,
    fastestStyle: { styleId: 's3', styleName: 'Fast Style', avgMs: 1200 },
    slowestStyle: { styleId: 's4', styleName: 'Slow Style', avgMs: 9000 },
  },
  feedbackSummary: {
    avgRating: 4.2,
    totalFeedback: 50,
    distribution: { 5: 30, 4: 10, 3: 5, 2: 3, 1: 2 },
  },
  recentFeedback: [
    { id: 'f1', userEmail: 'user@example.com', styleName: 'Anime Style', rating: 5, comment: 'Great!', createdAt: '2026-01-01T00:00:00.000Z' },
  ],
};

const TODAY_SUMMARY = {
  ...ALL_TIME_SUMMARY,
  range: 'today' as const,
  topStyles: [{ styleId: 's5', styleName: 'Today Only Style', count: 3, percentage: 100 }],
};

describe('GenerationAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('renders overview cards and range-filtered sections once data resolves', async () => {
    (apiService.getGenerationOverview as any).mockResolvedValue(OVERVIEW);
    (apiService.getGenerationAnalyticsSummary as any).mockResolvedValue(ALL_TIME_SUMMARY);

    render(<GenerationAnalyticsPage />);

    expect(await screen.findByText('500')).toBeTruthy();
    expect(screen.getByText('Most Used Styles')).toBeTruthy();
    expect(screen.getAllByText('Anime Style').length).toBeGreaterThan(0);
    expect(screen.getByText('Highest Rated Styles')).toBeTruthy();
    expect(screen.getByText('Lowest Rated Styles')).toBeTruthy();
    expect(screen.getByText('Feedback Summary')).toBeTruthy();
    expect(screen.getByText('Recent Feedback')).toBeTruthy();
    expect(screen.getByText('user@example.com')).toBeTruthy();
    expect(apiService.getGenerationAnalyticsSummary).toHaveBeenCalledWith('allTime');
  });

  it('shows overview error state with retry', async () => {
    (apiService.getGenerationOverview as any).mockRejectedValueOnce(new Error('overview unavailable'));
    (apiService.getGenerationAnalyticsSummary as any).mockResolvedValue(ALL_TIME_SUMMARY);

    render(<GenerationAnalyticsPage />);

    await screen.findByText('Unable to Load Overview');
    expect(screen.getByText('overview unavailable')).toBeTruthy();

    (apiService.getGenerationOverview as any).mockResolvedValueOnce(OVERVIEW);
    fireEvent.click(screen.getByText(/Try Again/));

    await screen.findByText('500');
    expect(apiService.getGenerationOverview).toHaveBeenCalledTimes(2);
  });

  it('shows generation analytics error state with retry, independent of overview', async () => {
    (apiService.getGenerationOverview as any).mockResolvedValue(OVERVIEW);
    (apiService.getGenerationAnalyticsSummary as any).mockRejectedValueOnce(new Error('analytics unavailable'));

    render(<GenerationAnalyticsPage />);

    await screen.findByText('Unable to Load Generation Analytics');
    expect(screen.getByText('analytics unavailable')).toBeTruthy();
    // Overview itself still rendered fine even though the summary section failed.
    expect(screen.getByText('500')).toBeTruthy();

    (apiService.getGenerationAnalyticsSummary as any).mockResolvedValueOnce(ALL_TIME_SUMMARY);
    fireEvent.click(screen.getByText(/Try Again/));

    await screen.findByText('Most Used Styles');
    expect(apiService.getGenerationAnalyticsSummary).toHaveBeenCalledTimes(2);
  });

  it('fetches once per filter and reuses cached data when switching back', async () => {
    (apiService.getGenerationOverview as any).mockResolvedValue(OVERVIEW);
    (apiService.getGenerationAnalyticsSummary as any).mockImplementation((range: string) =>
      Promise.resolve(range === 'today' ? TODAY_SUMMARY : ALL_TIME_SUMMARY)
    );

    render(<GenerationAnalyticsPage />);
    await screen.findAllByText('Anime Style');
    expect(apiService.getGenerationAnalyticsSummary).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    await screen.findByText('Today Only Style');
    expect(apiService.getGenerationAnalyticsSummary).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'All Time' }));
    await screen.findAllByText('Anime Style');
    // Switching back to a filter already fetched this session must not
    // trigger another network call.
    expect(apiService.getGenerationAnalyticsSummary).toHaveBeenCalledTimes(2);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { StyleManagerPage } from '../StyleManagerPage';
import { apiService } from '../../services/api';

// vitest runs without `globals: true`, so react-testing-library's automatic
// afterEach cleanup never registers - unmount explicitly between tests.
afterEach(cleanup);

vi.mock('../../services/api', () => ({
  apiService: {
    getCategories: vi.fn(),
    getStyles: vi.fn(),
    updateStyle: vi.fn(),
    patchStyleFlags: vi.fn(),
    addStyle: vi.fn(),
    deleteStyle: vi.fn(),
    reorderStyles: vi.fn(),
    reorderCategories: vi.fn(),
    getTags: vi.fn(),
    addTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
  },
}));

const CATEGORY = { id: 'cat-1', name: 'Trending', sortOrder: 1, isEnabled: true };

const STYLE = {
  id: 'style-1',
  categoryId: 'cat-1',
  name: 'Spec Style',
  prompt: 'a test prompt',
  negativePrompt: null,
  coverImage: null,
  creditCost: 2,
  isTrending: false,
  isPremium: false,
  isEnabled: true,
  sortOrder: 5, // a real drag-and-drop position, not the default 0
};

describe('StyleManagerPage - edit preserves sortOrder (Phase A regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiService.getCategories as any).mockResolvedValue([CATEGORY]);
    (apiService.getStyles as any).mockResolvedValue([STYLE]);
    (apiService.getTags as any).mockResolvedValue([]);
    (apiService.updateStyle as any).mockResolvedValue({ ...STYLE, name: STYLE.name });
  });

  it('sends the original sortOrder when saving an edited style without changing it', async () => {
    render(<StyleManagerPage />);

    await screen.findByText('Spec Style');

    fireEvent.click(screen.getByTitle('Edit Preset Settings'));

    // Editing a style must not silently reset its drag-and-drop position -
    // this is the exact bug fixed in Dashboard Phase A.
    await screen.findByText('Update Preset');
    fireEvent.click(screen.getByText('Update Preset'));

    await waitFor(() => expect(apiService.updateStyle).toHaveBeenCalledTimes(1));
    expect(apiService.updateStyle).toHaveBeenCalledWith(
      'style-1',
      expect.objectContaining({ sortOrder: 5 })
    );
  });
});

describe('StyleManagerPage - quick toggle actions (Trending / Enable-Disable)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiService.getCategories as any).mockResolvedValue([CATEGORY]);
    (apiService.getStyles as any).mockResolvedValue([STYLE]);
    (apiService.getTags as any).mockResolvedValue([]);
  });

  it('toggles trending via PATCH, shows the badge and a success toast', async () => {
    (apiService.patchStyleFlags as any).mockResolvedValue({ ...STYLE, isTrending: true });

    render(<StyleManagerPage />);
    await screen.findByText('Spec Style');

    fireEvent.click(screen.getByTitle('Mark as Trending'));

    await waitFor(() =>
      expect(apiService.patchStyleFlags).toHaveBeenCalledWith('style-1', { isTrending: true })
    );
    expect(await screen.findByText('Trending', { selector: '.preset-badge-trending' })).toBeTruthy();
    expect(await screen.findByText('"Spec Style" marked as trending.')).toBeTruthy();
  });

  it('toggles enabled via PATCH, shows the Disabled badge and a success toast', async () => {
    (apiService.patchStyleFlags as any).mockResolvedValue({ ...STYLE, isEnabled: false });

    render(<StyleManagerPage />);
    await screen.findByText('Spec Style');

    fireEvent.click(screen.getByTitle('Disable Style'));

    await waitFor(() =>
      expect(apiService.patchStyleFlags).toHaveBeenCalledWith('style-1', { isEnabled: false })
    );
    expect(await screen.findByText('Disabled', { selector: '.preset-badge-disabled' })).toBeTruthy();
    expect(await screen.findByText('"Spec Style" disabled.')).toBeTruthy();
  });

  it('reverts the optimistic flip and shows an error toast when the PATCH fails', async () => {
    (apiService.patchStyleFlags as any).mockRejectedValue(new Error('Server exploded'));

    render(<StyleManagerPage />);
    await screen.findByText('Spec Style');

    fireEvent.click(screen.getByTitle('Mark as Trending'));

    expect(await screen.findByText('Server exploded')).toBeTruthy();
    // Optimistic flip must have been rolled back
    expect(screen.queryByText('Trending', { selector: '.preset-badge-trending' })).toBeNull();
  });

  it('no longer renders the removed Duplicate Style and Mark as Premium quick actions', async () => {
    render(<StyleManagerPage />);
    await screen.findByText('Spec Style');

    expect(screen.queryByTitle('Duplicate Style')).toBeNull();
    expect(screen.queryByTitle('Mark as Premium')).toBeNull();
  });
});

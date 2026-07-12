import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StyleManagerPage } from '../StyleManagerPage';
import { apiService } from '../../services/api';

vi.mock('../../services/api', () => ({
  apiService: {
    getCategories: vi.fn(),
    getStyles: vi.fn(),
    updateStyle: vi.fn(),
    addStyle: vi.fn(),
    deleteStyle: vi.fn(),
    reorderStyles: vi.fn(),
    reorderCategories: vi.fn(),
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

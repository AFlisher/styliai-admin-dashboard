import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PromptPreview } from '../PromptPreview';
import { apiService } from '../../services/api';
import { StyleField } from '../../types';

vi.mock('../../services/api', () => ({
  apiService: { previewPrompt: vi.fn() },
}));

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const teamField: StyleField = { key: 'team', label: 'Team', type: 'text', required: true };

describe('PromptPreview', () => {
  it('renders a sample-value input for each field', () => {
    render(<PromptPreview prompt="A {{team}} jersey" fields={[teamField]} />);
    expect(screen.getByText(/Live Prompt Preview/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/Sample Team/i)).toBeTruthy();
  });

  it('calls the backend engine with entered values and shows the rendered prompt', async () => {
    (apiService.previewPrompt as any).mockResolvedValue({ prompt: 'A Barcelona jersey' });
    render(<PromptPreview prompt="A {{team}} jersey" fields={[teamField]} />);

    fireEvent.change(screen.getByPlaceholderText(/Sample Team/i), { target: { value: 'Barcelona' } });
    fireEvent.click(screen.getByText(/Render Preview/i));

    await waitFor(() => expect(screen.getByTestId('preview-result')).toBeTruthy());
    expect(screen.getByTestId('preview-result').textContent).toBe('A Barcelona jersey');
    expect(apiService.previewPrompt).toHaveBeenCalledWith({
      prompt: 'A {{team}} jersey',
      fields: [teamField],
      values: { team: 'Barcelona' },
    });
  });

  it('omits blank optional values so the server can apply defaults', async () => {
    (apiService.previewPrompt as any).mockResolvedValue({ prompt: 'ok' });
    const note: StyleField = { key: 'note', label: 'Note', type: 'text', required: false };
    render(<PromptPreview prompt="{{note}}" fields={[note]} />);

    fireEvent.click(screen.getByText(/Render Preview/i));
    await waitFor(() => expect(apiService.previewPrompt).toHaveBeenCalled());
    expect((apiService.previewPrompt as any).mock.calls[0][0].values).toEqual({});
  });

  it('surfaces a validation error from the backend', async () => {
    (apiService.previewPrompt as any).mockRejectedValue(new Error('"Team" is required.'));
    render(<PromptPreview prompt="{{team}}" fields={[teamField]} />);

    fireEvent.click(screen.getByText(/Render Preview/i));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toMatch(/is required/i);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageUploader } from '../ImageUploader';
import { apiService } from '../../services/api';

vi.mock('../../services/api', () => ({
  apiService: {
    uploadImage: vi.fn(),
    deleteImage: vi.fn().mockResolvedValue(undefined),
  },
}));

function makeFile(name: string, sizeBytes: number, type = 'image/png') {
  const file = new File(['x'.repeat(Math.min(sizeBytes, 10))], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

function getFileInput(container: HTMLElement) {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

describe('ImageUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a non-image file client-side without ever calling uploadImage', async () => {
    const onChange = vi.fn();
    const { container } = render(<ImageUploader value="" onChange={onChange} />);

    fireEvent.change(getFileInput(container), {
      target: { files: [makeFile('resume.pdf', 1000, 'application/pdf')] },
    });

    expect(await screen.findByText('Please upload an image file.')).toBeInTheDocument();
    expect(apiService.uploadImage).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects a file over 10MB client-side without ever calling uploadImage', async () => {
    const onChange = vi.fn();
    const { container } = render(<ImageUploader value="" onChange={onChange} />);

    fireEvent.change(getFileInput(container), {
      target: { files: [makeFile('huge.png', 11 * 1024 * 1024)] },
    });

    expect(await screen.findByText('File is too large. Maximum size is 10MB.')).toBeInTheDocument();
    expect(apiService.uploadImage).not.toHaveBeenCalled();
  });

  it('uploads a valid image and calls onChange with the resulting URL and thumbnail URL', async () => {
    (apiService.uploadImage as any).mockResolvedValue({
      url: 'https://cdn.example.com/new.png',
      thumbnailUrl: 'https://cdn.example.com/new-thumb.webp',
    });
    const onChange = vi.fn();
    const { container } = render(<ImageUploader value="" onChange={onChange} />);

    fireEvent.change(getFileInput(container), {
      target: { files: [makeFile('cover.png', 1000)] },
    });

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith('https://cdn.example.com/new.png', 'https://cdn.example.com/new-thumb.webp')
    );
    expect(apiService.deleteImage).not.toHaveBeenCalled(); // no previous image to clean up
  });

  it('cleans up the previous image (best-effort) on remove', async () => {
    const onChange = vi.fn();
    render(<ImageUploader value="https://cdn.example.com/old.png" onChange={onChange} />);

    fireEvent.click(screen.getByTitle('Remove image'));
    expect(onChange).toHaveBeenCalledWith('', null);
    expect(apiService.deleteImage).toHaveBeenCalledWith('https://cdn.example.com/old.png');
  });
});

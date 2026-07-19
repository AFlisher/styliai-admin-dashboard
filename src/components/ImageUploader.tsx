import React, { useState } from 'react';
import { apiService } from '../services/api';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // matches the backend's adminImageUpload limit

interface ImageUploaderProps {
  value: string;
  // thumbnailUrl is passed alongside url so callers can persist both without
  // a second round trip - the server generates it in the same upload call.
  onChange: (url: string, thumbnailUrl?: string | null) => void;
  label?: string;
  disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  label = 'Cover Image',
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const previousValue = value;
      const response = await apiService.uploadImage(file);
      onChange(response.url, response.thumbnailUrl);
      if (previousValue) {
        // Best-effort cleanup of the now-replaced image; a failed delete
        // here just leaves a harmless orphaned object in storage, not a
        // broken UI state, so it's not surfaced as an error to the user.
        apiService.deleteImage(previousValue).catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    const previousValue = value;
    onChange('', null);
    if (previousValue) {
      apiService.deleteImage(previousValue).catch(() => {});
    }
  };

  return (
    <div className="image-uploader form-group">
      {label && <label>{label}</label>}
      <div className="uploader-container">
        {value ? (
          <div className="uploader-preview">
            <img src={value} alt="Preview" />
            {!disabled && (
              <button
                type="button"
                className="uploader-remove-btn"
                onClick={handleRemove}
                title="Remove image"
              >
                <i className="fa-solid fa-trash-can"></i>
              </button>
            )}
          </div>
        ) : (
          <div className={`uploader-dropzone ${isUploading ? 'uploading' : ''}`}>
            {isUploading ? (
              <div className="uploader-status">
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                <span>Uploading...</span>
              </div>
            ) : (
              <label className="uploader-label">
                <i className="fa-solid fa-cloud-arrow-up"></i>
                <span className="upload-title">Choose image file</span>
                <span className="upload-subtitle">JPG, PNG, WEBP, GIF up to 10MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={disabled}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>
        )}
      </div>
      {error && <span className="uploader-error-text">{error}</span>}
    </div>
  );
};
export default ImageUploader;

import React from 'react';

interface LoaderProps {
  type?: 'spinner' | 'skeleton-card' | 'skeleton-list' | 'page';
  count?: number;
}

export const Loader: React.FC<LoaderProps> = ({ type = 'spinner', count = 1 }) => {
  if (type === 'page') {
    return (
      <div className="page-loader">
        <div className="spinner"></div>
      </div>
    );
  }

  if (type === 'skeleton-card') {
    return (
      <>
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="skeleton-card">
            <div className="skeleton-image pulse"></div>
            <div className="skeleton-info">
              <div className="skeleton-line title pulse"></div>
              <div className="skeleton-line text pulse"></div>
              <div className="skeleton-line text short pulse"></div>
            </div>
          </div>
        ))}
      </>
    );
  }

  if (type === 'skeleton-list') {
    return (
      <div className="skeleton-list">
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="skeleton-list-item pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="spinner-container">
      <div className="spinner"></div>
    </div>
  );
};

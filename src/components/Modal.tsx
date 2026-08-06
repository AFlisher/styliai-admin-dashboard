import React, { useEffect, useId } from 'react';
import { IconButton } from './IconButton';

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

export const Modal: React.FC<ModalProps> = ({
  title,
  isOpen,
  onClose,
  children,
  size = 'medium',
}) => {
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-container">
          <h3 className="modal-header" id={titleId}>{title}</h3>
          <IconButton variant="modal-close-btn" icon="fa-solid fa-xmark" label="Close modal" onClick={onClose} />
        </div>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};
export default Modal;

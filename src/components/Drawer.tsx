import React, { useEffect, useId, useRef, useState } from 'react';
import { IconButton } from './IconButton';

interface DrawerProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Slide-in side panel - the drawer counterpart to Modal, for content that's
 * anchored to a row the admin just clicked rather than centered over the
 * whole page. Entrance-only animation (see index.css's .drawer rules for why),
 * Escape to close, and focus lands on the panel itself on open.
 */
export const Drawer: React.FC<DrawerProps> = ({ title, isOpen, onClose, children }) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEntered(false);
      return;
    }

    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => setEntered(true));
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
      cancelAnimationFrame(raf);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" data-entered={entered} onClick={onClose}>
      <div
        className="drawer"
        data-entered={entered}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <h3 id={titleId}>{title}</h3>
          <IconButton variant="modal-close-btn" icon="fa-solid fa-xmark" label="Close panel" onClick={onClose} />
        </div>
        <div className="drawer-content">{children}</div>
      </div>
    </div>
  );
};

export default Drawer;

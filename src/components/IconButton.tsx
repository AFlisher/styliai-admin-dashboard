import React from 'react';

/**
 * The app's icon-only buttons - modal close, image remove, category/preset
 * row actions, tag-manager row actions - were each hand-rolled with their own
 * copy of the same <button><i /></button> shape, several without an
 * aria-label. This centralizes the shape and guarantees an accessible name;
 * `variant` selects the existing CSS class for that button's look (unchanged)
 * so nothing renders differently than before.
 */
interface IconButtonProps {
  /** FontAwesome class, e.g. "fa-solid fa-trash-can". */
  icon: string;
  /** Accessible name, also shown as the hover tooltip via title. */
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Existing CSS class selecting this button's visual treatment (e.g. "icon-btn", "modal-close-btn"). */
  variant: string;
  /** Appends the shared ".delete" hover modifier used by icon-btn/category-inline-btn. */
  danger?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  iconStyle?: React.CSSProperties;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  onClick,
  variant,
  danger = false,
  disabled = false,
  style,
  iconStyle,
}) => (
  <button
    type="button"
    className={[variant, danger ? 'delete' : ''].filter(Boolean).join(' ')}
    onClick={onClick}
    title={label}
    aria-label={label}
    disabled={disabled}
    style={style}
  >
    <i className={icon} style={iconStyle}></i>
  </button>
);

export default IconButton;

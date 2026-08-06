import React from 'react';

/**
 * Every tone this app has ever hand-rolled a badge for: the tinted status
 * pills (.badge + modifier) used for wallet-activity/pack labels, the solid
 * label ribbons on preset cards, and the credits tag. Each tone maps to the
 * existing CSS class for that exact look - this component centralizes the
 * markup, not the visual design, so nothing renders differently than before.
 */
export type BadgeTone =
  | 'neutral'
  | 'success'
  | 'purple'
  | 'blue'
  | 'trending'
  | 'pro'
  | 'disabled'
  | 'credits';

const TONE_CLASS_NAME: Record<BadgeTone, string> = {
  neutral: 'badge',
  success: 'badge success',
  purple: 'badge purple',
  blue: 'badge blue',
  trending: 'preset-badge-trending',
  pro: 'preset-badge-pro',
  disabled: 'preset-badge-disabled',
  credits: 'credits-badge',
};

interface BadgeProps {
  tone: BadgeTone;
  /** FontAwesome class, e.g. "fa-solid fa-coins" - only the credits tone uses this today. */
  icon?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ tone, icon, children, className, style }) => (
  <span className={[TONE_CLASS_NAME[tone], className].filter(Boolean).join(' ')} style={style}>
    {icon ? (
      <>
        <i className={icon}></i> {children}
      </>
    ) : (
      children
    )}
  </span>
);

export default Badge;

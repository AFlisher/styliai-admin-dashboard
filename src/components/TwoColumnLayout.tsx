import React from 'react';

/**
 * The "main content + secondary panel" shape used four times in this app
 * (analytics chart + activity table, category sidebar + style grid, world
 * map + pie chart, style-usage pairs) - each previously a bespoke CSS grid
 * class with its own ratio. One primitive, parameterized by ratio, replaces
 * all four; each still collapses to a single column at the same 968px
 * breakpoint they already shared.
 */
type ColumnRatio = '2-1' | '3-2' | '1-1' | 'sidebar';

interface TwoColumnLayoutProps {
  ratio: ColumnRatio;
  /** The sidebar ratio (category list + style grid) used a 28px gap instead of the default 24px. */
  gapWide?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const TwoColumnLayout: React.FC<TwoColumnLayoutProps> = ({
  ratio,
  gapWide = false,
  className,
  style,
  children,
}) => (
  <div
    className={[
      'two-col-layout',
      `two-col-layout--${ratio}`,
      gapWide ? 'two-col-layout--gap-wide' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    style={style}
  >
    {children}
  </div>
);

export default TwoColumnLayout;

import React, { useMemo, useRef, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { numericToAlpha2 } from 'i18n-iso-countries';
import { CountryStat } from '../types';

// Natural Earth 1:110m world topology (public, CDN-hosted - see
// react-simple-maps docs). Each geometry's `id` is an ISO 3166-1 numeric
// code, which is why country codes are looked up via numericToAlpha2 below
// rather than matched by name (Natural Earth's short names don't always
// match Intl.DisplayNames, e.g. "United States of America" vs "United States").
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const NO_DATA_FILL = 'var(--bg-card-hover)';
const LOW_COLOR: [number, number, number] = [90, 42, 168]; // muted accent-purple
const HIGH_COLOR: [number, number, number] = [231, 53, 246]; // accent-pink

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function colorForRatio(ratio: number): string {
  // Floor so even the smallest non-zero country is still visibly distinct
  // from the "no data" fill.
  const t = Math.max(ratio, 0.18);
  const [r, g, b] = LOW_COLOR.map((channel, i) => lerpChannel(channel, HIGH_COLOR[i], t));
  return `rgb(${r}, ${g}, ${b})`;
}

interface TooltipState {
  x: number;
  y: number;
  countryName: string;
  userCount: number;
  percentage: number;
}

interface CountryWorldMapProps {
  countries: CountryStat[];
}

export const CountryWorldMap: React.FC<CountryWorldMapProps> = React.memo(({ countries }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const statsByAlpha2 = useMemo(() => {
    const map = new Map<string, CountryStat>();
    for (const stat of countries) {
      map.set(stat.countryCode.toUpperCase(), stat);
    }
    return map;
  }, [countries]);

  const maxUserCount = useMemo(
    () => countries.reduce((max, stat) => Math.max(max, stat.userCount), 0),
    [countries]
  );

  const handleMouseMove = (event: React.MouseEvent<SVGPathElement>, stat: CountryStat) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    setTooltip({
      x: bounds ? event.clientX - bounds.left : event.clientX,
      y: bounds ? event.clientY - bounds.top : event.clientY,
      countryName: stat.countryName,
      userCount: stat.userCount,
      percentage: stat.percentage,
    });
  };

  return (
    <div className="world-map-container" ref={containerRef}>
      <ComposableMap projection="geoEqualEarth" className="world-map-svg">
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const alpha2 = numericToAlpha2(geo.id);
              const stat = alpha2 ? statsByAlpha2.get(alpha2) : undefined;
              const fill = stat ? colorForRatio(maxUserCount > 0 ? stat.userCount / maxUserCount : 0) : NO_DATA_FILL;

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="var(--bg-dark)"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { outline: 'none', filter: stat ? 'brightness(1.2)' : undefined, cursor: stat ? 'pointer' : 'default' },
                    pressed: { outline: 'none' },
                  }}
                  onMouseMove={(event) => stat && handleMouseMove(event, stat)}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {tooltip && (
        <div
          className="map-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <strong>{tooltip.countryName}</strong>
          <span>Users: {tooltip.userCount.toLocaleString()}</span>
          <span>{tooltip.percentage.toFixed(1)}% of total</span>
        </div>
      )}

      <div className="map-legend">
        <span className="map-legend-label">Fewer users</span>
        <span className="map-legend-swatch" style={{ background: `linear-gradient(to right, ${colorForRatio(0)}, ${colorForRatio(1)})` }}></span>
        <span className="map-legend-label">More users</span>
      </div>
    </div>
  );
});

CountryWorldMap.displayName = 'CountryWorldMap';

export default CountryWorldMap;

/**
 * Cosmogram: Hamburg School / Cosmobiology 90° dial. Plots planets at
 * (longitude mod 90) with cardinal/fixed/mutable rings showing the
 * fourfold quadrants.
 *
 * Convention per Ebertin 1940 (*Combination of Stellar Influences*) +
 * Witte 1928 (*Rules for Planetary Pictures*).
 */

import { svg, circle, line, text, polarToCartesian,
  displayBodyName, planetGlyph, narrowBodies, resolveTheme, eclipticToWheel } from './svg-utils.ts';
import type { Planet } from './wheel-western.ts';
import { chartDescription } from './chart-description.ts';

export interface CosmogramInput {
  planets: Planet[];
  title?: string;
}

export interface CosmogramOptions {
  /* Narrows DEFAULT_PLANET_SHOWLIST to this subset; absent means the default. */
  bodies?: readonly string[];
  size?: number;
  theme?: string;
}

const DEFAULT_PLANET_SHOWLIST = new Set([
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'North Node', 'Chiron', 'Lilith',
]);

export function renderCosmogram(input: CosmogramInput, opts: CosmogramOptions = {}): string {
  const size = opts.size ?? 700;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.45;
  const rInner = size * 0.30;
  const t = resolveTheme(opts.theme);

  let body = circle(cx, cy, rOuter, { fill: t.bg });
  if (input.title) {
    body += text(cx, 24, input.title, {
      'font-family': 'Inter, sans-serif', 'font-size': 14, 'font-weight': 600,
      'text-anchor': 'middle', fill: t.text,
    });
  }
  body += circle(cx, cy, rOuter, { fill: 'none', stroke: t.text, 'stroke-width': 1.5 });
  body += circle(cx, cy, rInner, { fill: 'none', stroke: t.ring, 'stroke-width': 1 });

  // 90° dial: 4 quadrants: Cardinal / Fixed / Mutable repeated
  const quadrantNames = ['Cardinal', 'Fixed', 'Mutable', 'Cardinal'];
  for (let q = 0; q < 4; q++) {
    // 90 deg arc, with marks every 5°
    const startAngle = q * 90;
    for (let i = 0; i <= 90; i++) {
      const wheelDeg = (startAngle + i) % 360;
      const len = i === 0 ? 14 : (i % 30 === 0 ? 10 : (i % 10 === 0 ? 6 : 3));
      const p1 = polarToCartesian(cx, cy, rOuter, wheelDeg);
      const p2 = polarToCartesian(cx, cy, rOuter - len, wheelDeg);
      body += line(p1.x, p1.y, p2.x, p2.y, {
        stroke: i % 30 === 0 ? t.text : t.textMuted,
        'stroke-width': i === 0 ? 1.2 : 0.5,
      });
    }
    // Quadrant label at midpoint
    const midDeg = startAngle + 45;
    const labelP = polarToCartesian(cx, cy, (rOuter + rInner) / 2, midDeg);
    body += text(labelP.x, labelP.y + 4, quadrantNames[q]!, {
      'font-family': 'JetBrains Mono, monospace', 'font-size': 10,
      'text-anchor': 'middle', fill: t.textMuted, 'font-weight': 600,
    });
  }

  // Plot planets at longitude mod 90 across all 4 quadrants for redundancy
  // (standard cosmogram shows each planet 4× to make conjunctions/oppositions
  // pop visually). Use anti-collision spacing per quadrant.
  const visible = narrowBodies(input.planets, opts.bodies)
    .filter((p) => DEFAULT_PLANET_SHOWLIST.has(displayBodyName(p.name)));
  for (const p of visible) {
    for (let q = 0; q < 4; q++) {
      const angle = q * 90 + (p.longitude % 90);
      const pos = polarToCartesian(cx, cy, rInner - 12, angle);
      body += text(pos.x, pos.y + 5, planetGlyph(p.name), {
        'font-size': 16, 'text-anchor': 'middle', fill: t.text, 'font-weight': 600,
      });
    }
  }

  return svg(size, size, body, { 'font-family': 'system-ui, sans-serif' }, {
    title: input.title ?? 'Cosmogram',
    desc: chartDescription({ planets: input.planets }),
  });
}

// Re-export for type safety
export { eclipticToWheel };

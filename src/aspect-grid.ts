/**
 * Aspect grid: triangular matrix. Rows × cols = planets, each cell shows
 * the aspect symbol + orb (degrees) for that pair, or empty if no aspect.
 *
 * Standard astrology textbook layout: ordered Sun…Pluto on both axes,
 * but only the lower-triangular half is drawn (mirror is redundant).
 */

import { svg, rect, text, resolveTheme,
  displayBodyName, planetGlyph, aspectColor, hook, bodySlug, aspectSlug } from './svg-utils.ts';
import type { Planet, Aspect } from './wheel-western.ts';

export interface AspectGridInput {
  planets: Planet[];
  aspects: Aspect[];
}

export interface AspectGridOptions {
  /* Narrows DEFAULT_ORDER to this subset, keeping our order; absent means all. */
  bodies?: readonly string[];
  size?: number;
  theme?: string;
  title?: string;
}

/* The chart response aspects "mean Apogee" like any other body, three of them in the
   reference chart, so a Lilith row carries content rather than an empty band. */
const DEFAULT_ORDER = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'North Node', 'Chiron', 'Lilith',
];

const ASPECT_GLYPH: Record<string, string> = {
  Conjunction: '☌', Opposition: '☍', Trine: '△',
  Square: '□', Sextile: '⚹', Quincunx: '⚻',
  Semisextile: '⚺', Semisquare: '∠', Sesquiquadrate: '⚼',
  Quintile: 'Q', Biquintile: 'bQ',
};

export function renderAspectGrid(input: AspectGridInput, opts: AspectGridOptions = {}): string {
  const t = resolveTheme(opts.theme);
  /* Our order is kept, the caller's list only says which rows survive. */
  const wanted = opts.bodies?.length ? new Set(opts.bodies) : null;
  const planets = DEFAULT_ORDER
    .filter((name) => !wanted || wanted.has(name))
    .map((name) => input.planets.find((p) => displayBodyName(p.name) === name))
    .filter((p): p is Planet => !!p);
  const n = planets.length;
  const cell = 38;
  const headerSize = 38;
  const padding = 16;
  const titleH = opts.title ? 32 : 0;

  const gridSize = n * cell + headerSize;
  const width = gridSize + 2 * padding;
  const height = gridSize + 2 * padding + titleH;

  // Quick lookup for aspects (canonical: orderless pair)
  const aspectMap = new Map<string, Aspect>();
  for (const a of input.aspects) {
    const key = [a.planet1, a.planet2].sort().join('|');
    aspectMap.set(key, a);
  }

  let body = rect(0, 0, width, height, { fill: t.bg, ...hook(t, { class: 'aw-bg' }) });

  if (opts.title) {
    body += text(width / 2, padding + 18, opts.title, {
      'font-family': 'Inter, sans-serif', 'font-size': 14, 'font-weight': 600,
      'text-anchor': 'middle', fill: t.text, ...hook(t, { class: 'aw-label aw-title' }),
    });
  }

  const ox = padding + headerSize;
  const oy = padding + titleH + headerSize;

  // Column headers (top, planets on x-axis)
  for (let c = 0; c < n; c++) {
    const cx = ox + c * cell + cell / 2;
    body += text(cx, oy - 14, planetGlyph(planets[c]!.name), {
      'font-size': 18, 'text-anchor': 'middle', fill: t.text, 'font-weight': 600,
      ...hook(t, { class: 'aw-grid-header', 'data-planet': bodySlug(planets[c]!.name) }),
    });
  }

  // Row headers (left, planets on y-axis) + cells
  for (let r = 1; r < n; r++) {
    const cy = oy + (r - 1) * cell + cell / 2;
    body += text(ox - 14, cy + 6, planetGlyph(planets[r]!.name), {
      'font-size': 18, 'text-anchor': 'middle', fill: t.text, 'font-weight': 600,
      ...hook(t, { class: 'aw-grid-header', 'data-planet': bodySlug(planets[r]!.name) }),
    });
    // Lower-triangle cells: c < r
    for (let c = 0; c < r; c++) {
      const cx = ox + c * cell;
      const yy = oy + (r - 1) * cell;
      const key = [planets[r]!.name, planets[c]!.name].sort().join('|');
      const a = aspectMap.get(key);
      const pair = { 'data-a': bodySlug(planets[r]!.name), 'data-b': bodySlug(planets[c]!.name) };
      body += rect(cx, yy, cell, cell, {
        fill: 'none', stroke: t.ring, 'stroke-width': 0.5, ...hook(t, { class: 'aw-grid-cell', ...pair }),
      });
      if (a) {
        const typeName = typeof a.type === 'string' ? a.type : a.type.name;
        const color = aspectColor(t, typeName, t.text);
        const glyph = ASPECT_GLYPH[typeName] ?? '·';
        body += text(cx + cell / 2, yy + cell / 2 + 2, glyph, {
          'font-size': 16, 'text-anchor': 'middle', fill: color, 'font-weight': 600,
          ...hook(t, { class: `aw-aspect aw-aspect-${aspectSlug(typeName)}`, ...pair }),
        });
        // Orb (small text below)
        const orbVal = typeof a.type !== 'string' && (a as any).orb !== undefined
          ? (a as any).orb : null;
        if (orbVal !== null) {
          body += text(cx + cell / 2, yy + cell - 4, `${Number(orbVal).toFixed(1)}°`, {
            'font-size': 8, 'text-anchor': 'middle', fill: t.textMuted, ...hook(t, { class: 'aw-orb' }),
          });
        }
      }
    }
  }

  return svg(width, height, body, { 'font-family': 'system-ui, sans-serif' }, {
    title: opts.title ?? 'Planetary aspect grid',
    desc: `Aspect grid: ${input.aspects.length} aspects among ${input.planets.length} bodies.`,
  });
}

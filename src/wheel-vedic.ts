/**
 * Vedic chart layouts: North Indian (diamond), South Indian (square),
 * East Indian (Bengali). Each is a fixed grid where house positions are
 * static and signs rotate with the ascendant.
 *
 * Conventions per BPHS + Drik Panchang reference renders:
 *   - North Indian: diamond. House 1 = top-center upward triangle.
 *     Houses go counter-clockwise.
 *   - South Indian: 4×4 grid, center 2×2 hollow. Sign positions are
 *     fixed (top-left = Pisces, then clockwise) and houses are placed
 *     where their sign falls.
 *   - East Indian: square with diagonals + inner rotated square →
 *     12 triangular cells.
 *
 * Layouts are schematic; ornate traditional divisions are not drawn.
 */

import { svg, line, rect, text, path, resolveTheme,
  displayBodyName, planetGlyph, narrowBodies, SIGN_NAMES } from './svg-utils.ts';
import type { Planet, Houses } from './wheel-western.ts';
import { chartDescription } from './chart-description.ts';

export interface VedicInput {
  planets: Planet[];
  houses: Houses;
}

export interface VedicOptions {
  /* Narrows SHOW_PLANETS to this subset; absent means the default. */
  bodies?: readonly string[];
  size?: number;
  theme?: string;
  title?: string;
}

const SHOW_PLANETS = new Set([
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'North Node', 'South Node', 'Chiron',
]);

// Sign of an ecliptic longitude (0=Aries, 11=Pisces).
function signOf(longitude: number): number {
  return Math.floor(((longitude % 360) + 360) % 360 / 30);
}

// Group planets by sign for placement inside a house cell.
/*
 * Ketu is not in the chart response and does not need to be: it is the North
 * Node opposed, exactly, with no ephemeris of its own. A Jyotish chart is read
 * over nine grahas, so it is derived here, for the drawing only, rather than
 * added to the published chart shape. Western wheels keep their own convention.
 */
function withSouthNode(planets: Planet[]): Planet[] {
  const north = planets.find((p) => displayBodyName(p.name) === 'North Node');
  if (!north) return planets;
  if (planets.some((p) => displayBodyName(p.name) === 'South Node')) return planets;
  /* id 111 is the house convention for it, from `ACG_PLANET_IDS` in core. */
  return [...planets, { ...north, id: 111, name: 'South Node', longitude: (north.longitude + 180) % 360 }];
}

/*
 * A cell holds so many glyphs and no more. The overflow is shown as a count
 * rather than dropped or crammed in: the cells are small, and an unreadable row
 * of eight is worse than four and a "+4".
 */
function glyphRow(ps: Planet[], max: number): string {
  const shown = ps.slice(0, max).map((p) => planetGlyph(p.name)).join(' ');
  return ps.length > max ? `${shown} +${ps.length - max}` : shown;
}

function groupPlanetsBySign(planets: Planet[]): Map<number, Planet[]> {
  const map = new Map<number, Planet[]>();
  for (const p of planets) {
    if (!SHOW_PLANETS.has(displayBodyName(p.name))) continue;
    const s = signOf(p.longitude);
    if (!map.has(s)) map.set(s, []);
    map.get(s)!.push(p);
  }
  return map;
}

// ─── North Indian (diamond) ──────────────────────────────────────

export function renderVedicNorth(input: VedicInput, opts: VedicOptions = {}): string {
  const size = opts.size ?? 700;
  const t = resolveTheme(opts.theme);
  const titleH = opts.title ? 32 : 0;
  const padding = 20;
  const W = size;
  const H = size + titleH;
  const x0 = padding, y0 = padding + titleH;
  const x1 = W - padding, y1 = H - padding;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const mxL = x0, mxR = x1, myT = y0, myB = y1;

  // Lagna sign (sign occupied by house 1)
  const lagnaSign = signOf(input.houses.ascendant);

  // House cell centers: North Indian fixed positions from the outer square
  // and its diagonals, house 1 at top-center, then counter-clockwise.
  //
  // Reference cells (12 triangles) for a unit square with diagonals + midpoint cross.
  // Positions are approximate centers for label placement.
  const W2 = (mxR - mxL) / 2;
  const H2 = (myB - myT) / 2;
  // 12 cell centers (% of half-width offset from cx,cy)
  const cellPositions: { x: number; y: number; house: number }[] = [
    { x: cx,           y: cy - H2 * 0.55, house: 1 },
    { x: cx - W2 * 0.55, y: cy - H2 * 0.78, house: 2 },
    { x: cx - W2 * 0.78, y: cy - H2 * 0.55, house: 3 },
    { x: cx - W2 * 0.55, y: cy,            house: 4 },
    { x: cx - W2 * 0.78, y: cy + H2 * 0.55, house: 5 },
    { x: cx - W2 * 0.55, y: cy + H2 * 0.78, house: 6 },
    { x: cx,           y: cy + H2 * 0.55, house: 7 },
    { x: cx + W2 * 0.55, y: cy + H2 * 0.78, house: 8 },
    { x: cx + W2 * 0.78, y: cy + H2 * 0.55, house: 9 },
    { x: cx + W2 * 0.55, y: cy,            house: 10 },
    { x: cx + W2 * 0.78, y: cy - H2 * 0.55, house: 11 },
    { x: cx + W2 * 0.55, y: cy - H2 * 0.78, house: 12 },
  ];

  let body = rect(0, 0, W, H, { fill: t.bg });
  if (opts.title) {
    body += text(W / 2, padding + 18, opts.title, {
      'font-family': 'Inter, sans-serif', 'font-size': 14, 'font-weight': 600,
      'text-anchor': 'middle', fill: t.text,
    });
  }

  // Outer square + diagonals + midpoint cross = 12 cells
  body += rect(mxL, myT, mxR - mxL, myB - myT, {
    fill: 'none', stroke: t.text, 'stroke-width': 1.5,
  });
  body += line(mxL, myT, mxR, myB, { stroke: t.text, 'stroke-width': 1 });
  body += line(mxR, myT, mxL, myB, { stroke: t.text, 'stroke-width': 1 });
  // Inner diamond from edge midpoints
  const m1 = { x: cx, y: myT };
  const m2 = { x: mxR, y: cy };
  const m3 = { x: cx, y: myB };
  const m4 = { x: mxL, y: cy };
  body += path(`M ${m1.x} ${m1.y} L ${m2.x} ${m2.y} L ${m3.x} ${m3.y} L ${m4.x} ${m4.y} Z`, {
    fill: 'none', stroke: t.text, 'stroke-width': 1,
  });

  // Place house labels + sign + planets in each cell
  const planetsBySign = groupPlanetsBySign(narrowBodies(withSouthNode(input.planets), opts.bodies));
  for (const cell of cellPositions) {
    const sign = (lagnaSign + cell.house - 1) % 12;
    body += text(cell.x, cell.y - 8, `${cell.house}`, {
      'font-family': 'JetBrains Mono, monospace', 'font-size': 9,
      'text-anchor': 'middle', fill: t.textMuted, 'font-weight': 600,
    });
    body += text(cell.x, cell.y + 6, SIGN_NAMES[sign]!.slice(0, 3), {
      'font-family': 'JetBrains Mono, monospace', 'font-size': 9,
      'text-anchor': 'middle', fill: t.textMuted, 'font-style': 'italic',
    });
    const ps = planetsBySign.get(sign) ?? [];
    if (ps.length > 0) {
      body += text(cell.x, cell.y + 22, glyphRow(ps, 5), {
        'font-size': 13, 'text-anchor': 'middle', fill: t.text, 'font-weight': 600,
      });
    }
  }

  return svg(W, H, body, { 'font-family': 'system-ui, sans-serif' }, {
    title: opts.title ?? 'Vedic birth chart',
    desc: chartDescription(input),
  });
}

// ─── South Indian (square donut) ─────────────────────────────────

export function renderVedicSouth(input: VedicInput, opts: VedicOptions = {}): string {
  const size = opts.size ?? 700;
  const t = resolveTheme(opts.theme);
  const titleH = opts.title ? 32 : 0;
  const padding = 20;
  const W = size;
  const H = size + titleH;
  const x0 = padding, y0 = padding + titleH;
  const cellSize = (W - 2 * padding) / 4;

  let body = rect(0, 0, W, H, { fill: t.bg });
  if (opts.title) {
    body += text(W / 2, padding + 18, opts.title, {
      'font-family': 'Inter, sans-serif', 'font-size': 14, 'font-weight': 600,
      'text-anchor': 'middle', fill: t.text,
    });
  }

  // South Indian fixes SIGN positions on the grid (Pisces top-left, then clockwise):
  // sign 11 (Pisces) | 0 (Aries) | 1 (Taurus) | 2 (Gemini)
  // sign 10 (Aquar)  |    -      |    -       | 3 (Cancer)
  // sign  9 (Capr)   |    -      |    -       | 4 (Leo)
  // sign  8 (Sagit)  | 7 (Scor)  | 6 (Libra)  | 5 (Virgo)
  const signGridPositions: { sign: number; row: number; col: number }[] = [
    { sign: 11, row: 0, col: 0 }, { sign: 0,  row: 0, col: 1 },
    { sign: 1,  row: 0, col: 2 }, { sign: 2,  row: 0, col: 3 },
    { sign: 10, row: 1, col: 0 },                                { sign: 3, row: 1, col: 3 },
    { sign: 9,  row: 2, col: 0 },                                { sign: 4, row: 2, col: 3 },
    { sign: 8,  row: 3, col: 0 }, { sign: 7,  row: 3, col: 1 },
    { sign: 6,  row: 3, col: 2 }, { sign: 5,  row: 3, col: 3 },
  ];

  const lagnaSign = signOf(input.houses.ascendant);
  const planetsBySign = groupPlanetsBySign(narrowBodies(withSouthNode(input.planets), opts.bodies));

  // Outer frame
  body += rect(x0, y0, cellSize * 4, cellSize * 4, {
    fill: 'none', stroke: t.text, 'stroke-width': 1.5,
  });
  // Center 2x2 frame
  body += rect(x0 + cellSize, y0 + cellSize, cellSize * 2, cellSize * 2, {
    fill: t.housesFill, stroke: t.text, 'stroke-width': 1,
  });
  body += text(x0 + cellSize * 2, y0 + cellSize * 2, 'Rashi', {
    'font-family': 'Inter, sans-serif', 'font-size': 14, 'font-style': 'italic',
    'text-anchor': 'middle', fill: t.textMuted,
  });

  // 12 cells
  for (const cell of signGridPositions) {
    const cellX = x0 + cell.col * cellSize;
    const cellY = y0 + cell.row * cellSize;
    body += rect(cellX, cellY, cellSize, cellSize, {
      fill: 'none', stroke: t.text, 'stroke-width': 0.7,
    });
    // House number = (sign - lagna + 12) % 12 + 1
    const house = ((cell.sign - lagnaSign + 12) % 12) + 1;
    const isLagna = house === 1;
    body += text(cellX + 8, cellY + 16, String(house), {
      'font-family': 'JetBrains Mono, monospace', 'font-size': 11,
      fill: isLagna ? t.benefic : t.textMuted, 'font-weight': 700,
    });
    body += text(cellX + cellSize - 8, cellY + 16, SIGN_NAMES[cell.sign]!.slice(0, 3), {
      'font-family': 'JetBrains Mono, monospace', 'font-size': 9,
      'text-anchor': 'end', fill: t.textMuted, 'font-style': 'italic',
    });
    if (isLagna) {
      body += text(cellX + cellSize / 2, cellY + 32, 'Lg', {
        'font-family': 'JetBrains Mono, monospace', 'font-size': 9,
        'text-anchor': 'middle', fill: t.benefic, 'font-weight': 700,
      });
    }
    const ps = planetsBySign.get(cell.sign) ?? [];
    if (ps.length > 0) {
      // Stack planet glyphs inside cell
      let py = cellY + cellSize / 2 + 6;
      body += text(cellX + cellSize / 2, py, glyphRow(ps, 5), {
        'font-size': 16, 'text-anchor': 'middle', fill: t.text, 'font-weight': 600,
      });
    }
  }

  return svg(W, H, body, { 'font-family': 'system-ui, sans-serif' }, {
    title: opts.title ?? 'Vedic birth chart',
    desc: chartDescription(input),
  });
}

// ─── East Indian (Bengali) ───────────────────────────────────────

export function renderVedicEast(input: VedicInput, opts: VedicOptions = {}): string {
  const size = opts.size ?? 700;
  const t = resolveTheme(opts.theme);
  const titleH = opts.title ? 32 : 0;
  const padding = 20;
  const W = size;
  const H = size + titleH;
  const x0 = padding, y0 = padding + titleH;
  const sq = W - 2 * padding;
  const cx = x0 + sq / 2, cy = y0 + sq / 2;

  let body = rect(0, 0, W, H, { fill: t.bg });
  if (opts.title) {
    body += text(W / 2, padding + 18, opts.title, {
      'font-family': 'Inter, sans-serif', 'font-size': 14, 'font-weight': 600,
      'text-anchor': 'middle', fill: t.text,
    });
  }

  // Outer square
  body += rect(x0, y0, sq, sq, { fill: 'none', stroke: t.text, 'stroke-width': 1.5 });
  // Diagonals (full corner-to-corner)
  body += line(x0, y0, x0 + sq, y0 + sq, { stroke: t.text, 'stroke-width': 1 });
  body += line(x0 + sq, y0, x0, y0 + sq, { stroke: t.text, 'stroke-width': 1 });
  // Inner rotated square (vertices at edge midpoints)
  body += path(
    `M ${cx} ${y0} L ${x0 + sq} ${cy} L ${cx} ${y0 + sq} L ${x0} ${cy} Z`,
    { fill: 'none', stroke: t.text, 'stroke-width': 1 },
  );

  // East Indian: 12 sections: 4 corner triangles + 4 outer mid triangles
  // + 4 inner triangles (top of inner diamond, etc.). For visual MVP we
  // place 12 labels at sector midpoints.
  const r = sq / 2;
  // Sector centers: clockwise starting from top
  const sectorCenters: { x: number; y: number }[] = [
    // Top half: top-mid-outer, top-right-corner, top-mid-inner, etc.
    { x: cx,           y: y0 + r * 0.18 },           // top outer
    { x: cx + r * 0.55, y: y0 + r * 0.32 },          // top-right corner
    { x: cx + r * 0.32, y: cy - r * 0.55 },          // upper-right inner
    { x: x0 + sq - r * 0.18, y: cy },                // right outer
    { x: cx + r * 0.32, y: cy + r * 0.55 },          // lower-right inner
    { x: cx + r * 0.55, y: y0 + sq - r * 0.32 },     // bottom-right corner
    { x: cx,           y: y0 + sq - r * 0.18 },      // bottom outer
    { x: cx - r * 0.55, y: y0 + sq - r * 0.32 },     // bottom-left corner
    { x: cx - r * 0.32, y: cy + r * 0.55 },          // lower-left inner
    { x: x0 + r * 0.18, y: cy },                     // left outer
    { x: cx - r * 0.32, y: cy - r * 0.55 },          // upper-left inner
    { x: cx - r * 0.55, y: y0 + r * 0.32 },          // top-left corner
  ];

  const lagnaSign = signOf(input.houses.ascendant);
  const planetsBySign = groupPlanetsBySign(narrowBodies(withSouthNode(input.planets), opts.bodies));
  for (let h = 1; h <= 12; h++) {
    const c = sectorCenters[h - 1]!;
    const sign = (lagnaSign + h - 1) % 12;
    body += text(c.x, c.y - 6, String(h), {
      'font-family': 'JetBrains Mono, monospace', 'font-size': 10,
      'text-anchor': 'middle', fill: t.textMuted, 'font-weight': 700,
    });
    body += text(c.x, c.y + 6, SIGN_NAMES[sign]!.slice(0, 3), {
      'font-family': 'JetBrains Mono, monospace', 'font-size': 9,
      'text-anchor': 'middle', fill: t.textMuted, 'font-style': 'italic',
    });
    const ps = planetsBySign.get(sign) ?? [];
    if (ps.length > 0) {
      body += text(c.x, c.y + 20, glyphRow(ps, 4), {
        'font-size': 12, 'text-anchor': 'middle', fill: t.text, 'font-weight': 600,
      });
    }
  }

  return svg(W, H, body, { 'font-family': 'system-ui, sans-serif' }, {
    title: opts.title ?? 'Vedic birth chart',
    desc: chartDescription(input),
  });
}

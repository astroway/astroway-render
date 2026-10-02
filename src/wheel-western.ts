/**
 * Western natal wheel: outer signs ring, houses ring, planets layer,
 * inner aspect lines. Pure SVG output.
 *
 * Layout (default 800×800):
 *   r=380  outer rim
 *   r=340  signs ring (12 arcs, sign glyphs)
 *   r=280  houses ring (12 cusp lines, house numbers)
 *   r=200  planet glyphs at their longitudes
 *   r=180  inner aspect circle (lines drawn inside)
 */

import {
  svg, circle, line, text,
  polarToCartesian, eclipticToWheel, arcPath,
  SIGN_GLYPH, ASPECT_COLOR, displayBodyName, planetGlyph, narrowBodies,
  resolveTheme, type Theme,
} from './svg-utils.ts';
import { chartDescription } from './chart-description.ts';

export interface Planet {
  id: number;
  name: string;
  longitude: number;
  isRetrograde?: boolean;
}

export interface Houses {
  cusps: number[]; // 12 entries, 0..360
  ascendant: number;
  mc: number;
}

export interface AspectType {
  name: string;
  angle: number;
  orb: number;
}
export interface Aspect {
  planet1: string;
  planet2: string;
  type: AspectType | string;
}

export interface WheelInput {
  planets: Planet[];
  houses: Houses;
  aspects?: Aspect[];
}

export interface WheelOptions {
  /* Narrows DEFAULT_PLANET_SHOWLIST to this subset; absent means the default. */
  bodies?: readonly string[];
  size?: number;
  theme?: string;
  showAspects?: boolean;
  showRetrograde?: boolean;
  title?: string;
  /* SVG <title>/<desc> for screen readers. Callers that know the request
     language (the embed) pass localized text; everyone else gets English. */
  ariaTitle?: string;
  ariaDesc?: string;
  /**
   * Extra outer rings: used for bi-wheel (natal + transit) and tri-wheel
   * (natal + progressed + transit). Each layer renders its own planets at
   * an outer radius outside the natal wheel.
   */
  outerLayers?: OuterLayer[];
}

export interface OuterLayer {
  planets: Planet[];
  label?: string;       // small caption near the layer
  color?: string;       // override planet glyph color
}

/* Lilith is the Moon's mean apogee ("mean Apogee" in the chart response).
   Deliberately not in wheel-vedic: Black Moon Lilith is not a Jyotish body,
   and that list belongs to a different tradition, not a copy of this one. */
const DEFAULT_PLANET_SHOWLIST = new Set([
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'North Node', 'Chiron', 'Lilith',
]);

export function renderWesternWheel(wheel: WheelInput, opts: WheelOptions = {}): string {
  /* Narrowed once, here, so the aspect layer sees the same set as the glyph
     layer: renderAspects skips a pair whose planet is absent, which is what
     should happen when a caller drops a body. */
  const input: WheelInput = opts.bodies?.length
    ? { ...wheel, planets: narrowBodies(wheel.planets, opts.bodies) }
    : wheel;
  const size = opts.size ?? 800;
  const cx = size / 2;
  const cy = size / 2;

  // Layout shrinks the natal wheel when extra layers stack outside it.
  const layerCount = opts.outerLayers?.length ?? 0;
  const ringWidth = layerCount > 0 ? Math.min(36, size * 0.07) : 0;
  const totalLayerRoom = ringWidth * layerCount;

  const rOuter = size * 0.475;
  const rNatalOuter = rOuter - totalLayerRoom;     // wheel structure ends here when layers
  const rSigns = (rNatalOuter ?? rOuter) - size * 0.025;
  const rHouses = (rNatalOuter ?? rOuter) - size * 0.10;
  const rPlanets = (rNatalOuter ?? rOuter) - size * 0.20;
  const rAspect = (rNatalOuter ?? rOuter) - size * 0.225;
  const t = resolveTheme(opts.theme);

  const asc = input.houses.ascendant;
  const showAspects = opts.showAspects !== false;

  let body = '';

  // Background
  body += circle(cx, cy, rOuter, { fill: t.bg, stroke: t.ring, 'stroke-width': 1.5 });

  // ─── Signs ring ──────────────────────────────────────────────
  body += renderSignsRing(cx, cy, rOuter, rSigns, asc, t);

  // ─── Houses ring ─────────────────────────────────────────────
  body += circle(cx, cy, rHouses, { fill: 'none', stroke: t.ring, 'stroke-width': 1 });
  body += renderHouseCusps(cx, cy, rSigns, rPlanets, rHouses, input.houses, asc, t);
  // House numbers sit inside the houses ring, close to its outer edge,
  // away from the planet glyphs to avoid collision.
  body += renderHouseNumbers(cx, cy, rHouses - 14, input.houses, asc, t);

  // ─── Aspect lines (innermost) ────────────────────────────────
  if (showAspects && input.aspects && input.aspects.length > 0) {
    body += renderAspects(cx, cy, rAspect, input, asc);
  }
  body += circle(cx, cy, rAspect, { fill: 'none', stroke: t.ring, 'stroke-width': 0.5, opacity: 0.4 });

  // ─── Planet glyphs ───────────────────────────────────────────
  body += renderPlanets(cx, cy, rPlanets, input.planets, asc, t, opts.showRetrograde !== false);

  // ─── Outer layers (transit / progressed) ─────────────────────
  if (opts.outerLayers && opts.outerLayers.length > 0) {
    let r = rNatalOuter ?? rOuter;
    for (let i = 0; i < opts.outerLayers.length; i++) {
      const layer = opts.outerLayers[i]!;
      const rInner = r;
      const rOuterLayer = r + ringWidth;
      // Ring boundary
      body += circle(cx, cy, rOuterLayer, { fill: 'none', stroke: t.ring, 'stroke-width': 0.8 });
      // Layer planets at mid-radius
      const rLayer = (rInner + rOuterLayer) / 2;
      body += renderLayerPlanets(cx, cy, rLayer, narrowBodies(layer.planets, opts.bodies), asc, t, layer.color, opts.showRetrograde !== false);
      // Layer label (top-right corner of ring)
      if (layer.label) {
        const lp = polarToCartesian(cx, cy, rLayer, 60); // top-right
        body += text(lp.x, lp.y - 14, layer.label, {
          'font-family': 'JetBrains Mono, monospace', 'font-size': 9,
          'text-anchor': 'middle', fill: t.textMuted,
          'font-weight': 600,
        });
      }
      r = rOuterLayer;
    }
  } else {
    // Single-wheel mode keeps the original outer rim
    body += circle(cx, cy, rOuter, { fill: 'none', stroke: t.ring, 'stroke-width': 1.2 });
  }

  // ─── Title (optional) ────────────────────────────────────────
  if (opts.title) {
    body += text(cx, 24, opts.title, {
      'font-family': 'Inter, sans-serif', 'font-size': 14, 'font-weight': 600,
      'text-anchor': 'middle', fill: t.text,
    });
  }

  return svg(size, size, body, { 'font-family': 'system-ui, sans-serif' }, {
    title: opts.ariaTitle ?? opts.title ?? 'Astrological natal chart wheel',
    desc: opts.ariaDesc ?? chartDescription(input),
  });
}

// ─── Signs ring ──────────────────────────────────────────────────

function renderSignsRing(cx: number, cy: number, rOuter: number, rInner: number, asc: number, t: Theme): string {
  let out = `<circle cx="${cx}" cy="${cy}" r="${rInner}" fill="none" stroke="${t.ring}" stroke-width="1"/>`;
  // 12 sign divisions: every 30° from 0° Aries
  for (let i = 0; i < 12; i++) {
    const startL = i * 30;
    const wheelStart = eclipticToWheel(startL, asc);
    const p1 = polarToCartesian(cx, cy, rInner, wheelStart);
    const p2 = polarToCartesian(cx, cy, rOuter, wheelStart);
    out += line(p1.x, p1.y, p2.x, p2.y, { stroke: t.ring, 'stroke-width': 0.8 });
    // Glyph at sign midpoint (15° into sign)
    const midL = i * 30 + 15;
    const wheelMid = eclipticToWheel(midL, asc);
    const rGlyph = (rOuter + rInner) / 2;
    const p = polarToCartesian(cx, cy, rGlyph, wheelMid);
    out += text(p.x, p.y + 5, SIGN_GLYPH[i]!, {
      'font-size': 18, 'text-anchor': 'middle', fill: t.text,
    });
  }
  // Tick marks every 5° on inner edge of sign ring
  for (let deg = 0; deg < 360; deg += 5) {
    const wheelDeg = eclipticToWheel(deg, asc);
    const tickLen = deg % 30 === 0 ? 0 : (deg % 10 === 0 ? 6 : 3);
    if (tickLen === 0) continue;
    const p1 = polarToCartesian(cx, cy, rInner, wheelDeg);
    const p2 = polarToCartesian(cx, cy, rInner - tickLen, wheelDeg);
    out += line(p1.x, p1.y, p2.x, p2.y, { stroke: t.textMuted, 'stroke-width': 0.5 });
  }
  return out;
}

// ─── House cusps + numbers ───────────────────────────────────────

function renderHouseCusps(cx: number, cy: number, rSigns: number, rInner: number, rHouses: number, h: Houses, asc: number, t: Theme): string {
  let out = '';
  const cusps = h.cusps;
  for (let i = 0; i < 12; i++) {
    const cusp = cusps[i]!;
    const wheelDeg = eclipticToWheel(cusp, asc);
    const p1 = polarToCartesian(cx, cy, rInner, wheelDeg);
    const p2 = polarToCartesian(cx, cy, rSigns, wheelDeg);
    // Cardinal cusps (1, 4, 7, 10) bolder
    const isCardinal = i === 0 || i === 3 || i === 6 || i === 9;
    out += line(p1.x, p1.y, p2.x, p2.y, {
      stroke: isCardinal ? t.text : t.textMuted,
      'stroke-width': isCardinal ? 1.5 : 0.7,
    });
    if (isCardinal) {
      const labelMap: Record<number, string> = { 0: 'ASC', 3: 'IC', 6: 'DSC', 9: 'MC' };
      /* Inside the empty band between the house and sign rings, nudged off the
         cusp line. Outside the sign ring a 420px wheel had 7px left for the
         label and clipped ASC and DSC. */
      const rLabel = (rSigns + rHouses) / 2;
      const labelLong = polarToCartesian(cx, cy, rLabel, wheelDeg + (9 / rLabel) * (180 / Math.PI));
      out += text(labelLong.x, labelLong.y + 3.5, labelMap[i]!, {
        'font-size': 10, 'font-weight': 700, 'text-anchor': 'middle', fill: t.text,
      });
    }
  }
  return out;
}

function renderHouseNumbers(cx: number, cy: number, r: number, h: Houses, asc: number, t: Theme): string {
  let out = '';
  for (let i = 0; i < 12; i++) {
    const c1 = h.cusps[i]!;
    const c2 = h.cusps[(i + 1) % 12]!;
    let mid = (c1 + c2) / 2;
    if (c2 < c1) mid = ((c1 + c2 + 360) / 2) % 360;
    const wheelDeg = eclipticToWheel(mid, asc);
    const p = polarToCartesian(cx, cy, r, wheelDeg);
    out += text(p.x, p.y + 4, String(i + 1), {
      'font-size': 11, 'text-anchor': 'middle', fill: t.textMuted, 'font-weight': 500,
    });
  }
  return out;
}

// ─── Planet glyphs ───────────────────────────────────────────────

function renderPlanets(cx: number, cy: number, r: number, planets: Planet[], asc: number, t: Theme, showRetro: boolean): string {
  const visible = planets.filter((p) => DEFAULT_PLANET_SHOWLIST.has(displayBodyName(p.name)));
  // Anti-collision: bump planets that are within 6° of a previous one
  // outward by 18px increments.
  const sorted = [...visible].sort((a, b) => a.longitude - b.longitude);
  const radii = new Map<number, number>();
  let lastLong = -Infinity;
  let stack = 0;
  for (const p of sorted) {
    if (Math.abs(p.longitude - lastLong) < 6) stack++; else stack = 0;
    radii.set(p.id, r + stack * 18);
    lastLong = p.longitude;
  }
  let out = '';
  for (const p of visible) {
    const wheelDeg = eclipticToWheel(p.longitude, asc);
    const rUse = radii.get(p.id) ?? r;
    const pos = polarToCartesian(cx, cy, rUse, wheelDeg);
    const glyph = planetGlyph(p.name);
    const isLuminary = p.name === 'Sun' || p.name === 'Moon';
    out += text(pos.x, pos.y + 6, glyph, {
      'font-size': isLuminary ? 22 : 18,
      'text-anchor': 'middle',
      fill: t.text,
      'font-weight': 600,
    });
    if (showRetro && p.isRetrograde) {
      out += text(pos.x + 12, pos.y + 6, '℞', {
        'font-size': 10, fill: t.malefic, 'text-anchor': 'middle',
      });
    }
    // Short tick from glyph toward center: positioning indicator without
    // colliding with house numbers (which sit closer to the houses ring).
    const tickP1 = polarToCartesian(cx, cy, rUse - 12, wheelDeg);
    const tickP2 = polarToCartesian(cx, cy, rUse - 18, wheelDeg);
    out += line(tickP1.x, tickP1.y, tickP2.x, tickP2.y, {
      stroke: t.textMuted, 'stroke-width': 0.6,
    });
  }
  return out;
}

function renderLayerPlanets(cx: number, cy: number, r: number, planets: Planet[], asc: number, t: Theme, color: string | undefined, showRetro: boolean): string {
  const visible = planets.filter((p) => DEFAULT_PLANET_SHOWLIST.has(displayBodyName(p.name)));
  let out = '';
  const fill = color ?? t.benefic;
  for (const p of visible) {
    const wheelDeg = eclipticToWheel(p.longitude, asc);
    const pos = polarToCartesian(cx, cy, r, wheelDeg);
    const glyph = planetGlyph(p.name);
    out += text(pos.x, pos.y + 5, glyph, {
      'font-size': 14, 'text-anchor': 'middle', fill, 'font-weight': 600,
    });
    if (showRetro && p.isRetrograde) {
      out += text(pos.x + 9, pos.y + 5, '℞', {
        'font-size': 8, fill: t.malefic, 'text-anchor': 'middle',
      });
    }
  }
  return out;
}

// ─── Aspects ─────────────────────────────────────────────────────

function renderAspects(cx: number, cy: number, r: number, input: WheelInput, asc: number): string {
  const planetById = new Map<string, Planet>();
  for (const p of input.planets) planetById.set(p.name, p);

  let out = '';
  for (const a of input.aspects ?? []) {
    const p1 = planetById.get(a.planet1);
    const p2 = planetById.get(a.planet2);
    if (!p1 || !p2) continue;
    const w1 = eclipticToWheel(p1.longitude, asc);
    const w2 = eclipticToWheel(p2.longitude, asc);
    const c1 = polarToCartesian(cx, cy, r, w1);
    const c2 = polarToCartesian(cx, cy, r, w2);
    const typeName = typeof a.type === 'string' ? a.type : a.type.name;
    const color = ASPECT_COLOR[typeName] ?? '#888';
    out += line(c1.x, c1.y, c2.x, c2.y, {
      stroke: color, 'stroke-width': 1, opacity: 0.7,
    });
  }
  return out;
}

// Re-exports for convenience
export { polarToCartesian, eclipticToWheel, arcPath };

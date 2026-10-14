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
  svg, circle, line, text, group,
  polarToCartesian, eclipticToWheel, arcPath, spreadOnArc,
  SIGN_GLYPH, SIGN_NAMES, aspectColor, displayBodyName, planetGlyph, narrowBodies,
  resolveTheme, hook, bodySlug, aspectSlug, bodyLabel, type Theme, type BodyWords,
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
  /* The caller's words for the axis labels, the SVG <title>/<desc> and each planet's data-label.
     Absent means today's English. The package does not translate. */
  labels?: WheelLabels;
}

export interface WheelLabels extends BodyWords {
  asc?: string;
  dsc?: string;
  mc?: string;
  ic?: string;
  title?: string;
  desc?: string;
}

export interface OuterLayer {
  planets: Planet[];
  label?: string;       // small caption near the layer
  color?: string;       // override planet glyph color
  /* Aspects between the inner chart (planet1) and this layer (planet2), drawn as dashed chords
     inside the aspect circle. Absent means none, so the default output does not change. */
  aspects?: Aspect[];
}

/* Lilith is the Moon's mean apogee ("mean Apogee" in the chart response).
   Deliberately not in wheel-vedic: Black Moon Lilith is not a Jyotish body,
   and that list belongs to a different tradition, not a copy of this one. */
const AXIS_BY_CUSP: Record<number, string> = { 0: 'asc', 3: 'ic', 6: 'dsc', 9: 'mc' };

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
  body += circle(cx, cy, rOuter, { fill: t.bg, stroke: t.ring, 'stroke-width': 1.5, ...hook(t, { class: 'aw-bg' }) });

  // ─── Signs ring ──────────────────────────────────────────────
  body += renderSignsRing(cx, cy, rOuter, rSigns, asc, t);

  // ─── Houses ring ─────────────────────────────────────────────
  body += circle(cx, cy, rHouses, { fill: 'none', stroke: t.ring, 'stroke-width': 1, ...hook(t, { class: 'aw-ring' }) });
  body += renderHouseCusps(cx, cy, rSigns, rPlanets, rHouses, input.houses, asc, t, opts.labels);
  // House numbers sit inside the houses ring, close to its outer edge,
  // away from the planet glyphs to avoid collision.
  body += renderHouseNumbers(cx, cy, rHouses - 14, input.houses, asc, t);

  // ─── Aspect lines (innermost) ────────────────────────────────
  if (showAspects && input.aspects && input.aspects.length > 0) {
    body += renderAspects(cx, cy, rAspect, input, asc, t);
  }
  for (let i = 0; i < (opts.outerLayers?.length ?? 0); i++) {
    const layer = opts.outerLayers![i]!;
    if (layer.aspects?.length) {
      body += renderCrossAspects(cx, cy, rAspect, visiblePlanets(input.planets), visiblePlanets(narrowBodies(layer.planets, opts.bodies)), layer.aspects, asc, t, i + 1);
    }
  }
  body += circle(cx, cy, rAspect, { fill: 'none', stroke: t.ring, 'stroke-width': 0.5, opacity: 0.4, ...hook(t, { class: 'aw-ring' }) });

  // ─── Planet glyphs ───────────────────────────────────────────
  body += renderPlanets(cx, cy, rPlanets, input.planets, asc, t, opts.showRetrograde !== false, opts.labels);

  // ─── Outer layers (transit / progressed) ─────────────────────
  if (opts.outerLayers && opts.outerLayers.length > 0) {
    let r = rNatalOuter ?? rOuter;
    for (let i = 0; i < opts.outerLayers.length; i++) {
      const layer = opts.outerLayers[i]!;
      const rInner = r;
      const rOuterLayer = r + ringWidth;
      // Ring boundary
      body += circle(cx, cy, rOuterLayer, { fill: 'none', stroke: t.ring, 'stroke-width': 0.8, ...hook(t, { class: 'aw-ring' }) });
      // Layer planets at mid-radius
      const rLayer = (rInner + rOuterLayer) / 2;
      body += renderLayerPlanets(cx, cy, rLayer, narrowBodies(layer.planets, opts.bodies), asc, t, layer.color, opts.showRetrograde !== false, i + 1, opts.labels);
      // Layer label (top-right corner of ring)
      if (layer.label) {
        const lp = polarToCartesian(cx, cy, rLayer, 60); // top-right
        body += text(lp.x, lp.y - 14, layer.label, {
          'font-family': 'JetBrains Mono, monospace', 'font-size': 9,
          'text-anchor': 'middle', fill: t.textMuted,
          'font-weight': 600, ...hook(t, { class: 'aw-label aw-layer-label' }),
        });
      }
      r = rOuterLayer;
    }
  } else {
    // Single-wheel mode keeps the original outer rim
    body += circle(cx, cy, rOuter, { fill: 'none', stroke: t.ring, 'stroke-width': 1.2, ...hook(t, { class: 'aw-ring' }) });
  }

  // ─── Title (optional) ────────────────────────────────────────
  if (opts.title) {
    body += text(cx, 24, opts.title, {
      'font-family': 'Inter, sans-serif', 'font-size': 14, 'font-weight': 600,
      'text-anchor': 'middle', fill: t.text, ...hook(t, { class: 'aw-label aw-title' }),
    });
  }

  return svg(size, size, body, { 'font-family': 'system-ui, sans-serif' }, {
    title: opts.ariaTitle ?? opts.labels?.title ?? opts.title ?? 'Astrological natal chart wheel',
    desc: opts.ariaDesc ?? opts.labels?.desc ?? chartDescription(input),
  });
}

// ─── Signs ring ──────────────────────────────────────────────────

function renderSignsRing(cx: number, cy: number, rOuter: number, rInner: number, asc: number, t: Theme): string {
  let out = circle(cx, cy, rInner, { fill: 'none', stroke: t.ring, 'stroke-width': 1, ...hook(t, { class: 'aw-ring' }) });
  // 12 sign divisions: every 30° from 0° Aries
  for (let i = 0; i < 12; i++) {
    const startL = i * 30;
    const wheelStart = eclipticToWheel(startL, asc);
    const p1 = polarToCartesian(cx, cy, rInner, wheelStart);
    const p2 = polarToCartesian(cx, cy, rOuter, wheelStart);
    out += line(p1.x, p1.y, p2.x, p2.y, { stroke: t.ring, 'stroke-width': 0.8, ...hook(t, { class: 'aw-sign-line' }) });
    // Glyph at sign midpoint (15° into sign)
    const midL = i * 30 + 15;
    const wheelMid = eclipticToWheel(midL, asc);
    const rGlyph = (rOuter + rInner) / 2;
    const p = polarToCartesian(cx, cy, rGlyph, wheelMid);
    out += text(p.x, p.y + 5, SIGN_GLYPH[i]!, {
      'font-size': 18, 'text-anchor': 'middle', fill: t.text,
      ...hook(t, { class: `aw-sign aw-sign-${SIGN_NAMES[i]!.toLowerCase()}` }),
    });
  }
  // Tick marks every 5° on inner edge of sign ring
  for (let deg = 0; deg < 360; deg += 5) {
    const wheelDeg = eclipticToWheel(deg, asc);
    const tickLen = deg % 30 === 0 ? 0 : (deg % 10 === 0 ? 6 : 3);
    if (tickLen === 0) continue;
    const p1 = polarToCartesian(cx, cy, rInner, wheelDeg);
    const p2 = polarToCartesian(cx, cy, rInner - tickLen, wheelDeg);
    out += line(p1.x, p1.y, p2.x, p2.y, { stroke: t.textMuted, 'stroke-width': 0.5, ...hook(t, { class: 'aw-tick' }) });
  }
  return out;
}

// ─── House cusps + numbers ───────────────────────────────────────

function renderHouseCusps(cx: number, cy: number, rSigns: number, rInner: number, rHouses: number, h: Houses, asc: number, t: Theme, labels: WheelLabels = {}): string {
  let out = '';
  const cusps = h.cusps;
  /* Lines start past the planet ring: from its centre they crossed out any glyph
     on a cusp (kb 2026-10-14, Messi's Jupiter on IC). A 22 px luminary reaches
     ~11 px out and a ℞ at DSC ~16 px, glyph sizes are fixed in px. */
  const rStart = Math.min(rInner + 20, rHouses - 2);
  for (let i = 0; i < 12; i++) {
    const cusp = cusps[i]!;
    const wheelDeg = eclipticToWheel(cusp, asc);
    const p1 = polarToCartesian(cx, cy, rStart, wheelDeg);
    const p2 = polarToCartesian(cx, cy, rSigns, wheelDeg);
    // Cardinal cusps (1, 4, 7, 10) bolder
    const isCardinal = i === 0 || i === 3 || i === 6 || i === 9;
    const axis = AXIS_BY_CUSP[i];
    out += line(p1.x, p1.y, p2.x, p2.y, {
      stroke: isCardinal ? t.text : t.textMuted,
      'stroke-width': isCardinal ? 1.5 : 0.7,
      ...hook(t, { class: axis ? `aw-house-cusp aw-axis aw-${axis}` : 'aw-house-cusp' }),
    });
    if (isCardinal) {
      const labelMap: Record<number, string> = { 0: labels.asc ?? 'ASC', 3: labels.ic ?? 'IC', 6: labels.dsc ?? 'DSC', 9: labels.mc ?? 'MC' };
      /* Inside the empty band between the house and sign rings, nudged off the
         cusp line. Outside the sign ring a 420px wheel had 7px left for the
         label and clipped ASC and DSC. */
      const rLabel = (rSigns + rHouses) / 2;
      const labelLong = polarToCartesian(cx, cy, rLabel, wheelDeg + (9 / rLabel) * (180 / Math.PI));
      out += text(labelLong.x, labelLong.y + 3.5, labelMap[i]!, {
        'font-size': 10, 'font-weight': 700, 'text-anchor': 'middle', fill: t.text,
        ...hook(t, { class: `aw-label aw-axis-label aw-${axis}` }),
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
      ...hook(t, { class: 'aw-house-number' }),
    });
  }
  return out;
}

// ─── Planet glyphs ───────────────────────────────────────────────

function renderPlanets(cx: number, cy: number, r: number, planets: Planet[], asc: number, t: Theme, showRetro: boolean, words?: BodyWords): string {
  const visible = planets.filter((p) => DEFAULT_PLANET_SHOWLIST.has(displayBodyName(p.name)));
  /* Spread along the planet ring rather than stacking outward: an outward
     stack ran into the house numbers and 18 px steps left 18-22 px glyphs
     touching (kb, Hillary Clinton's Mars and Pluto). */
  /* Glyph box from its font size; the ℞ sits 12 px right of centre, so a
     retrograde body is boxed symmetrically to its right edge. */
  const box = (p: Planet) => {
    const fs = (p.name === 'Sun' || p.name === 'Moon') ? 22 : 18;
    return { w: showRetro && p.isRetrograde ? 2 * (12 + 4) : fs * 0.8, h: fs * 0.9 };
  };
  const drawn = spreadOnArc(visible.map((p) => ({ id: p.id, deg: eclipticToWheel(p.longitude, asc), ...box(p) })), r);
  let out = '';
  for (const p of visible) {
    const wheelDeg = eclipticToWheel(p.longitude, asc);
    const at = drawn.get(p.id) ?? wheelDeg;
    const pos = polarToCartesian(cx, cy, r, at);
    const glyph = planetGlyph(p.name);
    const isLuminary = p.name === 'Sun' || p.name === 'Moon';
    let g = text(pos.x, pos.y + 6, glyph, {
      'font-size': isLuminary ? 22 : 18,
      'text-anchor': 'middle',
      fill: t.text,
      'font-weight': 600,
      ...hook(t, { class: 'aw-glyph' }),
    });
    if (showRetro && p.isRetrograde) {
      g += text(pos.x + 12, pos.y + 6, '℞', {
        'font-size': 10, fill: t.malefic, 'text-anchor': 'middle', ...hook(t, { class: 'aw-retro' }),
      });
    }
    // Tick at the true degree, inside the glyph, away from the house numbers;
    // a moved glyph gets a thin line to it.
    const tickP1 = polarToCartesian(cx, cy, r - 12, wheelDeg);
    const tickP2 = polarToCartesian(cx, cy, r - 18, wheelDeg);
    g += line(tickP1.x, tickP1.y, tickP2.x, tickP2.y, {
      stroke: t.textMuted, 'stroke-width': 0.6, ...hook(t, { class: 'aw-planet-tick' }),
    });
    if (Math.abs(((at - wheelDeg + 540) % 360) - 180) > 0.5) {
      const from = polarToCartesian(cx, cy, r - 11, at);
      g += line(from.x, from.y, tickP1.x, tickP1.y, {
        stroke: t.textMuted, 'stroke-width': 0.4, ...hook(t, { class: 'aw-planet-pointer' }),
      });
    }
    out += planetGroup(t, g, p, '', '', words);
  }
  return out;
}

/* Glyph, retrograde mark and tick in one group, so a script hovers the planet as a whole. */
function planetGroup(t: Theme, content: string, p: Planet, idPrefix: string, extraClass: string, words?: BodyWords): string {
  if (!t.css) return content;
  const slug = bodySlug(p.name);
  return group(content, {
    class: `aw-planet aw-planet-${slug}${p.isRetrograde ? ' aw-retrograde' : ''}${extraClass}`,
    'data-planet': idPrefix + slug,
    'data-label': bodyLabel(p.name, p.longitude, p.isRetrograde, words),
  });
}

function renderLayerPlanets(cx: number, cy: number, r: number, planets: Planet[], asc: number, t: Theme, color: string | undefined, showRetro: boolean, layer: number, words?: BodyWords): string {
  const visible = planets.filter((p) => DEFAULT_PLANET_SHOWLIST.has(displayBodyName(p.name)));
  let out = '';
  const fill = color ?? t.benefic;
  for (const p of visible) {
    const wheelDeg = eclipticToWheel(p.longitude, asc);
    const pos = polarToCartesian(cx, cy, r, wheelDeg);
    const glyph = planetGlyph(p.name);
    let g = text(pos.x, pos.y + 5, glyph, {
      'font-size': 14, 'text-anchor': 'middle', fill, 'font-weight': 600, ...hook(t, { class: 'aw-glyph' }),
    });
    if (showRetro && p.isRetrograde) {
      g += text(pos.x + 9, pos.y + 5, '℞', {
        'font-size': 8, fill: t.malefic, 'text-anchor': 'middle', ...hook(t, { class: 'aw-retro' }),
      });
    }
    // b- for the first outer chart, c- for the second: the WP plugin's convention.
    out += planetGroup(t, g, p, `${String.fromCharCode(97 + layer)}-`, ` aw-layer-${layer}`, words);
  }
  return out;
}

// ─── Aspects ─────────────────────────────────────────────────────

function renderAspects(cx: number, cy: number, r: number, input: WheelInput, asc: number, t: Theme): string {
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
    const color = aspectColor(t, typeName, '#888');
    out += line(c1.x, c1.y, c2.x, c2.y, {
      stroke: color, 'stroke-width': 1, opacity: 0.7,
      ...hook(t, { class: `aw-aspect aw-aspect-${aspectSlug(typeName)}`, 'data-a': bodySlug(p1.name), 'data-b': bodySlug(p2.name) }),
    });
  }
  return out;
}

/* Same pair lookup as renderAspects, but each end in its own chart: the Sun inside and the Sun
   outside are different points. A pair with a hidden body is skipped; a conjunction, whose two
   ends would coincide, draws a short radial tick instead of a zero-length line. */
function renderCrossAspects(cx: number, cy: number, r: number, inner: Planet[], outer: Planet[], aspects: Aspect[], asc: number, t: Theme, layer: number): string {
  const byName = (list: Planet[]) => new Map(list.map((p) => [p.name, p]));
  const a1 = byName(inner);
  const a2 = byName(outer);
  const prefix = `${String.fromCharCode(97 + layer)}-`;
  let out = '';
  for (const a of aspects) {
    const p1 = a1.get(a.planet1);
    const p2 = a2.get(a.planet2);
    if (!p1 || !p2) continue;
    const typeName = typeof a.type === 'string' ? a.type : a.type.name;
    const w1 = eclipticToWheel(p1.longitude, asc);
    const w2 = eclipticToWheel(p2.longitude, asc);
    const c1 = polarToCartesian(cx, cy, r, w1);
    const c2 = Math.abs(((w1 - w2 + 540) % 360) - 180) < 0.5 ? polarToCartesian(cx, cy, r - 10, w1) : polarToCartesian(cx, cy, r, w2);
    out += line(c1.x, c1.y, c2.x, c2.y, {
      stroke: aspectColor(t, typeName, '#888'), 'stroke-width': 1, opacity: 0.7, 'stroke-dasharray': '4 3',
      ...hook(t, { class: `aw-aspect aw-aspect-${aspectSlug(typeName)} aw-cross-aspect aw-layer-${layer}`, 'data-a': bodySlug(p1.name), 'data-b': prefix + bodySlug(p2.name) }),
    });
  }
  return out;
}

function visiblePlanets(planets: Planet[]): Planet[] {
  return planets.filter((p) => DEFAULT_PLANET_SHOWLIST.has(displayBodyName(p.name)));
}

// Re-exports for convenience
export { polarToCartesian, eclipticToWheel, arcPath };

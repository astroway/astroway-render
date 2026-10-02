/**
 * Star map: stereographic projection of caller-supplied points (typically
 * stars + planets in equatorial coordinates RA/Dec).
 *
 * Stereographic projection from the celestial sphere to a plane tangent
 * at the zenith of given observer (or default North celestial pole).
 * Points below the horizon (or south of cap altitude) are clipped.
 */

import { svg, circle, text, line, resolveTheme } from './svg-utils.ts';

export interface StarPoint {
  raHours?: number;     // 0-24
  raDeg?: number;       // 0-360 (alternative)
  decDeg: number;       // -90..90
  magnitude?: number;   // visual magnitude, smaller = brighter
  name?: string;
  glyph?: string;
}

export interface StarMapInput {
  points: StarPoint[];
  observerLatDeg?: number;  // for horizon line; default 0 (equator)
  zenithDecDeg?: number;    // tangent point (default 90 = NCP)
  capAltitudeDeg?: number;  // limit (default 0 = horizon)
  title?: string;
}

export interface StarMapOptions {
  size?: number;
  theme?: string;
}

export function renderStarMap(input: StarMapInput, opts: StarMapOptions = {}): string {
  const size = opts.size ?? 700;
  const t = resolveTheme(opts.theme);
  const padding = 30;
  const titleH = input.title ? 32 : 0;
  const W = size;
  const H = size + titleH;
  const cx = W / 2;
  const cy = padding + titleH + (size - 2 * padding) / 2;
  const r = (size - 2 * padding) / 2;

  let body = circle(cx, cy, r + 8, { fill: t.bg });
  if (input.title) {
    body += text(W / 2, padding + 18, input.title, {
      'font-family': 'Inter, sans-serif', 'font-size': 14, 'font-weight': 600,
      'text-anchor': 'middle', fill: t.text,
    });
  }

  // Map disk
  body += circle(cx, cy, r, { fill: t.housesFill, stroke: t.ring, 'stroke-width': 1 });

  // Concentric Dec lines (every 30°), labelled
  const zenith = input.zenithDecDeg ?? 90;
  for (let dec = -60; dec <= 60; dec += 30) {
    if (dec === zenith) continue;
    const angularDist = Math.abs(zenith - dec);
    const rr = (angularDist / 90) * r;
    if (rr > 0 && rr < r) {
      body += circle(cx, cy, rr, { fill: 'none', stroke: t.ring, 'stroke-width': 0.4, opacity: 0.4 });
      body += text(cx + rr, cy, `${dec}°`, {
        'font-family': 'JetBrains Mono, monospace', 'font-size': 8,
        'text-anchor': 'middle', fill: t.textMuted,
      });
    }
  }

  // Radial RA lines (every 30°)
  for (let ra = 0; ra < 360; ra += 30) {
    const a = (ra - 90) * Math.PI / 180; // 0h at top, increases clockwise
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    body += line(cx, cy, x, y, { stroke: t.ring, 'stroke-width': 0.3, opacity: 0.4 });
    body += text(cx + (r + 14) * Math.cos(a), cy + (r + 14) * Math.sin(a) + 3, `${ra / 15}h`, {
      'font-family': 'JetBrains Mono, monospace', 'font-size': 9,
      'text-anchor': 'middle', fill: t.textMuted,
    });
  }

  // Plot stars
  for (const p of input.points) {
    const raDeg = p.raDeg ?? (p.raHours ?? 0) * 15;
    const angularDist = Math.abs(zenith - p.decDeg);
    if (angularDist > 90) continue; // below horizon
    const rr = (angularDist / 90) * r;
    const a = (raDeg - 90) * Math.PI / 180;
    const x = cx + rr * Math.cos(a);
    const y = cy + rr * Math.sin(a);
    const mag = p.magnitude ?? 3;
    // Brighter = larger; mag scale: 0=large, 5=tiny
    const dotR = Math.max(1.2, 4 - mag * 0.6);
    if (p.glyph) {
      body += text(x, y + 4, p.glyph, {
        'font-size': 12 + dotR, 'text-anchor': 'middle', fill: t.text, 'font-weight': 600,
      });
    } else {
      body += circle(x, y, dotR, { fill: t.text });
    }
    if (p.name) {
      body += text(x + dotR + 3, y + 3, p.name, {
        'font-family': 'JetBrains Mono, monospace', 'font-size': 9,
        fill: t.textMuted,
      });
    }
  }

  return svg(W, H, body, { 'font-family': 'system-ui, sans-serif' }, {
    title: input.title ?? 'Star map',
    desc: `Sky map with ${input.points.length} plotted points.`,
  });
}

/**
 * Eclipse path: equirectangular world map graticule + caller-supplied
 * lat/lon path points connected as the eclipse track (umbral or annular
 * shadow).
 *
 * The caller passes the path; this module draws it and computes nothing.
 */

import { svg, rect, line, text, path, resolveTheme } from './svg-utils.ts';

export interface EclipsePathInput {
  path: { latitude: number; longitude: number; time?: string }[];
  centerlinePoints?: { latitude: number; longitude: number }[];
  bandWidthDeg?: number;
  title?: string;
}

export interface EclipseOptions {
  width?: number;
  height?: number;
  theme?: string;
  showGraticule?: boolean;
  pathColor?: string;
}

export function renderEclipsePath(input: EclipsePathInput, opts: EclipseOptions = {}): string {
  const W = opts.width ?? 1000;
  const H = opts.height ?? 500;
  const padding = 20;
  const titleH = input.title ? 28 : 0;
  const t = resolveTheme(opts.theme);

  const x0 = padding, y0 = padding + titleH;
  const x1 = W - padding, y1 = H - padding;
  const mapW = x1 - x0;
  const mapH = y1 - y0;

  // Equirectangular projection: longitude -180..180 → x, latitude 90..-90 → y
  const project = (lat: number, lon: number) => ({
    x: x0 + ((lon + 180) / 360) * mapW,
    y: y0 + ((90 - lat) / 180) * mapH,
  });

  let body = rect(0, 0, W, H, { fill: t.bg });
  if (input.title) {
    body += text(W / 2, padding + 18, input.title, {
      'font-family': 'Inter, sans-serif', 'font-size': 14, 'font-weight': 600,
      'text-anchor': 'middle', fill: t.text,
    });
  }

  // Map background
  body += rect(x0, y0, mapW, mapH, { fill: t.housesFill, stroke: t.ring, 'stroke-width': 1 });

  // Graticule (every 30°)
  if (opts.showGraticule !== false) {
    for (let lon = -180; lon <= 180; lon += 30) {
      const a = project(0, lon);
      body += line(a.x, y0, a.x, y1, { stroke: t.ring, 'stroke-width': 0.3, opacity: 0.5 });
      if (lon !== -180 && lon !== 180) {
        body += text(a.x, y1 + 12, `${lon}°`, {
          'font-family': 'JetBrains Mono, monospace', 'font-size': 9,
          'text-anchor': 'middle', fill: t.textMuted,
        });
      }
    }
    for (let lat = -90; lat <= 90; lat += 30) {
      const a = project(lat, -180);
      body += line(x0, a.y, x1, a.y, { stroke: t.ring, 'stroke-width': 0.3, opacity: 0.5 });
      if (lat !== -90 && lat !== 90) {
        body += text(x0 - 6, a.y + 4, `${lat}°`, {
          'font-family': 'JetBrains Mono, monospace', 'font-size': 9,
          'text-anchor': 'end', fill: t.textMuted,
        });
      }
    }
    // Equator + prime meridian emphasis
    const eq0 = project(0, -180), eq1 = project(0, 180);
    body += line(eq0.x, eq0.y, eq1.x, eq1.y, { stroke: t.text, 'stroke-width': 0.6, opacity: 0.5 });
    const pm0 = project(90, 0), pm1 = project(-90, 0);
    body += line(pm0.x, pm0.y, pm1.x, pm1.y, { stroke: t.text, 'stroke-width': 0.6, opacity: 0.5 });
  }

  // Centerline (caller-supplied)
  const center = input.centerlinePoints ?? input.path;
  if (center && center.length > 1) {
    const d: string[] = [];
    for (let i = 0; i < center.length; i++) {
      const p = center[i]!;
      const proj = project(p.latitude, p.longitude);
      d.push(`${i === 0 ? 'M' : 'L'} ${proj.x.toFixed(1)} ${proj.y.toFixed(1)}`);
    }
    body += path(d.join(' '), {
      fill: 'none', stroke: opts.pathColor ?? t.malefic, 'stroke-width': 2.5,
      'stroke-dasharray': '4 2',
    });
  }

  // Band (caller's `path` if separate from centerline)
  if (input.path && input.path.length > 1) {
    const bandWidth = input.bandWidthDeg ?? 5;
    const px = (bandWidth / 180) * mapH;
    const upper: string[] = [];
    const lower: string[] = [];
    for (let i = 0; i < input.path.length; i++) {
      const p = input.path[i]!;
      const proj = project(p.latitude, p.longitude);
      upper.push(`${i === 0 ? 'M' : 'L'} ${proj.x.toFixed(1)} ${(proj.y - px / 2).toFixed(1)}`);
      lower.unshift(`L ${proj.x.toFixed(1)} ${(proj.y + px / 2).toFixed(1)}`);
    }
    const d = upper.concat(lower).join(' ') + ' Z';
    body += path(d, {
      fill: opts.pathColor ?? t.malefic, opacity: 0.25, stroke: 'none',
    });
  }

  return svg(W, H, body, { 'font-family': 'system-ui, sans-serif' }, {
    title: input.title ?? 'Eclipse path map',
    desc: `Eclipse ground track with ${input.path.length} points.`,
  });
}

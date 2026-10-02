/**
 * Biorhythm: three sine curves with the periods of Fliess (1897) and
 * Swoboda (1904): physical 23d, emotional 28d, intellectual 33d. Curve value
 * at day d since birth: sin(2π · d / period).
 *
 * No astronomy here, only date arithmetic and sine waves.
 *
 * Periods and the value function come from biorhythm-math.ts, shared with
 * POST /v1/wellness/biorhythm so the drawing and the data agree. Only the
 * per-cycle colour and label are presentation, so only those live here.
 */

import { svg, rect, line, text, path, resolveTheme } from './svg-utils.ts';
import { BIORHYTHM_CYCLES, cycleValue, parseUtcDate, DAY_MS } from './biorhythm-math.ts';

export interface BiorhythmInput {
  birthDate: string;     // YYYY-MM-DD
  rangeStart: string;    // YYYY-MM-DD
  rangeEnd: string;      // YYYY-MM-DD
}

export interface BiorhythmOptions {
  width?: number;
  height?: number;
  theme?: string;
  title?: string;
}

const CYCLE_STYLE: Record<string, { label: string; color: string }> = {
  physical:     { label: 'Physical',     color: '#d24a4a' },
  emotional:    { label: 'Emotional',    color: '#3b82f6' },
  intellectual: { label: 'Intellectual', color: '#22c55e' },
};

const CYCLES = BIORHYTHM_CYCLES.map((c) => ({
  name: CYCLE_STYLE[c.name]!.label,
  period: c.periodDays,
  color: CYCLE_STYLE[c.name]!.color,
}));

export function renderBiorhythm(input: BiorhythmInput, opts: BiorhythmOptions = {}): string {
  const W = opts.width ?? 1000;
  const H = opts.height ?? 400;
  const padding = 40;
  const titleH = opts.title ? 28 : 0;
  const t = resolveTheme(opts.theme);

  const birth = parseUtcDate(input.birthDate);
  const rangeStart = parseUtcDate(input.rangeStart);
  const rangeEnd = parseUtcDate(input.rangeEnd);
  const days = Math.max(1, Math.round((rangeEnd - rangeStart) / DAY_MS));

  const x0 = padding;
  const x1 = W - padding;
  const y0 = padding + titleH;
  const yMid = y0 + (H - y0 - padding) / 2;
  const yAmp = (H - y0 - padding) / 2 - 20;

  let body = rect(0, 0, W, H, { fill: t.bg });
  if (opts.title) {
    body += text(W / 2, padding - 12, opts.title, {
      'font-family': 'Inter, sans-serif', 'font-size': 14, 'font-weight': 600,
      'text-anchor': 'middle', fill: t.text,
    });
  }

  // Axes: horizontal midline + vertical day-zero axis
  body += line(x0, yMid, x1, yMid, { stroke: t.ring, 'stroke-width': 1 });
  body += line(x0, y0 + 8, x0, H - padding, { stroke: t.ring, 'stroke-width': 0.7 });
  body += line(x1, y0 + 8, x1, H - padding, { stroke: t.ring, 'stroke-width': 0.7 });
  // 0% / 100% reference labels
  body += text(x0 - 6, yMid + 4, '0', {
    'font-family': 'JetBrains Mono, monospace', 'font-size': 10,
    'text-anchor': 'end', fill: t.textMuted,
  });
  body += text(x0 - 6, y0 + 16, '+1', {
    'font-family': 'JetBrains Mono, monospace', 'font-size': 10,
    'text-anchor': 'end', fill: t.textMuted,
  });
  body += text(x0 - 6, H - padding + 2, '-1', {
    'font-family': 'JetBrains Mono, monospace', 'font-size': 10,
    'text-anchor': 'end', fill: t.textMuted,
  });

  // Date range labels
  body += text(x0, H - padding + 18, input.rangeStart, {
    'font-family': 'JetBrains Mono, monospace', 'font-size': 10,
    'text-anchor': 'start', fill: t.textMuted,
  });
  body += text(x1, H - padding + 18, input.rangeEnd, {
    'font-family': 'JetBrains Mono, monospace', 'font-size': 10,
    'text-anchor': 'end', fill: t.textMuted,
  });

  // Curves
  const stepsPerDay = 4;          // 4 samples/day for smooth lines
  const totalSteps = days * stepsPerDay;
  for (const c of CYCLES) {
    const points: string[] = [];
    for (let i = 0; i <= totalSteps; i++) {
      const dayFromStart = i / stepsPerDay;
      const dayFromBirth = (rangeStart - birth) / DAY_MS + dayFromStart;
      const v = cycleValue(dayFromBirth, c.period);
      const x = x0 + (i / totalSteps) * (x1 - x0);
      const y = yMid - v * yAmp;
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    body += path(points.join(' '), {
      fill: 'none', stroke: c.color, 'stroke-width': 1.8,
    });
  }

  // Legend (top-right)
  let lx = x1 - 200;
  for (const c of CYCLES) {
    body += rect(lx, y0 + 4, 14, 3, { fill: c.color });
    body += text(lx + 18, y0 + 12, c.name, {
      'font-family': 'JetBrains Mono, monospace', 'font-size': 10,
      fill: t.text, 'font-weight': 500,
    });
    lx += 70;
  }

  return svg(W, H, body, { 'font-family': 'system-ui, sans-serif' }, {
    title: opts.title ?? 'Biorhythm chart',
    desc: `Biorhythm cycles from ${input.rangeStart} to ${input.rangeEnd}.`,
  });
}

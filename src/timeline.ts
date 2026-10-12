/**
 * Horizontal timeline: a Gantt-style bar chart for transit/aspect events
 * over a date window. Rows = events, X axis = time, color = severity/type.
 */

import { svg, rect, line, text, resolveTheme, aspectColor } from './svg-utils.ts';

export interface TimelineEvent {
  label: string;            // e.g., "Saturn ☐ Sun"
  color?: string;           // overrides default coloring
  start: string;            // YYYY-MM-DD
  end: string;              // YYYY-MM-DD
  exact?: string;           // YYYY-MM-DD inside [start, end]
  category?: string;        // e.g., 'transit', 'progression', aspect type name
}

export interface TimelineInput {
  rangeStart: string;       // YYYY-MM-DD
  rangeEnd: string;         // YYYY-MM-DD
  events: TimelineEvent[];
}

export interface TimelineOptions {
  width?: number;           // total width
  rowHeight?: number;
  theme?: string;
  title?: string;
}

export function renderTimeline(input: TimelineInput, opts: TimelineOptions = {}): string {
  const W = opts.width ?? 1000;
  const rowH = opts.rowHeight ?? 28;
  const labelCol = 200;
  const padding = 24;
  const titleH = opts.title ? 32 : 0;
  const tickH = 28;
  const t = resolveTheme(opts.theme);

  const start = parseDate(input.rangeStart);
  const end = parseDate(input.rangeEnd);
  const rangeMs = Math.max(1, end - start);

  const events = input.events;
  const n = events.length;
  const H = padding + titleH + tickH + n * rowH + padding;

  let body = rect(0, 0, W, H, { fill: t.bg });

  if (opts.title) {
    body += text(W / 2, padding + 18, opts.title, {
      'font-family': 'Inter, sans-serif', 'font-size': 14, 'font-weight': 600,
      'text-anchor': 'middle', fill: t.text,
    });
  }

  const x0 = padding + labelCol;
  const x1 = W - padding;
  const trackW = x1 - x0;
  const y0 = padding + titleH + tickH;

  // Time-axis ticks (monthly)
  const ticks = monthlyTicks(start, end);
  for (const tk of ticks) {
    const x = x0 + ((tk.t - start) / rangeMs) * trackW;
    body += line(x, y0 - tickH + 6, x, H - padding, {
      stroke: t.ring, 'stroke-width': 0.4, opacity: 0.5,
    });
    body += text(x, y0 - 8, tk.label, {
      'font-family': 'JetBrains Mono, monospace', 'font-size': 9,
      'text-anchor': 'middle', fill: t.textMuted,
    });
  }

  // Top and bottom track frames
  body += line(x0, y0, x1, y0, { stroke: t.ring, 'stroke-width': 0.8 });

  // Rows
  for (let i = 0; i < n; i++) {
    const ev = events[i]!;
    const yMid = y0 + i * rowH + rowH / 2;
    body += text(padding, yMid + 4, ev.label, {
      'font-family': 'Inter, sans-serif', 'font-size': 11, 'font-weight': 500,
      fill: t.text,
    });
    const evStart = parseDate(ev.start);
    const evEnd = parseDate(ev.end);
    const bx = x0 + ((evStart - start) / rangeMs) * trackW;
    const bw = Math.max(2, ((evEnd - evStart) / rangeMs) * trackW);
    const color = ev.color ?? aspectColor(t, ev.category ?? '', t.benefic);
    body += rect(bx, yMid - 7, bw, 14, {
      fill: color, opacity: 0.7, rx: 2, ry: 2,
    });
    if (ev.exact) {
      const exMs = parseDate(ev.exact);
      const ex = x0 + ((exMs - start) / rangeMs) * trackW;
      body += line(ex, yMid - 10, ex, yMid + 10, {
        stroke: t.text, 'stroke-width': 1.5,
      });
    }
  }

  return svg(W, H, body, { 'font-family': 'system-ui, sans-serif' }, {
    title: opts.title ?? 'Transit timeline',
    desc: `${input.events.length} events from ${input.rangeStart} to ${input.rangeEnd}.`,
  });
}

function parseDate(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y!, (m! - 1), d!);
}

function monthlyTicks(start: number, end: number): { t: number; label: string }[] {
  const out: { t: number; label: string }[] = [];
  const sd = new Date(start);
  let cur = Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), 1);
  while (cur <= end) {
    const d = new Date(cur);
    const monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()];
    out.push({ t: cur, label: `${monthShort} ${String(d.getUTCFullYear()).slice(2)}` });
    cur = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  }
  // Limit ticks to ~12 to avoid clutter
  if (out.length > 12) {
    const step = Math.ceil(out.length / 12);
    return out.filter((_, i) => i % step === 0);
  }
  return out;
}

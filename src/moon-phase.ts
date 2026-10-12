/**
 * Moon phase: circular illustration of the lunar disk's illuminated
 * fraction. Two semicircles + an ellipse sweep gives accurate phase
 * geometry (terminator is half an ellipse).
 *
 * Input: illuminationFraction 0..1, waxing boolean.
 */

import { svg, circle, path, text, resolveTheme, themedColor } from './svg-utils.ts';

export interface MoonPhaseInput {
  illuminationFraction: number; // 0 = new, 1 = full
  waxing: boolean;
  phaseName?: string;
  date?: string;
}

export interface MoonPhaseOptions {
  size?: number;
  theme?: string;
  showLabel?: boolean;
}

export function renderMoonPhase(input: MoonPhaseInput, opts: MoonPhaseOptions = {}): string {
  const size = opts.size ?? 400;
  const cx = size / 2;
  const cy = size / 2 - (opts.showLabel !== false ? 16 : 0);
  const r = size * 0.32;
  const t = resolveTheme(opts.theme);
  const showLabel = opts.showLabel !== false;

  const f = Math.max(0, Math.min(1, input.illuminationFraction));

  let body = `<rect width="${size}" height="${size}" fill="${t.bg}"/>`;

  // Dark moon disk (full circle, dark)
  body += circle(cx, cy, r, { fill: themedColor(t, 'moon-shadow', '#15151a'), stroke: t.ring, 'stroke-width': 1 });

  if (f > 0.001) {
    body += renderIlluminatedRegion(cx, cy, r, f, input.waxing, themedColor(t, 'moon-light', '#f5f5f5'));
  }

  // Outer ring on top
  body += circle(cx, cy, r, { fill: 'none', stroke: t.ring, 'stroke-width': 1.2 });

  if (showLabel) {
    const name = input.phaseName ?? phaseNameFor(f, input.waxing);
    body += text(cx, cy + r + 36, name, {
      'font-family': 'Inter, sans-serif', 'font-size': 14, 'font-weight': 600,
      'text-anchor': 'middle', fill: t.text,
    });
    body += text(cx, cy + r + 56, `${(f * 100).toFixed(1)}% illuminated`, {
      'font-family': 'JetBrains Mono, monospace', 'font-size': 11,
      'text-anchor': 'middle', fill: t.textMuted,
    });
    if (input.date) {
      body += text(cx, cy + r + 76, input.date, {
        'font-family': 'JetBrains Mono, monospace', 'font-size': 10,
        'text-anchor': 'middle', fill: t.textMuted,
      });
    }
  }

  return svg(size, size, body, { 'font-family': 'system-ui, sans-serif' }, {
    title: input.phaseName ?? 'Moon phase',
    desc: `${input.phaseName ?? 'Moon'}, ${Math.round(input.illuminationFraction * 100)}% illuminated, ${input.waxing ? 'waxing' : 'waning'}${input.date ? `, ${input.date}` : ''}.`,
  });
}

/**
 * Two-arc lit region. The terminator is half an ellipse with rx scaled
 * by |1 - 2f|. f<0.5: only the limb half is lit; f>0.5: full half + crescent
 * extending across.
 */
function renderIlluminatedRegion(cx: number, cy: number, r: number, f: number, waxing: boolean, light: string): string {
  const topY = cy - r;
  const botY = cy + r;
  const limbX = cx;
  const limbStart = `${limbX} ${topY}`;
  const limbEnd = `${limbX} ${botY}`;
  // sweep to right limb (waxing) or left (waning)
  const limbSweep = waxing ? 1 : 0;

  // Terminator: vertical ellipse with rx = r * |1 - 2f|
  // At f=0.5: rx=0, terminator = vertical line. At f=0: rx=r (eats whole disk).
  const tRx = r * Math.abs(1 - 2 * f);
  // Terminator sweep: depends on whether we're under or over half.
  // For f<0.5 (crescent): terminator curves AWAY from lit limb → opposite sweep.
  // For f>0.5 (gibbous): terminator curves TOWARD dark limb → same sweep as outer.
  const termSweep = (f > 0.5 ? limbSweep : 1 - limbSweep);

  const d = `M ${limbStart} A ${r} ${r} 0 0 ${limbSweep} ${limbEnd} A ${tRx} ${r} 0 0 ${termSweep} ${limbStart} Z`;
  return path(d, { fill: light, opacity: 0.95 });
}

function phaseNameFor(f: number, waxing: boolean): string {
  if (f < 0.02) return 'New Moon';
  if (f > 0.98) return 'Full Moon';
  if (Math.abs(f - 0.5) < 0.05) return waxing ? 'First Quarter' : 'Last Quarter';
  if (f < 0.5) return waxing ? 'Waxing Crescent' : 'Waning Crescent';
  return waxing ? 'Waxing Gibbous' : 'Waning Gibbous';
}

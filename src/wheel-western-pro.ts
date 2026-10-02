import { svg, circle, line, text, path, polarToCartesian, eclipticToWheel,
  displayBodyName, planetGlyph, SIGN_GLYPH, SIGN_NAMES } from './svg-utils.ts';
import { resolveWheelProTheme, type WheelProTheme } from './wheel-theme-data.ts';
import type { WheelInput } from './wheel-western.ts';

export interface WheelProOptions { size?: number; style?: string; showAspects?: boolean; }

export function renderWesternWheelPro(input: WheelInput, opts: WheelProOptions = {}): string {
  const size = opts.size ?? 760;
  const cx = size / 2, cy = size / 2;
  const rOuter = size * 0.475;
  const rSigns = rOuter - size * 0.05;
  const rHouses = rOuter - size * 0.10;
  const rPlanets = rOuter - size * 0.20;
  const rAspect = rOuter - size * 0.225;
  const t = resolveWheelProTheme(opts.style);
  const asc = input.houses.ascendant;
  const showAspects = opts.showAspects !== false;

  let body = '';
  body += circle(cx, cy, rOuter, { fill: t.background, stroke: t.zodiac.borderColor, 'stroke-width': 1.5 });
  body += renderZodiacRingPro(cx, cy, rOuter, rSigns, asc, t);
  body += renderHouseLayerPro(cx, cy, rSigns, rHouses, rPlanets, input.houses, asc, t);
  if (showAspects && input.aspects?.length) body += renderAspectsPro(cx, cy, rAspect, input, asc, t);
  body += circle(cx, cy, rAspect, { fill: 'none', stroke: t.innerCircleColor, 'stroke-width': 0.6, opacity: 0.5 });
  body += renderPlanetsPro(cx, cy, rPlanets, input.planets, asc, t);

  return svg(size, size, body, { 'font-family': 'system-ui, sans-serif' },
    { title: 'Natal chart wheel', desc: SIGN_NAMES.join(' ') });
}

// Annular sector spanning a 30° sign band. The zodiac progresses by rising wheel
// angle (eclipticToWheel adds longitude), which is counter-clockwise on screen,
// so the outer arc sweeps counter-clockwise (flag 0) and the inner arc back
// clockwise (flag 1); 30° < 180° → large-arc 0.
//
// These two flags were 1 and 0 while eclipticToWheel subtracted longitude. They
// were a compensation for that mirror, so fixing the projection without turning
// them over would have left every sign band drawn the long way round.
function annularSectorPath(cx: number, cy: number, rO: number, rI: number, startWheel: number, endWheel: number): string {
  const oS = polarToCartesian(cx, cy, rO, startWheel);
  const oE = polarToCartesian(cx, cy, rO, endWheel);
  const iE = polarToCartesian(cx, cy, rI, endWheel);
  const iS = polarToCartesian(cx, cy, rI, startWheel);
  return `M ${oS.x} ${oS.y} A ${rO} ${rO} 0 0 0 ${oE.x} ${oE.y} ` +
    `L ${iE.x} ${iE.y} A ${rI} ${rI} 0 0 1 ${iS.x} ${iS.y} Z`;
}

function renderZodiacRingPro(cx: number, cy: number, rOuter: number, rInner: number, asc: number, t: WheelProTheme): string {
  let out = '';
  for (let i = 0; i < 12; i++) {
    const startWheel = eclipticToWheel(i * 30, asc);
    const endWheel = eclipticToWheel(i * 30 + 30, asc);
    out += path(annularSectorPath(cx, cy, rOuter, rInner, startWheel, endWheel),
      { fill: t.zodiac.bgColors[i]!, stroke: t.zodiac.borderColor, 'stroke-width': 0.6 });
    // glyph at sign midpoint
    const wheelMid = eclipticToWheel(i * 30 + 15, asc);
    const p = polarToCartesian(cx, cy, (rOuter + rInner) / 2, wheelMid);
    out += text(p.x, p.y + 6, SIGN_GLYPH[i]!, {
      'font-size': t.zodiac.glyphFontSize, 'text-anchor': 'middle',
      fill: t.zodiac.glyphColors[i]!, 'font-variant-emoji': 'text',
    });
  }
  // 5° ticks
  for (let deg = 0; deg < 360; deg += 5) {
    if (deg % 30 === 0) continue;
    const w = eclipticToWheel(deg, asc);
    const len = deg % 10 === 0 ? 6 : 3;
    const p1 = polarToCartesian(cx, cy, rInner, w);
    const p2 = polarToCartesian(cx, cy, rInner - len, w);
    out += line(p1.x, p1.y, p2.x, p2.y, { stroke: t.zodiac.tickColor, 'stroke-width': 0.5 });
  }
  return out;
}

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
const AXIS_LABEL: Record<number, string> = { 0: 'Asc', 3: 'IC', 6: 'Dsc', 9: 'MC' };

function renderHouseLayerPro(cx: number, cy: number, rSigns: number, rHouses: number, rPlanets: number,
    h: WheelInput['houses'], asc: number, t: WheelProTheme): string {
  let out = '';
  if (t.houses.showHouseCircle) {
    out += circle(cx, cy, rHouses, { fill: 'none', stroke: t.houses.houseCircleColor, 'stroke-width': 1 });
  }
  for (let i = 0; i < 12; i++) {
    const cusp = h.cusps[i]!;
    const w = eclipticToWheel(cusp, asc);
    const isCardinal = i === 0 || i === 3 || i === 6 || i === 9;
    const p1 = polarToCartesian(cx, cy, rPlanets, w);
    const p2 = polarToCartesian(cx, cy, rSigns, w);
    const stroke = i === 0 || i === 6 ? t.houses.axisColor : (i === 3 || i === 9 ? t.houses.mcIcColor : t.houses.lineColor);
    out += line(p1.x, p1.y, p2.x, p2.y, {
      stroke, 'stroke-width': isCardinal ? t.houses.axisWidth : t.houses.lineWidth,
      'stroke-dasharray': (!isCardinal && t.houses.dashedCusps) ? '3 2' : undefined,
    });
    if (isCardinal) {
      const lp = polarToCartesian(cx, cy, rSigns + 16, w);
      out += text(lp.x, lp.y + 4, AXIS_LABEL[i]!, {
        'font-size': 10, 'font-weight': 700, 'text-anchor': 'middle', fill: stroke,
      });
      // ASC arrow (only house 1, if theme enables)
      if (i === 0 && t.houses.showArrow) {
        const tip = polarToCartesian(cx, cy, rPlanets - 6, w);
        const a = (eclipticToWheel(cusp, asc)) * Math.PI / 180;
        const bx = cx + (rPlanets + 4) * Math.cos(a), by = cy - (rPlanets + 4) * Math.sin(a);
        const perp = 4;
        const dx = -Math.sin(a) * perp, dy = -Math.cos(a) * perp;
        out += `<polygon points="${tip.x},${tip.y} ${bx + dx},${by + dy} ${bx - dx},${by - dy}" fill="${t.houses.arrowColor}"/>`;
      }
      if (i === 9) { // small MC circle
        const mp = polarToCartesian(cx, cy, rSigns, w);
        out += circle(mp.x, mp.y, 3, { fill: 'none', stroke: t.houses.mcIcColor, 'stroke-width': 1 });
      }
    }
    // house degree label outside the ring
    if (t.houses.showDegreeLabels) {
      const dp = polarToCartesian(cx, cy, rSigns + 28, w);
      const deg = Math.floor(cusp % 30);
      const signIdx = Math.floor(cusp / 30) % 12;
      out += text(dp.x, dp.y + 3, `${deg}°${SIGN_GLYPH[signIdx]!}`, {
        'font-size': 7, 'text-anchor': 'middle', fill: t.houses.labelColor, 'font-variant-emoji': 'text',
      });
    }
  }
  // house numbers near houses-ring inner edge
  for (let i = 0; i < 12; i++) {
    const c1 = h.cusps[i]!, c2 = h.cusps[(i + 1) % 12]!;
    let mid = (c1 + c2) / 2; if (c2 < c1) mid = ((c1 + c2 + 360) / 2) % 360;
    const w = eclipticToWheel(mid, asc);
    const p = polarToCartesian(cx, cy, rHouses - 14, w);
    const label = t.houses.labelStyle === 'roman' ? ROMAN[i]! : String(i + 1);
    out += text(p.x, p.y + 4, label, { 'font-size': 10, 'text-anchor': 'middle', fill: t.houses.labelColor, 'font-weight': 500 });
  }
  return out;
}

function renderAspectsPro(cx: number, cy: number, r: number, input: WheelInput, asc: number, t: WheelProTheme): string {
  const byName = new Map(input.planets.map((p) => [p.name, p]));
  let out = '';
  for (const a of input.aspects ?? []) {
    const p1 = byName.get(a.planet1), p2 = byName.get(a.planet2);
    if (!p1 || !p2) continue;
    const typeName = typeof a.type === 'string' ? a.type : a.type.name;
    const orb = typeof a.type === 'string' ? 1 : (a.type.orb ?? 1);
    const color = t.aspects.colorMap[typeName] ?? '#888';
    // tighter orb (→0) = thicker; assume max orb ~6
    const k = Math.max(0, Math.min(1, 1 - orb / 6));
    const sw = +(t.aspects.minStrokeWidth + k * (t.aspects.maxStrokeWidth - t.aspects.minStrokeWidth)).toFixed(2);
    const c1 = polarToCartesian(cx, cy, r, eclipticToWheel(p1.longitude, asc));
    const c2 = polarToCartesian(cx, cy, r, eclipticToWheel(p2.longitude, asc));
    const isApplying = (a as { isApplying?: boolean }).isApplying;
    out += line(c1.x, c1.y, c2.x, c2.y, {
      stroke: color, 'stroke-width': sw, opacity: 0.7,
      'stroke-dasharray': isApplying === false ? t.aspects.separatingDash : undefined,
    });
  }
  return out;
}

const SHOWLIST = new Set(['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','North Node','Chiron','Lilith']);

function renderPlanetsPro(cx: number, cy: number, r: number, planets: WheelInput['planets'], asc: number, t: WheelProTheme): string {
  const visible = planets.filter((p) => SHOWLIST.has(displayBodyName(p.name)));
  const sorted = [...visible].sort((a, b) => a.longitude - b.longitude);
  const radii = new Map<number, number>();
  let last = -Infinity, stack = 0;
  for (const p of sorted) { if (Math.abs(p.longitude - last) < 6) stack++; else stack = 0; radii.set(p.id, r + stack * 18); last = p.longitude; }
  let out = '';
  for (const p of visible) {
    const w = eclipticToWheel(p.longitude, asc);
    const rUse = radii.get(p.id) ?? r;
    const pos = polarToCartesian(cx, cy, rUse, w);
    const isLum = p.name === 'Sun' || p.name === 'Moon';
    out += text(pos.x, pos.y + 6, planetGlyph(p.name), {
      'font-size': isLum ? t.planets.fontSize + 4 : t.planets.fontSize,
      'text-anchor': 'middle', fill: t.planets.glyphColor, 'font-weight': 600, 'font-variant-emoji': 'text',
    });
    if (p.isRetrograde) out += text(pos.x + 12, pos.y + 6, '℞', { 'font-size': 9, fill: t.planets.retroColor, 'text-anchor': 'middle' });
    if (t.planets.showDegreeLabel) {
      const deg = Math.floor(p.longitude % 30);
      const signIdx = Math.floor(p.longitude / 30) % 12;
      out += text(pos.x, pos.y + 18, `${deg}° ${SIGN_GLYPH[signIdx]!}`, {
        'font-size': 7, 'text-anchor': 'middle', fill: t.planets.degreeLabelColor, 'font-variant-emoji': 'text',
      });
    }
    // pointer tick toward center
    const t1 = polarToCartesian(cx, cy, rUse - 12, w), t2 = polarToCartesian(cx, cy, rUse - 18, w);
    out += line(t1.x, t1.y, t2.x, t2.y, { stroke: t.planets.pointerColor, 'stroke-width': 0.6 });
  }
  return out;
}

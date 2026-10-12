/**
 * SVG generation without a DOM: every renderer returns a UTF-8 string, ready
 * for JSON, a data: URL, an <img> or a file.
 *
 * Text concatenation rather than a DOM library keeps rendering cheap,
 * dependency-free and deterministic.
 */

import { astroBodyName } from './body-names.ts';

export type Attrs = Record<string, string | number | undefined>;

const XML_ESCAPE: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
};
export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => XML_ESCAPE[c]!);
}

function attrs(a: Attrs): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(a)) {
    if (v === undefined || v === null || v === '') continue;
    parts.push(` ${k}="${typeof v === 'string' ? escapeXml(v) : v}"`);
  }
  return parts.join('');
}

// ─── Element helpers ─────────────────────────────────────────────

export interface SvgA11y {
  /** Accessible name announced by screen readers. */
  title?: string;
  /** Longer description (e.g. chart placements). */
  desc?: string;
  /** Prefix for title/desc ids: set when several SVGs share one HTML page. */
  idPrefix?: string;
}

export function svg(width: number, height: number, body: string, extra: Attrs = {}, a11y: SvgA11y = {}): string {
  const { title, desc, idPrefix = 'aw' } = a11y;
  const titleId = title ? `${idPrefix}-svg-title` : undefined;
  const descId = desc ? `${idPrefix}-svg-desc` : undefined;
  const labelledby = [titleId, descId].filter(Boolean).join(' ') || undefined;
  const a = attrs({
    xmlns: 'http://www.w3.org/2000/svg',
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    role: title || desc ? 'img' : undefined,
    'aria-labelledby': labelledby,
    ...extra,
  });
  const head =
    (title ? `<title id="${titleId}">${escapeXml(title)}</title>` : '') +
    (desc ? `<desc id="${descId}">${escapeXml(desc)}</desc>` : '');
  return roundMarkupNumbers(`<svg${a}>${head}${body}</svg>`);
}

/* Two decimals in attribute values only, text nodes untouched. Full doubles differed in
   the last digit between V8 builds (Node 22 vs Chrome 148, macOS vs Linux), so the same
   chart gave different bytes per engine; 0.01 px moves geometry invisibly, a glyph can
   snap one device pixel. Attributes holding names, URLs or free text are left alone. */
// Hex colours never match: they carry neither a dot nor "e-".
const LONG_NUMBER = /(?<![.\d])-?(?:\d+\.\d{3,}(?:e[-+]?\d+)?|\d+(?:\.\d+)?e-\d+)(?![\d.])/g;
const VERBATIM_ATTR = /^(?:id|class|style|role|href|xlink:href|font-family|data-[\w-]*|aria-[\w-]*)$/i;

export function roundMarkupNumbers(markup: string): string {
  return markup.replace(/<[^>]+>/g, (tag) =>
    tag.replace(/([\w:-]+)="([^"]*)"/g, (attr, name: string, value: string) =>
      VERBATIM_ATTR.test(name)
        ? attr
        : `${name}="${value.replace(LONG_NUMBER, (n) => String(Number(Number(n).toFixed(2))).replace(/^-0$/, '0'))}"`));
}

export function circle(cx: number, cy: number, r: number, a: Attrs = {}): string {
  return `<circle${attrs({ cx, cy, r, ...a })}/>`;
}

export function line(x1: number, y1: number, x2: number, y2: number, a: Attrs = {}): string {
  return `<line${attrs({ x1, y1, x2, y2, ...a })}/>`;
}

export function rect(x: number, y: number, w: number, h: number, a: Attrs = {}): string {
  return `<rect${attrs({ x, y, width: w, height: h, ...a })}/>`;
}

export function text(x: number, y: number, content: string, a: Attrs = {}): string {
  return `<text${attrs({ x, y, ...a })}>${escapeXml(content)}</text>`;
}

export function path(d: string, a: Attrs = {}): string {
  return `<path${attrs({ d, ...a })}/>`;
}

export function group(content: string, a: Attrs = {}): string {
  return `<g${attrs(a)}>${content}</g>`;
}

// ─── Math helpers ────────────────────────────────────────────────

export const DEG2RAD = Math.PI / 180;

/**
 * Polar → cartesian for an astrology wheel.
 * Convention: ASC sits on the left (SVG angle 180°), zodiac increases
 * counter-clockwise. Caller provides wheelAngleDeg already converted
 * via `eclipticToWheel(L, asc)`.
 */
export function polarToCartesian(cx: number, cy: number, r: number, wheelAngleDeg: number): { x: number; y: number } {
  const a = wheelAngleDeg * DEG2RAD;
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}

/** Ecliptic longitude (0..360, 0=Aries) → wheel angle (0..360, 180=ASC).
 *
 * Longitude is added, not subtracted: polarToCartesian maps a rising wheel
 * angle to counter-clockwise on screen, and the zodiac and the houses both
 * advance with rising longitude. Subtracting mirrors the chart about the
 * horizon, where ASC and DSC still look right and the MC lands at the bottom. */
export function eclipticToWheel(longitudeDeg: number, ascendantDeg: number): number {
  return ((180 + (longitudeDeg - ascendantDeg)) % 360 + 360) % 360;
}

/** Arc path command from start to end angle (sweep counter-clockwise on the wheel). */
export function arcPath(cx: number, cy: number, r: number, startWheelDeg: number, endWheelDeg: number): string {
  const s = polarToCartesian(cx, cy, r, startWheelDeg);
  const e = polarToCartesian(cx, cy, r, endWheelDeg);
  let span = endWheelDeg - startWheelDeg;
  if (span < 0) span += 360;
  const largeArc = span > 180 ? 1 : 0;
  // SVG arc sweep: 0 = counter-clockwise (which is what we want for zodiac progression
  // since y-axis is flipped, "counter-clockwise" in our math = sweep flag 0).
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 0 ${e.x} ${e.y}`;
}

// ─── Glyphs (Unicode astrological symbols) ───────────────────────

/* U+FE0E asks for the text form. Without it Chrome on macOS and iOS draw the
   zodiac signs, Venus, Mars and the Sun as colour emoji. */
const TEXT_VS = '\uFE0E';

export const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉' + TEXT_VS, Moon: '☽', Mercury: '☿', Venus: '♀' + TEXT_VS,
  Mars: '♂' + TEXT_VS, Jupiter: '♃', Saturn: '♄', Uranus: '♅',
  Neptune: '♆', Pluto: '♇',
  'North Node': '☊', 'South Node': '☋',
  Chiron: '⚷', Lilith: '⚸',
};

/* The chart endpoint returns Swiss Ephemeris labels ("true Node", "mean
   Apogee") while the table above, and every renderer's show-list, is written
   in the names an astrologer uses. Matching one against the other silently
   drops the body: a filter says no and nothing throws. Every renderer goes
   through these two functions so the translation happens in one place. */
export { astroBodyName as displayBodyName };

/* Caller-requested subset of the bodies a renderer would draw by default.
   Narrowing only: an empty or absent list means the renderer's own show-list,
   so nothing changes for a caller that does not ask. Matching happens on the
   astrological name, never the engine label, for the reason above. */
export function narrowBodies<T extends { name: string }>(
  planets: T[], bodies?: readonly string[],
): T[] {
  if (!bodies?.length) return planets;
  const allow = new Set(bodies);
  return planets.filter((p) => allow.has(astroBodyName(p.name)));
}

export function planetGlyph(rawName: string): string {
  const name = astroBodyName(rawName);
  return PLANET_GLYPH[name] ?? name[0]!;
}

export const SIGN_GLYPH: string[] = [
  '♈', '♉', '♊', '♋', '♌', '♍',
  '♎', '♏', '♐', '♑', '♒', '♓',
].map((g) => g + TEXT_VS);

export const SIGN_NAMES: string[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const ASPECT_COLOR: Record<string, string> = {
  Conjunction: '#888', Opposition: '#d24a4a', Trine: '#3b82f6',
  Square: '#d24a4a', Sextile: '#3b82f6', Quincunx: '#a855f7',
  Semisextile: '#a855f7', Semisquare: '#d24a4a', Sesquiquadrate: '#d24a4a',
  Quintile: '#22c55e', Biquintile: '#22c55e',
};

// ─── Theming ─────────────────────────────────────────────────────

export interface Theme {
  bg: string;
  ring: string;
  text: string;
  textMuted: string;
  housesFill: string;
  benefic: string;
  malefic: string;
  neutral: string;
  /** Set by the css theme: colours outside the roles above are wrapped in variables too. */
  css?: boolean;
}

/* css mode paints var(--aw-<role>, <light value>) into the presentation attribute: browsers
   resolve var() there, a page rule still beats an attribute, and with no variable set the
   output is the light theme byte for byte. Names follow @astroway/ui (kebab-case). */
const cssVar = (name: string, fallback: string): string => `var(--aw-${name}, ${fallback})`;

export const THEMES: Record<string, Theme> = {
  light: {
    bg: '#ffffff', ring: '#222', text: '#111', textMuted: '#666',
    housesFill: '#fafafa', benefic: '#3b82f6', malefic: '#d24a4a', neutral: '#888',
  },
  dark: {
    bg: '#0a0a0c', ring: '#d6d6d6', text: '#f5f5f5', textMuted: '#a0a0a0',
    housesFill: '#1a1a1d', benefic: '#7fd47f', malefic: '#ff6b6b', neutral: '#888',
  },
  console: {
    bg: '#0a0a0c', ring: '#7fd47f', text: '#f5f5f5', textMuted: '#a0a0a0',
    housesFill: '#0e0e10', benefic: '#7fd47f', malefic: '#d24a4a', neutral: '#888',
  },
};

const L = THEMES.light!;
THEMES.css = {
  bg: cssVar('chart-bg', L.bg), ring: cssVar('ring', L.ring), text: cssVar('fg', L.text), textMuted: cssVar('muted', L.textMuted),
  housesFill: cssVar('houses-fill', L.housesFill), benefic: cssVar('benefic', L.benefic), malefic: cssVar('malefic', L.malefic),
  neutral: cssVar('neutral', L.neutral), css: true,
};

export function resolveTheme(name?: string): Theme {
  return THEMES[name ?? 'light'] ?? THEMES.light!;
}

const ASPECT_ROLE: Record<string, string> = {
  Conjunction: 'aspect-neutral', Trine: 'aspect-harmonious', Sextile: 'aspect-harmonious',
  Opposition: 'aspect-tense', Square: 'aspect-tense', Semisquare: 'aspect-tense', Sesquiquadrate: 'aspect-tense',
  Quincunx: 'aspect-minor', Semisextile: 'aspect-minor', Quintile: 'aspect-quintile', Biquintile: 'aspect-quintile',
};

/** An aspect's colour in this theme; `fallback` is what the caller used for an unknown aspect. */
export function aspectColor(t: Theme, name: string, fallback: string): string {
  const c = ASPECT_COLOR[name];
  if (c === undefined) return t.css && !fallback.startsWith('var(') ? cssVar('aspect-neutral', fallback) : fallback;
  return t.css ? cssVar(ASPECT_ROLE[name] ?? 'aspect-neutral', c) : c;
}

/** A colour the renderer fixes itself (not a theme role), wrapped in a variable in css mode. */
export function themedColor(t: Theme, name: string, value: string): string {
  return t.css ? cssVar(name, value) : value;
}

/* Stable classes and data attributes for page CSS and scripts, css mode only so the default
   themes stay byte-identical. Names are added to, never renamed: see HOOK_CLASSES. */
export function hook(t: Theme, a: Attrs): Attrs {
  return t.css ? a : {};
}

/** Kebab-case body slug, the same ids the WP plugin uses: `sun`, `north-node`, `lilith`. */
export function bodySlug(rawName: string): string {
  return astroBodyName(rawName).toLowerCase().replace(/\s+/g, '-');
}

export function aspectSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

/** Caller's words for what the renderer would otherwise write in English. */
export interface BodyWords {
  /** Keyed by the astrological name: `Sun`, `North Node`, `Lilith`. */
  bodies?: Record<string, string>;
  /** Twelve names, Aries first. */
  signs?: readonly string[];
  retrograde?: string;
}

/** "Sun 24°13' Taurus", plus ", retrograde": a planet's data-label, in the caller's words when given. */
export function bodyLabel(rawName: string, longitude: number, retrograde?: boolean, words: BodyWords = {}): string {
  const lon = ((longitude % 360) + 360) % 360;
  const inSign = lon % 30;
  const deg = Math.floor(inSign);
  const min = Math.floor((inSign - deg) * 60);
  const name = astroBodyName(rawName);
  const sign = Math.floor(lon / 30);
  return `${words.bodies?.[name] ?? name} ${deg}°${String(min).padStart(2, '0')}' ${words.signs?.[sign] ?? SIGN_NAMES[sign]}`
    + (retrograde ? `, ${words.retrograde ?? 'retrograde'}` : '');
}

/** Every class a renderer may emit in css mode; `-<slug>` families listed by prefix. */
export const HOOK_CLASSES = [
  'aw-bg', 'aw-ring', 'aw-tick', 'aw-sign', 'aw-sign-*', 'aw-sign-line',
  'aw-house-cusp', 'aw-house-number', 'aw-axis', 'aw-asc', 'aw-dsc', 'aw-mc', 'aw-ic',
  'aw-planet', 'aw-planet-*', 'aw-layer-*', 'aw-glyph', 'aw-retro', 'aw-retrograde', 'aw-planet-tick',
  'aw-aspect', 'aw-aspect-*', 'aw-cross-aspect', 'aw-label', 'aw-axis-label', 'aw-layer-label', 'aw-title',
  'aw-grid-cell', 'aw-grid-header', 'aw-orb',
] as const;

/** Every data attribute a renderer may emit in css mode. */
export const HOOK_DATA_ATTRS = ['data-planet', 'data-label', 'data-a', 'data-b'] as const;

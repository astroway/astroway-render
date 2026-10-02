/**
 * Biorhythm cycle arithmetic, shared by the SVG renderer and the JSON
 * endpoint so the two cannot drift.
 *
 * Periods are Fliess 1897 (physical 23d, emotional 28d) and Swoboda 1904
 * (intellectual 33d). Value at day d since birth is sin(2π · d / period),
 * so the curve is +1 at a quarter period, 0 at every half period, and the
 * birthday itself sits on a triple zero.
 *
 * No astronomy here: pure date arithmetic and sine waves.
 */

export type BiorhythmCycleName = 'physical' | 'emotional' | 'intellectual';

export interface BiorhythmCycle {
  name: BiorhythmCycleName;
  periodDays: number;
}

export const BIORHYTHM_CYCLES: readonly BiorhythmCycle[] = [
  { name: 'physical', periodDays: 23 },
  { name: 'emotional', periodDays: 28 },
  { name: 'intellectual', periodDays: 33 },
];

export const DAY_MS = 86_400_000;

/* Slack for comparing a day boundary against an exact half-period. Days are
 * small integers and periods are small integers, so the ratios are well
 * inside double precision; 1e-9 is far above the real error and far below
 * one day of phase. */
const EPS = 1e-9;

/** Parse YYYY-MM-DD as a UTC midnight timestamp. */
export function parseUtcDate(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

/** Format a UTC timestamp back to YYYY-MM-DD. */
export function formatUtcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Whole days elapsed from birth to the given date. Negative before birth. */
export function daysSinceBirth(birthDate: string, date: string): number {
  return Math.round((parseUtcDate(date) - parseUtcDate(birthDate)) / DAY_MS);
}

/** Cycle value in [-1, 1] at a given day of life. */
export function cycleValue(dayOfLife: number, periodDays: number): number {
  return Math.sin((2 * Math.PI * dayOfLife) / periodDays);
}

/**
 * A day is critical for a cycle when the curve crosses or touches zero
 * during it, which is the classical definition rather than "the value is
 * small". Zeros sit at every half period, so day d qualifies when some
 * integer count of half periods falls inside [d, d + 1).
 *
 * Comparing signs of the endpoints instead would miss the exact-zero case:
 * sin(2π) evaluates to about -2.4e-16, never to 0.
 */
export function isCriticalDay(dayOfLife: number, periodDays: number): boolean {
  const lo = (2 * dayOfLife) / periodDays;
  const hi = (2 * (dayOfLife + 1)) / periodDays;
  return Math.ceil(lo - EPS) < hi - EPS;
}

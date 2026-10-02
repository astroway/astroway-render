/**
 * Short accessible chart summary for SVG <desc> / screen readers.
 * Reads raw chart placements (longitudes), not rendered geometry, so it works
 * for any wheel renderer and for the /chart route.
 */

import { SIGN_NAMES } from './svg-utils.ts';

interface PlacementInput {
  planets: { name: string; longitude: number }[];
  houses?: { ascendant: number };
}

function signOf(longitude: number): string {
  const norm = ((longitude % 360) + 360) % 360;
  return SIGN_NAMES[Math.floor(norm / 30)]!;
}

/** Big-three first (Sun, Moon, Ascendant), then inner planets if present. */
export function chartDescription(input: PlacementInput): string {
  const byName = new Map(input.planets.map((p) => [p.name, p.longitude]));
  const parts: string[] = [];

  const sun = byName.get('Sun');
  if (sun !== undefined) parts.push(`Sun in ${signOf(sun)}`);
  const moon = byName.get('Moon');
  if (moon !== undefined) parts.push(`Moon in ${signOf(moon)}`);
  if (input.houses) parts.push(`Ascendant in ${signOf(input.houses.ascendant)}`);

  for (const body of ['Mercury', 'Venus', 'Mars']) {
    const lon = byName.get(body);
    if (lon !== undefined) parts.push(`${body} in ${signOf(lon)}`);
  }

  return parts.join(', ') + '.';
}

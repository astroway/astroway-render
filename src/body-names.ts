/* Engine labels → the name an astrologer would write. Anything not listed
   passes through unchanged (Sun, Moon, Chiron and the planets are already
   fine). Keys are matched case-insensitively. */
const BODY_NAME_MAP: Record<string, string> = {
  'true node': 'North Node',
  'mean node': 'North Node',
  'true south node': 'South Node',
  'mean south node': 'South Node',
  'mean apogee': 'Lilith',
  'osc. apogee': 'Lilith',
  'oscu. apogee': 'Lilith',
  'intp. apogee': 'Lilith',
  'mean perigee': 'Priapus',
  'osc. perigee': 'Priapus',
  'earth': 'Earth',
};

/** Engine body label → reader-facing astrological name. */
export function astroBodyName(raw: string): string {
  return BODY_NAME_MAP[raw.trim().toLowerCase()] ?? raw;
}

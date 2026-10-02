// Imports the built package the way a consumer does and draws every renderer once.
import * as R from '../dist/index.js';

const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
  .map((name, i) => ({ id: i, name, longitude: (i * 37.123456789 + 11.987654321) % 360, isRetrograde: i === 2 }));
const houses = { cusps: Array.from({ length: 12 }, (_, i) => (i * 30 + 7.77) % 360), ascendant: 7.77, mc: 277.12 };
const chart = { planets, houses, aspects: [] };

const out = {
  wheel: R.renderWesternWheel(chart, { size: 600 }),
  pro: R.renderWesternWheelPro(chart, {}),
  vedic: R.renderVedicNorth({ planets, houses }, {}),
  grid: R.renderAspectGrid({ planets, aspects: [] }, {}),
  cosmogram: R.renderCosmogram({ planets }, {}),
  moon: R.renderMoonPhase({ illuminationFraction: 0.4, waxing: true, date: '2026-10-02' }, {}),
  timeline: R.renderTimeline({ rangeStart: '2026-01-01', rangeEnd: '2026-12-31', events: [{ label: 'A', start: '2026-02-01', end: '2026-03-01' }] }, {}),
  biorhythm: R.renderBiorhythm({ birthDate: '1990-05-15', rangeStart: '2026-10-01', rangeEnd: '2026-10-31' }, {}),
  eclipse: R.renderEclipsePath({ path: [{ latitude: 10, longitude: -120 }, { latitude: 40, longitude: -70 }] }, {}),
  stars: R.renderStarMap({ points: [{ raHours: 6.75, decDeg: -16.7, magnitude: -1.46, name: 'Sirius' }] }, {}),
};
let bad = 0;
for (const [k, svg] of Object.entries(out)) {
  const tags = (svg.match(/<[^>]+>/g) ?? []).join('');
  if (!svg.startsWith('<svg') || !svg.endsWith('</svg>') || /\d\.\d{3,}/.test(tags)) { bad++; console.error(`${k}: bad output`); }
}
console.log(bad ? `${bad} renderers failed` : `${Object.keys(out).length} renderers ok`);
process.exit(bad ? 1 : 0);

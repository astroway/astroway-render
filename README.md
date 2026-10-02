# @astroway/render

The SVG chart renderers behind the [AstroWay API](https://api.astroway.info/docs/) `/v1/render/*` endpoints, as plain functions: chart data in, an SVG string out. The API draws with this package, so a wheel you render yourself is byte for byte the wheel the API returns for the same render version.

[![npm version](https://img.shields.io/npm/v/@astroway/render.svg?style=flat&color=blue)](https://www.npmjs.com/package/@astroway/render)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

- No dependencies, no DOM, no Node APIs: runs in Node, Deno, Bun, workers and browsers.
- Same bytes on every engine: coordinates are rounded to two decimals, so Node and Chrome emit identical SVG.
- Accessible output: `role="img"` with `<title>` and `<desc>` on every chart.

## Install

```bash
npm install @astroway/render
```

## Quick start

Get a chart from the API on your server, then draw it wherever you like:

```js
import { renderWesternWheel } from '@astroway/render';

const res = await fetch('https://api.astroway.info/v1/chart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Api-Key': process.env.ASTROWAY_API_KEY },
  body: JSON.stringify({
    date: '1990-05-15', time: '14:30:00', timezoneOffset: 3,
    latitude: 50.45, longitude: 30.52,
  }),
});
const { data: chart } = await res.json();

const svg = renderWesternWheel(chart, { size: 600, theme: 'dark' });
```

`chart` is the `/v1/chart` response as it comes: `planets`, `houses` and `aspects` are the shapes the renderers read.

Each renderer is also importable on its own, for the smallest bundle:

```js
import { renderMoonPhase } from '@astroway/render/moon-phase';

const svg = renderMoonPhase({ illuminationFraction: 0.37, waxing: true, date: '2026-10-02' }, { size: 200 });
```

## Renderers

| Function | Module | API endpoint it draws |
|---|---|---|
| `renderWesternWheel` | `wheel-western` | `/v1/render/wheel-western`, `bi-wheel`, `tri-wheel`, `composite` (pass `outerLayers` for bi- and tri-wheels) |
| `renderWesternWheelPro` | `wheel-western-pro` | poster wheel, styles `editorial`, `celestial`, `classic` |
| `renderVedicNorth`, `renderVedicSouth`, `renderVedicEast` | `wheel-vedic` | `/v1/render/wheel-vedic-{north,south,east}` |
| `renderAspectGrid` | `aspect-grid` | `/v1/render/aspect-grid` |
| `renderCosmogram` | `cosmogram` | `/v1/render/cosmogram` |
| `renderMoonPhase` | `moon-phase` | `/v1/render/moon-phase` |
| `renderTimeline` | `timeline` | `/v1/render/timeline` |
| `renderBiorhythm` | `biorhythm` | `/v1/render/biorhythm` |
| `renderEclipsePath` | `eclipse-path` | `/v1/render/eclipse-path` |
| `renderStarMap` | `star-map` | `/v1/render/star-map` |

Common options: `size`, `theme` (`light`, `dark`, `console`), `title`. Wheels also take `showAspects`, `showRetrograde` and `bodies` (draw only these bodies). Types ship with the package.

## Matching the API

Every `/v1/render/*` response carries an `X-Render-Version` header with the version of this package that drew it. Pin the same version to get the same SVG.

## Browser

The package is ESM with `sideEffects: false`; any bundler tree-shakes it. The whole package is about 10 KB gzipped, a single renderer 2 to 4 KB.

## License

MIT

# Changelog

## 0.2.0

- `theme: 'css'`: every colour is painted as `var(--aw-<role>, <light colour>)` inside the presentation attribute, so the page that inlines the SVG can recolour it with CSS custom properties. With no variable set it looks exactly like `light`. Variables: `--aw-chart-bg`, `--aw-fg`, `--aw-muted`, `--aw-ring`, `--aw-houses-fill`, `--aw-benefic`, `--aw-malefic`, `--aw-aspect-harmonious`, `--aw-aspect-tense`, `--aw-aspect-neutral`, `--aw-aspect-minor`, `--aw-aspect-quintile`, `--aw-moon-shadow`, `--aw-moon-light`, `--aw-cycle-physical`, `--aw-cycle-emotional`, `--aw-cycle-intellectual`.
- In `css` mode the Western wheel (single, bi-, tri-wheel) and the aspect grid also carry stable classes and data attributes for page CSS and scripts. Names are added to, never renamed; the full list is exported as `HOOK_CLASSES` and `HOOK_DATA_ATTRS`.
  - Wheel: `aw-bg`, `aw-ring`, `aw-sign aw-sign-<sign>`, `aw-sign-line`, `aw-tick`, `aw-house-cusp`, `aw-axis aw-asc|aw-dsc|aw-mc|aw-ic`, `aw-label aw-axis-label`, `aw-house-number`, `aw-title`, `aw-layer-label`.
  - Each planet is a `<g class="aw-planet aw-planet-<slug>">` (plus `aw-retrograde`, and `aw-layer-<n>` on outer charts) with `data-planet` (`sun`, `north-node`; `b-` for the first outer chart, `c-` for the second) and `data-label` (`Sun 24°13' Taurus, retrograde`). Inside: `aw-glyph`, `aw-retro` (the ℞ mark), `aw-planet-tick`.
  - Aspect lines: `aw-aspect aw-aspect-<type>` with `data-a` and `data-b` naming both planets.
  - Aspect grid: `aw-grid-header` with `data-planet`, `aw-grid-cell` with `data-a`/`data-b`, the aspect glyph as `aw-aspect aw-aspect-<type>`, `aw-orb`.
- `OuterLayer.aspects`: aspects between the inner chart (`planet1`) and that layer (`planet2`), drawn as dashed chords inside the aspect circle. A pair with a body that is not drawn is skipped; a conjunction whose ends coincide draws a short radial tick. In `css` mode each chord is `aw-aspect aw-aspect-<type> aw-cross-aspect aw-layer-<n>` with `data-a` and `data-b` (`b-` prefix).
- `labels` on the Western wheel: your words for the `ASC`/`DSC`/`MC`/`IC` labels, the SVG `<title>` and `<desc>`, and the body names, sign names and the word for retrograde inside `data-label`. Absent keys keep the English; nothing is translated by the package.
- `light`, `dark` and `console` output is unchanged byte for byte when the new options are not used.

## 0.1.1

First public release. The renderers behind `/v1/render/*`, with SVG coordinates rounded to two decimals so every JavaScript engine emits the same bytes, and the version exposed by the API as `X-Render-Version`.

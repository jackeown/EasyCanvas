# EasyCanvas — HTML canvas the easy way

A small plotting library I made to keep setup simple in plain JavaScript, while leaving the real canvas context available for custom drawings.

**[Documentation & live examples](https://jackeown.github.io/EasyCanvas/)** · [Download the browser bundle](https://jackeown.github.io/EasyCanvas/easyCanvas.bundle.js) · [TypeScript declarations](https://jackeown.github.io/EasyCanvas/easyCanvas.d.ts)

## A plot from pure JavaScript

Load the bundle once, before your app code:

```html
<script src="https://jackeown.github.io/EasyCanvas/easyCanvas.bundle.js"></script>
```

Then create a plot from JS (run this after the body exists):

```js
const plot = document.createElement('easy-canvas');
plot.style.cssText = 'display:block; width:100%; height:360px';
document.body.appendChild(plot);

const data = { xs: [0, 1, 2, 3], ys: [1, 3, 2, 5] };
plot.drawingLoop = () => {
  plot.hotAndReady.linePlot(data, {
    title: 'My first plot', xLabel: 'Time', yLabel: 'Value'
  });
};
```

Or use `<easy-canvas id="plot" style="display:block;height:360px"></easy-canvas>` in HTML and select it from JavaScript. No framework or runtime package installation needed. Theme typography uses local browser and system font stacks.

## What’s here

- Line plots with multiple series, colors, labels, legends, tooltips, and time axes.
- Bar plots with category labels and hover highlighting.
- Mouse pan/zoom, axis-specific zoom in the margins, and two-finger touch gestures.
- Linked axes across plots using `linkInfo` and a shared object.
- Custom data coordinates, canvas helpers, hit testing, and direct access to `ctx`.
- Automatic redraws and size/resolution adjustment.


[Read the full API reference](https://jackeown.github.io/EasyCanvas/#reference) for options, defaults, and existing limitations.

## TypeScript

Download `easyCanvas.d.ts` beside your application source and use a type-only import:

```ts
import type { EasyCanvasElement, LinePlotSettings } from './easyCanvas';

const plot = document.createElement('easy-canvas'); // EasyCanvasElement
const settings: LinePlotSettings = { title: 'From TypeScript' };
plot.drawingLoop = () => {
  plot.hotAndReady.linePlot({ xs: [0, 1, 2], ys: [2, 1, 4] }, settings);
};
```

Load the browser bundle in your HTML for the runtime and give the plot a size before appending it. The declarations do not export a JavaScript constructor or change the library.

## Source & compatibility

This is the original repository, with its history preserved. The stable `master` branch contains `easyCanvas.js`, `easyCanvasHotAndReady.js`, `helpers.js`, and the browser-ready `easyCanvas.bundle.js`. The original API and script URLs remain available. Optional time-axis formatting, custom tick/tooltip callbacks, and readable date tooltips extend that API without replacing the plotting helpers.

The later [TypeScript implementation](https://github.com/jackeown/EasyCanvas/tree/typescript) and [mask experiment](https://github.com/jackeown/EasyCanvas/tree/masks) remain on their original branches. They are not merged into the stable API. The declarations on `master` describe the stable browser bundle.

## Local documentation

```sh
git clone https://github.com/jackeown/EasyCanvas.git
cd EasyCanvas
python3 -m http.server 8766
```

Open http://localhost:8766. The docs are static HTML/CSS/JS; no build needed. Each live example runs the same code shown alongside it. The previous example page is preserved at `examples/original.html`.

## Development

Node.js 22 or newer:

```sh
npm ci
npm test       # check declaration examples and documentation integrity
npm run build # rebuild the browser bundle with Browserify
```

The build is deliberately separate from documentation work. Review the bundle diff before committing a rebuild. The committed bundle remains usable without any tooling.

GitHub Pages serves the root of `master`; `.nojekyll` keeps these static files as-is.

Vercel is not needed. `vercel.json` disables automatic deployments from the old Vercel Git integration. The docs, examples, and downloadable bundle are hosted entirely on GitHub Pages.

Code highlighting is pre-rendered with Prism (MIT; see `docs/PRISM-LICENSE.txt`), so the site needs no runtime highlighting dependency. After editing a code block, run `npm run docs:highlight`. Setup lines are muted to 40% opacity; hover anywhere in the code region, including whitespace, to brighten all setup lines in that block. Keyboard focus on the code block also restores full contrast.

The homepage has classic graphs, EasyCanvas features, and custom drawings. Open a chart title to edit its source in the playground. The full documentation lives separately at `guide.html`, keeping the homepage focused on the gallery.

Gallery additions live in `docs/custom-examples.json`. The playground reads these examples directly. Run `npm run docs:highlight` after edits to regenerate their gallery script.

## Time axes and tooltips

Set `xAxisIsTime: true` (or `yAxisIsTime`) for millisecond timestamps. Optional `locale`, `timeZone` and `timeFormat` settings use `Intl.DateTimeFormat`; omitting them preserves the original automatic tick labels. `xTickFormat` and `yTickFormat` accept callbacks for arbitrary tick formatting. `tooltipFormatters` maps data column names to `(value, index) => string`; date columns on time axes get readable timestamps by default.

The interactive date demo covers milliseconds through years, locales, timezones, custom labels and resetting the view. The [API reference](https://jackeown.github.io/EasyCanvas/guide.html#reference) is grouped into collapsible, searchable sections for hotAndReady and the core canvas API.


## More charts and live editing

Use these helpers inside `drawingLoop`. The settings argument is optional.

| Helper | Smallest input |
| --- | --- |
| `histogram` | `[1, 2, 2, 3]` |
| `pieChart` / `donutChart` | `[45, 35, 20]` |
| `boxPlot` | `[1, 2, 3, 8]` or named groups |
| `scatterPlot` / `bubblePlot` | `{xs: [1, 2], ys: [3, 5]}` with optional `radii` |
| `areaPlot` | `{xs: [0, 1], ys: [2, 4]}` |
| `heatmap` | `[[1, 2], [3, 4]]` |

Open any gallery title in the [playground](https://jackeown.github.io/EasyCanvas/playground.html). Edit JavaScript, HTML, or CSS and the sandboxed preview updates after a brief pause.

Load `easyCanvasRichText.js` after the bundle for optional rich text and on-demand drawing. Call `enhanceEasyCanvas(plot, {richText})`, then `plot.requestRender()` after changes. The callback can draw the text and return true, or return false for normal canvas text. `plot.disposeRichRendering()` restores the normal drawing loop.

Pie and donut charts include legends and hover tooltips by default. Use `showLabels`, `showLegend`, and `showTooltips` to control them individually. `labelFormatter(value, index, fraction)` and `tooltipFormatter(value, index, fraction)` customize the text.

The playground has a scrolling line-number gutter. Ctrl+/ (Cmd+/ on macOS) toggles comments on the current line or selected lines, using JavaScript line comments and HTML/CSS block comments.


## Graph themes

Every graph follows the browser color preference by default. Choose a mode with `plot.theme = 'dark'`, `plot.theme = 'light'`, or `plot.theme = 'auto'`.

Override individual colors by assigning `plot.themeColors`, for example `{background: '#102b26', axes: '#8cd8c2', foreground: '#e5fff5'}`. Other keys include `border`, `muted`, `tooltipBackground`, `legendBackground`, `sliceLabel`, `palette`, `fontFamily`, `titleFontFamily`, `fontWeight`, and `titleWeight`. Assign null to reset. Existing per-chart colors and direct canvas styles continue to work.

The gallery has an EasyCanvas features section for linked plots, themes, pan/zoom, time series, and animation. The guide groups its navigation into getting started, API reference, features, and resources. Detailed date/time controls live in the guide.


Theme presets include light, dark, paper, forest, midnight, and blueprint. Set `plot.theme` from your own button or selector. The [theme demo](https://jackeown.github.io/EasyCanvas/playground.html?example=themes) shows a line chart, bar chart, and donut chart side by side, with one selector updating their default colors and fonts. `plot.availableThemes` lists all supported names, including auto.


On this website, automatic examples and playground previews follow the site theme choice. In other applications, auto continues to use the browser preference. The theme comparison selector can choose a preset independently.

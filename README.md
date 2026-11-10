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

Or use `<easy-canvas id="plot" style="display:block;height:360px"></easy-canvas>` in HTML and select it from JavaScript. No framework or runtime package installation needed. The bundle requests the Lato font from Google Fonts; plots work without it.

## What’s here

- Line plots with multiple series, colors, labels, legends, tooltips, and time axes.
- Bar plots with category labels and hover highlighting.
- Mouse pan/zoom, axis-specific zoom in the margins, and two-finger touch gestures.
- Linked axes across plots using `linkInfo` and a shared object.
- Custom data coordinates, canvas helpers, hit testing, and direct access to `ctx`.
- Automatic redraws and size/resolution adjustment.

`histogram` is an unfinished historical placeholder, not a working chart type.

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

This is the original repository, with its history preserved. The stable `master` branch contains `easyCanvas.js`, `easyCanvasHotAndReady.js`, `helpers.js`, and the browser-ready `easyCanvas.bundle.js`. The documentation refresh leaves these runtime files unchanged, keeping the old blog posts and CDN paths working.

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

Code highlighting is pre-rendered with Prism (MIT; see `docs/PRISM-LICENSE.txt`), so the site needs no runtime highlighting dependency. After editing a code block, run `npm run docs:highlight`. Setup lines are muted to 40% opacity; hover any muted line to brighten all setup lines in that block. Keyboard focus on the code block also restores full contrast.

The homepage opens with classic graphs and custom drawing experiments. Click a chart title for its highlighted code and explanation; close the dialog with Escape, the close button, or the backdrop. The full documentation lives separately at `guide.html`, keeping the homepage focused on the gallery.

Custom gallery examples live in `docs/custom-examples.json`. Run `npm run docs:highlight` after edits to generate both their executable code and highlighted modal source.

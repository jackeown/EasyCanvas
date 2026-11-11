// Run documentation examples against the real committed bundle with a tiny DOM/canvas shim.
// Checks API calls and coordinates; browser rendering still needs visual inspection.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const registry = new Map();
const elements = new Map();
let strokes = 0;
let fills = 0;
const textLabels = [];
const fillColors = [];
const coordinateMethods = new Set(['moveTo', 'lineTo', 'translate', 'rotate', 'clearRect', 'rect', 'fillRect', 'arc']);
const ctx = new Proxy({}, {
  get(target, key) {
    if (!(key in target)) target[key] = (...args) => {
      if (coordinateMethods.has(key)) for (const n of (key === 'arc' ? args.slice(0, 5) : args)) assert.ok(Number.isFinite(n), `${key}: finite coordinate, got ${n}`);
      if (key === 'fillText') textLabels.push(String(args[0]));
      if (key === 'stroke') strokes++;
      if (key === 'fill' || key === 'fillRect') { fills++; fillColors.push(target.fillStyle); }
    };
    return target[key];
  }
});
class Element {
  constructor() { this.attrs = {}; this.style = {}; }
  attachShadow() { return {appendChild() {}}; }
  setAttribute(name, value) {
    const old = this.attrs[name]; this.attrs[name] = String(value);
    if (this.constructor.observedAttributes?.includes(name)) this.attributeChangedCallback(name, old, String(value));
  }
  getAttribute(name) { return this.attrs[name] ?? null; }
  addEventListener() {}
  removeEventListener() {}
  getContext() { return ctx; }
}
const document = {
  head: {appendChild() {}}, body: {appendChild() {}},
  createElement(tag) { const C = registry.get(tag); return C ? new C() : Object.assign(new Element(), {width:300,height:150}); },
  querySelector(selector) { return elements.get(selector.slice(1)); },
  getElementById(id) { return elements.get(id); }
};
const sandbox = vm.createContext({
  console, document, HTMLElement: Element,
  customElements: {define(tag, C) { registry.set(tag, C); }},
  window: {addEventListener() {}},
  requestAnimationFrame() {}, setInterval() {},
  getComputedStyle() { return {getPropertyValue(key) { return key === 'width' ? '700px' : '340px'; }}; },
  performance: {now() { return 1000; }}
});
vm.runInContext(fs.readFileSync(path.join(root, 'easyCanvas.bundle.js'), 'utf8'), sandbox);
for (const id of ['lines','bars','linked-sine','linked-cosine','custom','animation','dates']) {
  const plot = document.createElement('easy-canvas');
  plot.debug = false;
  elements.set(id, plot);
}
const snippets = JSON.parse(fs.readFileSync(path.join(root, 'docs/snippets.json')));
for (const name of ['line','bar','linked','custom','animation','dates']) vm.runInContext(`{${snippets[name]}}`, sandbox);
for (const [id, plot] of elements) {
  const before = strokes;
  plot.fixDPI(); plot.renderPlot();
  assert.ok(strokes > before, `${id}: draws visible paths`);
  for (const key of ['xmin','xmax','ymin','ymax']) assert.ok(Number.isFinite(plot[key]), `${id}: valid ${key}`);
  assert.ok(Math.abs(plot.scaleXInverse(plot.scaleX(0.5)) - 0.5) < 1e-9);
}
const first = elements.get('linked-sine'), second = elements.get('linked-cosine');
first.mouseX = 1; first.xmin = 1; first.xmax = 3; first.renderPlot(); second.renderPlot();
assert.equal(second.xmin, 1); assert.equal(second.xmax, 3);
const custom = elements.get('custom');
custom.mouseX = 0; custom.mouseY = 0;
assert.equal(custom.mouseInCircle(0,0,0.6), true);
assert.equal(custom.mouseInRect(-1,-1,1,1), true);
custom.renderPlot();
assert.ok(fillColors.includes('#df6846'));
vm.runInContext(`{${snippets.quick.match(/<script>\n([\s\S]*?)<\/script>/)[1]}}`, sandbox);
console.log('PASS: committed bundle runs all six examples, draws finite paths, links axes, hit-tests, and runs pure-JS quick start.');

// Exercise the gallery's five independent plots against the committed bundle too.
for (const id of ['lines', 'bars', 'custom', 'animation', 'dates']) {
  const plot = document.createElement('easy-canvas');
  plot.debug = false;
  elements.set('gallery-' + id, plot);
}
document.querySelectorAll = () => [...elements.entries()].filter(([id]) => id.startsWith('gallery-')).map(([, plot]) => plot);
sandbox.matchMedia = () => ({matches: false});
const gallery = fs.readFileSync(path.join(root, 'docs/gallery.js'), 'utf8');
vm.runInContext(gallery.split('const guideSections =')[0], sandbox);
for (const [id, plot] of elements) {
  if (!id.startsWith('gallery-')) continue;
  const before = strokes;
  plot.fixDPI(); plot.renderPlot();
  assert.ok(strokes > before, `${id}: gallery draws visible finite paths`);
}
console.log('PASS: all five gallery charts draw with the committed browser bundle.');

const customExamples = JSON.parse(fs.readFileSync(path.join(root, 'docs/custom-examples.json')));
for (const [id, example] of Object.entries(customExamples)) {
  const plot = document.createElement('easy-canvas');
  plot.debug = false;
  elements.set('gallery-' + id, plot);
  vm.runInContext('{' + example.code + '}', sandbox);
  const before = strokes + fills;
  plot.fixDPI(); plot.renderPlot();
  assert.ok(strokes + fills > before, id + ': draws finite custom paths');
  plot.mouseX = 0.5; plot.mouseY = 0.2;
  plot.renderPlot();
  sandbox.matchMedia = () => ({matches: true});
  vm.runInContext('{' + example.code + '}', sandbox);
  plot.renderPlot();
  sandbox.matchMedia = () => ({matches: false});
}
console.log('PASS: gallery additions draw finite paths and handle pointer/reduced-motion inputs.');

// Render tick callbacks and formatted tooltips through the actual browser bundle.
const timePlot = document.createElement('easy-canvas');
timePlot.debug = false;
const startTime = Date.UTC(2026, 0, 1);
const timeData = {time: [startTime, startTime + 1123], value: [21, 22]};
const timeSettings = {inputs:['time'], outputs:['value'], xAxisIsTime:true, locale:'en-GB', timeZone:'UTC', tooltips:['time','value'], xTickFormat: v => 'tick-' + v, tooltipFormatters:{value: v => v.toFixed(1) + ' °C'}};
timePlot.drawingLoop = () => timePlot.hotAndReady.linePlot(timeData, timeSettings);
timePlot.fixDPI();
timePlot.mouseX = startTime + 1123; timePlot.mouseY = 22;
textLabels.length = 0;
timePlot.renderPlot();
assert.ok(textLabels.some(text => text.startsWith('tick-')), 'Custom tick formatting reaches the canvas');
assert.ok(textLabels.includes('22.0 °C'), 'Custom tooltip formatting reaches the canvas');
assert.ok(textLabels.some(text => text.includes('2026') && text.includes('00:00:01.123') && text.includes('UTC')), 'Date tooltip preserves milliseconds and timezone');
timeSettings.tooltipFormatters.time = () => 'CUSTOM DATE';
textLabels.length = 0; timePlot.renderPlot();
assert.ok(textLabels.includes('CUSTOM DATE'), 'Column formatter overrides automatic date tooltip');

const timeDemo = fs.readFileSync(path.join(root, 'docs/time-demo.js'), 'utf8');
vm.runInContext(timeDemo.split('for (const container')[0] + '\nglobalThis.setupDateDemo = setupTimeDemo;', sandbox);
const fields = Object.fromEntries(Object.entries({range:'604800000', zone:'UTC', locale:'en-GB', format:'auto', ticks:'6'}).map(([key,value]) => [key,{value}]));
let change;
const status = {textContent:''};
const controls = {
 querySelector(selector) {
  if (selector === '.time-status') return status;
  if (selector === '[data-time-reset]') return {addEventListener() {}};
  return fields[selector.match(/name="([^"]+)"/)[1]];
 },
 addEventListener(type, callback) { if (type === 'change') change = callback; }
};
sandbox.setupDateDemo(timePlot, controls);
for (const span of ['500','30000','1800000','86400000','604800000','157680000000']) {
 for (const zone of ['UTC','Europe/Vienna','America/New_York']) {
  for (const mode of ['auto','detailed','iso']) {
   fields.range.value = span; fields.zone.value = zone; fields.format.value = mode;
   change();
   assert.equal(timePlot.xmax - timePlot.xmin, Number(span));
   assert.ok(status.textContent.includes('Synthetic data'));
  }
 }
}
console.log('PASS: tick and tooltip callbacks, readable dates, and 54 time-demo configurations.');

const chart = document.createElement('easy-canvas');
chart.debug = false;
chart.fixDPI();
const bins = chart.hotAndReady.histogram([0, 1, 2, 4, 9, NaN], {bins: 2, range: [0, 4], density: true});
assert.equal(JSON.stringify(bins.map(bin => bin.count)), '[2,2]', 'The final bin includes the upper endpoint');
assert.equal(bins.reduce((sum, bin) => sum + bin.height * (bin.max - bin.min), 0), 1, 'Density integrates to one');
const values = [4, 100, 2, 1, 3];
const [summary] = chart.hotAndReady.boxPlot(values);
assert.equal(summary.q1, 2);
assert.equal(summary.median, 3);
assert.equal(summary.q3, 4);
assert.equal(summary.high, 4);
assert.equal(JSON.stringify(summary.outliers), '[100]');
assert.deepEqual(values, [4, 100, 2, 1, 3], 'Box plot does not reorder its input');
console.log('PASS: histogram boundaries and density, box quartiles and outliers.');

const pie = document.createElement('easy-canvas');
pie.debug = false;
pie.fixDPI();
const slices = {values:[45,28,17,10], labels:['Rent','Food','Travel','Other']};
const pieOptions = {showLabels:false};
pie.drawingLoop = () => pie.hotAndReady.pieChart(slices, pieOptions);
textLabels.length = 0;
pie.renderPlot();
assert.ok(textLabels.includes('Rent') && textLabels.includes('Travel'), 'Legend uses slice names');
assert.ok(!textLabels.includes('45%'), 'Slice labels can be hidden');
const width = pie.canvas.width;
const height = pie.canvas.height;
const reserved = Math.min(width * 0.45, 6 * pie.fontsize / 2 + pie.fontsize * 3.5);
const centerX = (width - reserved) / 2;
const centerY = height / 2;
const radius = Math.min(width - reserved, height) * 0.36;
pie.mouseX = pie.scaleXInverse(centerX + radius * 0.3);
pie.mouseY = pie.scaleYInverse(centerY - radius * 0.4);
textLabels.length = 0;
pie.renderPlot();
assert.ok(textLabels.includes('45.0%') && textLabels.includes('45'), 'Pie hover shows value and share');
pieOptions.tooltipFormatter = value => 'Cost ' + value;
textLabels.length = 0;
pie.renderPlot();
assert.ok(textLabels.includes('Cost 45'), 'Custom tooltip formatter is used');
pieOptions.showTooltips = false;
textLabels.length = 0;
pie.renderPlot();
assert.ok(!textLabels.includes('Cost 45'), 'Tooltips can be disabled');
pieOptions.showTooltips = true;
pie.drawingLoop = () => pie.hotAndReady.donutChart(slices, pieOptions);
pie.mouseX = pie.scaleXInverse(centerX);
pie.mouseY = pie.scaleYInverse(centerY);
textLabels.length = 0;
pie.renderPlot();
assert.ok(!textLabels.includes('Cost 45'), 'Donut center does not activate a slice');
pieOptions.showLegend = false;
textLabels.length = 0;
pie.renderPlot();
assert.ok(!textLabels.includes('Rent'), 'Legend can be disabled independently');
console.log('PASS: pie legends, optional labels and tooltips, custom tooltip text, and donut hit testing.');

const themeListeners = new Set();
const preference = {
    matches: false,
    addEventListener(type, callback) { themeListeners.add(callback); },
    removeEventListener(type, callback) { themeListeners.delete(callback); }
};
sandbox.window.matchMedia = () => preference;
const themed = document.createElement('easy-canvas');
themed.debug = false;
themed.connectedCallback();
assert.equal(themed.theme, 'auto');
assert.equal(themed.resolvedTheme, 'light');
preference.matches = true;
for (const listener of themeListeners) listener();
assert.equal(themed.resolvedTheme, 'dark');
assert.equal(themed.canvas.style.backgroundColor, themed.themeColors.background);
themed.theme = 'light';
for (const listener of themeListeners) listener();
assert.equal(themed.resolvedTheme, 'light', 'Explicit theme overrides browser preference');
themed.themeColors = {background:'#102b26', axes:'#8cd8c2', palette:['#ff1234']};
assert.equal(themed.themeColors.background, '#102b26');
assert.equal(themed.themeColors.axes, '#8cd8c2');
themed.drawingLoop = () => themed.hotAndReady.scatterPlot({xs:[1,2],ys:[3,4]});
themed.fixDPI();
assert.ok(fillColors.includes('#102b26') && fillColors.includes('#ff1234'));
themed.themeColors = null;
assert.notEqual(themed.themeColors.background, '#102b26');
themed.theme = 'auto';
assert.equal(themed.resolvedTheme, 'dark');
themed.disconnectedCallback();
assert.equal(themeListeners.size, 0, 'Detached graphs release their browser preference listener');
console.log('PASS: browser theme preference, explicit modes, color overrides, and listener cleanup.');

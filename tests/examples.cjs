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
    if (key === 'measureText') return text => ({width: String(text).length * 12});
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
  requestAnimationFrame() {}, cancelAnimationFrame() {}, setInterval() {}, clearInterval() {},
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

const originalLabel = pie.drawLabel;
const positions = [];
pie.drawLabel = function (settings) {
    if (settings.text === '45%' || settings.text === '55%') positions.push({x:settings.x, y:settings.y});
    return originalLabel.call(this, settings);
};
pie.mouseX = undefined;
pie.mouseY = undefined;
for (const innerRadius of [0.2, 0.55, 0.9, 0.95]) {
    positions.length = 0;
    pie.hotAndReady.donutChart([45,55], {innerRadius, showLegend:false});
    const outer = Math.min(pie.canvas.width, pie.canvas.height) * 0.36;
    const expected = outer * (1 + innerRadius) / 2;
    assert.equal(positions.length, 2);
    for (const label of positions) {
        const distance = Math.hypot(label.x - pie.canvas.width / 2, label.y - pie.canvas.height / 2);
        assert.ok(Math.abs(distance - expected) < 1e-8, 'Donut labels stay at the middle of the ring');
    }
}
pie.drawLabel = originalLabel;
assert.ok(!('themeToggle' in themed), 'The library does not create a theme button');
for (const name of themed.availableThemes.filter(name => name !== 'auto')) {
    themed.theme = name;
    assert.equal(themed.resolvedTheme, name);
    assert.ok(themed.themeColors.fontFamily && themed.getFont().includes(themed.themeColors.fontFamily));
}
themed.themeColors = {fontFamily:'monospace', titleFontFamily:'serif', titleWeight:700};
assert.ok(themed.getFont().includes('monospace'));
assert.ok(themed.getFont(30, 'title').includes('700 30px serif'));
console.log('PASS: named theme typography, font overrides, and donut label placement across ring widths.');


const responsive = document.createElement('easy-canvas');
responsive.debug = false;
responsive.DPIHasBeenSet = true;
responsive.drawingLoop = () => responsive.hotAndReady.linePlot({xs:[0,6,12],ys:[-1,1,0]}, {title:'Example', xLabel:'Input', yLabel:'Value'});
responsive.canvas.width = 560; responsive.canvas.height = 360;
responsive.renderPlot();
const smallFont = responsive.fontsize;
const smallTicks = responsive.layout.xTicks;
assert.ok(responsive.layout.left + responsive.layout.right < responsive.canvas.width);
assert.ok(responsive.layout.top + responsive.layout.bottom < responsive.canvas.height);
assert.ok(responsive.layout.labelSize < responsive.fontsize * 1.2);
responsive.canvas.width = 1800; responsive.canvas.height = 900;
responsive.renderPlot();
assert.ok(responsive.fontsize >= smallFont);
assert.ok(responsive.layout.xTicks >= smallTicks);
responsive.fontsize = 19;
responsive.xpadding = 9; responsive.ypadding = 12;
responsive.renderPlot();
assert.equal(responsive.fontsize, 19);
assert.equal(responsive.layout.left, responsive.canvas.width * 0.09);
assert.equal(responsive.layout.top, responsive.canvas.height * 0.12);
responsive.updateLayout({xTicks:7,yTicks:3});
assert.equal(responsive.layout.xTicks, 7);
assert.equal(responsive.layout.yTicks, 3);

const manual = document.createElement('easy-canvas');
manual.debug = false;
manual.autoLayout = manual.autoResize = manual.autoRender = false;
manual.canvas.width = 640; manual.canvas.height = 320;
manual.fontsize = 18; manual.xpadding = 8; manual.ypadding = 12;
manual.xmin = -5; manual.xmax = 5; manual.ymin = -5; manual.ymax = 5;
manual.drawingLoop = () => manual.hotAndReady.linePlot({xs:[0,1],ys:[0,1]}, {
    autoScale:false, axes:false, showLegend:false, showTitle:false, showAxisLabels:false
});
manual.renderPlot();
assert.equal(manual.DPIHasBeenSet, true, 'Manual canvases can be drawn before any automatic resize');
manual.fixDPI();
assert.equal(manual.canvas.width, 640);
assert.equal(manual.canvas.height, 320);
assert.equal(manual.fontsize, 18);
assert.equal(manual.xmin, -5);
assert.equal(manual.xmax, 5);
assert.equal(manual.layout.automatic, false);
let scheduled = 0;
sandbox.requestAnimationFrame = () => ++scheduled;
manual.renderPlotLoop();
assert.equal(scheduled, 0, 'No automatic frames when autoRender is off');
manual.autoRender = true;
assert.equal(scheduled, 1);
manual.autoRender = false;
console.log('PASS: responsive sizing, explicit overrides, fixed bounds, manual resizing and rendering.');

const navigation = document.createElement('easy-canvas');
const barData = {bars:['A','B'], heights:[2,5]};
navigation.hotAndReady.barPlot(barData);
navigation.xmin = -0.25;
navigation.xmax = 1.75;
navigation.hotAndReady.barPlot(barData);
assert.equal(navigation.xmin, -0.25, 'Bar redraw preserves panning');
assert.equal(navigation.xmax, 1.75, 'Bar redraw preserves zoom');
const ellipses = [];
navigation.ctx.ellipse = (...args) => ellipses.push(args);
navigation.hotAndReady.pieChart([1,2]);
const initial = ellipses[0];
ellipses.length = 0;
navigation.xmax = 3.75;
navigation.hotAndReady.pieChart([1,2]);
assert.ok(ellipses[0][2] < initial[2], 'Pie radius follows axis zoom');
assert.equal(ellipses[0][3], initial[3], 'Horizontal zoom preserves vertical radius');
console.log('PASS: bar navigation persists and pie geometry follows single-axis zoom.');

const areas = document.createElement('easy-canvas');
areas.debug = false;
const areaLines = [];
areas.drawLine = data => areaLines.push({xs:[...data.xs], ys:[...data.ys]});
const areaData = {xs:[0,1,2], first:[2,-3,4], second:[5,-2,-1]};
const areaOptions = {outputs:['first','second'], axes:false, showLegend:false};
areas.hotAndReady.areaPlot(areaData, {...areaOptions, stacked:true, baseline:10});
assert.deepEqual(areaLines.map(line => line.ys), [[12,7,14],[17,5,9]], 'Signed stacks accumulate separately from baseline');
assert.equal(areas.ymin, 5);
assert.equal(areas.ymax, 17);
areaLines.length = 0;
areas.hotAndReady.areaPlot(areaData, {...areaOptions, baseline:10});
assert.deepEqual(areaLines.map(line => line.ys), [[2,-3,4],[5,-2,-1]], 'Independent series keep absolute y values');
assert.equal(areas.ymin, -3);
assert.equal(areas.ymax, 10);
areaLines.length = 0;
areas.hotAndReady.areaPlot({xs:[0,1], ys:[[1,2],[3,4]]}, {stacked:true, axes:false});
assert.deepEqual(areaLines.map(line => line.ys), [[1,2],[4,6]], 'Nested y arrays support simple stacks');
areaLines.length = 0;
areas.hotAndReady.areaPlot({xs:[0,1], ys:[3,4]}, {baseline:2, axes:false});
assert.deepEqual(areaLines[0].ys, [3,4], 'Single-series values stay compatible');
areaLines.length = 0;
const separateXs = {a:[0,1], b:[2,3,4], first:[1,2], second:[3,4,5]};
areas.hotAndReady.areaPlot(separateXs, {...areaOptions, inputs:['a','b']});
assert.deepEqual(areaLines.map(line => line.xs), [[0,1],[2,3,4]], 'Independent series can have different sample coordinates');
assert.throws(() => areas.hotAndReady.areaPlot(separateXs, {...areaOptions, inputs:['a','b'], stacked:true}), /matching x/);
assert.throws(() => areas.hotAndReady.areaPlot({xs:[0,1], ys:[2]}), /equally sized/);
assert.throws(() => areas.hotAndReady.areaPlot({xs:[0], ys:[NaN]}), /finite/);
areaLines.length = 0;
areas.hotAndReady.areaPlot({xs:[], ys:[]});
assert.equal(areaLines.length, 0, 'Empty series do not draw');
console.log('PASS: single, independent and signed stacked areas, baselines, named/nested series and validation.');
const areaPath = [];
const originalMoveTo = areas.ctx.moveTo, originalLineTo = areas.ctx.lineTo;
areas.ctx.moveTo = (x,y) => areaPath.push([areas.scaleXInverse(x), areas.scaleYInverse(y)]);
areas.ctx.lineTo = areas.ctx.moveTo;
areas.hotAndReady.areaPlot({xs:[0,1], ys:[[1,2],[3,4]]}, {stacked:true, axes:false, showLegend:false});
areas.ctx.moveTo = originalMoveTo;
areas.ctx.lineTo = originalLineTo;
const secondBand = areaPath.slice(5);
assert.equal(secondBand.length, 5);
for (const [index, expected] of [[0,[0,1]], [1,[0,4]], [2,[1,6]], [3,[1,2]], [4,[0,1]]]) {
    assert.ok(Math.abs(secondBand[index][0] - expected[0]) < 1e-9);
    assert.ok(Math.abs(secondBand[index][1] - expected[1]) < 1e-9, 'Stacked fills return along the previous series, rather than the baseline');
}

// Every classic chart shows useful values by default and honors one off switch.
function checkHover(method, data, options, pointer, expected, label) {
    const plot = document.createElement('easy-canvas');
    plot.debug = false;
    plot.fixDPI();
    const settings = {...options};
    plot.drawingLoop = () => plot.hotAndReady[method](data, settings);
    plot.renderPlot();
    [plot.mouseX, plot.mouseY] = pointer;
    textLabels.length = 0;
    plot.renderPlot();
    for (const text of expected) assert.ok(textLabels.includes(text), method + ': hover contains ' + text);
    settings.showTooltips = false;
    textLabels.length = 0;
    plot.renderPlot();
    assert.ok(!textLabels.includes(label), method + ': showTooltips=false hides tooltip');
    settings.showTooltips = true;
    plot.mouseX = plot.mouseY = undefined;
    textLabels.length = 0;
    plot.renderPlot();
    assert.ok(!textLabels.includes(label), method + ': pointer exit clears tooltip');
    assert.ok(plot.hotAndReadyEventListeners.tooltips, method + ': static plots redraw on hover');
    return {plot, settings};
}
checkHover('linePlot', {xs:[0,1,2], ys:[0,3,0]}, {}, [1,3], ['ys: ', '3.000'], 'ys: ');
checkHover('linePlot', {a:[0,2], b:[0,1,2], one:[0,1], two:[0,3,0]},
    {inputs:['a','b'],outputs:['one','two']}, [1,3], ['b: ', 'two: ', '3.000'], 'two: ');
const barHover = checkHover('barPlot', {bars:['Cake','Pie'], heights:[10,20]}, {}, [1/3,5], ['Category: ', 'Cake', 'Value: ', '10'], 'Category: ');
barHover.settings.tooltipFormatters = {Value:(value,index) => `Sold ${value} from bar ${index}`};
barHover.plot.mouseX=1/3; barHover.plot.mouseY=5; textLabels.length=0; barHover.plot.renderPlot();
assert.ok(textLabels.includes('Sold 10 from bar 0'), 'Field formatters receive the value and original item index');
checkHover('histogram', [0,0.2,0.8,1], {range:[0,1],bins:2,density:true}, [0.25,0.5],
    ['Bin start: ', 'Bin end: ', 'Count: ', '2', 'Density: ', '1'], 'Count: ');
checkHover('boxPlot', {A:[1,2,3,4,5,30]}, {}, [1,3],
    ['Group: ', 'A', 'Median: ', '3.5', 'Q1: ', '2.25', 'Lower whisker: ', 'Upper whisker: '], 'Median: ');
checkHover('boxPlot', {A:[1,2,3,4,5,30]}, {}, [1,30], ['Outlier: ', '30'], 'Outlier: ');
const scatterHover = checkHover('scatterPlot', {xs:[0,1,2],ys:[0,3,0]}, {}, [1,3], ['X: ', 'Y: ', '3'], 'X: ');
scatterHover.plot.mouseX=0.5;scatterHover.plot.mouseY=1; textLabels.length=0;scatterHover.plot.renderPlot();
assert.ok(!textLabels.includes('X: '), 'Scatter background does not trigger a tooltip');
checkHover('bubblePlot', {xs:[0,1,2],ys:[0,2,4],radii:[4,20,4]}, {}, [1,2], ['Radius: ', '20'], 'Radius: ');
checkHover('areaPlot', {xs:[0,1],first:[2,4],second:[3,5]}, {outputs:['first','second'],stacked:true}, [0.5,4],
    ['Series: ', 'second', 'Y: ', '5', 'Bottom: ', '4', 'Top: ', '9'], 'Series: ');
checkHover('areaPlot', {xs:[0,1],ys:[[2,4],[3,5]]}, {}, [0.5,2], ['Series: ', 'Series 2'], 'Series: ');
const heatHover = checkHover('heatmap', [[1,null],[3,4]], {}, [0.5,1.5], ['Row: ', '0', 'Column: ', 'Value: ', '1'], 'Column: ');
heatHover.plot.mouseX=1.5;heatHover.plot.mouseY=1.5;textLabels.length=0;heatHover.plot.renderPlot();
assert.ok(!textLabels.includes('Value: '), 'Missing heatmap cells have no tooltip');
heatHover.plot.mouseX=0.5;heatHover.plot.mouseY=0.5;textLabels.length=0;heatHover.plot.renderPlot();
assert.ok(textLabels.includes('3'), 'Heatmap lookup respects top-to-bottom row order');
console.log('PASS: all classic tooltip defaults, opt-outs, field formatting, signed stacks, outliers and missing cells.');
checkHover('linePlot', {xs:[0,2],ys:[0,4]}, {}, [1,2], ['ys: ', '4.000'], 'ys: ');
checkHover('boxPlot', {A:[1,2,3,4,5,30]}, {}, [1.2,5], ['Upper whisker: ', '5'], 'Upper whisker: ');
checkHover('areaPlot', {xs:[0,1],ys:[[-2,-4],[-3,-5]]}, {stacked:true}, [0.5,-4],
    ['Series: ', 'Series 2', 'Y: ', '-5', 'Bottom: ', '-4', 'Top: ', '-9'], 'Series: ');
const noLineTips = checkHover('linePlot', {xs:[0,1],ys:[2,3]}, {}, [1,3], ['ys: '], 'ys: ');
noLineTips.settings.tooltips=[];noLineTips.plot.mouseX=1;noLineTips.plot.mouseY=3;
textLabels.length=0;noLineTips.plot.renderPlot();
assert.ok(!textLabels.includes('ys: '), 'Legacy empty tooltips array still disables line hover');
console.log('PASS: sparse line segments, whisker caps, negative stack values and legacy opt-outs.');

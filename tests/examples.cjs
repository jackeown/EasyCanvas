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
const coordinateMethods = new Set(['moveTo', 'lineTo', 'translate', 'rotate', 'clearRect', 'rect']);
const ctx = new Proxy({}, {
  get(target, key) {
    if (!(key in target)) target[key] = (...args) => {
      if (coordinateMethods.has(key)) for (const n of args) assert.ok(Number.isFinite(n), `${key}: finite coordinate, got ${n}`);
      if (key === 'stroke') strokes++;
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
assert.equal(custom.ctx.fillStyle, '#df6846');
vm.runInContext(`{${snippets.quick.match(/<script>\n([\s\S]*?)<\/script>/)[1]}}`, sandbox);
console.log('PASS: committed bundle runs all six examples, draws finite paths, links axes, hit-tests, and runs pure-JS quick start.');

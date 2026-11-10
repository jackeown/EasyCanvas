const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const site = fs.readFileSync(path.join(root, 'docs/site.js'), 'utf8');
const snippets = JSON.parse(fs.readFileSync(path.join(root, 'docs/snippets.json')));
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'No duplicate DOM IDs');
for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  if (href.startsWith('#')) {
    if (href.length > 1) assert.ok(ids.includes(href.slice(1)), `Anchor ${href} resolves`);
  } else if (!/^https?:/.test(href)) assert.ok(fs.existsSync(path.join(root, href)), `Asset ${href} exists`);
}
for (const key of ['line', 'bar', 'linked', 'custom', 'animation', 'dates']) {
  assert.ok(site.includes(snippets[key]), `${key}: displayed code is the executed code`);
  new vm.Script(snippets[key]);
}
new vm.Script(site);
assert.ok(html.includes('does not bin or draw data'), 'Histogram placeholder documented');
console.log('PASS: local links, unique IDs, exact executable examples, script syntax, histogram status.');

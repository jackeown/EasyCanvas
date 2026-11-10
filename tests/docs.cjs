const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'guide.html'), 'utf8');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const site = fs.readFileSync(path.join(root, 'docs/site.js'), 'utf8');
const snippets = JSON.parse(fs.readFileSync(path.join(root, 'docs/snippets.json')));
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'No duplicate DOM IDs');
for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  if (href.startsWith('#')) {
    if (href.length > 1) assert.ok(ids.includes(href.slice(1)), `Anchor ${href} resolves`);
  } else if (!/^https?:/.test(href)) assert.ok(fs.existsSync(path.join(root, href.split('#')[0])), `Asset ${href} exists`);
}
for (const key of ['line', 'bar', 'linked', 'custom', 'animation', 'dates']) {
  assert.ok(site.includes(snippets[key]), `${key}: displayed code is the executed code`);
  new vm.Script(snippets[key]);
}
new vm.Script(site);
assert.ok(html.includes('does not bin or draw data'), 'Histogram placeholder documented');
console.log('PASS: local links, unique IDs, exact executable examples, script syntax, histogram status.');

// Highlighting must preserve the exact source users copy, including HTML wrappers.
const sourceBlocks = [...html.matchAll(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)].map(([, body]) =>
  body.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#x27|#39);/g, (_, key) =>
    ({amp: '&', lt: '<', gt: '>', quot: '"', '#x27': "'", '#39': "'"})[key]));
const snippetNames = ['quick', 'line', 'bar', 'linked', 'custom', 'animation', 'update', 'dates', 'typescript'];
for (const [index, name] of snippetNames.entries()) assert.equal(sourceBlocks[index], snippets[name], `${name}: copyable source preserved`);
const blocks = [...html.matchAll(/<pre([^>]*)><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g)];
assert.equal(blocks.length, 10);
for (const [, pre, code, content] of blocks) {
  assert.match(pre, /language-(html|javascript|typescript|bash)/);
  assert.match(code, /language-(html|javascript|typescript|bash)/);
  assert.match(content, /class="token /, 'Every block has highlighted tokens');
}
assert.ok(html.includes('James McKeown'), 'Developer credit is present');
console.log('PASS: every code block highlighted; complete copyable examples preserved.');

new vm.Script(fs.readFileSync(path.join(root, 'docs/gallery.js'), 'utf8'));
assert.equal((home.match(/class="gallery-title"/g) || []).length, 9);
assert.ok(!home.includes('id="start"'), 'No repeated guide below the gallery');
assert.ok(!home.includes('docs/site.js'), 'Homepage does not initialize duplicate guide plots');
assert.ok(!html.includes('docs/gallery.js'), 'Guide does not initialize homepage plots');
assert.match(home, /<dialog id="example-dialog" aria-labelledby="example-title"/);
assert.match(html, /href="https:\/\/github.com\/mckeown12">James McKeown/);
console.log('PASS: gallery navigation, modal accessibility, and linked developer credit.');

for (const [filename, page] of [['index.html', home], ['guide.html', html]]) {
  const pageIds = [...page.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(pageIds).size, pageIds.length, filename + ': unique IDs');
  for (const [, href] of page.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^https?:/.test(href)) continue;
    const [relative, hash] = href.split('#');
    const target = relative ? path.join(root, relative === './' ? 'index.html' : relative) : path.join(root, filename);
    assert.ok(fs.existsSync(target), filename + ': linked asset exists: ' + href);
    if (hash) {
      const targetHtml = fs.readFileSync(target, 'utf8');
      assert.ok(targetHtml.includes('id="' + hash + '"'), filename + ': linked section exists: ' + href);
    }
  }
}
console.log('PASS: separate homepage/guide assets and cross-page links.');

assert.ok(home.includes('id="classic-graphs"') && home.includes('id="custom-examples"'));
const custom = JSON.parse(fs.readFileSync(path.join(root, 'docs/custom-examples.json')));
const generated = fs.readFileSync(path.join(root, 'docs/custom-examples.js'), 'utf8');
new vm.Script(generated);
for (const [id, example] of Object.entries(custom)) {
  assert.ok(generated.includes(example.code), id + ': shown source is executable source');
  assert.ok(home.includes('id="gallery-' + id + '"'), id + ': gallery element exists');
}
console.log('PASS: custom gallery code and modal source share one definition.');

// Pre-rendered highlighting: the published docs need no highlighter or CDN at runtime.
const fs = require('node:fs');
const path = require('node:path');
const Prism = require('prismjs');
require('prismjs/components/prism-typescript');
require('prismjs/components/prism-bash');
const root = path.resolve(__dirname, '..');
const configs = [
  { language: 'html', muted: [[1, 10], [19, 21]] },
  { language: 'javascript', muted: [[8, 8]] },
  { language: 'javascript', muted: [[1, 1]] },
  { language: 'javascript', muted: [[3, 7]] },
  { language: 'javascript', muted: [[1, 5]] },
  { language: 'javascript', muted: [[1, 6]] },
  { language: 'javascript', muted: [] },
  { language: 'javascript', muted: [[1, 1]] },
  { language: 'typescript', muted: [[1, 7], [16, 17]] },
  { language: 'bash', muted: [] }
];
const entities = {amp: '&', lt: '<', gt: '>', quot: '"', '#x27': "'", '#39': "'", '#039': "'"};
function decode(content) {
  return content.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#x27|#39|#039);/g, (_, key) => entities[key]);
}
// Prism tokens can span multiple lines (HTML script tags, comments, templates).
// Balance nested token spans on each line without changing a single source character.
function renderLines(highlighted, muted) {
  const open = [];
  return highlighted.split('\n').map((line, i) => {
    const prefix = open.join('');
    for (const match of line.matchAll(/<span\b[^>]*>|<\/span>/g)) {
      if (match[0] === '</span>') open.pop(); else open.push(match[0]);
    }
    const dim = muted.some(([a, b]) => i + 1 >= a && i + 1 <= b);
    return `<span class="code-line${dim ? ' code-context' : ''}">${prefix}${line}${'</span>'.repeat(open.length)}</span>`;
  }).join('\n');
}
let index = 0;
const file = path.join(root, 'guide.html');
let html = fs.readFileSync(file, 'utf8').replace(/<pre(?:\s[^>]*)?><code(?:\s[^>]*)?>([\s\S]*?)<\/code><\/pre>/g, (_, content) => {
  const config = configs[index++];
  if (!config) throw new Error('Every code block needs explicit language and focus metadata');
  const source = decode(content);
  const highlighted = Prism.highlight(source, Prism.languages[config.language], config.language);
  return `<pre class="language-${config.language}" tabindex="0"><code class="language-${config.language}">${renderLines(highlighted, config.muted)}</code></pre>`;
});
if (index !== configs.length) throw new Error('Code block count changed; update highlighting metadata');
fs.writeFileSync(file, html);

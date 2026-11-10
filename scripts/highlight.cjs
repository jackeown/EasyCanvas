// Pre-rendered highlighting: the published docs need no highlighter or CDN at runtime.
const fs = require('node:fs');
const path = require('node:path');
const {decode, highlightCode} = require('./code-format.cjs');
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
let index = 0;
const file = path.join(root, 'guide.html');
let html = fs.readFileSync(file, 'utf8').replace(/<pre(?:\s[^>]*)?><code(?:\s[^>]*)?>([\s\S]*?)<\/code><\/pre>/g, (_, content) => {
  const config = configs[index++];
  if (!config) throw new Error('Every code block needs explicit language and focus metadata');
  const source = decode(content);
  return highlightCode(source, config.language, config.muted);
});
if (index !== configs.length) throw new Error('Code block count changed; update highlighting metadata');
fs.writeFileSync(file, html);

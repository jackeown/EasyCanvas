const Prism = require('prismjs');
require('prismjs/components/prism-typescript');
require('prismjs/components/prism-bash');
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
function highlightCode(source, language, muted = []) {
  return `<pre class="language-${language}" tabindex="0"><code class="language-${language}">${renderLines(Prism.highlight(source, Prism.languages[language], language), muted)}</code></pre>`;
}
const apiGrammar = {...Prism.languages.javascript, 'api-name': /[$A-Za-z_][$\w]*/};
function highlightInline(source) {
  let grammar = apiGrammar;
  let language = 'javascript';
  if (/^<\/?[a-z]/i.test(source)) {
    language = 'markup';
    grammar = Prism.languages.markup;
  } else if (/^(npm|git|node|python3?)\s/.test(source)) {
    language = 'bash';
    grammar = Prism.languages.bash;
  }
  return `<code class="inline-code language-${language}">${Prism.highlight(source, grammar, language)}</code>`;
}
module.exports = {decode, highlightCode, highlightInline};

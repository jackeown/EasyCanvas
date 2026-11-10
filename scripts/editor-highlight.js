const Prism = require('prismjs');

Prism.manual = true;
const editor = document.querySelector('#editor');
const language = document.querySelector('#editor-language');
const surface = editor.closest('.editor-surface');
const overlay = surface.querySelector('pre');
const code = overlay.querySelector('code');
const grammars = {js: 'javascript', html: 'markup', css: 'css'};

function syncScroll() {
    overlay.scrollTop = editor.scrollTop;
    overlay.scrollLeft = editor.scrollLeft;
}

function syncSize() {
    overlay.style.width = editor.clientWidth + 'px';
    overlay.style.height = editor.clientHeight + 'px';
    syncScroll();
}

function highlight() {
    const syntax = grammars[language.value];
    code.innerHTML = Prism.highlight(editor.value, Prism.languages[syntax], syntax) + '\n';
    syncSize();
}

editor.addEventListener('input', highlight);
editor.addEventListener('editor-source-change', highlight);
editor.addEventListener('scroll', syncScroll, {passive: true});
new ResizeObserver(syncSize).observe(editor);
highlight();
surface.classList.add('is-highlighted');

const Prism = require('prismjs');
const toggleComments = require('./editor-comments.cjs');

Prism.manual = true;
const editor = document.querySelector('#editor');
const language = document.querySelector('#editor-language');
const surface = editor.closest('.editor-surface');
const overlay = surface.querySelector('pre');
const code = overlay.querySelector('code');
const gutter = surface.querySelector('.editor-gutter');
const lineNumbers = gutter.querySelector('div');
const grammars = {js: 'javascript', html: 'markup', css: 'css'};

function syncScroll() {
    overlay.scrollTop = editor.scrollTop;
    overlay.scrollLeft = editor.scrollLeft;
    gutter.scrollTop = editor.scrollTop;
}

function syncSize() {
    overlay.style.width = editor.clientWidth + 'px';
    overlay.style.height = editor.clientHeight + 'px';
    gutter.style.height = editor.clientHeight + 'px';
    syncScroll();
}

function highlight() {
    const count = editor.value.split('\n').length;
    lineNumbers.textContent = Array.from({length: count}, (_, index) => index + 1).join('\n') + '\n';
    surface.style.setProperty('--gutter-width', Math.max(3, String(count).length) + 2 + 'ch');
    const syntax = grammars[language.value];
    code.innerHTML = Prism.highlight(editor.value, Prism.languages[syntax], syntax) + '\n';
    syncSize();
}

editor.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key !== '/') return;
    event.preventDefault();
    const scrollTop = editor.scrollTop;
    const scrollLeft = editor.scrollLeft;
    const selectionDirection = editor.selectionDirection;
    const change = toggleComments(editor.value, editor.selectionStart, editor.selectionEnd, language.value);
    editor.setRangeText(change.replacement, change.first, change.last, 'preserve');
    editor.setSelectionRange(change.start, change.end, selectionDirection);
    editor.scrollTop = scrollTop;
    editor.scrollLeft = scrollLeft;
    editor.dispatchEvent(new Event('input', {bubbles: true}));
});
editor.addEventListener('input', highlight);
editor.addEventListener('editor-source-change', highlight);
editor.addEventListener('scroll', syncScroll, {passive: true});
new ResizeObserver(syncSize).observe(editor);
highlight();
surface.classList.add('is-highlighted');

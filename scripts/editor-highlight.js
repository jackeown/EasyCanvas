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

// Keep edits, including programmatic comment toggles, in one history per language.
const histories = new Map();
let restoring = false;
let pending;
const snapshot = () => ({value: editor.value, start: editor.selectionStart, end: editor.selectionEnd});
function history() {
    if (!histories.has(language.value)) histories.set(language.value, {undo: [], redo: [], current: snapshot()});
    return histories.get(language.value);
}
function travel(redo = false) {
    const state = history();
    const from = redo ? state.redo : state.undo;
    const to = redo ? state.undo : state.redo;
    if (!from.length) return;
    to.push(snapshot());
    const saved = from.pop();
    restoring = true;
    editor.value = saved.value;
    editor.setSelectionRange(saved.start, saved.end);
    state.current = snapshot();
    editor.dispatchEvent(new Event('input', {bubbles: true}));
    restoring = false;
    pending = undefined;
}
editor.addEventListener('beforeinput', event => {
    if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
        event.preventDefault();
        travel(event.inputType === 'historyRedo');
    } else pending = snapshot();
});
editor.addEventListener('copy', event => {
    if (editor.selectionStart !== editor.selectionEnd) return;
    const position = editor.selectionStart;
    const first = editor.value.lastIndexOf('\n', position - 1) + 1;
    const next = editor.value.indexOf('\n', position);
    event.clipboardData.setData('text/plain', editor.value.slice(first, next < 0 ? editor.value.length : next) + '\n');
    event.preventDefault();
});
editor.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y') {
        event.preventDefault();
        travel(event.shiftKey || event.key.toLowerCase() === 'y');
        return;
    }
    if (event.key !== '/') return;
    event.preventDefault();
    pending = snapshot();
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
editor.addEventListener('input', () => {
    const state = history();
    if (!restoring && state.current.value !== editor.value) {
        state.undo.push(pending ?? state.current);
        state.redo = [];
        state.current = snapshot();
    }
    pending = undefined;
    highlight();
});
editor.addEventListener('editor-source-change', event => {
    if (event.detail?.resetHistory) histories.clear();
    history();
    pending = undefined;
    highlight();
});
editor.addEventListener('scroll', syncScroll, {passive: true});
new ResizeObserver(syncSize).observe(editor);
history();
highlight();
surface.classList.add('is-highlighted');

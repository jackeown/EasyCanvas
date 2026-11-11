const assert = require('node:assert/strict');
const toggle = require('../scripts/editor-comments.cjs');
function apply(value, start, end, language) {
    const change = toggle(value, start, end, language);
    return {...change, value: value.slice(0, change.first) + change.replacement + value.slice(change.last)};
}
for (const language of ['js', 'html', 'css']) {
    for (const value of ['one\ntwo', '  one\n\ttwo', '', '   ', '\nnext', 'one\r\ntwo']) {
        const added = apply(value, 0, value.length, language);
        const removed = apply(added.value, added.start, added.end, language);
        assert.equal(removed.value, value, language + ': round trip ' + JSON.stringify(value));
    }
}
assert.equal(apply('one\ntwo\nthree', 0, 4, 'js').value, '// one\ntwo\nthree', 'Exclude the line starting at the selection end');
assert.equal(apply('one\ntwo', 5, 5, 'js').value, 'one\n// two', 'Comment the current line');
assert.equal(apply('\nnext', 0, 0, 'js').value, '// \nnext', 'Comment an empty first line');
assert.equal(apply('/* */', 0, 5, 'css').value, '', 'Unwrap an empty block comment');
assert.equal(apply('<!-- -->', 0, 8, 'html').value, '', 'Unwrap an empty HTML comment');
console.log('PASS: comment toggling, indentation, empty lines, CRLF and selection boundaries.');

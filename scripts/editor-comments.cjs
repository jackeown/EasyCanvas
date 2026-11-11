// Work on complete lines. A selection ending at the next line's start excludes that line.
module.exports = function toggleComments(value, start, end, language) {
    const first = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
    const lastPosition = end > start ? end - 1 : end;
    const newline = value.indexOf('\n', lastPosition);
    const last = newline < 0 ? value.length : newline;
    const block = value.slice(first, last);
    const edits = [];

    if (language === 'js') {
        const lines = block.split('\n');
        const nonempty = lines.filter(line => line.trim());
        const remove = nonempty.length > 0 && nonempty.every(line => /^\s*\/\//.test(line));
        let position = first;
        for (const line of lines) {
            if (line.trim() || lines.length === 1) {
                const indentation = line.match(/^[\t ]*/)[0].length;
                const marker = line.slice(indentation).match(/^\/\/ ?/);
                edits.push({
                    start: position + indentation,
                    length: remove ? marker?.[0].length ?? 0 : 0,
                    text: remove ? '' : '// '
                });
            }
            position += line.length + 1;
        }
    } else {
        const [open, close] = language === 'html' ? ['<!--', '-->'] : ['/*', '*/'];
        const indentation = block.match(/^[\t ]*/)[0].length;
        const trailing = block.match(/\s*$/)[0].length;
        const contentEnd = Math.max(indentation, block.length - trailing);
        const content = block.slice(indentation, contentEnd);
        if (content.startsWith(open) && content.endsWith(close)) {
            const leadingSpace = content[open.length] === ' ' ? 1 : 0;
            const trailingSpace = content.length > open.length + close.length + leadingSpace && content[content.length - close.length - 1] === ' ' ? 1 : 0;
            edits.push({start: first + indentation, length: open.length + leadingSpace, text: ''});
            edits.push({start: first + contentEnd - close.length - trailingSpace, length: close.length + trailingSpace, text: ''});
        } else {
            edits.push({start: first + indentation, length: 0, text: open + ' '});
            edits.push({start: first + contentEnd, length: 0, text: ' ' + close});
        }
    }

    function move(position) {
        let delta = 0;
        for (const edit of edits) {
            if (position < edit.start) break;
            if (position < edit.start + edit.length) return edit.start + delta + edit.text.length;
            delta += edit.text.length - edit.length;
        }
        return position + delta;
    }

    let replacement = block;
    for (const edit of [...edits].reverse()) {
        const offset = edit.start - first;
        replacement = replacement.slice(0, offset) + edit.text + replacement.slice(offset + edit.length);
    }
    return {first, last, replacement, start: move(start), end: move(end)};
};

(() => {
    const preset = document.querySelector('#preset');
    const language = document.querySelector('#editor-language');
    const editor = document.querySelector('#editor');
    const preview = document.querySelector('#preview');
    const status = document.querySelector('#preview-status');
    const autoRun = document.querySelector('#auto-run');
    const runButton = document.querySelector('#run');
    const resetButton = document.querySelector('#reset');
    const description = document.querySelector('#preset-description');
    let examples;
    let source;
    let timer;
    let runId = 0;
    let reportedError = false;
    let runtime;
    const encode = value => JSON.stringify(value).replaceAll('<', '\\u003c');

    function run() {
        clearTimeout(timer);
        if (!source) return;
        const id = ++runId;
        reportedError = false;
        status.textContent = 'Running…';
        preview.srcdoc = `<!doctype html><html lang="en" data-theme="${document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'}"><head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:">
          <script>
            const report = (state, message) => parent.postMessage({easyCanvasPreview: ${id}, state, message}, '*');
            addEventListener('error', event => {
              if (event.message) report('error', event.message);
              else if (event.target.tagName === 'SCRIPT') report('error', 'A script could not load.');
            }, true);
            addEventListener('unhandledrejection', event => report('error', String(event.reason)));
            const logError = console.error.bind(console);
            console.error = (...args) => {
              report('error', args.map(value => value?.message || String(value)).join(' '));
              logError(...args);
            };
            addEventListener('message', event => {
              if (event.source === parent && ['light', 'dark'].includes(event.data?.easyCanvasSiteTheme)) {
                document.documentElement.dataset.theme = event.data.easyCanvasSiteTheme;
              }
            });
            new Function(${encode(runtime)})();
          </script>
          <style>
            html { background: #fff; color: #20272c; }
            html[data-theme="dark"] { background: #151921; color: #e4e9f2; color-scheme: dark; }
            ${source.css}
          </style>
          </head><body>${source.html}
          <script>
            try {
              if (!customElements.get('easy-canvas')) throw new Error('EasyCanvas could not load.');
              new Function(${encode(source.js)})();
              report('ready', 'Preview updated');
            } catch (error) { report('error', error.message); }
          </script></body></html>`;
    }

    function loadPreset() {
        const example = examples[preset.value];
        const id = example.element;
        const code = example.code;
        source = {
            js: code,
            html: example.html ?? '<easy-canvas id="' + id + '"></easy-canvas>',
            css: example.css ?? 'body { margin: 12px; }\neasy-canvas { display: block; width: 100%; height: 370px; }'
        };
        description.textContent = example.description;
        editor.value = source[language.value];
        editor.dispatchEvent(new CustomEvent('editor-source-change', {detail: {resetHistory: true}}));
        const url = new URL(location.href);
        url.searchParams.set('example', preset.value);
        history.replaceState(null, '', url);
        run();
    }

    addEventListener('message', event => {
        if (event.source !== preview.contentWindow || event.data?.easyCanvasPreview !== runId) return;
        if (event.data.state === 'error') {
            reportedError = true;
            status.textContent = 'Error: ' + String(event.data.message);
        } else if (!reportedError) status.textContent = 'Preview updated';
    });
    language.addEventListener('change', () => {
        if (!source) return;
        editor.value = source[language.value];
        editor.dispatchEvent(new Event('editor-source-change'));
        editor.setAttribute('aria-label', language.selectedOptions[0].textContent + ' source');
    });
    editor.addEventListener('input', () => {
        if (!source) return;
        source[language.value] = editor.value;
        clearTimeout(timer);
        if (autoRun.checked) timer = setTimeout(run, 400);
        else status.textContent = 'Changes ready. Click Run.';
    });
    editor.addEventListener('keydown', event => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            run();
        }
    });
    autoRun.addEventListener('change', () => {
        clearTimeout(timer);
        if (autoRun.checked) run();
    });
    preset.addEventListener('change', loadPreset);
    resetButton.addEventListener('click', loadPreset);
    runButton.addEventListener('click', run);

    new MutationObserver(() => {
        preview.contentWindow?.postMessage({easyCanvasSiteTheme: document.documentElement.dataset.theme}, '*');
    }).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});

    async function load(url, type) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Could not load examples');
        return response[type]();
    }

    Promise.all([
        load('docs/snippets.json', 'json'),
        load('docs/custom-examples.json', 'json'),
        load('docs/feature-examples.json', 'json'),
        load('easyCanvas.bundle.js', 'text'),
        load('easyCanvasRichText.js', 'text'),
        load('docs/chart-site-theme.js', 'text')
    ]).then(([snippets, extra, features, library, addon, siteTheme]) => {
        runtime = library + '\n' + addon + '\n' + siteTheme;
        const originals = {
            lines: ['line', 'Line plot', 'Compare two series with the same x coordinates.'],
            bars: ['bar', 'Bar chart', 'Plot named categories and values.'],
            dates: ['dates', 'Time series', 'Change the timezone, locale, or tick formatter.'],
            custom: ['custom', 'Hover drawing', 'Draw a circle and use mouseInCircle to change its fill.'],
            animation: ['animation', 'Animated wave', 'Draw a wave on every frame.']
        };
        examples = Object.fromEntries(Object.entries(originals).map(([id, [key, title, description]]) =>
            [id, {title, description, code: snippets[key], element: id}]));
        for (const [id, example] of Object.entries({...extra, ...features})) examples[id] = {...example, element: 'gallery-' + id};
        for (const [id, example] of Object.entries(examples)) preset.add(new Option(example.title, id));
        const requested = new URLSearchParams(location.search).get('example');
        preset.value = Object.hasOwn(examples, requested) ? requested : 'lines';
        preset.disabled = runButton.disabled = resetButton.disabled = false;
        loadPreset();
    }).catch(error => { status.textContent = error.message; });
})();

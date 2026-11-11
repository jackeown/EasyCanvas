// Website integration. EasyCanvas itself defaults to the browser preference.
(() => {
    const root = document.documentElement;
    const applied = new WeakMap();

    function sync() {
        const theme = root.dataset.theme;
        if (theme !== 'light' && theme !== 'dark') return;
        for (const plot of document.querySelectorAll('easy-canvas')) {
            if (!plot.availableThemes || plot.closest('.theme-previews')) continue;
            const previous = applied.get(plot);
            if (plot.theme === 'auto' || plot.theme === previous) {
                applied.set(plot, theme);
                if (plot.theme !== theme) plot.theme = theme;
            } else {
                applied.delete(plot);
            }
        }
    }

    new MutationObserver(sync).observe(root, {attributes: true, attributeFilter: ['data-theme']});
    new MutationObserver(records => {
        const addedPlot = records.some(record => [...record.addedNodes].some(node =>
            node.nodeType === 1 && (node.matches('easy-canvas') || node.querySelector('easy-canvas'))));
        if (addedPlot) sync();
    }).observe(root, {childList: true, subtree: true});
    sync();
})();

// Application-level site preference. Standalone EasyCanvas follows the browser.
(() => {
    const root = document.documentElement;
    const following = new WeakSet();
    const writes = new WeakMap();

    function apply(plot) {
        if (!plot.availableThemes) return;
        if (plot.theme === 'auto') following.add(plot);
        const theme = root.dataset.theme;
        if (!following.has(plot) || !['light','dark'].includes(theme) || plot.theme === theme) return;
        writes.set(plot, (writes.get(plot) || 0) + 1);
        plot.theme = theme;
    }

    new MutationObserver(() => {
        for (const plot of document.querySelectorAll('easy-canvas')) apply(plot);
    }).observe(root, {attributes:true, attributeFilter:['data-theme']});
    new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'attributes') {
                const plot = record.target;
                const pending = writes.get(plot) || 0;
                if (pending) { writes.set(plot, pending - 1); continue; }
                if (plot.theme !== 'auto') following.delete(plot);
                apply(plot);
            } else {
                for (const node of record.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (node.matches('easy-canvas')) apply(node);
                    for (const plot of node.querySelectorAll('easy-canvas')) apply(plot);
                }
            }
        }
    }).observe(root, {childList:true, subtree:true, attributes:true, attributeFilter:['theme']});
    for (const plot of document.querySelectorAll('easy-canvas')) apply(plot);
})();

// Optional rich text and render-on-demand support for an existing EasyCanvas element.
(function (root) {
    const active = new WeakMap();

    root.enhanceEasyCanvas = function enhanceEasyCanvas(plot, {richText} = {}) {
        if (active.has(plot)) return plot;

        const context = plot.ctx;
        const {renderPlot, renderPlotLoop, fixDPI, dpr} = plot;
        const richContext = new Proxy(context, {
            get(target, key) {
                if (key === 'fillText') {
                    return (text, x, y, maxWidth) => {
                        if (richText?.(target, String(text), x, y, target.font, target.textAlign, target.fillStyle)) return;
                        if (maxWidth === undefined) target.fillText(text, x, y);
                        else target.fillText(text, x, y, maxWidth);
                    };
                }
                const value = Reflect.get(target, key, target);
                return typeof value === 'function' ? value.bind(target) : value;
            },
            set(target, key, value) {
                return Reflect.set(target, key, value, target);
            }
        });

        let pending = null;
        plot.ctx = richContext;
        plot.getDrawingContext = () => richContext;
        plot.requestRender = () => {
            if (pending !== null) return;
            pending = requestAnimationFrame(() => {
                pending = null;
                renderPlot.call(plot);
            });
        };
        plot.renderPlot = plot.requestRender;
        clearInterval(plot.dpiInterval);
        cancelAnimationFrame(plot.renderFrame);
        plot.renderPlotLoop = () => {};
        plot.fixDPI = () => {
            const {width, height} = plot.canvas.getBoundingClientRect();
            if (!width || !height) return;
            plot.dpr = window.devicePixelRatio || 1;
            const w = Math.max(1, Math.round(width * plot.dpr));
            const h = Math.max(1, Math.round(height * plot.dpr));
            if (plot.canvas.width !== w || plot.canvas.height !== h) {
                plot.canvas.width = w;
                plot.canvas.height = h;
            }
            plot.DPIHasBeenSet = true;
            plot.updateScales();
            plot.requestRender();
        };
        const resize = plot.fixDPI;
        const observer = new ResizeObserver(resize);
        observer.observe(plot);
        window.addEventListener('resize', resize);

        const dispose = () => {
            if (!active.has(plot)) return;
            active.delete(plot);
            observer.disconnect();
            window.removeEventListener('resize', resize);
            if (pending !== null) cancelAnimationFrame(pending);
            plot.ctx = context;
            Object.assign(plot, {renderPlot, renderPlotLoop, fixDPI, dpr});
            delete plot.getDrawingContext;
            delete plot.requestRender;
            delete plot.disposeRichRendering;
            plot.dpiInterval = setInterval(() => plot.fixDPI(), 500);
            plot.fixDPI();
            plot.renderPlotLoop();
        };
        plot.disposeRichRendering = dispose;
        active.set(plot, dispose);
        resize();
        return plot;
    };
})(globalThis);

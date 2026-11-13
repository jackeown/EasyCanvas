// Share pointer redraws across helpers, including plots with autoRender disabled.
function watchPointer(plot) {
    if (plot.hotAndReadyEventListeners.tooltips) return;
    const redraw = () => plot.renderPlot();
    plot.canvas.addEventListener('mousemove', redraw);
    plot.canvas.addEventListener('mouseleave', redraw);
    plot.hotAndReadyEventListeners.tooltips = redraw;
}

function hasPointer(plot) {
    return Number.isFinite(plot.mouseX) && Number.isFinite(plot.mouseY) &&
        plot.mouseX >= plot.xmin && plot.mouseX <= plot.xmax &&
        plot.mouseY >= plot.ymin && plot.mouseY <= plot.ymax;
}

function showTooltip(plot, draw, settings, hit) {
    if (!hit || settings.showTooltips === false || !hasPointer(plot)) return;
    const info = Object.fromEntries(Object.entries(hit.info).map(([key, value]) => [key,
        settings.tooltipFormatters?.[key] ? String(settings.tooltipFormatters[key](value, hit.index)) :
            typeof value === 'number' ? String(Number(value.toPrecision(6))) : String(value)
    ]));
    draw.call(plot, plot.mouseX, plot.mouseY, info);
}

module.exports = {watchPointer, hasPointer, showTooltip};

const {getTimeLabel} = require('./helpers.js');

function tickLabel(plot, value) {
    if (!plot.autoLayout || !plot.autoTicks) return value.toFixed(2);
    if (value && (Math.abs(value) < 0.001 || Math.abs(value) >= 1000000)) return value.toExponential(2);
    return String(Number(value.toFixed(3)));
}

function niceTicks(start, end, count) {
    const interval = (end - start) / Math.max(1, count);
    if (!Number.isFinite(interval) || interval <= 0) return [];
    const power = 10 ** Math.floor(Math.log10(interval));
    const step = [1, 2, 2.5, 5, 10].find(value => value >= interval / power) * power;
    const first = Math.ceil(start / step) * step;
    const length = Math.max(0, Math.min(1000, Math.floor((end - first) / step + 1e-9) + 1));
    return Array.from({length}, (_, index) => Number((first + index * step).toPrecision(12)));
}

function axisLabels(plot, start, end, count, settings) {
    return Array.from({length: count}, (_, index) => {
        const value = start + (end - start) * (index + 1) / count;
        if (settings.tickFormat) return String(settings.tickFormat(value));
        if (settings.isDatetime) return String(getTimeLabel(index + 1, count, start, end, settings));
        return tickLabel(plot, value);
    });
}

function updateLayout(plot, settings = {}) {
    plot.layoutSettings = settings;
    const w = plot.canvas.width;
    const h = plot.canvas.height;
    const dpr = plot.dpr;
    const automatic = plot.autoLayout !== false;
    if (automatic && plot.autoFontSize && !plot.manualFontSize) {
        plot._fontsize = Math.max(10, Math.min(14, w / dpr / 30, h / dpr / 17)) * dpr;
    }
    if (!automatic && !plot.manualFontSize) plot._fontsize = 25;
    const font = plot.fontsize;
    const gap = Math.max(4 * dpr, font * 0.45);
    const tickLength = automatic ? 3.5 * dpr : 5;
    const title = settings.showTitle !== false && settings.title;
    const xLabel = settings.axes !== false && settings.showAxisLabels !== false && settings.xLabel;
    const yLabel = settings.axes !== false && settings.showAxisLabels !== false && settings.yLabel;
    const titleSize = automatic ? font * 1.25 : font * 2;
    const labelSize = automatic ? font * 1.05 : font * 2;
    let left = w * plot.xpadding / 100;
    let right = left;
    let top = h * plot.ypadding / 100;
    let bottom = top;

    plot.ctx.save();
    plot.ctx.font = plot.getFont();
    let xTicks = settings.xTicks ?? (automatic && plot.autoTicks ? Math.max(1, Math.min(10, Math.floor(w / dpr / 85))) : 10);
    let yTicks = settings.yTicks ?? (automatic && plot.autoTicks ? Math.max(1, Math.min(8, Math.floor(h / dpr / 50))) : 5);

    const timeOptions = {locale:settings.locale, timeZone:settings.timeZone, timeFormat:settings.timeFormat};
    if (automatic && plot.autoPadding) {
        if (!plot.manualXPadding) {
            const labels = settings.showTickLabels === false || settings.axes === false || settings._radial ? [] :
                axisLabels(plot, plot.ymin, plot.ymax, yTicks, {
                    ...timeOptions, tickFormat:settings.yTickFormat, isDatetime:settings.yAxisIsTime
                });
            const width = Math.max(0, ...labels.map(label => plot.ctx.measureText(label).width));
            left = gap + (labels.length ? width + tickLength + gap : 0) + (yLabel ? labelSize + gap : 0);
            right = gap * 2;
        }
        if (!plot.manualYPadding) {
            let legendRows = 0;
            if (settings.showLegend !== false && !settings._radial) {
                const labels = settings.legendLabels ?? [];
                let used = 0;
                for (const label of labels.filter(Boolean)) {
                    const width = plot.ctx.measureText(label).width + font * 1.7;
                    if (!legendRows || used + width > w - left - right) {
                        legendRows++;
                        used = 0;
                    }
                    used += width + gap;
                }
            }
            top = gap * 2 + (title ? titleSize + gap : 0) + legendRows * (font * 1.4);
            bottom = gap * 2 + (settings.axes !== false && settings.showTickLabels !== false && !settings._radial ? font + tickLength : 0) + (xLabel ? labelSize + gap : 0);
        }
        // Keep a useful drawing region even for small canvases or long labels.
        left = Math.min(left, w * 0.4);
        right = Math.min(right, w * 0.2);
        top = Math.min(top, h * 0.35);
        bottom = Math.min(bottom, h * 0.35);
    }

    if (automatic && plot.autoTicks && settings.xTicks === undefined) {
        const labels = axisLabels(plot, plot.xmin, plot.xmax, xTicks, {
            ...timeOptions, tickFormat:settings.xTickFormat, isDatetime:settings.xAxisIsTime
        });
        const widest = Math.max(font * 2, ...labels.map(label => plot.ctx.measureText(label).width));
        xTicks = Math.max(1, Math.min(10, Math.floor((w - left - right) / (widest + gap * 2))));
    }
    plot.ctx.restore();
    plot.layout = {
        left, right, top, bottom, fontSize:font, titleSize, labelSize, gap, tickLength,
        xTicks, yTicks, legendTop:gap + (title ? titleSize + gap : 0), radial:Boolean(settings._radial), automatic
    };
    plot.updateScales();
}

module.exports = {updateLayout, tickLabel, niceTicks};

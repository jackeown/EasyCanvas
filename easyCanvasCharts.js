const chartBounds = new WeakMap();
const finite = value => typeof value === 'number' && Number.isFinite(value);

function extent(values) {
    let min = Infinity;
    let max = -Infinity;
    for (const value of values) {
        min = Math.min(min, value);
        max = Math.max(max, value);
    }
    return min === max ? [min - Math.max(0.5, Math.abs(min) * 0.01), max + Math.max(0.5, Math.abs(max) * 0.01)] : [min, max];
}

function color(plot, settings, index = 0) {
    const colors = settings.colors?.length ? settings.colors : plot.themeColors.palette;
    return settings.color ?? colors[index % colors.length];
}

function pixelRect(plot, x1, y1, x2, y2) {
    const x = plot.scaleX(x1);
    const y = plot.scaleY(y1);
    const right = plot.scaleX(x2);
    const bottom = plot.scaleY(y2);
    plot.ctx.fillRect(Math.min(x, right), Math.min(y, bottom), Math.abs(right - x), Math.abs(bottom - y));
}

function cartesian(plot, kind, bounds, settings, draw, decorate) {
    if (plot.defaultAxesOn) plot.setAttribute('default-axes-on', 'false');
    const key = kind + ':' + bounds.join(',');
    if (settings.autoScale === false) {
        chartBounds.delete(plot);
    } else if (chartBounds.get(plot) !== key) {
        ['xmin', 'xmax', 'ymin', 'ymax'].forEach((name, index) => plot.setAttribute(name, String(bounds[index])));
        chartBounds.set(plot, key);
    }
    plot.ctx.save();
    try {
        draw();
        plot.ctx.fillStyle = plot.themeColors.foreground;
        plot.ctx.strokeStyle = plot.themeColors.axes;
        if (settings.axes !== false) plot.drawDefaultAxes(settings);
        decorate.call(plot, {title: '', xLabel: '', yLabel: '', legendLabels: [], ...settings});
    } finally {
        plot.ctx.restore();
    }
}

function quantile(sorted, fraction) {
    const index = (sorted.length - 1) * fraction;
    const lower = Math.floor(index);
    return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
}

module.exports = function createChartHelpers(decorate, drawTooltip) {
    function histogram(data, settings = {}) {
        const values = (Array.isArray(data) ? data : data.values).filter(finite);
        if (!values.length) return [];
        const bins = settings.bins ?? Math.min(1000, Math.ceil(Math.sqrt(values.length)));
        if (!Number.isInteger(bins) || bins < 1 || bins > 1000) throw new RangeError('bins must be an integer from 1 to 1000');
        const [min, max] = settings.range ?? extent(values);
        if (!finite(min) || !finite(max) || max <= min || !finite(max - min)) throw new RangeError('range must contain two increasing finite bounds');
        const width = (max - min) / bins;
        const counts = Array(bins).fill(0);
        for (const value of values) {
            if (value >= min && value <= max) counts[Math.min(bins - 1, Math.floor((value - min) / width))]++;
        }
        const total = counts.reduce((sum, count) => sum + count, 0);
        const bars = counts.map((count, i) => ({
            min: min + i * width,
            max: i === bins - 1 ? max : min + (i + 1) * width,
            count,
            height: settings.density && total ? count / (total * width) : count
        }));
        const gap = Math.max(0, Math.min(0.9, settings.gap ?? 0.06)) * width / 2;
        cartesian(this, 'histogram', [min, max, 0, Math.max(...bars.map(bar => bar.height), settings.density ? Number.EPSILON : 1) * 1.08], settings, () => {
            this.ctx.fillStyle = color(this, settings);
            for (const bar of bars) pixelRect(this, bar.min + gap, 0, bar.max - gap, bar.height);
        }, decorate);
        return bars;
    }

    function pieChart(data, settings = {}) {
        const values = Array.isArray(data) ? data : data.values;
        const labels = settings.labels ?? (Array.isArray(data) ? [] : data.labels) ?? [];
        if (!values.every(value => finite(value) && value >= 0)) throw new RangeError('Pie values must be finite and nonnegative');
        const total = values.reduce((sum, value) => sum + value, 0);
        if (this.defaultAxesOn) this.setAttribute('default-axes-on', 'false');
        if (!total) return;
        if (!finite(total)) throw new RangeError('Pie total must be finite');
        if (this.defaultAxesOn) this.setAttribute('default-axes-on', 'false');
        const ctx = this.ctx;
        const legendLabels = settings.showLegend === false ? [] :
            values.map((_, index) => settings.legendLabels?.[index] ?? labels[index] ?? 'Slice ' + (index + 1));
        ctx.save();
        ctx.font = this.getFont();
        const legendTextWidth = Math.max(0, ...legendLabels.map(label => ctx.measureText(label).width));
        ctx.restore();
        const legendWidth = legendLabels.length ? Math.min(this.canvas.width * 0.45, legendTextWidth + this.fontsize * 3.5) : 0;
        const chartWidth = this.canvas.width - legendWidth;
        const x = chartWidth / 2;
        const y = this.canvas.height * (settings.title ? 0.56 : 0.5);
        const radius = Math.min(chartWidth, this.canvas.height) * 0.36;
        const inner = radius * Math.max(0, Math.min(0.95, settings.innerRadius ?? 0));
        const startAngle = settings.startAngle ?? -Math.PI / 2;
        let angle = startAngle;
        const mouseX = this.mouseX === undefined ? NaN : this.scaleX(this.mouseX);
        const mouseY = this.mouseY === undefined ? NaN : this.scaleY(this.mouseY);
        const distanceToMouse = Math.hypot(mouseX - x, mouseY - y);
        const pointerAngle = ((Math.atan2(mouseY - y, mouseX - x) - startAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        let hovered;
        if (!this.hotAndReadyEventListeners.pieChart) {
            const redraw = () => this.renderPlot();
            this.canvas.addEventListener('mousemove', redraw);
            this.canvas.addEventListener('mouseleave', redraw);
            this.hotAndReadyEventListeners.pieChart = redraw;
        }
        ctx.save();
        try {
            for (const [index, value] of values.entries()) {
                if (!value) continue;
                const fraction = value / total;
                const end = angle + fraction * Math.PI * 2;
                ctx.beginPath();
                ctx.arc(x, y, radius, angle, end);
                if (inner) ctx.arc(x, y, inner, end, angle, true);
                else ctx.lineTo(x, y);
                ctx.closePath();
                ctx.fillStyle = color(this, settings, index);
                ctx.fill();
                const overSlice = distanceToMouse <= radius && distanceToMouse > inner &&
                    pointerAngle >= angle - startAngle && pointerAngle < end - startAngle;
                if (overSlice) {
                    hovered = {index, value, fraction};
                    ctx.save();
                    ctx.strokeStyle = this.themeColors.axes;
                    ctx.lineWidth = 2 * this.dpr;
                    ctx.stroke();
                    ctx.restore();
                }
                if (settings.showLabels !== false && fraction >= 0.04) {
                    const mid = (angle + end) / 2;
                    const distance = (radius + inner) / 2;
                    ctx.fillStyle = settings.labelColor ?? this.themeColors.sliceLabel;
                    this.drawLabel({
                        text: settings.labelFormatter?.(value, index, fraction) ?? labels[index] ?? (fraction * 100).toFixed(0) + '%',
                        x: x + distance * Math.cos(mid), y: y + distance * Math.sin(mid),
                        textAlign: 'center', textBaseline: 'middle', font: this.getFont()
                    });
                }
                angle = end;
            }
            ctx.fillStyle = this.themeColors.foreground;
            decorate.call(this, {
                title: '', xLabel: '', yLabel: '', ...settings,
                colors: values.map((_, index) => color(this, settings, index)), legendLabels
            });
            if (hovered && settings.showTooltips !== false) {
                const {index, value, fraction} = hovered;
                const info = settings.tooltipFormatter ? { [labels[index] ?? legendLabels[index] ?? 'Slice ' + (index + 1)]: settings.tooltipFormatter(value, index, fraction) } : {
                    Label: labels[index] ?? legendLabels[index] ?? 'Slice ' + (index + 1),
                    Value: String(value), Share: (fraction * 100).toFixed(1) + '%'
                };
                drawTooltip.call(this, this.mouseX, this.mouseY, info);
            }
        } finally {
            ctx.restore();
        }
    }

    function donutChart(data, settings = {}) {
        return pieChart.call(this, data, {innerRadius: 0.55, ...settings});
    }

    function boxPlot(data, settings = {}) {
        const groups = Array.isArray(data) ? [{values: data}] : Object.entries(data).map(([label, values]) => ({label, values}));
        const summaries = [];
        const factor = settings.whiskerFactor ?? 1.5;
        if (!finite(factor) || factor < 0) throw new RangeError('whiskerFactor must be nonnegative');
        for (const {label, values} of groups) {
            const sorted = values.filter(finite).sort((a, b) => a - b);
            if (!sorted.length) continue;
            const q1 = quantile(sorted, 0.25);
            const median = quantile(sorted, 0.5);
            const q3 = quantile(sorted, 0.75);
            const spread = (q3 - q1) * factor;
            const inside = sorted.filter(value => value >= q1 - spread && value <= q3 + spread);
            summaries.push({label, q1, median, q3, low: inside[0] ?? q1, high: inside.at(-1) ?? q3,
                outliers: sorted.filter(value => value < q1 - spread || value > q3 + spread)});
        }
        if (!summaries.length) return summaries;
        const [min, max] = extent(summaries.flatMap(box => [box.low, box.high, ...box.outliers]));
        const padding = (max - min) * 0.07;
        cartesian(this, 'box', [0, summaries.length + 1, min - padding, max + padding], {
            ...settings, xTicks: summaries.length + 1,
            xTickFormat: value => summaries[Math.round(value) - 1]?.label ?? ''
        }, () => {
            for (const [i, box] of summaries.entries()) {
                const x = i + 1;
                const half = Math.max(0.05, Math.min(0.48, (settings.boxWidth ?? 0.55) / 2));
                this.ctx.fillStyle = color(this, settings, i);
                pixelRect(this, x - half, box.q1, x + half, box.q3);
                this.ctx.strokeStyle = this.themeColors.axes;
                this.drawLine({xs: [x, x], ys: [box.low, box.q1]});
                this.drawLine({xs: [x, x], ys: [box.q3, box.high]});
                for (const y of [box.low, box.median, box.high]) this.drawLine({xs: [x - half, x + half], ys: [y, y]});
                if (settings.showOutliers !== false) {
                    for (const y of box.outliers) {
                        this.ctx.beginPath();
                        this.ctx.arc(this.scaleX(x), this.scaleY(y), 2.5 * this.dpr, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
            }
        }, decorate);
        return summaries;
    }

    function paired(data) {
        return data.xs.flatMap((x, index) => finite(x) && finite(data.ys[index]) ? [{x, y: data.ys[index], index}] : []);
    }

    function scatterPlot(data, settings = {}) {
        const points = paired(data);
        if (!points.length) return;
        cartesian(this, 'scatter', [...extent(points.map(p => p.x)), ...extent(points.map(p => p.y))], settings, () => {
            this.ctx.fillStyle = color(this, settings);
            this.ctx.globalAlpha = settings.opacity ?? 0.8;
            for (const {x, y, index} of points) {
                const radius = data.radii?.[index] ?? settings.radius ?? 4;
                if (!finite(radius) || radius <= 0) continue;
                this.ctx.beginPath();
                this.ctx.arc(this.scaleX(x), this.scaleY(y), radius * this.dpr, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.globalAlpha = 1;
        }, decorate);
    }

    function areaPlot(data, settings = {}) {
        const points = paired(data);
        if (!points.length) return;
        const baseline = settings.baseline ?? 0;
        cartesian(this, 'area', [...extent(points.map(p => p.x)), ...extent([baseline, ...points.map(p => p.y)])], settings, () => {
            this.ctx.fillStyle = color(this, settings);
            this.ctx.globalAlpha = settings.opacity ?? 0.26;
            this.ctx.beginPath();
            this.ctx.moveTo(this.scaleX(points[0].x), this.scaleY(baseline));
            for (const {x, y} of points) this.ctx.lineTo(this.scaleX(x), this.scaleY(y));
            this.ctx.lineTo(this.scaleX(points.at(-1).x), this.scaleY(baseline));
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
            this.ctx.strokeStyle = color(this, settings);
            this.drawLine({xs: points.map(p => p.x), ys: points.map(p => p.y)}, settings.lineWidth ?? 2);
        }, decorate);
    }

    function heatmap(data, settings = {}) {
        const rows = data.length;
        const columns = data.reduce((width, row) => Math.max(width, row.length), 0);
        const values = data.flat().filter(finite);
        if (!rows || !columns || !values.length) return;
        const [min, max] = settings.range ?? extent(values);
        if (!finite(min) || !finite(max) || max <= min) throw new RangeError('range must contain two increasing finite bounds');
        const palette = settings.colors?.length ? settings.colors : ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#172554'];
        cartesian(this, 'heatmap', [0, columns, 0, rows], {axes: false, ...settings}, () => {
            for (const [row, cells] of data.entries()) {
                for (const [column, value] of cells.entries()) {
                    if (!finite(value)) continue;
                    const fraction = Math.max(0, Math.min(1, (value - min) / (max - min)));
                    this.ctx.fillStyle = settings.colorScale?.(value, fraction) ?? palette[Math.min(palette.length - 1, Math.floor(fraction * palette.length))];
                    pixelRect(this, column, rows - row - 1, column + 1, rows - row);
                }
            }
        }, decorate);
    }

    return {histogram, pieChart, donutChart, boxPlot, scatterPlot, bubblePlot: scatterPlot, areaPlot, heatmap};
};

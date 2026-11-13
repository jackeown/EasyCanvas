/* this file contains functions for making very common plots using easyCanvas */
/* they will be made accessable via EasyCanvas.hotAndReady */

// helpers:
const helpers = require('./helpers.js');
const {niceTicks} = require('./easyCanvasLayout.js');
const {watchPointer, hasPointer, showTooltip} = require('./easyCanvasTooltips.js');
let {defaultColors, zip, defaultVal, defaultVals, dist, getTimeLabel} = helpers;


// tools
function textWidth(plot, text, font) {
    plot.ctx.save();
    plot.ctx.font = font;
    const width = plot.ctx.measureText(String(text)).width;
    plot.ctx.restore();
    return width;
}

function drawTooltip(x,y,info){
    let padding = 5 * this.dpr;
    let lineHeight = this.fontsize;


    let keys = Object.keys(info);
    let values = Object.values(info);
    let labels = zip(keys,values).map(pair => [`${pair[0]}: `,`${pair[1]}`])

    x = this.scaleX(x);
    y = this.scaleY(y);

    // find height and width
    let h = labels.length * lineHeight;
    h += padding * (labels.length+1);
    const labelFont = 'bold ' + this.fontsize + 'px ' + this.themeColors.fontFamily;
    const valueFont = this.getFont();
    const widths = labels.map(pair => [textWidth(this, pair[0], labelFont), textWidth(this, pair[1], valueFont)]);
    let w = Math.max(...widths.map(pair => pair[0] + pair[1])) + 2 * padding;

    // move tooltip up and left if necessary.
    if(x+w > this.canvas.width){
       x = this.canvas.width - w; 
    }
    if(y+h > this.canvas.height){
        y = this.canvas.height - h;
    }

    x = Math.max(0, x);
    y = Math.max(0, y);

    // Draw Rectangle 
    this.ctx.save();
    this.ctx.fillStyle = this.themeColors.tooltipBackground;
    this.ctx.strokeStyle = this.themeColors.border;
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.fillStyle = this.themeColors.foreground;

    // draw text for individual labels
    for(let [i, label] of labels.entries()){
        let x1 = x + padding;
        let y1 = y + padding*(i+1) + lineHeight*(i+1);
        
        let labelSettings = {x: x1, y: y1, textBaseline: "bottom"}

        labelSettings.text = label[0];
        labelSettings.font = labelFont;
        this.drawLabel(labelSettings);
        
        labelSettings.x += widths[i][0];
        labelSettings.text = label[1];
        labelSettings.font = valueFont;
        this.drawLabel(labelSettings);
    }
}

function drawLegend(labels, settings){
    if (!labels.length) return;
    if (this.layout?.automatic && !this.layout.radial) {
        const {left, right, gap, legendTop} = this.layout;
        let x = left;
        let y = legendTop;
        const patch = this.fontsize * 0.65;
        for (const label of labels) {
            const width = textWidth(this, label.text, this.getFont()) + this.fontsize * 1.7;
            if (x > left && x + width > this.canvas.width - right) {
                x = left;
                y += this.fontsize * 1.4;
            }
            this.ctx.fillStyle = label.color;
            this.ctx.fillRect(x, y + (this.fontsize - patch) / 2, patch, patch);
            this.ctx.fillStyle = this.themeColors.foreground;
            this.drawLabel({text:label.text, x:x + patch + gap, y, textBaseline:'top', font:this.getFont()});
            x += width + gap;
        }
        return;
    }
    
    let padding = this.fontsize / 2;
    let lineHeight = this.fontsize;

    let patchSize = this.fontsize * (3/4);

    // Rectangle 
    let h = labels.length * lineHeight;
    h += padding * (labels.length+1);
    let w = Math.max(...labels.map(label => textWidth(this, label.text, this.getFont()))) + 3*padding + patchSize;

    let x = this.canvas.width - padding - w;
    let y = padding;

    this.ctx.fillStyle = this.themeColors.legendBackground;
    this.ctx.strokeStyle = this.themeColors.border;
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.fillStyle = this.themeColors.foreground;
    
    
    // Individual labels
    for(let [i, label] of labels.entries()){
        // draw patch
        this.ctx.fillStyle=label.color;
        let x1 = x + padding;
        let y1 = y + padding*(i+1) + lineHeight*i;
        this.ctx.beginPath();
        this.ctx.rect(x1, y1, patchSize, patchSize);
        this.ctx.stroke();
        this.ctx.fill();
        this.ctx.fillStyle = this.themeColors.foreground;

        // draw text
        x1 += (patchSize + padding);
        y1 += lineHeight;
        this.drawLabel({text: label.text, x: x1, y: y1, font: this.getFont(), textBaseline: "bottom"});
    }
}

function drawLegendAxesLabelsAndTitle(settings) {
    const layout = this.layout;
    const automatic = layout?.automatic;
    const title = settings.showTitle === false ? '' : settings.title ?? (automatic ? '' : 'Untitled');
    const showLabels = settings.showAxisLabels !== false && settings.axes !== false;
    const xLabel = showLabels ? settings.xLabel ?? (automatic ? '' : 'x') : '';
    const yLabel = showLabels ? settings.yLabel ?? (automatic ? '' : 'y') : '';
    const colors = settings.colors ?? this.themeColors.palette;
    const legend = settings.showLegend === false ? [] : settings.legendLabels ?? [];
    drawLegend.call(this, legend.map((text, index) => ({text, color:colors[index % colors.length]})).filter(label => label.text));

    const centerX = automatic ? (layout.left + this.canvas.width - layout.right) / 2 : this.canvas.width / 2;
    if (title) this.drawLabel({
        text:title, x:this.canvas.width / 2, y:automatic ? layout.gap : this.fontsize * 2.5,
        font:this.getFont(automatic ? layout.titleSize : this.fontsize * 2, 'title'),
        textAlign:'center', textBaseline:automatic ? 'top' : 'alphabetic'
    });
    if (xLabel) this.drawLabel({
        text:xLabel, x:centerX, y:this.canvas.height - (automatic ? layout.gap : this.fontsize),
        font:this.getFont(automatic ? layout.labelSize : this.fontsize * 2),
        textAlign:'center', textBaseline:automatic ? 'bottom' : 'alphabetic'
    });
    if (yLabel) this.drawLabel({
        text:yLabel, x:automatic ? layout.gap + layout.labelSize / 2 : this.fontsize * 2,
        y:automatic ? (layout.top + this.canvas.height - layout.bottom) / 2 : this.canvas.height / 2,
        theta:Math.PI / 2, font:this.getFont(automatic ? layout.labelSize : this.fontsize * 2),
        textAlign:'center', textBaseline:'middle'
    });
}

function rescaleAxes(xmin,xmax,ymin,ymax){
        let ga = this.getAttribute.bind(this);
        let sa = this.setAttribute.bind(this);
        if(this.xmin != xmin || this.xmax != xmax || this.ymin != ymin || this.ymax != ymax){
                sa("xmin",xmin);sa("xmax",xmax);sa("ymin",ymin);sa("ymax",ymax);
        }
}


function getLinePlotTooltip(data, inputs, outputs, tooltips, epsilon=100, settings={}){
    if (!hasPointer(this)) return;
    let closest = epsilon;
    let selected;
    for (let series = 0; series < outputs.length; series++) {
        const input = inputs[series] ?? inputs[0];
        const output = outputs[series];
        const xs = data[input] ?? [], ys = data[output] ?? [];
        for (let index = 0; index < xs.length; index++) {
            if (!Number.isFinite(xs[index]) || !Number.isFinite(ys[index])) continue;
            const px = this.scaleX(this.mouseX), py = this.scaleY(this.mouseY);
            const x1 = this.scaleX(xs[index]), y1 = this.scaleY(ys[index]);
            let distance = Math.hypot(x1 - px, y1 - py);
            let sample = index;
            if (Number.isFinite(xs[index + 1]) && Number.isFinite(ys[index + 1])) {
                const dx = this.scaleX(xs[index + 1]) - x1;
                const dy = this.scaleY(ys[index + 1]) - y1;
                const length = dx * dx + dy * dy;
                const mix = length ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length)) : 0;
                distance = Math.hypot(x1 + dx * mix - px, y1 + dy * mix - py);
                sample = mix < 0.5 ? index : index + 1;
            }
            if (distance <= closest) {
                closest = distance;
                selected = {index:sample, input, output};
            }
        }
    }
    if (!selected) return;
    const {index, input, output} = selected;
    const x = data[input][index], y = data[output][index];
    tooltips = tooltips ?? [input, output];
    let info = {};
    for(let tooltip of tooltips){
        const value = data[tooltip][index];
        if (settings.tooltipFormatters && settings.tooltipFormatters[tooltip]) {
            info[tooltip] = String(settings.tooltipFormatters[tooltip](value, index));
            continue;
        }
        if ((settings.xAxisIsTime && inputs.includes(tooltip)) ||
            (settings.yAxisIsTime && outputs.includes(tooltip))) {
            info[tooltip] = helpers.formatTime(value, 86400000, {
                ...settings,
                timeFormat: settings.timeFormat || {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short', ...(value % 1000 ? {fractionalSecondDigits: 3} : {})}
            });
            continue;
        }
        let text = String(value);
        if(isNaN(text)){
            info[tooltip] = text.slice(0,8) + "...";
        }
        else{
            info[tooltip] = parseFloat(text).toFixed(3);
        }
    }

    return {x:x, y:y, info:info}
}





// Actual exported functions
function linePlot(data, settings = {}){
    let inputs = defaultVal(settings.inputs, ["xs"]);
    let outputs = defaultVal(settings.outputs, ["ys"]);
    let autoScale = defaultVal(settings.autoScale, true);
    let colors = defaultVal(settings.colors, this.themeColors.palette);
    let lineWidth = defaultVal(settings.lineWidth, 2);
    let tooltips = settings.tooltips;
    let xAxisIsTime = defaultVal(settings.xAxisIsTime, false);
    let yAxisIsTime = defaultVal(settings.yAxisIsTime, false);
    
    settings = {...settings, legendLabels: settings.legendLabels ?? (outputs.length > 1 ? outputs : [])};
    let zipped = outputs.map((output, i) => [inputs[i] ?? inputs[0], output]);
    
    // find extent of data.
    let xmin = ymin = Infinity;
    let xmax = ymax = -Infinity;
    for(let [i,[x,y]] of zipped.entries()){
        xmin = Math.min(Math.min(...data[x]),xmin);
        xmax = Math.max(Math.max(...data[x]),xmax);
        ymin = Math.min(Math.min(...data[y]),ymin);
        ymax = Math.max(Math.max(...data[y]),ymax);
    }

    // rescale canvas if desired
    // find a better way...
    if(autoScale && !this.alreadyAutoScaledLinePlot){
        xmin = defaultVal(settings.xmin, xmin);
        xmax = defaultVal(settings.xmax, xmax);
        ymin = defaultVal(settings.ymin, ymin);
        ymax = defaultVal(settings.ymax, ymax);
        if (xmin === xmax) { xmin -= 1; xmax += 1; }
        if (ymin === ymax) { ymin -= 1; ymax += 1; }
        this.alreadyAutoScaledLinePlot = true;
        rescaleAxes.bind(this)(xmin,xmax,ymin,ymax);
    }

    this.updateLayout(settings);

    // draw lines
    for(let [i, [x,y]] of zipped.entries()){
        this.ctx.strokeStyle = colors[i%colors.length];
        line = {xs: data[x], ys: data[y]};
        this.drawLine(line, lineWidth);
    }


    this.ctx.strokeStyle = this.themeColors.axes;

    // use axes information sent to linePlot and not the default
    // axes of easyCanvas.
    if(this.defaultAxesOn){
        this.setAttribute("default-axes-on","false");
    }
    if (settings.axes !== false) this.drawDefaultAxes(settings);

    // legend, plot title, and axes labels.
    drawLegendAxesLabelsAndTitle.bind(this)(settings);


    // draw tooltips
    if(settings.showTooltips !== false && tooltips?.length !== 0 && hasPointer(this)){
        let tooltip = getLinePlotTooltip.bind(this)(data, inputs, outputs, tooltips, 12 * this.dpr, settings);
        if(tooltip != undefined){
            let {x,y,info} = tooltip;
            drawTooltip.bind(this)(this.mouseX,this.mouseY,info);
        }
    }
    
    watchPointer(this);

}




function barPlot(data, settings = {}){
    settings = {...settings, legendLabels:settings.legendLabels ?? []};
    let autoScale = defaultVal(settings.autoScale,true)
    let colors = defaultVal(settings.colors, this.themeColors.palette);

    const boundsKey = JSON.stringify(data.heights);
    if(autoScale && this.barBoundsKey !== boundsKey){
        rescaleAxes.bind(this)(0,1,0,Math.max(1,...data.heights));
        this.barBoundsKey = boundsKey;
    }

    this.updateLayout(settings);

    // y-axis
    let labelXOffset = this.scaleXInverse(-this.fontsize) - this.scaleXInverse(0)
    if (settings.axes !== false) this.drawAxis({x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: this.ymax, 
                    labelXOffset: labelXOffset,
                    labelYOffset: 0,
                    labelTheta: this.autoLayout ? 0 : 2*Math.PI/5,
                    labelTextAlign: this.autoLayout ? "right" : "center",
                    labelTextBaseline: "middle",
                    showTickLabels: settings.showTickLabels,
                    nTicks: settings.yTicks ?? this.layout.yTicks,
                    tickValues: this.autoLayout && this.autoTicks && settings.yTicks === undefined ? niceTicks(0, this.ymax, this.layout.yTicks) : undefined,
                    labels: undefined,
                    scaleStart: 0,
                    scaleEnd: this.ymax})


    // x-axis
    labelYOffset = this.scaleYInverse(this.autoLayout ? this.layout.gap + this.layout.tickLength : this.fontsize*1.5) - this.scaleYInverse(0)

    if (settings.axes !== false) this.drawAxis({x1: 0,
                    y1: 0,
                    x2: 1,
                    y2: 0, 
                    labelXOffset: 0,
                    labelYOffset: labelYOffset,
                    labelTheta: this.autoLayout ? 0 : Math.PI/15,
                    labelTextBaseline: "top",
                    showTickLabels: settings.showTickLabels,
                    nTicks: data.bars.length+1,
                    labels: data.bars.concat("")})


    let hovered;
    for(let i=0; i<data.heights.length; i++){
        let w = 1/(data.heights.length+2);
        let pos = ((i+1)/(data.heights.length+1)) - (w/2);
        this.ctx.beginPath();
        this.ctx.fillStyle = colors[i%colors.length];
        this.rect(pos,0,w,data.heights[i]);
        if(this.mouseInRect(pos,0,pos+w,0+data.heights[i])){
            this.ctx.lineWidth=3;
            this.ctx.stroke();
            hovered = {index:i, info:{Category:data.bars[i], Value:data.heights[i]}};
        }
        this.ctx.fill();
    }
    this.ctx.lineWidth=1;
    this.ctx.fillStyle = this.themeColors.foreground;
    
    if(this.defaultAxesOn){
        this.setAttribute("default-axes-on","false");
    }

    drawLegendAxesLabelsAndTitle.bind(this)(settings);
    watchPointer(this);
    showTooltip(this, drawTooltip, settings, hovered);
}



module.exports = {
    linePlot,
    barPlot,
    drawTooltip,
    ...require('./easyCanvasCharts.js')(drawLegendAxesLabelsAndTitle, drawTooltip)
};

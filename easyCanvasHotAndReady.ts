/* this file contains functions for making very common plots using easyCanvas */
/* they will be made accessable via EasyCanvas.hotAndReady */

// helpers:
import {defaultColors, zip, defaultVal, defaultVals, dist, getTimeLabel} from "./helpers";
// const helpers = require('./helpers.js')
// let {defaultColors, zip, defaultVal, defaultVals, dist, getTimeLabel} = helpers;


// tools
function drawTooltip(x,y,info){
    let padding = 10;
    let lineHeight = this.fontsize;
    let letterWidth = this.fontsize / 2;

    let keys = Object.keys(info);
    let values = Object.values(info);
    let labels = zip(keys,values).map(pair => [`${pair[0]}: `,`${pair[1]}`])

    x = this.scaleX(x);
    y = this.scaleY(y);

    // find height and width
    let h = labels.length * lineHeight;
    h += padding * (labels.length+1);
    let w = Math.max(...labels.map(pair => pair[0].length + pair[1].length))*letterWidth + 2*padding;

    // move tooltip up and left if necessary.
    if(x+w > this.canvas.width){
       x = this.canvas.width - w; 
    }
    if(y+h > this.canvas.height){
        y = this.canvas.height - h;
    }

    // Draw Rectangle 
    this.ctx.save();
    this.ctx.fillStyle="rgba(255,255,255,0.75)";
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.restore();

    // draw text for individual labels
    for(let [i, label] of labels.entries()){
        let x1 = x + padding;
        let y1 = y + padding*(i+1) + lineHeight*(i+1);
        
        let labelSettings: any = {x: x1, y: y1, textBaseline: "bottom"}

        labelSettings.text = label[0];
        labelSettings.font = `bold ${this.fontsize}px Lato`;
        this.drawLabel(labelSettings);
        
        labelSettings.x += (letterWidth*label[0].length);
        labelSettings.text = label[1];
        labelSettings.font = `${this.fontsize}px Lato`;
        this.drawLabel(labelSettings);
    }
}

function drawLegend(labels, settings){
    
    let padding = this.fontsize / 2;
    let lineHeight = this.fontsize;
    let letterWidth = this.fontsize / 2;
    let patchSize = this.fontsize * (3/4);

    // Rectangle 
    let h = labels.length * lineHeight;
    h += padding * (labels.length+1);
    let w = Math.max(...labels.map(v => v.text.length))*letterWidth + 3*padding + patchSize;

    let x = this.canvas.width - padding - w;
    let y = padding;

    this.ctx.fillStyle="rgba(255,255,255,0.7)";
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.fillStyle="black";
    
    
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
        this.ctx.fillStyle="black";

        // draw text
        x1 += (patchSize + padding);
        y1 += lineHeight;
        this.drawLabel({text: label.text, x: x1, y: y1, font: `300 ${this.fontsize}px Lato`, textBaseline: "bottom"});
    }
}

function drawLegendAxesLabelsAndTitle(settings){
    let title = defaultVal(settings.title, "Untitled");
    let xLabel = defaultVal(settings.xLabel, "x");
    let yLabel = defaultVal(settings.yLabel, "y");
    let legendLabels = defaultVal(settings.legendLabels, ["y"]);
    let colors = defaultVal(settings.colors, defaultColors);

    // draw legend
    legendLabels = legendLabels.map((field,i) => {
        return {text: field, color: colors[i%colors.length]};
    })
    legendLabels = legendLabels.filter(x => x.text != "")
    drawLegend.bind(this)(legendLabels);

    // draw title
    let titleX = this.canvas.width/2;
    let titleY = this.fontsize * 2.5;
    this.drawLabel({text: title, x: titleX, y: titleY, font: `300 ${this.fontsize*2}px Lato`, textAlign: "center"});

    // draw x-axis label
    let xLabelX = this.canvas.width/2;
    let xLabelY = this.canvas.height - (this.fontsize);
    this.drawLabel({text: xLabel, x: xLabelX, y: xLabelY, font: `300 ${this.fontsize*2}px Lato`, textAlign: "center"});

    // draw y-axis label
    let yLabelX = this.fontsize*2;
    let yLabelY = this.canvas.height/2;
    this.drawLabel({text: yLabel, x: yLabelX, y: yLabelY, theta: Math.PI/2, font: `300 ${this.fontsize*2}px Lato`, textAlign: "center"});
}



function rescaleAxes(xmin,xmax,ymin,ymax){
        let ga = this.getAttribute.bind(this);
        let sa = this.setAttribute.bind(this);
        if(this.xmin != xmin || this.xmax != xmax || this.ymin != ymin || this.ymax != ymax){
                sa("xmin",xmin);sa("xmax",xmax);sa("ymin",ymin);sa("ymax",ymax);
        }
}


function getLinePlotTooltip(data, inputs, outputs, tooltips, epsilon=100){
    // make sure inputs has exactly one unique element.
    if(new Set(inputs).size != 1){
        console.log("in order to have tooltips on a line plot, all inputs must be the same.");
        return undefined;
    } 

    let xs = data[inputs[0]];

    // get closest point to mouse.
    let mx = this.mouseX;
    let my = this.mouseY;

    // binary search over x
    let low = 0;
    let high = xs.length-1;
    let guess = Math.round((high+low)/2);
    while(high - low > 1){
        if(xs[guess] > mx){
            high = guess;
        }
        else{
            low = guess;
        }
        guess = Math.round((high+low)/2);
    }

    let index = low;
    if(Math.abs(xs[high] - mx) < Math.abs(xs[low] - mx)){
        index = high;
    }


    // find closest y-coordinate
    let output = undefined;
    let smallestDist = Infinity;
    for(let out of outputs){
        let d = dist(xs[index], data[out][index], mx, my)
        if(d < smallestDist){
            output = out;
            smallestDist = d;
        }
    }


    // ensure it is within epsilon of mouse in canvas (c) coordinates.
    let cPointX = this.scaleX(xs[index]);
    let cPointY = this.scaleY(data[output][index]);
    let cMouseX = this.scaleX(mx);
    let cMouseY = this.scaleY(my);
    if(dist(cPointX,cPointY,cMouseX, cMouseY) > epsilon){
        return undefined;
    }

    let x = xs[index];
    let y = data[output][index];
    let info = {};
    for(let tooltip of tooltips){
        let text: any = String(data[tooltip][index]);
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
function linePlot(data, settings){
    let inputs = defaultVal(settings.inputs, ["xs"]);
    let outputs = defaultVal(settings.outputs, ["ys"]);
    let autoScale = defaultVal(settings.autoScale, true);
    let colors = defaultVal(settings.colors, defaultColors);
    let lineWidth = defaultVal(settings.lineWidth, 2);
    let tooltips = defaultVal(settings.tooltips, []);
    let xTicks = defaultVal(settings.xTicks, Math.floor(this.canvas.width /120));
    let yTicks = defaultVal(settings.yTicks, Math.floor(this.canvas.height /80));
    let xAxisIsTime = defaultVal(settings.xAxisIsTime, false);
    let yAxisIsTime = defaultVal(settings.yAxisIsTime, false);
    
    let zipped = zip(inputs,outputs);
    
    // find extent of data.
    let xmin = Infinity;
    let ymin = Infinity;
    let xmax = -Infinity;
    let ymax = -Infinity;
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
        this.alreadyAutoScaledLinePlot = true;
        rescaleAxes.bind(this)(xmin,xmax,ymin,ymax);
    }

    // draw lines
    for(let [i, [x,y]] of zipped.entries()){
        this.ctx.strokeStyle = colors[i%colors.length];
        let line = {xs: data[x], ys: data[y]};
        this.drawLine(line, lineWidth);
    }


    this.ctx.strokeStyle="black";

    // use axes information sent to linePlot and not the default
    // axes of easyCanvas.
    if(this.defaultAxesOn){
        this.setAttribute("default-axes-on","false");
    }
    this.drawDefaultAxes({
        xTicks: xTicks,
        yTicks: yTicks,
        xAxisIsTime: xAxisIsTime,
        yAxisIsTime: yAxisIsTime
    });



    // legend, plot title, and axes labels.
    drawLegendAxesLabelsAndTitle.bind(this)(settings);


    // draw tooltips
    if(tooltips.length != 0 && this.mouseX !== undefined){
        let tooltip = getLinePlotTooltip.bind(this)(data, inputs, outputs, tooltips);
        if(tooltip != undefined){
            let {x,y,info} = tooltip;
            drawTooltip.bind(this)(x,y,info);
        }
    }
    
    if(this.hotAndReadyEventListeners["linePlot"] === undefined){
        function listener(){
            let tooltip = getLinePlotTooltip.bind(this)(data, inputs, outputs, tooltips);
            if(tooltip != undefined){
                this.renderPlot();
            }
        };

        this.hotAndReadyEventListeners["linePlot"] = {
            mousemove: listener.bind(this)
        };
        this.canvas.addEventListener("mousemove", this.hotAndReadyEventListeners["linePlot"]["mousemove"])
    }

}




function barPlot(data, settings){
    let autoScale = defaultVal(settings.autoScale,true)
    let colors = defaultVal(settings.colors, defaultColors);

    if(autoScale){
        rescaleAxes.bind(this)(0,1,0,Math.max(...data.heights))
    }

    // y-axis
    let labelXOffset = this.scaleXInverse(-this.fontsize) - this.scaleXInverse(0)
    this.drawAxis({x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: this.ymax, 
                    labelXOffset: labelXOffset,
                    labelYOffset: 0,
                    labelTheta: 2*Math.PI/5,
                    nTicks: 5,
                    labels: undefined,
                    scaleStart: 0,
                    scaleEnd: this.ymax})


    // x-axis
    let labelYOffset = this.scaleYInverse(this.fontsize*1.5) - this.scaleYInverse(0)

    this.drawAxis({x1: 0,
                    y1: 0,
                    x2: this.xmax,
                    y2: 0, 
                    labelXOffset: 0,
                    labelYOffset: labelYOffset,
                    labelTheta: Math.PI/15,
                    nTicks: data.bars.length+1,
                    labels: data.bars.concat("")})


    for(let i=0; i<data.heights.length; i++){
        let w = 1/(data.heights.length+2);
        let pos = ((i+1)/(data.heights.length+1)) - (w/2);
        this.ctx.beginPath();
        this.ctx.fillStyle = colors[i%colors.length];
        this.rect(pos,0,w,data.heights[i]);
        if(this.mouseInRect(pos,0,pos+w,0+data.heights[i])){
            this.ctx.lineWidth=3;
            this.ctx.stroke();
        }
        this.ctx.fill();
    }
    this.ctx.lineWidth=1;
    this.ctx.fillStyle = "black";
    
    if(this.defaultAxesOn){
        this.setAttribute("default-axes-on","false");
    }
    if(this.controls){
        this.setAttribute("controls","false");
    }
    drawLegendAxesLabelsAndTitle.bind(this)(settings);
}



function histogram(data){
    this.setAttribute("default-axes-on","false");

}


export {linePlot, barPlot, histogram, drawTooltip}

// module.exports = {
//     "linePlot": linePlot,
//     "barPlot": barPlot,
//     "histogram": histogram,
//     "drawTooltip": drawTooltip
// }

// module.exports = [
//     ["linePlot",linePlot],
//     ["barPlot", barPlot],
//     ["histogram", barPlot]
// ]; 
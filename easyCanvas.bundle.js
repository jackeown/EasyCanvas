(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const hotAndReadyFuncs = require('./easyCanvasHotAndReady.js');
const helpers = require('./helpers.js');
const chartTheme = require('./easyCanvasTheme.js');
const chartLayout = require('./easyCanvasLayout.js');

let {defaultColors, zip, defaultVal, defaultVals, dist, getTimeLabel} = helpers;

    
// d for domain, r for range...actually affine.
function linearScale(d1, d2, r1, r2){
    function scale(x){
        let z = (x-d1)/(d2-d1)
        return z*(r2-r1) + r1;
    }
    return scale;
}
window.linearScale = linearScale;

// For mobile zooming / panning
function getScalesFromPoints(oldPoints, newPoints){
    let distOld = dist(...oldPoints);
    let distNew = dist(...newPoints);
    
    let s = distNew / distOld;
    let sx = s;
    let sy = s;

    let oldMidX = (oldPoints[0].x + oldPoints[1].x)/2
    let oldMidY = (oldPoints[0].y + oldPoints[1].y)/2
    
    let newMidX = (newPoints[0].x + newPoints[1].x)/2
    let newMidY = (newPoints[0].y + newPoints[1].y)/2

    // scaling only along y-axis
    if (oldPoints[0].x < this.xmin && oldPoints[1].x < this.xmin){
        sx=1;
        newMidX = oldMidX;
    }
    // scaling only along x-axis
    if (oldPoints[0].y < this.ymin && oldPoints[1].y < this.ymin){
        sy=1;
        newMidY = oldMidY
    }
    
    let scaleX = linearScale(newMidX, newMidX+sx, oldMidX, oldMidX+1);
    let scaleY = linearScale(newMidY, newMidY+sy, oldMidY, oldMidY+1);
    
    return [scaleX, scaleY];
}

class EasyCanvas extends HTMLElement {
    static get observedAttributes(){ 
        return [
            "xmin",
            "xmax",
            "ymin",
            "ymax",
            "framerate",
            "xpadding",
            "ypadding",
            "default-axes-on",
            "controls",
            "fontsize",
            "theme",
            "auto-layout", "auto-font-size", "auto-padding", "auto-ticks", "auto-resize", "auto-render"
        ];
    }
    
    constructor() {
        // Always call super first in constructor
        super();
        
        // Set up canvas 
        this.shadow = this.attachShadow({mode: 'open'});
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("style","border:1px solid black;width:100%;height:100%;");

        // update this.mouseDown boolean
        this.canvas.addEventListener("mousedown",function(e){this.mouseDown = true;}.bind(this))
        this.canvas.addEventListener("mouseup",function(e){this.mouseDown = false;}.bind(this))
       
        // update mouseX and mouseY locations
        this.canvas.addEventListener("mousemove",function(e){
            // get size of padding in data units.
            let padXPixels = (this.xpadding/100)*this.canvas.width;
            let padYPixels = (this.ypadding/100)*this.canvas.height;

            // data coordinates of actual canvas boundary.
            let px = Math.abs(this.scaleXInverse(padXPixels) - this.scaleXInverse(0));
            let py = Math.abs(this.scaleYInverse(padYPixels) - this.scaleYInverse(0));

            this.mouseX = this.scaleXInverse(e.offsetX*this.dpr);
            this.mouseY = this.scaleYInverse(e.offsetY*this.dpr);

        }.bind(this));

        this.canvas.addEventListener("mouseleave",function(e){
            this.mouseDown = false;
            this.mouseX = undefined;
            this.mouseY = undefined;
        }.bind(this));


        // panningControl and zoomingControl can't be actual methods because they need
        // to be bound to the object for event handling.
        this.panningControl = function(e){
            if(this.mouseDown){
                let dx = this.scaleXInverse(e.movementX)-this.scaleXInverse(0);
                let dy = this.scaleYInverse(e.movementY)-this.scaleYInverse(0);

                dx *= this.dpr;
                dy *= this.dpr;
    
                this.xmin -= dx;
                this.xmax -= dx;
                this.ymin -= dy;
                this.ymax -= dy;
                this.renderPlot();
            }
        }.bind(this)
    
        this.zoomingControl = function(e){
            let xdist = this.xmax - this.xmin;
            let ydist = this.ymax - this.ymin;
          
            let sensitivity = 0.001
            let zoomAmount = (e.deltaY*sensitivity);
    
            let px = (this.mouseX - this.xmin) / xdist
            let py = (this.mouseY - this.ymin) / ydist
    
            // make sure the zoom makes sense and there aren't weird numerical issues.
            // also make sure we don't zoom in too far...
            if(isNaN(px) || isNaN(py) || isNaN(zoomAmount) || 
                (zoomAmount<0 && Math.abs(zoomAmount) < 0.000001)){
                return
            }
    
            let aspectRatio = xdist / ydist;
            if(this.mouseX > this.xmin && this.mouseY > this.ymin){
                zoomAmount *= Math.max(xdist,ydist);
                this.xmin -= px*zoomAmount;
                this.xmax += (1-px)*zoomAmount;
                this.ymin -= py*zoomAmount/aspectRatio;
                this.ymax += (1-py)*zoomAmount/aspectRatio;
            }
            else if(this.mouseY < this.ymin){
                zoomAmount *= xdist;
                this.xmin -= px*zoomAmount;
                this.xmax += (1-px)*zoomAmount;
            }
            else if(this.mouseX < this.xmin){
                zoomAmount *= ydist;
                this.ymin -= py*zoomAmount;
                this.ymax += (1-py)*zoomAmount;
            }
    
            e.preventDefault();
            this.renderPlot();
        }.bind(this)

        // panning controls
        this.canvas.addEventListener("mousemove", this.panningControl);

        // zooming controls
        this.canvas.addEventListener("wheel", this.zoomingControl);

        // touch events:
        this.canvas.addEventListener("touchstart", function(e){
            if (this.getAttribute('controls') === 'false') return;
            if(e.touches.length == 2){
                this.twoFingerStartEvent = e;
                this.saveScalesAndRanges();
                e.preventDefault();
            }
        }.bind(this));


        this.canvas.addEventListener("touchmove", function(e){
            if (this.getAttribute('controls') === 'false') return;
            if(e.touches.length == 2){
                // Get old and new touch positions
                let {pageX: x1Old, pageY: y1Old} = this.twoFingerStartEvent.touches[0];
                let {pageX: x2Old, pageY: y2Old} = this.twoFingerStartEvent.touches[1];
                
                let {pageX: x1New, pageY: y1New} = e.touches[0];
                let {pageX: x2New, pageY: y2New} = e.touches[1];

                // some quick defines to make the next bit more concise.
                let [sxi, syi] = [this.oldScales["scaleXInverse"], this.oldScales["scaleYInverse"]]
                let dpr = this.dpr;
                let left = this.canvas.offsetLeft;
                let top = this.canvas.offsetTop;

                // Rescale old and new touch positions
                let oldPoints = [
                    {x: sxi((x1Old-left)*dpr), y: syi((y1Old-top)*dpr)},
                    {x: sxi((x2Old-left)*dpr), y: syi((y2Old-top)*dpr)}
                ]

                let newPoints = [
                    {x: sxi((x1New-left)*dpr), y: syi((y1New-top)*dpr)},
                    {x: sxi((x2New-left)*dpr), y: syi((y2New-top)*dpr)}
                ]

                let [pinchScaleX, pinchScaleY] = getScalesFromPoints.bind(this)(oldPoints, newPoints)

                this.setAttribute("xmin", pinchScaleX(this.oldxmin));
                this.setAttribute("xmax", pinchScaleX(this.oldxmax));
    
                this.setAttribute("ymin", pinchScaleY(this.oldymin));
                this.setAttribute("ymax", pinchScaleY(this.oldymax));
    
                this.renderPlot();
                e.preventDefault();
            }
        }.bind(this));


        this.canvas.addEventListener("touchend", function(e){
            if (this.getAttribute('controls') === 'false') return;
            if(e.touches.length == 2){
                this.twoFingerStartEvent = e;
            }
        }.bind(this));



        this.shadow.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");
        
        // Constantly adjust DPI with possibly changing screen size
        this.DPIHasBeenSet = false;
        this._autoResize = true;
        this._autoRender = true;
        this.autoLayout = this.autoFontSize = this.autoPadding = this.autoTicks = true;
        this.dpiInterval = setInterval(() => this.fixDPI(), 500);
        window.addEventListener("load", () => this.fixDPI(), {once: true});
        
        // config
        this.framerate = 30;
        this._xpadding = 10;
        this._ypadding = 16;

        this.xmin = -100;
        this.xmax = 100;        
        this.ymin = -100;
        this.ymax = 100;

        this.dpr = 2; // device pixel ratio.
        this.debug = true; 
        
        this.defaultAxesOn = true;
        this.mouseDown = false; // left mouse button is not clicked in when the webpage loads...
        this._fontsize = 25;
        this.updateScales();

        // bind all methods from easyCanvasHotAndReady
        this.hotAndReady = {}
        for(let key of Object.keys(hotAndReadyFuncs)){
            this.hotAndReady[key] = hotAndReadyFuncs[key].bind(this);
        }
        this.hotAndReadyEventListeners = {};


        chartTheme.initializeTheme(this);

        // Constantly be redrawing the plot at this.framerate
        this.renderPlotLoop();

    }

    get fontsize() { return this._fontsize; }
    set fontsize(value) { this._fontsize = Number(value); this.manualFontSize = true; }
    get xpadding() { return this._xpadding; }
    set xpadding(value) { this._xpadding = Number(value); this.manualXPadding = true; }
    get ypadding() { return this._ypadding; }
    set ypadding(value) { this._ypadding = Number(value); this.manualYPadding = true; }

    get autoResize() { return this._autoResize; }
    set autoResize(value) {
        this._autoResize = Boolean(value);
        clearInterval(this.dpiInterval);
        this.dpiInterval = this._autoResize ? setInterval(() => this.fixDPI(), 500) : null;
    }
    get autoRender() { return this._autoRender; }
    set autoRender(value) {
        const enabled = Boolean(value);
        if (enabled === this._autoRender) return;
        this._autoRender = enabled;
        cancelAnimationFrame(this.renderFrame);
        if (enabled) this.renderPlotLoop();
    }
    updateLayout(settings = {}) { chartLayout.updateLayout(this, settings); }

    get theme() {
        const value = this.getAttribute('theme');
        return this.availableThemes.includes(value) ? value : 'auto';
    }

    set theme(value) {
        if (!this.availableThemes.includes(value)) throw new RangeError('Unknown theme: ' + value);
        this.setAttribute('theme', value);
    }

    get availableThemes() { return ['auto', ...chartTheme.names]; }

    getFont(size = this.fontsize, kind = 'body') {
        const style = this.themeColors;
        const weight = kind === 'title' ? style.titleWeight : style.fontWeight;
        const family = kind === 'title' ? style.titleFontFamily ?? style.fontFamily : style.fontFamily;
        return weight + ' ' + size + 'px ' + family;
    }

    get resolvedTheme() { return chartTheme.resolvedTheme(this); }
    get themeColors() { return chartTheme.themeColors(this); }
    set themeColors(value) {
        this.themeOverrides = value ? {...value} : {};
        chartTheme.updateTheme(this);
    }

    connectedCallback() {
        this.themePreference?.addEventListener('change', this.themePreferenceChanged);
        chartTheme.updateTheme(this);
    }

    disconnectedCallback() {
        this.themePreference?.removeEventListener('change', this.themePreferenceChanged);
    }

    saveScalesAndRanges(){
        this.oldScales = {
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            scaleXInverse: this.scaleXInverse,
            scaleYInverse: this.scaleYInverse
        }

        this.oldxmin = this.xmin;
        this.oldxmax = this.xmax;
        this.oldymin = this.ymin;
        this.oldymax = this.ymax;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if(this.debug)
            console.log(`custom element attribute "${name}" has changed from "${oldValue}" to "${newValue}"`);
        
        if (name === 'theme') {
            chartTheme.updateTheme(this);
            return;
        }

        const autoSettings = {
            'auto-layout':'autoLayout', 'auto-font-size':'autoFontSize',
            'auto-padding':'autoPadding', 'auto-ticks':'autoTicks',
            'auto-resize':'autoResize', 'auto-render':'autoRender'
        };
        if (autoSettings[name]) {
            this[autoSettings[name]] = newValue !== 'false';
            return;
        }
        if (newValue === null && ['fontsize','xpadding','ypadding'].includes(name)) {
            this[{fontsize:'manualFontSize',xpadding:'manualXPadding',ypadding:'manualYPadding'}[name]] = false;
            return;
        }

        // simple numeric
        if(["xmin", "xmax", "ymin", "ymax", "xpadding", "ypadding", "framerate", "fontsize"].includes(name)){
            this[name] = +newValue;
            this.updateScales();
        }
        
        // simple boolean
        else if(["default-axes-on"].includes(name)){
            this.defaultAxesOn = (newValue == "true");
        }

        else if(name === "controls"){
            this.canvas.removeEventListener("mousemove",this.panningControl);
            this.canvas.removeEventListener("wheel",this.zoomingControl);

            if(newValue !== "false"){
                this.canvas.addEventListener("mousemove",this.panningControl);
                this.canvas.addEventListener("wheel",this.zoomingControl);
            }
        }
    }

    updateScales(){
        let w = this.canvas.width;
        let h = this.canvas.height;
        const layout = this.layout;
        const left = layout?.left ?? this.xpadding * w / 100;
        const right = layout?.right ?? this.xpadding * w / 100;
        const top = layout?.top ?? this.ypadding * h / 100;
        const bottom = layout?.bottom ?? this.ypadding * h / 100;
        this.scaleX = linearScale(this.xmin, this.xmax, left, w - right);
        this.scaleY = linearScale(this.ymin, this.ymax, h - bottom, top);
        this.scaleXInverse = linearScale(left, w - right, this.xmin, this.xmax);
        this.scaleYInverse = linearScale(h - bottom, top, this.ymin, this.ymax);
    }

    fixDPI(force = false) {
        if (!this.autoResize && !force) return;
        const style = getComputedStyle(this.canvas);
        const height = Math.max(1, Math.round(parseFloat(style.getPropertyValue('height')) * this.dpr));
        const width = Math.max(1, Math.round(parseFloat(style.getPropertyValue('width')) * this.dpr));
        const changed = this.canvas.width !== width || this.canvas.height !== height;
        if (changed) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        const initial = !this.DPIHasBeenSet;
        this.DPIHasBeenSet = true;
        if (changed || initial || force) this.renderPlot();
    }

    linkInfo(keys, link){
        this.linkedKeys = keys;
        this.link = link;
    }


    renderPlotLoop(){
        if (!this.autoRender) return;
        // will be true if this.lastFrame is undefined
        let ready = (new Date() - this.lastFrame > 1000/this.framerate)
        ready = (ready || this.lastFrame === undefined)

        try {
            if(ready){
                this.renderPlot();
            }
        }
        catch(e){
            console.error(e);
        }
        finally {
            this.renderFrame = requestAnimationFrame(this.renderPlotLoop.bind(this));
        }
    }

    renderPlot(){
        // linked axes and other info maybe...
        if(this.DPIHasBeenSet || !this.autoResize){
            this.DPIHasBeenSet = true;
            if(this.link !== undefined){
                for(let key of this.linkedKeys){
                    if(this.link[key] !== undefined && this.mouseX === undefined){
                        this.setAttribute(key,this.link[key]);
                    }
                }
            }
            
            this.updateLayout(this.layoutSettings ?? {});
            this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
            const theme = this.themeColors;
            this.ctx.save();
            this.ctx.fillStyle = theme.background;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
            this.ctx.strokeStyle = theme.axes;
            this.ctx.fillStyle = theme.foreground;
            this.ctx.beginPath(); // clears any old path they may have made.
            
            if(this.drawingLoop){
                this.drawingLoop();
            }

            // this needs to be below the drawing loop because 
            // your drawing loop may disable the default axes. (hotAndReady does)
            if(this.defaultAxesOn){
                this.drawDefaultAxes();
            }
    
            // linked axes and other info maybe...
            if(this.link !== undefined){
                for(let key of this.linkedKeys){
                    if(this.mouseX !== undefined){
                        this.link[key] = this[key];
                    }
                }
            }
    
            this.lastFrame = new Date();
        }
    }


    drawLabel(settings) {
        const {
            x, y, text, color, theta = 0, font = this.getFont(20),
            textAlign = 'left', textBaseline = 'alphabetic'
        } = settings;
        this.ctx.save();
        if (color) this.ctx.fillStyle = color;
        this.ctx.textBaseline = textBaseline;
        this.ctx.textAlign = textAlign;
        this.ctx.font = font;
        this.ctx.translate(x, y);
        this.ctx.rotate(-theta);
        this.ctx.fillText(text, 0, 0);
        this.ctx.restore();
    }

    drawAxis(settings){
        let {x1,y1,x2,y2} = settings
        let {labelXOffset,labelYOffset,labelTheta,nTicks} = settings
        let {labels,scaleStart,scaleEnd} = settings
        let {isDatetime} = settings
    
        let r = Math.sqrt(Math.pow(y2-y1,2) + Math.pow(x2-x1,2));
        let theta = Math.asin((y2-y1)/r);

        this.ctx.save();
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = settings.axisColor ?? this.themeColors.axes;
        this.ctx.fillStyle = settings.textColor ?? this.themeColors.foreground;
        this.ctx.beginPath();
        this.ctx.moveTo(parseInt(this.scaleX(x1)), parseInt(this.scaleY(y1)));
        this.ctx.lineTo(parseInt(this.scaleX(x2)), parseInt(this.scaleY(y2)));
        this.ctx.stroke();
        const tickLength = this.layout?.tickLength ?? 10;
        const values = settings.tickValues ?? Array.from({length:nTicks}, (_, i) => i + 1);
        for (const [index, value] of values.entries()) {
            const fraction = settings.tickValues ? (value - scaleStart) / (scaleEnd - scaleStart) : value / nTicks;
            let x = this.scaleX(x1 + (x2-x1)*fraction);
            let y = this.scaleY(y1 + (y2-y1)*fraction);

            this.ctx.beginPath();
            this.ctx.moveTo(x-tickLength*Math.cos(theta-Math.PI/2), y+tickLength*Math.sin(theta-Math.PI/2));
            this.ctx.lineTo(x+tickLength*Math.cos(theta-Math.PI/2), y-tickLength*Math.sin(theta-Math.PI/2));
            this.ctx.stroke();

            if (settings.showTickLabels === false) continue;

            // labelXOffset and labelYOffset are in user coordinates (not canvas coordinates)
            let labelX = this.scaleX(this.scaleXInverse(x)+labelXOffset);
            let labelY = this.scaleY(this.scaleYInverse(y)+labelYOffset);
            let labelSettings = {
                x: labelX, 
                y: labelY, 
                theta: labelTheta, 
                textAlign: settings.labelTextAlign ?? "center",
                textBaseline: settings.labelTextBaseline ?? "alphabetic",
                font: this.getFont()
            };
            if (labels) {
                labelSettings.text = labels[index];
            } else if (!isNaN(scaleStart) && !isNaN(scaleEnd)) {
                const position = settings.tickValues ? value : scaleStart + (scaleEnd - scaleStart) * fraction;
                if (settings.tickFormat) labelSettings.text = settings.tickFormat(position);
                else if (isDatetime) labelSettings.text = helpers.getTimeLabel(fraction, 1, scaleStart, scaleEnd, settings);
                else labelSettings.text = chartLayout.tickLabel(this, position);
            } else {
                console.error("drawAxis requires labels or both scaleStart and scaleEnd");
                continue;
            }
            if (this.autoLayout && y1 === y2 && !labelTheta) {
                this.ctx.font = labelSettings.font;
                const half = this.ctx.measureText(String(labelSettings.text)).width / 2;
                labelSettings.x = Math.max(half + 2, Math.min(this.canvas.width - half - 2, labelSettings.x));
            }
            this.drawLabel(labelSettings);
        }
        this.ctx.restore();
    }



    drawDefaultAxes(settings){
        settings = defaultVal(settings,{});
        let [xTicks,yTicks] = defaultVals(settings,["xTicks","yTicks"],[this.layout?.xTicks ?? 10,this.layout?.yTicks ?? 5]);
        let [xAxisIsTime,yAxisIsTime] = defaultVals(settings,["xAxisIsTime","yAxisIsTime"],[false,false]);

        // x-axis
        let labelYOffset = this.scaleYInverse(this.autoLayout ? (this.layout?.gap ?? 8) + (this.layout?.tickLength ?? 4) : this.fontsize + 10)-this.scaleYInverse(0);
        this.drawAxis({
            x1:this.xmin,
            y1:this.ymin,
            x2:this.xmax,
            y2:this.ymin, 
            labelXOffset:0,
            labelYOffset:labelYOffset,
            labelTheta: this.autoLayout ? 0 : Math.PI/8,
            showTickLabels: settings.showTickLabels,
            labelTextBaseline: this.autoLayout ? "top" : "alphabetic",
            nTicks: xTicks,
            tickValues: this.autoLayout && this.autoTicks && settings.xTicks === undefined && !xAxisIsTime ? chartLayout.niceTicks(this.xmin, this.xmax, xTicks) : undefined,
            labels: undefined,
            scaleStart: this.xmin,
            scaleEnd: this.xmax,
            isDatetime: xAxisIsTime,
            axisColor: settings.axisColor, textColor: settings.textColor,
            tickFormat: settings.xTickFormat,
            locale: settings.locale, timeZone: settings.timeZone, timeFormat: settings.timeFormat
        })
    
        // y-axis
        let labelXOffset = this.scaleXInverse(-(this.layout?.gap ?? (this.fontsize + 10)))-this.scaleXInverse(0);
        this.drawAxis({
            x1:this.xmin,
            y1: this.ymin,
            x2:this.xmin,
            y2:this.ymax, 
            labelXOffset:labelXOffset,
            labelYOffset:0,
            labelTheta: this.autoLayout ? 0 : Math.PI/3,
            labelTextAlign: this.autoLayout ? "right" : "center",
            labelTextBaseline: this.autoLayout ? "middle" : "alphabetic",
            showTickLabels: settings.showTickLabels,
            nTicks: yTicks,
            tickValues: this.autoLayout && this.autoTicks && settings.yTicks === undefined && !yAxisIsTime ? chartLayout.niceTicks(this.ymin, this.ymax, yTicks) : undefined,
            labels: undefined,
            scaleStart: this.ymin,
            scaleEnd: this.ymax,
            isDatetime: yAxisIsTime,
            axisColor: settings.axisColor, textColor: settings.textColor,
            tickFormat: settings.yTickFormat,
            locale: settings.locale, timeZone: settings.timeZone, timeFormat: settings.timeFormat
        })
    }

    drawLine(data, lineWidth=2){
        let xs = data.xs.map(x => this.scaleX(x));
        let ys = data.ys.map(y => this.scaleY(y));

        let oldLineWidth = this.ctx.lineWidth;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(xs[0],ys[0]);
        for(let i=1; i<xs.length; i++){
            this.ctx.lineTo(xs[i],ys[i]);
        }
        this.ctx.stroke();
        this.ctx.lineWidth = oldLineWidth;
    }

    // in custom coordinates, not canvas coordinates
    mouseInCircle(cx, cy, r){
        if(this.mouseX === undefined || this.mouseY === undefined){
            return false;
        }
        return (dist(this.mouseX,this.mouseY,cx,cy) < r)
    }

    // opposite corners of a rectangle.
    mouseInRect(x1, y1, x2, y2){
        if(this.mouseX === undefined || this.mouseY === undefined){
            return false;
        }

        // helper function to tell if x is between a and b.
        function between(x,a,b){
            return (a <= x && x <= b) || (b <= x && x <= a);
        }
        return (between(this.mouseX,x1,x2) && between(this.mouseY,y1,y2))
    }    


    // standard canvas stuff wrapped or reimplemented!!
    arc(cx, cy, r, sAngle, eAngle, counterclockwise=false){
        let delta = 0.05;

        if(!counterclockwise){
            let tmp = sAngle;
            sAngle = eAngle;
            eAngle = tmp + 2*Math.PI;
        }

        let x = this.scaleX(cx + Math.cos(sAngle)*r);
        let y = this.scaleY(cy + Math.sin(sAngle)*r);
        this.ctx.moveTo(x,y);
        for(let angle=sAngle; angle<eAngle-delta; angle += delta){
                let x = this.scaleX(cx + Math.cos(angle)*r);
                let y = this.scaleY(cy + Math.sin(angle)*r);
                this.ctx.lineTo(x,y);
        }
    }

    rect(x, y, w, h){
        x = this.scaleX(x);
        y = this.scaleY(y);
        w = this.scaleX(w) - this.scaleX(0);
        h = this.scaleY(h) - this.scaleY(0);
        this.ctx.moveTo(x,y);
        this.ctx.lineTo(x,y+h);
        this.ctx.lineTo(x+w,y+h);
        this.ctx.lineTo(x+w,y);
        this.ctx.lineTo(x,y);
    }
}

customElements.define('easy-canvas', EasyCanvas);

},{"./easyCanvasHotAndReady.js":3,"./easyCanvasLayout.js":4,"./easyCanvasTheme.js":5,"./helpers.js":6}],2:[function(require,module,exports){
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
    plot.updateLayout({...settings, _radial:false});
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
        this.updateLayout({...settings, _radial:true, legendLabels});
        ctx.save();
        ctx.font = this.getFont();
        const legendTextWidth = Math.max(0, ...legendLabels.map(label => ctx.measureText(label).width));
        ctx.restore();
        const legendWidth = legendLabels.length ? Math.min(this.canvas.width * 0.45, legendTextWidth + this.fontsize * 3.5) : 0;
        const chartWidth = this.canvas.width - legendWidth;
        const x = chartWidth / 2;
        const y = this.canvas.height * (settings.showTitle !== false && settings.title ? 0.56 : 0.5);
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

},{}],3:[function(require,module,exports){
/* this file contains functions for making very common plots using easyCanvas */
/* they will be made accessable via EasyCanvas.hotAndReady */

// helpers:
const helpers = require('./helpers.js');
const {niceTicks} = require('./easyCanvasLayout.js');
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
    let padding = 10;
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
    let tooltips = defaultVal(settings.tooltips, []);
    let xAxisIsTime = defaultVal(settings.xAxisIsTime, false);
    let yAxisIsTime = defaultVal(settings.yAxisIsTime, false);
    
    settings = {...settings, legendLabels: settings.legendLabels ?? (outputs.length > 1 ? outputs : [])};
    let zipped = zip(inputs,outputs);
    
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
    if(tooltips.length != 0 && this.mouseX !== undefined){
        let tooltip = getLinePlotTooltip.bind(this)(data, inputs, outputs, tooltips, 100, settings);
        if(tooltip != undefined){
            let {x,y,info} = tooltip;
            drawTooltip.bind(this)(x,y,info);
        }
    }
    
    if(this.hotAndReadyEventListeners["linePlot"] === undefined){
        function listener(){
            // Redraw from the current drawingLoop, not data captured on the first call.
            this.renderPlot();
        };

        this.hotAndReadyEventListeners["linePlot"] = {
            mousemove: listener.bind(this)
        };
        this.canvas.addEventListener("mousemove", this.hotAndReadyEventListeners["linePlot"]["mousemove"])
    }

}




function barPlot(data, settings = {}){
    settings = {...settings, legendLabels:settings.legendLabels ?? []};
    let autoScale = defaultVal(settings.autoScale,true)
    let colors = defaultVal(settings.colors, this.themeColors.palette);

    if(autoScale){
        rescaleAxes.bind(this)(0,1,0,Math.max(...data.heights))
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
                    x2: this.xmax,
                    y2: 0, 
                    labelXOffset: 0,
                    labelYOffset: labelYOffset,
                    labelTheta: this.autoLayout ? 0 : Math.PI/15,
                    labelTextBaseline: "top",
                    showTickLabels: settings.showTickLabels,
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
    this.ctx.fillStyle = this.themeColors.foreground;
    
    if(this.defaultAxesOn){
        this.setAttribute("default-axes-on","false");
    }
    if(this.controls){
        this.setAttribute("controls","false");
    }
    drawLegendAxesLabelsAndTitle.bind(this)(settings);
}



module.exports = {
    linePlot,
    barPlot,
    drawTooltip,
    ...require('./easyCanvasCharts.js')(drawLegendAxesLabelsAndTitle, drawTooltip)
};

},{"./easyCanvasCharts.js":2,"./easyCanvasLayout.js":4,"./helpers.js":6}],4:[function(require,module,exports){
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

},{"./helpers.js":6}],5:[function(require,module,exports){
const presets = {
    light: {
        background: '#ffffff', foreground: '#20272c', axes: '#394553',
        border: '#cbd2dc', muted: '#596778', tooltipBackground: 'rgba(255,255,255,0.96)',
        legendBackground: 'rgba(255,255,255,0.9)', sliceLabel: '#ffffff',
        palette: ['#2457dc', '#c54b2b', '#168574', '#744bb4', '#956b00', '#b44772'],
        fontFamily: 'system-ui, sans-serif', fontWeight: 400, titleWeight: 600
    },
    dark: {
        background: '#171e2a', foreground: '#e7edf7', axes: '#b6c5dc',
        border: '#46536a', muted: '#afbdd2', tooltipBackground: 'rgba(28,38,55,0.97)',
        legendBackground: 'rgba(28,38,55,0.92)', sliceLabel: '#17202b',
        palette: ['#91b6ff', '#ffb394', '#8cddc7', '#cdb2ff', '#f4d181', '#f3accb'],
        fontFamily: 'system-ui, sans-serif', fontWeight: 400, titleWeight: 600
    },
    paper: {
        background: '#f7f0df', foreground: '#40372b', axes: '#756652',
        border: '#d5c6a6', muted: '#776a58', tooltipBackground: '#fff9ec',
        legendBackground: '#f7f0dfee', sliceLabel: '#fff8ec',
        palette: ['#4b6761', '#9d5b45', '#726184', '#8b713b', '#515f83', '#8c5266'],
        fontFamily: 'Georgia, serif', fontWeight: 400, titleWeight: 400
    },
    forest: {
        background: '#102b26', foreground: '#e4f4df', axes: '#9ac6a5',
        border: '#3c6152', muted: '#a3b9a5', tooltipBackground: '#193d34',
        legendBackground: '#193d34ed', sliceLabel: '#173026',
        palette: ['#b8da8e', '#75c8b0', '#f2ce8c', '#d8a6b3', '#9cbbdd', '#d4d9b0'],
        fontFamily: 'Verdana, sans-serif', fontWeight: 400, titleWeight: 600
    },
    midnight: {
        background: '#17142c', foreground: '#eeeaff', axes: '#b3a8df',
        border: '#4a406a', muted: '#b5aacd', tooltipBackground: '#2a2244',
        legendBackground: '#2a2244ed', sliceLabel: '#211831',
        palette: ['#b5a1ff', '#ffadcc', '#81dfdf', '#ffd493', '#b3e897', '#aabfff'],
        fontFamily: 'Georgia, serif', fontWeight: 400, titleWeight: 400
    },
    blueprint: {
        background: '#123b62', foreground: '#e4f3ff', axes: '#a9d3ed',
        border: '#537d9c', muted: '#b6d1e5', tooltipBackground: '#1a4b74',
        legendBackground: '#1a4b74ed', sliceLabel: '#163552',
        palette: ['#97d7ff', '#ffdf90', '#9be2c7', '#ffc3a4', '#d1c5ff', '#f3c1dd'],
        fontFamily: 'ui-monospace, monospace', fontWeight: 400, titleWeight: 600
    }
};

function resolvedTheme(plot) {
    const theme = plot.getAttribute('theme');
    if (Object.hasOwn(presets, theme)) return theme;
    return plot.themePreference?.matches ? 'dark' : 'light';
}

function themeColors(plot) {
    return {...presets[resolvedTheme(plot)], ...plot.themeOverrides};
}

function updateTheme(plot) {
    const colors = themeColors(plot);
    plot.canvas.style.backgroundColor = colors.background;
    plot.canvas.style.borderColor = colors.border;
    if (plot.DPIHasBeenSet && plot.autoRender) plot.renderPlot();
}

function initializeTheme(plot) {
    plot.themePreference = window.matchMedia?.('(prefers-color-scheme: dark)');
    plot.themePreferenceChanged = () => {
        if (plot.theme === 'auto') updateTheme(plot);
    };
    updateTheme(plot);
}

module.exports = {names: Object.keys(presets), resolvedTheme, themeColors, updateTheme, initializeTheme};

},{}],6:[function(require,module,exports){
let defaultColors = ["red", "green","orange", "blue", "purple", "yellow"];

function zip(xs,ys){
    return xs.map((v,i)=>[v,ys[i]])
}

function defaultVal(original,def){
    if(original === undefined){
        return def;
    }
    return original;
}

function defaultVals(obj,keys,defs){
    return keys.map((k,i) => defaultVal(obj[k],defs[i]));
}

function dist(x1,y1,x2,y2){
    // compute pointwise distance treating x1 as one point and y1 as another.
    // hack because js doesn't have function overloading...
    if(x2 === undefined && y2 === undefined){
        return dist(x1.x, x1.y, y1.x, y1.y);
    }

    return Math.sqrt(Math.pow(x2-x1,2) + Math.pow(y2-y1,2));
}

const timeFormatters = new Map();

// Opt-in Intl formatting keeps the original automatic labels unchanged by default.
function formatTime(value, span, options = {}) {
    const range = Math.abs(span);
    let format;
    if (range >= 2 * 365 * 86400000) format = {year: 'numeric'};
    else if (range >= 60 * 86400000) format = {year: 'numeric', month: 'short'};
    else if (range >= 86400000) format = {month: 'short', day: 'numeric'};
    else if (range >= 60000) format = {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'};
    else if (range >= 1000) format = {minute: '2-digit', second: '2-digit'};
    else format = {second: '2-digit', fractionalSecondDigits: 3};
    const config = {...(options.timeFormat || format)};
    if (options.timeZone) config.timeZone = options.timeZone;
    const key = JSON.stringify([options.locale, config]);
    if (!timeFormatters.has(key)) {
        if (timeFormatters.size >= 64) timeFormatters.clear();
        timeFormatters.set(key, new Intl.DateTimeFormat(options.locale, config));
    }
    return timeFormatters.get(key).format(new Date(value));
}

function getTimeLabel(i, nTicks, scaleStart, scaleEnd, options = {}){
    if (options.locale || options.timeZone || options.timeFormat) {
        return formatTime(scaleStart + (scaleEnd - scaleStart) * i / nTicks, scaleEnd - scaleStart, options);
    }
    let start = new Date(scaleStart);
    let now = new Date(scaleStart + (scaleEnd-scaleStart)*(i/nTicks));
    let end = new Date(scaleEnd);

    let label = now.getFullYear();

    let secondLength = 1000;
    let minuteLength = secondLength*60;
    let hourLength = minuteLength*60;
    let dayLength = hourLength*24;
    let monthLength = dayLength*30;
    let yearLength = dayLength*365;

    // years
    if(end - start > yearLength){
        label = `${now.getFullYear()}`;
    }

    // months
    else if(end - start > monthLength){
        label = `${now.getMonth()+1}/${now.getFullYear()}`;
    }

    // days
    else if(end - start > dayLength){
        label = `${now.getMonth()+1}/${now.getDate()}`;
    }

    // hours
    else if(end - start > hourLength){
        label = `${now.getHours()}h:${now.getMinutes()}m`;
    }

    // minutes
    else if(end - start > minuteLength){
        label = `${now.getMinutes()}m:${now.getSeconds()}s`;
    }

    // seconds
    else if(end - start > secondLength){
        label = `${now.getSeconds()}s`;
    }

    // milliseconds
    else{
        label = `${now.getMilliseconds()}ms`;
    }

    return label;
}





module.exports = {
    "defaultColors": defaultColors,
    "zip":zip,
    "defaultVal": defaultVal,
    "defaultVals": defaultVals,
    "dist": dist,
    "getTimeLabel": getTimeLabel,
    "formatTime": formatTime
}



},{}]},{},[1]);

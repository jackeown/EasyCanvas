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

import type { EasyCanvasElement, LinePlotSettings, BarPlotData } from '../easyCanvas';
const plot = document.createElement('easy-canvas');
const typed: EasyCanvasElement = plot;
const settings: LinePlotSettings = {inputs: ['x'], outputs: ['y'], xAxisIsTime: true};
plot.drawingLoop = () => {
  typed.hotAndReady.linePlot({x: [0, 1], y: [2, 3]}, settings);
  typed.ctx.fillRect(typed.scaleX(0), typed.scaleY(2), 5, 5);
};
const bars: BarPlotData = {bars: ['A', 'B'], heights: [2, 3]};
plot.hotAndReady.barPlot(bars, {legendLabels: bars.bars});
plot.linkInfo(['xmin', 'xmax'], {});
// @ts-expect-error Numeric data is required.
plot.hotAndReady.linePlot({xs: ['wrong'], ys: [1]}, {});
// @ts-expect-error Known settings should catch misspellings.
const bad: LinePlotSettings = {lineWitdh: 3};
void bad;

const timeSettings: LinePlotSettings = {
  xAxisIsTime: true, locale: 'en-GB', timeZone: 'Europe/Vienna',
  timeFormat: {month: 'short', day: 'numeric'},
  xTickFormat: value => new Date(value).toISOString(),
  tooltipFormatters: {temperature: (value, index) => `${index}: ${value.toFixed(1)} °C`}
};
plot.drawDefaultAxes(timeSettings);
plot.theme = 'dark';
plot.themeColors = {background:'#102b26', axes:'#8cd8c2', palette:['#91b6ff']};
plot.drawDefaultAxes({axisColor:'#8cd8c2', textColor:'#e5fff5'});
plot.themeColors = null;

plot.theme = 'paper';
plot.themeColors = {fontFamily:'Georgia, serif', titleFontFamily:'monospace', titleWeight:600};
plot.getFont(24, 'title');

plot.autoLayout = false;
plot.autoFontSize = plot.autoPadding = plot.autoTicks = false;
plot.autoResize = plot.autoRender = false;
plot.fixDPI(true);
plot.hotAndReady.linePlot({xs:[0,1],ys:[0,1]});
plot.hotAndReady.barPlot({bars:['A'],heights:[3]}, {showTitle:false,showTickLabels:false});

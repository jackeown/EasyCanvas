// Gallery examples use the same API and source as their documentation examples.
for (const plot of document.querySelectorAll('.gallery easy-canvas')) {
  plot.debug = false;
  plot.setAttribute('framerate', '12');
  plot.setAttribute('fontsize', '19');
  plot.setAttribute('xpadding', '16');
  plot.setAttribute('ypadding', '22');
}
document.querySelector('#gallery-bars').setAttribute('controls', 'false');

{
const xs = Array.from({ length: 161 }, (_, i) => i / 20);
const data = {
  xs,
  sine: xs.map(Math.sin),
  cosine: xs.map(Math.cos)
};
const plot = document.querySelector('#gallery-lines');
plot.drawingLoop = () => {
  plot.hotAndReady.linePlot(data, {
    title: 'A couple of waves',
    xLabel: 'x', yLabel: 'Amplitude',
    inputs: ['xs', 'xs'],
    outputs: ['sine', 'cosine'],
    legendLabels: ['Sine', 'Cosine'],
    colors: ['#2457dc', '#df6846'],
    tooltips: ['xs', 'sine', 'cosine']
  });
};
}

{
const plot = document.querySelector('#gallery-bars');
const data = {
  bars: ['Cake', 'Pie', 'Donuts', 'Cookies'],
  heights: [12, 8, 19, 15]
};
plot.drawingLoop = () => {
  plot.hotAndReady.barPlot(data, {
    title: 'An entirely made-up bake sale',
    xLabel: 'Dessert', yLabel: 'Sold',
    legendLabels: data.bars,
    colors: ['#2457dc', '#df6846', '#43a18b', '#9273b9']
  });
};
}

{
const plot = document.querySelector('#gallery-custom');
plot.setAttribute('xmin', '-2');
plot.setAttribute('xmax', '2');
plot.setAttribute('ymin', '-1.5');
plot.setAttribute('ymax', '1.5');
plot.drawingLoop = () => {
  plot.ctx.save();
  plot.ctx.strokeStyle = '#2457dc';
  plot.ctx.fillStyle = plot.mouseInCircle(0, 0, 0.6)
    ? '#df6846' : '#dce5ff';
  plot.ctx.beginPath();
  plot.arc(0, 0, 0.6, 0, 2 * Math.PI, true);
  plot.ctx.closePath();
  plot.ctx.fill();
  plot.ctx.stroke();
  plot.ctx.restore();
};
}

{
const plot = document.querySelector('#gallery-animation');
plot.setAttribute('xmin', '0');
plot.setAttribute('xmax', '8');
plot.setAttribute('ymin', '-1.5');
plot.setAttribute('ymax', '1.5');
plot.setAttribute('framerate', '30');
const xs = Array.from({ length: 161 }, (_, i) => i / 20);
plot.drawingLoop = () => {
  const t = matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 0 : performance.now() / 1000;
  plot.ctx.save();
  plot.ctx.strokeStyle = '#2457dc';
  plot.drawLine({ xs, ys: xs.map(x => Math.sin(x - t)) });
  plot.ctx.restore();
};
}

{
const plot = document.querySelector('#gallery-dates');
const start = Date.UTC(2026, 0, 1);
const time = Array.from({ length: 85 }, (_, i) => start + i * 7200000);
const data = {
  time,
  temperature: time.map((_, i) => 18 + 3 * Math.sin(i / 5)),
  forecast: time.map((_, i) => 18 + 2.5 * Math.sin(i / 5 + 0.3))
};
plot.drawingLoop = () => {
  plot.hotAndReady.linePlot(data, {
    title: 'A week of temperatures',
    inputs: ['time', 'time'], outputs: ['temperature', 'forecast'],
    xLabel: 'Time · UTC', yLabel: 'Temperature (°C)',
    legendLabels: ['Observed', 'Forecast'],
    colors: ['#2457dc', '#df6846'],
    xAxisIsTime: true, timeZone: 'UTC', locale: 'en-GB', xTicks: 6,
    tooltips: ['time', 'temperature'],
    tooltipFormatters: { temperature: value => `${value.toFixed(1)} °C` }
    // Optional: timeFormat: { month: 'short', day: 'numeric' }
    // Or: xTickFormat: value => new Date(value).toISOString().slice(0, 10)
  });
};
}

const guideSections = ['start', 'line-plots', 'bar-plots', 'linked', 'custom-drawing', 'animation-updates', 'time-axes', 'typescript', 'reference', 'notes'];
if (guideSections.includes(location.hash.slice(1))) location.replace('guide.html' + location.hash);

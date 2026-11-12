// Generated from docs/snippets.json by npm run docs:highlight.
for (const plot of document.querySelectorAll('.gallery easy-canvas')) {
    plot.debug = false;
    plot.setAttribute('framerate', '12');
}


{
const xs = Array.from({ length: 161 }, (_, i) => i / 20);
const data = {
  xs,
  sine: xs.map(Math.sin),
  cosine: xs.map(Math.cos)
};
const plot = document.querySelector('#gallery-lines');
// Uncomment to turn off pan and zoom:
// plot.setAttribute('controls', 'false');
// Hide hotAndReady axes with { axes: false } in the settings.
// For custom drawing, uncomment to hide axes:
// plot.setAttribute('default-axes-on', 'false');
plot.drawingLoop = () => {
  plot.hotAndReady.linePlot(data, {
    title: 'A couple of waves',
    xLabel: 'x', yLabel: 'Amplitude',
    inputs: ['xs', 'xs'],
    outputs: ['sine', 'cosine'],
    legendLabels: ['Sine', 'Cosine'],
    tooltips: ['xs', 'sine', 'cosine']
  });
};
}

{
const plot = document.querySelector('#gallery-bars');
// Uncomment to turn off pan and zoom:
// plot.setAttribute('controls', 'false');
// Hide hotAndReady axes with { axes: false } in the settings.
// For custom drawing, uncomment to hide axes:
// plot.setAttribute('default-axes-on', 'false');
const data = {
  bars: ['Cake', 'Pie', 'Donuts', 'Cookies'],
  heights: [12, 8, 19, 15]
};
plot.drawingLoop = () => {
  plot.hotAndReady.barPlot(data, {
    title: 'Bake sale',
    xLabel: 'Dessert', yLabel: 'Sold',
    legendLabels: data.bars,
  });
};
}

{
const plot = document.querySelector('#gallery-custom');
// Uncomment to turn off pan and zoom:
// plot.setAttribute('controls', 'false');
// Hide hotAndReady axes with { axes: false } in the settings.
// For custom drawing, uncomment to hide axes:
// plot.setAttribute('default-axes-on', 'false');
plot.setAttribute('xmin', '-2');
plot.setAttribute('xmax', '2');
plot.setAttribute('ymin', '-1.5');
plot.setAttribute('ymax', '1.5');
plot.drawingLoop = () => {
  plot.ctx.save();
  plot.ctx.strokeStyle = plot.themeColors.palette[0];
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
// Uncomment to turn off pan and zoom:
// plot.setAttribute('controls', 'false');
// Hide hotAndReady axes with { axes: false } in the settings.
// For custom drawing, uncomment to hide axes:
// plot.setAttribute('default-axes-on', 'false');
plot.setAttribute('xmin', '0');
plot.setAttribute('xmax', '8');
plot.setAttribute('ymin', '-1.5');
plot.setAttribute('ymax', '1.5');
plot.setAttribute('framerate', '30');
const xs = Array.from({ length: 161 }, (_, i) => i / 20);
plot.drawingLoop = () => {
  const t = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : performance.now() / 1000;
  plot.ctx.save();
  plot.ctx.strokeStyle = plot.themeColors.palette[0];
  plot.drawLine({ xs, ys: xs.map(x => Math.sin(x - t)) });
  plot.ctx.restore();
};
}

{
const plot = document.querySelector('#gallery-dates');
// Uncomment to turn off pan and zoom:
// plot.setAttribute('controls', 'false');
// Hide hotAndReady axes with { axes: false } in the settings.
// For custom drawing, uncomment to hide axes:
// plot.setAttribute('default-axes-on', 'false');
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
    xAxisIsTime: true, timeZone: 'UTC', locale: 'en-GB', xTicks: 6,
    tooltips: ['time', 'temperature'],
    tooltipFormatters: { temperature: value => `${value.toFixed(1)} °C` }
    // Optional: timeFormat: { month: 'short', day: 'numeric' }
    // Or: xTickFormat: value => new Date(value).toISOString().slice(0, 10)
  });
};
}

const guideSections = ['automatic-layout','features','themes','controls','start','line-plots','bar-plots','linked','custom-drawing','animation-updates','time-axes','typescript','reference','notes'];
if (guideSections.includes(location.hash.slice(1))) location.replace('guide.html' + location.hash);

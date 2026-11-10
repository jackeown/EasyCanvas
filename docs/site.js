// Documentation examples and page interactions.
for (const plot of document.querySelectorAll('easy-canvas')) {
  plot.debug = false;
  plot.setAttribute('fontsize', '22');
  plot.setAttribute('xpadding', '13');
  plot.setAttribute('ypadding', '20');
}
document.querySelector('#bars').setAttribute('controls', 'false');

{
const xs = Array.from({ length: 161 }, (_, i) => i / 20);
const data = {
  xs,
  sine: xs.map(Math.sin),
  cosine: xs.map(Math.cos)
};
const plot = document.querySelector('#lines');
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
const plot = document.querySelector('#bars');
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
const link = {};
const xs = Array.from({ length: 161 }, (_, i) => i / 20);
for (const [id, fn, title] of [
  ['linked-sine', Math.sin, 'Sine'],
  ['linked-cosine', Math.cos, 'Cosine']
]) {
  const plot = document.getElementById(id);
  plot.linkInfo(['xmin', 'xmax'], link);
  const data = { xs, ys: xs.map(fn) };
  plot.drawingLoop = () => {
    plot.hotAndReady.linePlot(data, {
      title, xLabel: 'Shared x', yLabel: 'Value',
      colors: ['#2457dc']
    });
  };
}
}

{
const plot = document.querySelector('#custom');
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
const plot = document.querySelector('#animation');
plot.setAttribute('xmin', '0');
plot.setAttribute('xmax', '8');
plot.setAttribute('ymin', '-1.5');
plot.setAttribute('ymax', '1.5');
plot.setAttribute('framerate', '30');
const xs = Array.from({ length: 161 }, (_, i) => i / 20);
plot.drawingLoop = () => {
  const t = performance.now() / 1000;
  plot.ctx.save();
  plot.ctx.strokeStyle = '#2457dc';
  plot.drawLine({ xs, ys: xs.map(x => Math.sin(x - t)) });
  plot.ctx.restore();
};
}

{
const plot = document.querySelector('#dates');
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

const animation = document.querySelector('#animation');
const drawAnimation = animation.drawingLoop;
let frozenTime;
document.querySelector('#toggle-animation').addEventListener('click', event => {
  const paused = event.currentTarget.getAttribute('aria-pressed') !== 'true';
  if (paused) {
    // Freeze the drawing itself, since framerate=0 still permits timer redraws.
    frozenTime = performance.now() / 1000;
    animation.drawingLoop = () => {
      animation.ctx.save();
      animation.ctx.strokeStyle = '#2457dc';
      const xs = Array.from({length: 161}, (_, i) => i / 20);
      animation.drawLine({xs, ys: xs.map(x => Math.sin(x - frozenTime))});
      animation.ctx.restore();
    };
  } else animation.drawingLoop = drawAnimation;
  event.currentTarget.setAttribute('aria-pressed', String(paused));
  event.currentTarget.textContent = paused ? 'Resume animation' : 'Pause animation';
});
if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelector('#toggle-animation').click();
}
for (const button of document.querySelectorAll('.copy')) {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.parentElement.querySelector('code').textContent);
      button.textContent = 'Copied!';
    } catch {
      button.textContent = 'Select code to copy';
    }
    setTimeout(() => { button.textContent = 'Copy'; }, 2000);
  });
}
const links = [...document.querySelectorAll('nav a')];
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    for (const link of links) {
      if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
}, {rootMargin: '-10% 0px -65% 0px'});
for (const section of document.querySelectorAll('main section')) observer.observe(section);

// Native details provide keyboard-accessible reference sections; search opens matches.
const apiSearch = document.querySelector('#api-search');
const apiDetails = [...document.querySelectorAll('.api-detail')];
apiSearch.addEventListener('input', () => {
  const query = apiSearch.value.trim().toLowerCase();
  let matches = 0;
  for (const detail of apiDetails) {
    const match = !query || detail.textContent.toLowerCase().includes(query);
    detail.hidden = !match;
    detail.open = Boolean(query && match);
    if (match) matches++;
  }
  for (const family of document.querySelectorAll('.api-family')) {
    family.hidden = ![...family.querySelectorAll('.api-detail')].some(detail => !detail.hidden);
  }
  document.querySelector('#api-search-status').textContent = query
    ? matches ? matches + ' reference sections match.' : 'No matching API members. Try a method or option name.'
    : '';
});
function revealReferenceTarget() {
  const target = document.getElementById(location.hash.slice(1));
  if (!target) return;
  let detail = target.closest('details');
  while (detail) { detail.open = true; detail = detail.parentElement.closest('details'); }
}
window.addEventListener('hashchange', revealReferenceTarget);
revealReferenceTarget();

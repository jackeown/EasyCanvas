// Gallery examples use the same API and source as their documentation examples.
const galleryDescriptions = {
  "lines": "Pair named data columns with inputs and outputs. This example draws sine and cosine from the same x values. Drag to pan, scroll to zoom, and hover near a line to inspect its values. Tooltips require ascending x values and a shared input column.",
  "bars": "Give barPlot matching bars and heights arrays. The helper draws category labels, colors and a legend; hovering a bar highlights it. This example uses made-up nonnegative values and disables mouse controls so the category layout stays fixed.",
  "custom": "The context is still yours. arc uses data coordinates and mouseInCircle tests the pointer in those same coordinates. Hover the shape to change its fill. save and restore keep its colors separate from the axes and tick labels. Unequal x/y pixel scales make the circle appear elliptical.",
  "animation": "EasyCanvas clears the canvas and runs drawingLoop automatically. This example computes the wave from elapsed time, then draws it with drawLine. save and restore keep the wave blue and the axes neutral. Reduced-motion preferences show a still frame; the animation guide has a pause control.",
  "dates": "Store dates as Unix timestamps in milliseconds and set xAxisIsTime to true. EasyCanvas formats the ticks for the visible time range in the browser\u2019s local timezone. These seven values are illustrative data, not a real measurement."
};
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
const data = {
  xs: Array.from({ length: 7 }, (_, i) => start + i * 86400000),
  ys: [4, 6, 5, 9, 8, 12, 10]
};
plot.drawingLoop = () => {
  plot.hotAndReady.linePlot(data, {
    title: 'One week of example data',
    xLabel: 'Date', yLabel: 'Value',
    xAxisIsTime: true, xTicks: 4,
    colors: ['#2457dc']
  });
};
}

const exampleDialog = document.querySelector('#example-dialog');
const exampleCode = document.querySelector('#example-code');
let guideSource;
let openedExample = 0;
function loadGuide() {
  if (!guideSource) {
    guideSource = fetch('guide.html').then(response => {
      if (!response.ok) throw new Error('Guide could not be loaded');
      return response.text();
    }).then(html => new DOMParser().parseFromString(html, 'text/html')).catch(error => {
      guideSource = undefined;
      throw error;
    });
  }
  return guideSource;
}
for (const button of document.querySelectorAll('.gallery-title')) {
  button.addEventListener('click', async () => {
    const id = button.dataset.example;
    const request = ++openedExample;
    document.querySelector('#example-title').textContent = button.textContent.replace(' ↗', '');
    document.querySelector('#example-description').textContent = galleryDescriptions[id] || customExampleInfo[id].description;
    document.querySelector('#example-element').textContent = '<easy-canvas id="gallery-' + id + '"' + (id === 'bars' ? ' controls="false"' : '') + ' style="display:block; width:100%; height:300px"></easy-canvas>';
    document.querySelector('#example-guide').href = 'guide.html#' + button.dataset.section;
    exampleCode.textContent = 'Loading code…';
    exampleDialog.showModal();
    if (typeof customExampleInfo !== 'undefined' && customExampleInfo[id]) {
      const wrapper = document.createElement('div');
      wrapper.className = 'code-wrap';
      wrapper.innerHTML = customExampleInfo[id].html;
      exampleCode.replaceChildren(wrapper);
      return;
    }
    try {
      const guide = await loadGuide();
      if (request !== openedExample || !exampleDialog.open) return;
      const source = guide.querySelector('#' + button.dataset.section + ' .code-wrap');
      const copy = source.cloneNode(true);
      // Reuse the guide's highlighted source, without repeating the guide on the homepage.
      copy.innerHTML = copy.innerHTML.replaceAll('#' + id, '#gallery-' + id);
      if (id === 'animation') {
        const note = document.createElement('p');
        note.className = 'caption';
        note.textContent = 'The gallery holds a still frame when reduced motion is enabled.';
        copy.appendChild(note);
      }
      exampleCode.replaceChildren(copy);
    } catch {
      if (request === openedExample) exampleCode.textContent = 'Could not load the example code. You can open the full guide using the link below.';
    }
  });
}
exampleDialog.querySelector('.modal-close').addEventListener('click', () => exampleDialog.close());
exampleDialog.addEventListener('click', event => {
  if (event.target.closest('.copy')) {
    const button = event.target.closest('.copy');
    navigator.clipboard.writeText(exampleCode.querySelector('code').textContent).then(() => {
      button.textContent = 'Copied!';
    }, () => { button.textContent = 'Select code to copy'; });
    setTimeout(() => { button.textContent = 'Copy'; }, 2000);
  }
  if (event.target !== exampleDialog) return;
  const rect = exampleDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) exampleDialog.close();
});
document.querySelector('#example-guide').addEventListener('click', () => exampleDialog.close());

const guideSections = ['start', 'line-plots', 'bar-plots', 'linked', 'custom-drawing', 'animation-updates', 'time-axes', 'typescript', 'reference', 'notes'];
if (guideSections.includes(location.hash.slice(1))) location.replace('guide.html' + location.hash);

// Interactive date and timezone controls in the documentation.
function makeTimeData(start, span) {
  const time = Array.from({length: 85}, (_, i) => start + span * i / 84);
  return {
    time,
    temperature: time.map((_, i) => 18 + 3 * Math.sin(i / 5)),
    forecast: time.map((_, i) => 18 + 2.5 * Math.sin(i / 5 + 0.3))
  };
}
function setupTimeDemo(plot, container) {
  const field = name => container.querySelector('[name="' + name + '"]');
  const status = container.querySelector('.time-status');
  const start = Date.UTC(2026, 0, 1);
  let data, settings;
  plot.drawingLoop = () => plot.hotAndReady.linePlot(data, settings);
  plot.setAttribute('framerate', '4');
  function update() {
    const span = Number(field('range').value);
    const timeZone = field('zone').value || undefined;
    const locale = field('locale').value;
    const mode = field('format').value;
    data = makeTimeData(start, span);
    settings = {
      title: 'A week of temperatures',
      inputs: ['time', 'time'], outputs: ['temperature', 'forecast'],
      legendLabels: ['Observed', 'Forecast'],
      xLabel: 'Time · ' + (mode === 'iso' ? 'UTC' : timeZone || 'browser local'),
      yLabel: 'Temperature (°C)', xTicks: Number(field('ticks').value),
      xAxisIsTime: true, locale, timeZone,
      tooltips: ['time', 'temperature'],
      tooltipFormatters: {temperature: value => `${value.toFixed(1)} °C`}
    };
    settings.title = span < 1000 ? 'Half a second' : span < 60000 ? 'Thirty seconds' : span < 3600000 ? 'Thirty minutes' : span < 172800000 ? 'One day' : span < 31536000000 ? 'One week' : 'Five years';
    if (mode === 'detailed') settings.timeFormat = {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    };
    if (mode === 'iso') settings.xTickFormat = value => new Date(value).toISOString().slice(0, span < 1000 ? 23 : 19).replace('T', ' ');
    const format = new Intl.DateTimeFormat(locale, {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: span < 60000 ? 3 : undefined, timeZoneName: 'short', timeZone});
    status.textContent = format.format(start) + ' → ' + format.format(start + span) + ' · Synthetic data';
    plot.alreadyAutoScaledLinePlot = false;
    plot.renderPlot();
  }
  container.addEventListener('change', update);
  container.querySelector('[data-time-reset]').addEventListener('click', update);
  update();
}
for (const container of document.querySelectorAll('[data-time-demo]')) {
  setupTimeDemo(container.querySelector('easy-canvas'), container);
}

const palettes = {
    light: {
        background: '#ffffff', foreground: '#20272c', axes: '#394553',
        border: '#cbd2dc', muted: '#596778', tooltipBackground: 'rgba(255,255,255,0.96)',
        legendBackground: 'rgba(255,255,255,0.9)', sliceLabel: '#ffffff',
        palette: ['#2457dc', '#c54b2b', '#168574', '#744bb4', '#956b00', '#b44772']
    },
    dark: {
        background: '#171e2a', foreground: '#e7edf7', axes: '#b6c5dc',
        border: '#46536a', muted: '#afbdd2', tooltipBackground: 'rgba(28,38,55,0.97)',
        legendBackground: 'rgba(28,38,55,0.92)', sliceLabel: '#17202b',
        palette: ['#91b6ff', '#ffb394', '#8cddc7', '#cdb2ff', '#f4d181', '#f3accb']
    }
};

function resolvedTheme(plot) {
    const theme = plot.getAttribute('theme');
    if (theme === 'light' || theme === 'dark') return theme;
    return plot.themePreference?.matches ? 'dark' : 'light';
}

function themeColors(plot) {
    return {...palettes[resolvedTheme(plot)], ...plot.themeOverrides};
}

function updateTheme(plot) {
    if (!plot.themeToggle) return;
    const colors = themeColors(plot);
    const dark = resolvedTheme(plot) === 'dark';
    plot.canvas.style.backgroundColor = colors.background;
    plot.canvas.style.borderColor = colors.border;
    plot.themeToggle.style.backgroundColor = colors.background;
    plot.themeToggle.style.color = colors.muted;
    plot.themeToggle.style.borderColor = colors.border;
    plot.themeToggle.textContent = dark ? 'Light' : 'Dark';
    plot.themeToggle.setAttribute('aria-label', dark ? 'Use light chart theme' : 'Use dark chart theme');
    plot.themeToggle.setAttribute('aria-pressed', String(dark));
    plot.themeToggle.hidden = plot.getAttribute('show-theme-toggle') === 'false';
    if (plot.DPIHasBeenSet) plot.renderPlot();
}

function initializeTheme(plot) {
    plot.themePreference = window.matchMedia?.('(prefers-color-scheme: dark)');
    plot.themePreferenceChanged = () => {
        if (plot.theme === 'auto') updateTheme(plot);
    };
    const style = document.createElement('style');
    style.textContent = `
        :host { position: relative; display: block; }
        button { position: absolute; top: 6px; left: 6px; z-index: 1; padding: 3px 7px;
          border: 1px solid; border-radius: 4px; cursor: pointer; font: 11px/1.4 system-ui; }
        button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
        button[hidden] { display: none; }
    `;
    const button = document.createElement('button');
    button.type = 'button';
    button.addEventListener('click', () => {
        plot.theme = resolvedTheme(plot) === 'dark' ? 'light' : 'dark';
    });
    plot.themeToggle = button;
    plot.shadow.appendChild(style);
    plot.shadow.appendChild(button);
    updateTheme(plot);
}

module.exports = {resolvedTheme, themeColors, updateTheme, initializeTheme};

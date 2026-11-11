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
    if (plot.DPIHasBeenSet) plot.renderPlot();
}

function initializeTheme(plot) {
    plot.themePreference = window.matchMedia?.('(prefers-color-scheme: dark)');
    plot.themePreferenceChanged = () => {
        if (plot.theme === 'auto') updateTheme(plot);
    };
    updateTheme(plot);
}

module.exports = {names: Object.keys(presets), resolvedTheme, themeColors, updateTheme, initializeTheme};

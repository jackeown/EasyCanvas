(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    let preference;
    try { preference = localStorage.getItem('easycanvas-theme'); } catch {}
    const root = document.documentElement;
    function apply() {
        root.dataset.theme = preference || (media.matches ? 'dark' : 'light');
        const toggle = document.querySelector('[data-theme-toggle]');
        if (!toggle) return;
        const dark = root.dataset.theme === 'dark';
        toggle.setAttribute('aria-pressed', String(dark));
    }
    apply();
    media.addEventListener('change', apply);
    document.addEventListener('DOMContentLoaded', () => {
        apply();
        document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
            preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem('easycanvas-theme', preference); } catch {}
            apply();
        });
    });
})();

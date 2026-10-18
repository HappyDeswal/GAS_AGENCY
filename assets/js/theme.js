let initialized = false;
function refreshThemeControls() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    document.querySelectorAll('#theme-toggle, [data-theme-toggle]').forEach(button => {
        button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
        button.setAttribute('aria-pressed', String(isDark));
        button.title = isDark ? 'Light theme' : 'Dark theme';
    });
    const appearanceSelect = document.querySelector('[name="settings-theme"]');
    if (appearanceSelect)
        appearanceSelect.value = isDark ? 'dark' : 'light';
}
export function initializeTheme() {
    let preference = 'light';
    try {
        preference = localStorage.getItem('gas-theme') || 'light';
    }
    catch {
    }
    document.documentElement.dataset.theme = preference === 'dark' ? 'dark' : 'light';
    if (!initialized) {
        // Delegation works even when the header or auth toolbar is rendered later.
        document.addEventListener('click', event => {
            if (event.target.closest('#theme-toggle, [data-theme-toggle]')) {
                setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
            }
        });
        initialized = true;
    }
    refreshThemeControls();
}
export function setTheme(value) {
    if (!['dark', 'light'].includes(value))
        return;
    document.documentElement.dataset.theme = value;
    try {
        localStorage.setItem('gas-theme', value);
    }
    catch {
    }
    refreshThemeControls();
    document.dispatchEvent(new CustomEvent('theme-change'));
}

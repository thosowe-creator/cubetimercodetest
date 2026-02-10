// --- Dark Mode ---
window.setThemeSettingsAccess = (isDark) => {
    const btn = document.getElementById('themeSettingsBtn');
    if (!btn) return;
    const disabled = !!isDark;
    btn.disabled = disabled;
    btn.classList.toggle('theme-disabled', disabled);
    btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    btn.tabIndex = disabled ? -1 : 0;
    if (disabled && typeof window.closeThemeSettings === 'function') {
        window.closeThemeSettings();
    }
};

function toggleDarkMode(checkbox) {
    const isDark = checkbox.checked;
    document.documentElement.classList.toggle('dark', isDark);
    if (typeof window.setThemeSettingsAccess === 'function') {
        window.setThemeSettingsAccess(isDark);
    }
    saveData();
    if(activeTool === 'graph') renderHistoryGraph();
}

window.setThemeSettingsAccess(document.documentElement.classList.contains('dark'));

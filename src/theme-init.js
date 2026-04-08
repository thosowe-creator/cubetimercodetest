(function () {
try {
const raw = localStorage.getItem('cubeTimerData_v5') || localStorage.getItem('cubeTimerData_v4');
if (!raw) return;
const data = JSON.parse(raw);
const isDark = !!(data && data.settings && data.settings.isDarkMode);
document.documentElement.classList.toggle('dark', isDark);
} catch (_) {}
})();

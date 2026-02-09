// --- Mobile Tab Logic ---
window.switchMobileTab = (tab) => {
    // Close Settings if open (prevents overlay stacking on mobile)
    try {
        const _so = document.getElementById('settingsOverlay');
        if (_so && _so.classList.contains('active')) closeSettings();
    } catch (e) {}

    if (tab === 'timer') {
        // Show Timer, Hide History
        timerSection.classList.remove('hidden');
        historySection.classList.add('hidden');
        // Ensure we don't leave mobile-only flex layout on history section
        historySection.classList.remove('flex');
        
        // Update Tab Colors
        mobTabTimer.className = "flex flex-col items-center justify-center w-full h-full text-blue-600 dark:text-blue-400";
        mobTabHistory.className = "flex flex-col items-center justify-center w-full h-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors";
    } else if (tab === 'history') {
        // Hide Timer, Show History
        timerSection.classList.add('hidden');
        historySection.classList.remove('hidden');
        // Force flex for history section when active on mobile
        historySection.classList.add('flex');
        // Update Tab Colors
        mobTabHistory.className = "flex flex-col items-center justify-center w-full h-full text-blue-600 dark:text-blue-400";
        mobTabTimer.className = "flex flex-col items-center justify-center w-full h-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors";
        
        // Refresh graph if tool is active
        if(activeTool === 'graph') renderHistoryGraph();
    }
};
// Ensure desktop layout on resize
window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
        // Desktop: Show both
        timerSection.classList.remove('hidden');
        historySection.classList.remove('hidden');
        historySection.classList.add('flex');
    } else {
        // Mobile: Revert to current tab state (defaulting to timer if mixed)
        if (mobTabTimer.classList.contains('text-blue-600') || mobTabTimer.classList.contains('text-blue-400')) {
            switchMobileTab('timer');
        } else {
            switchMobileTab('history');
        }
    }
    scheduleLayout('resize');
});

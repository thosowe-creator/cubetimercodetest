// Infinite Scroll Event Listener
historyList.addEventListener('scroll', () => {
    if (historyList.scrollTop + historyList.clientHeight >= historyList.scrollHeight - 50) {
        // Near bottom
        const sid = getCurrentSessionId();
        const total = solves.filter(s => s.event === currentEvent && s.sessionId === sid).length;
        if (displayedSolvesCount < total) {
            displayedSolvesCount += SOLVES_BATCH_SIZE;
            updateUI(); // Re-render with more items
        }
    }
});

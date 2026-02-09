// --- Penalty Functions ---
function updatePenaltyBtns(s) {
    if (plus2Btn && dnfBtn) {
        plus2Btn.className = `penalty-btn ${s?.penalty==='+2'?'active-plus2':'inactive'}`;
        dnfBtn.className = `penalty-btn ${s?.penalty==='DNF'?'active-dnf':'inactive'}`;
    }
}
function resetPenalty() {
    updatePenaltyBtns(null);
}
function deleteSolve(id) {
    solves = solves.filter(s => s.id !== id);
    updateUI();
    saveData();
}
function togglePenalty(p) {
    if(!solves.length || isRunning) return;
    const sid = getCurrentSessionId();
    const currentList = solves.filter(s => s.event === currentEvent && s.sessionId === sid);
    if (!currentList.length) return;
    const targetSolve = currentList[0];
    targetSolve.penalty = (targetSolve.penalty===p)?null:p;
    
    if (targetSolve.penalty === 'DNF') {
        timerEl.innerText = 'DNF';
    } else {
        const t = targetSolve.time + (targetSolve.penalty === '+2' ? 2000 : 0);
        timerEl.innerText = formatTime(t) + (targetSolve.penalty === '+2' ? '+' : '');
    }
    
    updateUI(); updatePenaltyBtns(targetSolve); saveData();
}

// Toggle penalty for an arbitrary solve in the history list (used by each row's +2/DNF buttons).
// This MUST exist because history rows are rendered with inline onclick="toggleSolvePenalty(...)".
function toggleSolvePenalty(solveId, p) {
    try {
        if (isRunning) return;
        const s = solves.find(x => x.id === solveId);
        if (!s) return;

        s.penalty = (s.penalty === p) ? null : p;

        // If the edited solve is the latest solve in the current event/session, reflect it on the main timer + top penalty buttons.
        const sid = getCurrentSessionId();
        const currentList = solves.filter(x => x.event === currentEvent && x.sessionId === sid);
        if (currentList.length && currentList[0].id === s.id) {
            if (s.penalty === 'DNF') {
                timerEl.innerText = 'DNF';
            } else {
                const t = s.time + (s.penalty === '+2' ? 2000 : 0);
                timerEl.innerText = formatTime(t) + (s.penalty === '+2' ? '+' : '');
            }
            updatePenaltyBtns(s);
        }

        updateUI();
        saveData();
    } catch (err) {
        // Fail silently to avoid breaking tap/click globally.
        console.error('toggleSolvePenalty error:', err);
    }
}

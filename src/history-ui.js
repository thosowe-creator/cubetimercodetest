// Updated UpdateUI with Lazy Loading support
function updateUI() {
    const sid = getCurrentSessionId();
    const filtered = solves.filter(s => s.event === currentEvent && s.sessionId === sid);

    const activeSession = (sessions[currentEvent] || []).find(s => s.isActive);
    if (activeSession) {
        const el = document.getElementById('currentSessionNameDisplay');
        if (el) el.innerText = activeSession.name;
    }

    // Lazy Render
    const subset = filtered.slice(0, displayedSolvesCount);

    const solvePrimaryText = (s) => {
        if (s.event === '333mbf' && s.mbf) {
            return s.mbf.resultText || `${s.mbf.solved}/${s.mbf.attempted} ${formatClockTime(s.mbf.timeMs || s.time)}`;
        }
        const base = (s.penalty === 'DNF')
            ? 'DNF'
            : formatTime(s.penalty === '+2' ? s.time + 2000 : s.time);
        return `${base}${s.penalty === '+2' ? '+' : ''}`;
    };

    historyList.innerHTML = subset.map(s => `
        <div class="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-xl flex justify-between items-center group cursor-pointer hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all" onclick="showSolveDetails(${s.id})">
            <span class="font-bold text-slate-700 dark:text-slate-200 text-sm">${solvePrimaryText(s)}</span>
            <div class="flex items-center gap-2">
                ${s.event === '333mbf' ? '' : `
                    <button class="history-pen-btn ${s.penalty === '+2' ? 'active-plus2' : ''}" onclick="event.stopPropagation(); toggleSolvePenalty(${s.id}, '+2')">+2</button>
                    <button class="history-pen-btn ${s.penalty === 'DNF' ? 'active-dnf' : ''}" onclick="event.stopPropagation(); toggleSolvePenalty(${s.id}, 'DNF')">DNF</button>
                `}
                <button onclick="event.stopPropagation(); deleteSolve(${s.id})" class="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 font-black text-lg leading-none" aria-label="Delete">&times;</button>
            </div>
        </div>
    `).join('') || '<div class="text-center py-10 text-slate-300 text-[11px] italic">No solves yet</div>';

    solveCountEl.innerText = filtered.length;

    // Stats
    if (currentEvent === '333mbf') {
        labelPrimaryAvg.innerText = "-";
        displayPrimaryAvg.innerText = "-";
        displayAo12.innerText = "-";
        sessionAvgEl.innerText = "-";
        bestSolveEl.innerText = "-";
        if (activeTool === 'graph') renderHistoryGraph();
        return;
    }

    if (isAo5Mode) {
        labelPrimaryAvg.innerText = "Ao5";
        displayPrimaryAvg.innerText = calculateAvg(filtered, 5);
    } else {
        labelPrimaryAvg.innerText = "Mo3";
        displayPrimaryAvg.innerText = calculateAvg(filtered, 3, true);
    }
    displayAo12.innerText = calculateAvg(filtered, 12);

    const valid = filtered
        .filter(s => s.penalty !== 'DNF')
        .map(s => s.penalty === '+2' ? s.time + 2000 : s.time);

    sessionAvgEl.innerText = valid.length
        ? formatTime(valid.reduce((a, b) => a + b, 0) / valid.length)
        : "-";

    bestSolveEl.innerText = valid.length
        ? formatTime(Math.min(...valid))
        : "-";

    if (activeTool === 'graph') renderHistoryGraph();
}



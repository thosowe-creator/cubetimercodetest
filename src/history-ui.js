// Updated UpdateUI with Lazy Loading support
function updateUI() {
    const sid = getCurrentSessionId();
    const filtered = appState.solves.filter(s => s.event === appState.currentEvent && s.sessionId === sid);

    const activeSession = (appState.sessions[appState.currentEvent] || []).find(s => s.isActive);
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

    historyList.innerHTML = '';
    if (!subset.length) {
        const empty = document.createElement('div');
        empty.className = 'text-center py-10 text-slate-300 text-[11px] italic';
        empty.textContent = 'No solves yet';
        historyList.appendChild(empty);
    } else {
        subset.forEach((s) => {
            const row = document.createElement('div');
            row.className = 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-xl flex justify-between items-center group cursor-pointer hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all';
            row.dataset.action = 'show-solve-details';
            row.dataset.solveId = String(s.id);

            const timeText = document.createElement('span');
            timeText.className = 'font-bold text-slate-700 dark:text-slate-200 text-sm';
            timeText.textContent = solvePrimaryText(s);
            row.appendChild(timeText);

            const controls = document.createElement('div');
            controls.className = 'flex items-center gap-2';

            if (s.event !== '333mbf') {
                const plus2Btn = document.createElement('button');
                plus2Btn.className = `history-pen-btn ${s.penalty === '+2' ? 'active-plus2' : ''}`;
                plus2Btn.dataset.action = 'toggle-solve-penalty';
                plus2Btn.dataset.solveId = String(s.id);
                plus2Btn.dataset.penalty = '+2';
                plus2Btn.textContent = '+2';
                controls.appendChild(plus2Btn);

                const dnfBtn = document.createElement('button');
                dnfBtn.className = `history-pen-btn ${s.penalty === 'DNF' ? 'active-dnf' : ''}`;
                dnfBtn.dataset.action = 'toggle-solve-penalty';
                dnfBtn.dataset.solveId = String(s.id);
                dnfBtn.dataset.penalty = 'DNF';
                dnfBtn.textContent = 'DNF';
                controls.appendChild(dnfBtn);
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 font-black text-lg leading-none';
            deleteBtn.dataset.action = 'delete-solve';
            deleteBtn.dataset.solveId = String(s.id);
            deleteBtn.setAttribute('aria-label', 'Delete');
            deleteBtn.textContent = '×';
            controls.appendChild(deleteBtn);

            row.appendChild(controls);
            historyList.appendChild(row);
        });
    }

    solveCountEl.innerText = filtered.length;

    // Stats
    if (appState.currentEvent === '333mbf') {
        labelPrimaryAvg.innerText = "-";
        displayPrimaryAvg.innerText = "-";
        displayAo12.innerText = "-";
        sessionAvgEl.innerText = "-";
        bestSolveEl.innerText = "-";
        if (activeTool === 'graph') renderHistoryGraph();
        return;
    }

    if (appState.isAo5Mode) {
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


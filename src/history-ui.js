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
        subset.forEach((s, solveIndex) => {
            const rowSlice = filtered.slice(solveIndex);
            const ao5AtSolve = s.event === '333mbf' ? '-' : calculateAvg(rowSlice, 5);
            const ao12AtSolve = s.event === '333mbf' ? '-' : calculateAvg(rowSlice, 12);

            const row = document.createElement('div');
            row.className = 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-xl group cursor-pointer hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all';
            row.dataset.action = 'show-solve-details';
            row.dataset.solveId = String(s.id);

            const rowGrid = document.createElement('div');
            rowGrid.className = 'grid grid-cols-[minmax(0,1fr)_80px_80px] gap-2 items-center';

            const recordWrap = document.createElement('div');
            recordWrap.className = 'min-w-0 flex flex-col gap-2';

            const timeText = document.createElement('span');
            timeText.className = 'font-bold text-slate-700 dark:text-slate-200 text-sm truncate';
            timeText.textContent = solvePrimaryText(s);
            recordWrap.appendChild(timeText);

            const splitText = (typeof getSplitTextForSolve === 'function') ? getSplitTextForSolve(s) : '';
            if (splitText) {
                const splitEl = document.createElement('span');
                splitEl.className = 'text-[10px] font-bold text-slate-400 truncate';
                splitEl.textContent = splitText;
                recordWrap.appendChild(splitEl);
            }

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

            recordWrap.appendChild(controls);

            const ao5El = document.createElement('span');
            ao5El.className = `text-sm font-bold text-right pr-1 ${ao5AtSolve !== '-' ? 'text-blue-600 dark:text-blue-400 hover:underline cursor-pointer' : 'text-slate-400 dark:text-slate-500'}`;
            ao5El.textContent = ao5AtSolve;
            if (ao5AtSolve !== '-') {
                ao5El.dataset.action = 'open-history-avg-share';
                ao5El.dataset.shareCount = '5';
                ao5El.dataset.shareStart = String(solveIndex);
            }

            const ao12El = document.createElement('span');
            ao12El.className = `text-sm font-bold text-right pr-1 ${ao12AtSolve !== '-' ? 'text-purple-600 dark:text-purple-400 hover:underline cursor-pointer' : 'text-slate-400 dark:text-slate-500'}`;
            ao12El.textContent = ao12AtSolve;
            if (ao12AtSolve !== '-') {
                ao12El.dataset.action = 'open-history-avg-share';
                ao12El.dataset.shareCount = '12';
                ao12El.dataset.shareStart = String(solveIndex);
            }

            rowGrid.appendChild(recordWrap);
            rowGrid.appendChild(ao5El);
            rowGrid.appendChild(ao12El);
            row.appendChild(rowGrid);
            historyList.appendChild(row);
        });
    }

    solveCountEl.innerText = filtered.length;

    const bestAverageLabelEl = document.getElementById('bestAverageLabel');
    const bestSingleLabelEl = document.getElementById('bestSingleLabel');
    const moreAverageBtnEl = document.getElementById('moreAverageBtn');
    const isKorean = currentLang === 'ko';

    if (bestAverageLabelEl) {
        bestAverageLabelEl.innerText = isKorean
            ? '최고 평균'
            : (appState.isAo5Mode ? 'Best Average' : 'Best Mean');
    }
    if (bestSingleLabelEl) {
        bestSingleLabelEl.innerText = isKorean ? '최고 싱글' : 'Best Single';
    }
    if (moreAverageBtnEl) {
        moreAverageBtnEl.innerText = isKorean
            ? '(평균 상세)'
            : '(Average Details)';
    }

    // Stats
    if (appState.currentEvent === '333mbf') {
        labelPrimaryAvg.innerText = "-";
        displayPrimaryAvg.innerText = "-";
        displayAo12.innerText = "-";
        bestAverageEl.innerText = "-";
        delete bestAverageEl.dataset.bestStart;
        delete bestAverageEl.dataset.bestCount;
        delete bestAverageEl.dataset.bestIsMean;
        bestSolveEl.innerText = "-";
        delete bestSolveEl.dataset.solveId;
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

    const validWithMeta = filtered
        .filter(s => s.penalty !== 'DNF')
        .map(s => ({
            id: s.id,
            value: s.penalty === '+2' ? s.time + 2000 : s.time,
        }));

    const primaryAvgCount = appState.isAo5Mode ? 5 : 3;
    const primaryAvgIsMean = !appState.isAo5Mode;

    const calculateWindowAverageMs = (slice, count, mean = false) => {
        const dnfCount = slice.filter(s => s.penalty === "DNF").length;
        let removeCount = Math.ceil(count * 0.05);
        if (count <= 12) removeCount = 1;
        if (dnfCount >= removeCount + (mean ? 0 : 1)) return null;

        const nums = slice.map(s => s.penalty === "DNF" ? Infinity : (s.penalty === "+2" ? s.time + 2000 : s.time));
        if (mean) {
            const sum = nums.reduce((a, b) => a + b, 0);
            if (!Number.isFinite(sum)) return null;
            return sum / count;
        }

        nums.sort((a, b) => a - b);
        for (let i = 0; i < removeCount; i++) {
            nums.pop();
            nums.shift();
        }

        if (!nums.length || nums.some(n => !Number.isFinite(n))) return null;
        return nums.reduce((a, b) => a + b, 0) / nums.length;
    };

    let bestAverageMs = null;
    let bestAverageStart = -1;
    for (let i = 0; i <= filtered.length - primaryAvgCount; i++) {
        const windowSlice = filtered.slice(i, i + primaryAvgCount);
        const avgMs = calculateWindowAverageMs(windowSlice, primaryAvgCount, primaryAvgIsMean);
        if (avgMs === null) continue;
        if (bestAverageMs === null || avgMs < bestAverageMs) {
            bestAverageMs = avgMs;
            bestAverageStart = i;
        }
    }

    if (bestAverageMs === null) {
        bestAverageEl.innerText = "-";
        delete bestAverageEl.dataset.bestStart;
        delete bestAverageEl.dataset.bestCount;
        delete bestAverageEl.dataset.bestIsMean;
    } else {
        bestAverageEl.innerText = formatTime(bestAverageMs);
        bestAverageEl.dataset.bestStart = String(bestAverageStart);
        bestAverageEl.dataset.bestCount = String(primaryAvgCount);
        bestAverageEl.dataset.bestIsMean = primaryAvgIsMean ? '1' : '0';
    }

    if (validWithMeta.length) {
        const bestSingle = validWithMeta.reduce((best, current) => (current.value < best.value ? current : best), validWithMeta[0]);
        bestSolveEl.innerText = formatTime(bestSingle.value);
        bestSolveEl.dataset.solveId = String(bestSingle.id);
    } else {
        bestSolveEl.innerText = "-";
        delete bestSolveEl.dataset.solveId;
    }

    if (activeTool === 'graph') renderHistoryGraph();
}

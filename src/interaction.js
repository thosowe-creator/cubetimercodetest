// --- Interaction Logic with configurable Hold Time ---
function parseRgb(color) {
    const match = color && color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return null;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function getReadyColor(baseColor) {
    const rgb = parseRgb(baseColor);
    if (rgb) {
        const [r, g, b] = rgb;
        const isGreenish = g > r + 25 && g > b + 25;
        if (isGreenish) return '#3b82f6';
    }
    return '#10b981';
}
window.getReadyColor = getReadyColor;

function getSplitTextForSolve(solve) {
    if (!solve || !Array.isArray(solve.splitMarks) || !solve.splitMarks.length) return '';
    if (typeof window.getSplitTextFromMarks === 'function') return window.getSplitTextFromMarks(solve.splitMarks);
    let prev = 0;
    return solve.splitMarks.map((m) => {
        const lap = Math.max(0, Number(m) - prev);
        prev = Number(m);
        return formatTime(lap);
    }).join(' + ');
}

function getSolveShareTimeText(solve) {
    if (typeof window.getSolveDisplayText === 'function') return window.getSolveDisplayText(solve);
    if (solve.penalty === 'DNF') return 'DNF';
    return `${formatTime(solve.penalty === '+2' ? solve.time + 2000 : solve.time)}${solve.penalty === '+2' ? '+' : ''}`;
}

function getSplitLabel() {
    return currentLang === 'ko' ? '스플릿' : 'Split';
}

function appendSplitShareLine(container, solve) {
    const splitText = getSplitTextForSolve(solve);
    if (!splitText) return;
    const splitLine = document.createElement('div');
    splitLine.className = 'mt-2 text-[10px] text-slate-400 font-bold break-all';
    splitLine.textContent = `${getSplitLabel()}: ${splitText}`;
    container.appendChild(splitLine);
}

function handleStart(e) {
    // [FIX] Ignore touches on interactive elements like badges or buttons
    // This allows clicking on stats/settings without triggering the timer
    // Also ensuring e exists and checking target only for non-keyboard events to prevent errors or blocks
    if (e && e.type !== 'keydown' && e.target && (e.target.closest('.avg-badge') || e.target.closest('button') || e.target.closest('.tools-dropdown'))) return;
    if (isBtConnected && !isInspectionMode) return; 
    
    if(e && e.cancelable) e.preventDefault();
    if(isManualMode || isRunning) { if(isRunning) stopTimer(); return; }
    
    // Inspection Logic Handling
    if (isInspectionMode && inspectionState === 'none') {
        // Space pressed in Idle with inspection ON: Do nothing (wait for release to start inspection)
        return;
    }
    const baseTimerColor = timerEl ? window.getComputedStyle(timerEl).color : '';
    if (isInspectionMode && inspectionState === 'inspecting') {
        // BT 연결 시에는 키보드로 'Ready' 상태 진입 불가 (오직 간 타이머 핸즈온으로만 가능)
        if (isBtConnected) return;
        // Pressed during inspection -> Ready to solve
        timerEl.style.setProperty('color', '#ef4444', 'important');
        timerEl.classList.add('holding-status');
        holdTimer = setTimeout(()=> { 
            isReady=true; 
            const readyColor = getReadyColor(baseTimerColor);
            timerEl.style.setProperty('--ct-ready-color', readyColor);
            timerEl.style.setProperty('color', readyColor, 'important');
            timerEl.classList.replace('holding-status','ready-to-start'); 
            statusHint.innerText="Ready!"; 
        }, holdDuration); 
        return;
    }
    // Standard Logic (BT 연결 시 여기 도달 안함)
    timerEl.style.setProperty('color', '#ef4444', 'important');
    timerEl.classList.add('holding-status');
    
    holdTimer = setTimeout(()=> { 
        isReady=true; 
        const readyColor = getReadyColor(baseTimerColor);
        timerEl.style.setProperty('--ct-ready-color', readyColor);
        timerEl.style.setProperty('color', readyColor, 'important');
        timerEl.classList.replace('holding-status','ready-to-start'); 
        statusHint.innerText="Ready!"; 
    }, holdDuration); 
}
function handleEnd(e) {
    // Allow taps on UI controls inside the interactive area (avg badges, buttons, dropdown)
    // to behave like normal clicks on mobile (iOS can cancel the click if we preventDefault on touchend).
    if (e && e.type !== 'keydown' && e.target && (e.target.closest('.avg-badge') || e.target.closest('button') || e.target.closest('.tools-dropdown'))) return;

    // [CRITICAL FIX] Prevent immediate inspection restart after stopping timer
    if (Date.now() - lastStopTimestamp < 500) return;
    // BT 모드일 때
    if (isBtConnected) {
        if (isInspectionMode && inspectionState === 'none') {
             // BT 연결되어 있어도 인스펙션 모드라면 스페이스바 뗄 때 인스펙션 시작 허용
             startInspection(); 
        }
        // BT 모드에서는 키보드 뗄 때 절대 startTimer() 호출 금지
        return; 
    }
    if(e && e.cancelable) e.preventDefault();
    clearTimeout(holdTimer);
    if (isManualMode) return;
    // Inspection Mode: Start Countdown on Release if Idle
    if (isInspectionMode && !isRunning && inspectionState === 'none') {
        startInspection();
        return;
    }
    if(!isRunning && isReady) {
        startTimer();
    } else { 
        // Reset color logic for dark mode
        timerEl.style.removeProperty('color'); 
        
        timerEl.classList.remove('holding-status','ready-to-start'); 
        isReady=false; 
        // If inspecting, don't reset to "Hold to Ready"
        if (!isInspectionMode || inspectionState === 'none') {
            statusHint.innerText= isInspectionMode ? "Start Inspection" : "Hold to Ready";
        } else {
            // Returned to inspecting state without starting
            timerEl.style.setProperty('color', '#ef4444', 'important');
        }
    }
}
window.openSessionModal = () => { document.getElementById('sessionOverlay').classList.add('active'); renderSessionList(); };
window.closeSessionModal = () => { document.getElementById('sessionOverlay').classList.remove('active'); document.getElementById('newSessionName').value = ""; editingSessionId = null; };
// ... (Session Management Functions - Logic Preserved) ...
function renderSessionList() {
    const listContainer = document.getElementById('sessionList');
    const eventSessions = appState.sessions[appState.currentEvent] || [];
    document.getElementById('sessionCountLabel').innerText = `${eventSessions.length}/10`;
    listContainer.innerHTML = '';
    eventSessions.forEach((s) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 group';

        if (editingSessionId === s.id) {
            const inputWrap = document.createElement('div');
            inputWrap.className = 'flex items-center gap-2';

            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'editSessionInput';
            input.value = s.name;
            input.className = 'flex-1 bg-white dark:bg-slate-800 border border-blue-400 rounded-xl px-3 py-2.5 text-xs font-bold outline-none dark:text-white';
            input.autofocus = true;
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') saveSessionName(s.id);
            });
            input.addEventListener('blur', () => saveSessionName(s.id));
            inputWrap.appendChild(input);

            const saveBtn = document.createElement('button');
            saveBtn.className = 'p-2 text-blue-600';
            saveBtn.dataset.action = 'save-session-name';
            saveBtn.dataset.sessionId = String(s.id);
            saveBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
            inputWrap.appendChild(saveBtn);

            row.appendChild(inputWrap);
        } else {
            const sessionButtonWrap = document.createElement('div');
            sessionButtonWrap.className = `flex-1 flex items-center gap-2 p-1 rounded-xl border ${s.isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400'} hover:bg-slate-100 dark:hover:bg-slate-700 transition-all`;

            const sessionBtn = document.createElement('button');
            sessionBtn.className = 'flex-1 text-left p-2.5 text-xs font-bold truncate';
            sessionBtn.dataset.action = 'switch-session';
            sessionBtn.dataset.sessionId = String(s.id);
            sessionBtn.textContent = s.name;
            sessionButtonWrap.appendChild(sessionBtn);

            const editBtn = document.createElement('button');
            editBtn.className = 'p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-blue-500 transition-all';
            editBtn.dataset.action = 'edit-session-name';
            editBtn.dataset.sessionId = String(s.id);
            editBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
            sessionButtonWrap.appendChild(editBtn);

            row.appendChild(sessionButtonWrap);

            if (eventSessions.length > 1) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all';
                deleteBtn.dataset.action = 'delete-session';
                deleteBtn.dataset.sessionId = String(s.id);
                deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>';
                row.appendChild(deleteBtn);
            }
        }

        listContainer.appendChild(row);
    });
    if (editingSessionId) {
        const editInput = document.getElementById('editSessionInput');
        if (editInput) editInput.focus();
    }
    document.getElementById('sessionCreateForm').classList.toggle('hidden', eventSessions.length >= 10);
}
// ... (Remaining window functions - Logic Preserved) ...
window.editSessionName = (id) => { editingSessionId = id; renderSessionList(); };
window.saveSessionName = (id) => {
    const input = document.getElementById('editSessionInput');
    if (!input) return;
    const newName = input.value.trim();
    if (newName) {
        const session = appState.sessions[appState.currentEvent].find(x => x.id === id);
        if (session) session.name = newName;
    }
    editingSessionId = null;
    renderSessionList();
    updateUI();
    saveData();
};
window.createNewSession = () => {
    const nameInput = document.getElementById('newSessionName');
    const name = nameInput.value.trim() || `Session ${appState.sessions[appState.currentEvent].length + 1}`;
    if (appState.sessions[appState.currentEvent].length >= 10) return;
    appState.sessions[appState.currentEvent].forEach(s => s.isActive = false);
    appState.sessions[appState.currentEvent].push({ id: Date.now(), name: name, isActive: true });
    nameInput.value = "";
    renderSessionList();
    updateUI();
    saveData();
    timerEl.innerText = (0).toFixed(appState.precision);
    resetPenalty();
};
window.switchSession = (id) => {
    appState.sessions[appState.currentEvent].forEach(s => s.isActive = (s.id === id));
    renderSessionList();
    updateUI();
    saveData();
    timerEl.innerText = (0).toFixed(appState.precision);
    resetPenalty();
    closeSessionModal();
};
window.deleteSession = (id) => {
    const eventSessions = appState.sessions[appState.currentEvent];
    if (!eventSessions || eventSessions.length <= 1) return;
    const targetIdx = eventSessions.findIndex(s => s.id === id);
    if (targetIdx === -1) return;
    const wasActive = eventSessions[targetIdx].isActive;
    appState.sessions[appState.currentEvent] = eventSessions.filter(s => s.id !== id);
    appState.solves = appState.solves.filter(s => !(s.event === appState.currentEvent && s.sessionId === id));
    if (wasActive && appState.sessions[appState.currentEvent].length > 0) appState.sessions[appState.currentEvent][0].isActive = true;
    renderSessionList();
    updateUI();
    saveData();
};
window.openAvgShare = (type) => {
    const sid = getCurrentSessionId();
    const parsedCount = Number(type);
    const isPrimary = type === 'primary';
    const count = isPrimary
        ? (appState.isAo5Mode ? 5 : 3)
        : (Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 12);
    const isMean = isPrimary && !appState.isAo5Mode;
    const filtered = appState.solves.filter(s => s.event === appState.currentEvent && s.sessionId === sid);
    if (filtered.length < count) return;
    const list = filtered.slice(0, count);
    const avgValue = calculateAvg(filtered, count, isMean);

    const dateStr = list[0].date || new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, "");
    const datePrefix = currentLang === 'ko' ? '날짜 :' : 'Date :';
    document.getElementById('shareDate').innerText = `${datePrefix} ${dateStr}.`;

    const label = isMean
        ? (currentLang === 'ko' ? 'Mo3 :' : 'Mean of 3 :')
        : (currentLang === 'ko' ? `Ao${count} :` : `Average of ${count} :`);
    const overlay = document.getElementById('avgShareOverlay');
    if (overlay) {
        overlay.dataset.shareMode = 'avg';
        overlay.dataset.shareCount = String(count);
        overlay.dataset.shareStart = '0';
        overlay.dataset.shareSolveId = '';
    }
    document.getElementById('shareLabel').innerText = label;
    document.getElementById('shareAvg').innerText = avgValue;

    const listContainer = document.getElementById('shareList');
    listContainer.innerHTML = '';
    list.slice().reverse().forEach((s, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex flex-col p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700';

        const row = document.createElement('div');
        row.className = 'flex items-center gap-3';

        const indexLabel = document.createElement('span');
        indexLabel.className = 'text-[10px] font-bold text-slate-400 w-4';
        indexLabel.textContent = `${count - idx}.`;

        const timeLabel = document.createElement('span');
        timeLabel.className = 'font-bold text-slate-800 dark:text-slate-200 text-sm min-w-[50px]';
        timeLabel.textContent = s.penalty === 'DNF' ? 'DNF' : `${formatTime(s.penalty === '+2' ? s.time + 2000 : s.time)}${s.penalty === '+2' ? '+' : ''}`;

        const scrambleLabel = document.createElement('span');
        scrambleLabel.className = 'text-[10px] text-slate-400 font-medium italic truncate flex-grow';
        scrambleLabel.textContent = s.scramble;

        row.appendChild(indexLabel);
        row.appendChild(timeLabel);
        row.appendChild(scrambleLabel);
        wrapper.appendChild(row);
        appendSplitShareLine(wrapper, s);
        listContainer.appendChild(wrapper);
    });

    document.getElementById('avgShareOverlay').classList.add('active');
};
window.openSingleShareById = (solveId) => {
    const s = appState.solves.find(x => x.id === solveId);
    if (!s) return;
    closeModal();
    const dateStr = s.date || new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, "");
    const datePrefix = currentLang === 'ko' ? '날짜 :' : 'Date :';
    document.getElementById('shareDate').innerText = `${datePrefix} ${dateStr}.`;
    document.getElementById('shareLabel').innerText = (currentLang === 'ko') ? '싱글 :' : 'Single :';
    const overlay = document.getElementById('avgShareOverlay');
    if (overlay) {
        overlay.dataset.shareMode = 'single';
        overlay.dataset.shareCount = '';
        overlay.dataset.shareStart = '';
        overlay.dataset.shareSolveId = String(solveId);
    }

    const listContainer = document.getElementById('shareList');
    listContainer.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700';
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3';
    const indexLabel = document.createElement('span');
    indexLabel.className = 'text-[10px] font-bold text-slate-400 w-4';
    indexLabel.textContent = '1.';
    const timeLabel = document.createElement('span');
    timeLabel.className = 'font-bold text-slate-800 dark:text-slate-200 text-sm min-w-[50px]';
    const scrambleLabel = document.createElement('span');
    scrambleLabel.className = 'text-[10px] text-slate-400 font-medium italic truncate flex-grow';

    if (s.event === '333mbf' && s.mbf) {
        const res = s.mbf.resultText || `${s.mbf.solved}/${s.mbf.attempted} ${formatClockTime(s.mbf.timeMs || s.time)}`;
        document.getElementById('shareAvg').innerText = res;
        timeLabel.textContent = res;
        scrambleLabel.textContent = (s.scramble || '').toString();
    } else {
        const res = (s.penalty === 'DNF') ? 'DNF' : (formatTime(s.penalty === '+2' ? s.time + 2000 : s.time) + (s.penalty === '+2' ? '+' : ''));
        document.getElementById('shareAvg').innerText = res;
        timeLabel.textContent = res;
        scrambleLabel.textContent = s.scramble;
    }

    row.appendChild(indexLabel);
    row.appendChild(timeLabel);
    row.appendChild(scrambleLabel);
    wrapper.appendChild(row);
    appendSplitShareLine(wrapper, s);
    listContainer.appendChild(wrapper);
    document.getElementById('avgShareOverlay').classList.add('active');
};

window.openBestSingleShare = () => {
    const solveId = Number(bestSolveEl?.dataset?.solveId || '0');
    if (!Number.isFinite(solveId) || solveId <= 0) return;
    openSingleShareById(solveId);
};

window.openBestAverageShare = () => {
    const start = Number(bestAverageEl?.dataset?.bestStart || '-1');
    const count = Number(bestAverageEl?.dataset?.bestCount || '0');
    const isMean = (bestAverageEl?.dataset?.bestIsMean || '0') === '1';
    if (!Number.isFinite(start) || !Number.isFinite(count) || start < 0 || count <= 0) return;

    const sid = getCurrentSessionId();
    const filtered = appState.solves.filter(s => s.event === appState.currentEvent && s.sessionId === sid);
    if (filtered.length < start + count) return;
    const list = filtered.slice(start, start + count);
    const avgValue = calculateAvg(list, count, isMean);

    const dateStr = list[0].date || new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, "");
    const datePrefix = currentLang === 'ko' ? '날짜 :' : 'Date :';
    document.getElementById('shareDate').innerText = `${datePrefix} ${dateStr}.`;

    const label = isMean
        ? (currentLang === 'ko' ? 'Mo3 :' : 'Mean of 3 :')
        : (currentLang === 'ko' ? `Ao${count} :` : `Average of ${count} :`);
    const overlay = document.getElementById('avgShareOverlay');
    if (overlay) {
        overlay.dataset.shareMode = 'avg';
        overlay.dataset.shareCount = String(count);
        overlay.dataset.shareStart = String(start);
        overlay.dataset.shareSolveId = '';
    }
    document.getElementById('shareLabel').innerText = label;
    document.getElementById('shareAvg').innerText = avgValue;

    const listContainer = document.getElementById('shareList');
    listContainer.innerHTML = '';
    list.slice().reverse().forEach((s, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex flex-col p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700';

        const row = document.createElement('div');
        row.className = 'flex items-center gap-3';

        const indexLabel = document.createElement('span');
        indexLabel.className = 'text-[10px] font-bold text-slate-400 w-4';
        indexLabel.textContent = `${count - idx}.`;

        const timeLabel = document.createElement('span');
        timeLabel.className = 'font-bold text-slate-800 dark:text-slate-200 text-sm min-w-[50px]';
        timeLabel.textContent = s.penalty === 'DNF' ? 'DNF' : `${formatTime(s.penalty === '+2' ? s.time + 2000 : s.time)}${s.penalty === '+2' ? '+' : ''}`;

        const scrambleLabel = document.createElement('span');
        scrambleLabel.className = 'text-[10px] text-slate-400 font-medium italic truncate flex-grow';
        scrambleLabel.textContent = s.scramble;

        row.appendChild(indexLabel);
        row.appendChild(timeLabel);
        row.appendChild(scrambleLabel);
        wrapper.appendChild(row);
        appendSplitShareLine(wrapper, s);
        listContainer.appendChild(wrapper);
    });

    document.getElementById('avgShareOverlay').classList.add('active');
};

window.openExtendedBestAvgShare = (countRaw, startRaw) => {
    const count = Number(countRaw || '0');
    const start = Number(startRaw || '-1');
    if (!Number.isFinite(start) || !Number.isFinite(count) || start < 0 || count <= 0) return;

    const sid = getCurrentSessionId();
    const filtered = appState.solves.filter(s => s.event === appState.currentEvent && s.sessionId === sid);
    if (filtered.length < start + count) return;
    const list = filtered.slice(start, start + count);
    const avgValue = calculateAvg(list, count, false);

    const dateStr = list[0].date || new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, "");
    const datePrefix = currentLang === 'ko' ? '날짜 :' : 'Date :';
    document.getElementById('shareDate').innerText = `${datePrefix} ${dateStr}.`;

    const label = currentLang === 'ko' ? `최고 Ao${count} :` : `Best Average of ${count} :`;
    const overlay = document.getElementById('avgShareOverlay');
    if (overlay) {
        overlay.dataset.shareMode = 'avg';
        overlay.dataset.shareCount = String(count);
        overlay.dataset.shareStart = String(start);
        overlay.dataset.shareSolveId = '';
    }
    document.getElementById('shareLabel').innerText = label;
    document.getElementById('shareAvg').innerText = avgValue;

    const listContainer = document.getElementById('shareList');
    listContainer.innerHTML = '';
    list.slice().reverse().forEach((s, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex flex-col p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700';

        const row = document.createElement('div');
        row.className = 'flex items-center gap-3';

        const indexLabel = document.createElement('span');
        indexLabel.className = 'text-[10px] font-bold text-slate-400 w-4';
        indexLabel.textContent = `${count - idx}.`;

        const timeLabel = document.createElement('span');
        timeLabel.className = 'font-bold text-slate-800 dark:text-slate-200 text-sm min-w-[50px]';
        timeLabel.textContent = s.penalty === 'DNF' ? 'DNF' : `${formatTime(s.penalty === '+2' ? s.time + 2000 : s.time)}${s.penalty === '+2' ? '+' : ''}`;

        const scrambleLabel = document.createElement('span');
        scrambleLabel.className = 'text-[10px] text-slate-400 font-medium italic truncate flex-grow';
        scrambleLabel.textContent = s.scramble;

        row.appendChild(indexLabel);
        row.appendChild(timeLabel);
        row.appendChild(scrambleLabel);
        wrapper.appendChild(row);
        appendSplitShareLine(wrapper, s);
        listContainer.appendChild(wrapper);
    });

    document.getElementById('avgShareOverlay').classList.add('active');
};

window.openHistoryAvgShare = (countRaw, startRaw) => {
    const count = Number(countRaw || '0');
    const start = Number(startRaw || '-1');
    if (!Number.isFinite(start) || !Number.isFinite(count) || start < 0 || count <= 0) return;

    const sid = getCurrentSessionId();
    const filtered = appState.solves.filter(s => s.event === appState.currentEvent && s.sessionId === sid);
    if (filtered.length < start + count) return;
    const list = filtered.slice(start, start + count);
    const avgValue = calculateAvg(list, count, false);

    const dateStr = list[0].date || new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, "");
    const datePrefix = currentLang === 'ko' ? '날짜 :' : 'Date :';
    document.getElementById('shareDate').innerText = `${datePrefix} ${dateStr}.`;

    const label = currentLang === 'ko' ? `Ao${count} :` : `Average of ${count} :`;
    const overlay = document.getElementById('avgShareOverlay');
    if (overlay) {
        overlay.dataset.shareMode = 'avg';
        overlay.dataset.shareCount = String(count);
        overlay.dataset.shareStart = String(start);
        overlay.dataset.shareSolveId = '';
    }
    document.getElementById('shareLabel').innerText = label;
    document.getElementById('shareAvg').innerText = avgValue;

    const listContainer = document.getElementById('shareList');
    listContainer.innerHTML = '';
    list.slice().reverse().forEach((s, idx) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'flex flex-col p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700';

        const row = document.createElement('div');
        row.className = 'flex items-center gap-3';

        const indexLabel = document.createElement('span');
        indexLabel.className = 'text-[10px] font-bold text-slate-400 w-4';
        indexLabel.textContent = `${count - idx}.`;

        const timeLabel = document.createElement('span');
        timeLabel.className = 'font-bold text-slate-800 dark:text-slate-200 text-sm min-w-[50px]';
        timeLabel.textContent = s.penalty === 'DNF' ? 'DNF' : `${formatTime(s.penalty === '+2' ? s.time + 2000 : s.time)}${s.penalty === '+2' ? '+' : ''}`;

        const scrambleLabel = document.createElement('span');
        scrambleLabel.className = 'text-[10px] text-slate-400 font-medium italic truncate flex-grow';
        scrambleLabel.textContent = s.scramble;

        row.appendChild(indexLabel);
        row.appendChild(timeLabel);
        row.appendChild(scrambleLabel);
        wrapper.appendChild(row);
        appendSplitShareLine(wrapper, s);
        listContainer.appendChild(wrapper);
    });

    document.getElementById('avgShareOverlay').classList.add('active');
};

window.openSingleShare = () => {
    const s = appState.solves.find(x => x.id === selectedSolveId);
    if (!s) return;
    closeModal();
    const dateStr = s.date || new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, "");
    const datePrefix = currentLang === 'ko' ? '날짜 :' : 'Date :';
    document.getElementById('shareDate').innerText = `${datePrefix} ${dateStr}.`;
    document.getElementById('shareLabel').innerText = (currentLang === 'ko') ? '싱글 :' : 'Single :';
    const overlay = document.getElementById('avgShareOverlay');
    if (overlay) {
        overlay.dataset.shareMode = 'single';
        overlay.dataset.shareCount = '';
        overlay.dataset.shareStart = '';
        overlay.dataset.shareSolveId = String(selectedSolveId);
    }

    const listContainer = document.getElementById('shareList');
    listContainer.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'flex flex-col p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700';
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3';
    const indexLabel = document.createElement('span');
    indexLabel.className = 'text-[10px] font-bold text-slate-400 w-4';
    indexLabel.textContent = '1.';
    const timeLabel = document.createElement('span');
    timeLabel.className = 'font-bold text-slate-800 dark:text-slate-200 text-sm min-w-[50px]';
    const scrambleLabel = document.createElement('span');
    scrambleLabel.className = 'text-[10px] text-slate-400 font-medium italic truncate flex-grow';

    if (s.event === '333mbf' && s.mbf) {
        const res = s.mbf.resultText || `${s.mbf.solved}/${s.mbf.attempted} ${formatClockTime(s.mbf.timeMs || s.time)}`;
        document.getElementById('shareAvg').innerText = res;
        timeLabel.textContent = res;
        scrambleLabel.textContent = (s.scramble || '').toString();
    } else {
        const res = (s.penalty === 'DNF') ? 'DNF' : (formatTime(s.penalty === '+2' ? s.time + 2000 : s.time) + (s.penalty === '+2' ? '+' : ''));
        document.getElementById('shareAvg').innerText = res;
        timeLabel.textContent = res;
        scrambleLabel.textContent = s.scramble;
    }

    row.appendChild(indexLabel);
    row.appendChild(timeLabel);
    row.appendChild(scrambleLabel);
    wrapper.appendChild(row);
    appendSplitShareLine(wrapper, s);
    listContainer.appendChild(wrapper);
    document.getElementById('avgShareOverlay').classList.add('active');
};
window.closeAvgShare = () => document.getElementById('avgShareOverlay').classList.remove('active');
window.copyShareText = async () => {
    const date = document.getElementById('shareDate').innerText;
    const avgLabel = document.getElementById('shareLabel').innerText;
    const avgVal = document.getElementById('shareAvg').innerText;
    const overlay = document.getElementById('avgShareOverlay');
    const mode = overlay?.dataset?.shareMode || '';
    const count = parseInt(overlay?.dataset?.shareCount || '0', 10);
    const start = parseInt(overlay?.dataset?.shareStart || '0', 10);
    const shareSolveId = parseInt(overlay?.dataset?.shareSolveId || '0', 10);

    const isSingle = mode === 'single';
    let text = `[CubeTimer]\n\n${date}\n\n${avgLabel} ${avgVal}\n\n`;

    if (isSingle) {
        const sidForSingle = Number.isFinite(shareSolveId) && shareSolveId > 0 ? shareSolveId : selectedSolveId;
        const s = appState.solves.find(x => x.id === sidForSingle);
        if (s) { text += `1. ${avgVal}   ${s.scramble}\n`; const splitText = getSplitTextForSolve(s); if (splitText) text += `   ${getSplitLabel()}: ${splitText}\n`; }
    } else {
        const n = (Number.isFinite(count) && count > 0) ? count : 12;
        const st = (Number.isFinite(start) && start >= 0) ? start : 0;
        const sid = getCurrentSessionId();
        const filtered = appState.solves.filter(s => s.event === appState.currentEvent && s.sessionId === sid).slice(st, st + n);
        filtered.reverse().forEach((s, i) => {
            text += `${i + 1}. ${getSolveShareTimeText(s)}   ${s.scramble}\n`; const splitText = getSplitTextForSolve(s); if (splitText) text += `   ${getSplitLabel()}: ${splitText}\n`;
        });
    }

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
        const btn = document.querySelector('[data-action="copy-share-text"]');
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = (currentLang === 'ko') ? '복사됨!' : 'Copied!';
            btn.classList.add('bg-green-600');
            setTimeout(() => {
                btn.innerHTML = original;
                btn.classList.remove('bg-green-600');
                try { applyAutoI18n(document); } catch (_) {}
            }, 2000);
        }
    } catch (err) {
        console.error('Copy failed', err);
    }
};
window.addEventListener('keydown', (e) => {
    const tag = (document.activeElement?.tagName || '').toUpperCase();
    const isTypingTarget = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // If editing something, don't hijack keyboard (except manual input submit)
    if (editingSessionId || isTypingTarget) {
        if (e.code === 'Enter' && document.activeElement === manualInput) {
            // allow manual submit below
        } else {
            return;
        }
    }

    if (e.code === 'Space') {
        // Prevent default always, including key repeat, to stop page scrolling.
        e.preventDefault();
        e.stopPropagation();
        if (isRunning) {
            if (!e.repeat && appState.splitEnabled && !isBtConnected && !isManualMode && typeof window.pushSplitMark === 'function') {
                const elapsed = performance.now() - startPerf;
                window.pushSplitMark(elapsed);
            }
            return;
        }
        if (!e.repeat) handleStart(e);
        return;
    }

    if (isManualMode && e.code === 'Enter') {
        let v = parseFloat(manualInput.value);
        if (v > 0) {
            appState.solves.unshift({
                id: Date.now(),
                time: v * 1000,
                scramble: currentScramble,
                event: appState.currentEvent,
                sessionId: getCurrentSessionId(),
                penalty: null,
                date: new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, "")
            });
            manualInput.value = "";
            updateUI();
            generateScramble();
            saveData();
        }
    }
}, { capture: true });

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        if (!editingSessionId) handleEnd(e);
    }
}, { capture: true });
const interactiveArea = document.getElementById('timerInteractiveArea');
interactiveArea.addEventListener('touchstart', handleStart, { passive: false });
interactiveArea.addEventListener('touchend', handleEnd, { passive: false });
// [UPDATED] Toggle Settings: Acts as open/close toggle
window.openSettings = () => { 
    if (isRunning) return;
    const overlay = document.getElementById('settingsOverlay');
    if (overlay.classList.contains('active')) {
        closeSettings();
    } else {
        overlay.classList.add('active'); 
        setTimeout(()=>document.getElementById('settingsModal').classList.remove('scale-95','opacity-0'), 10); 
    }
};
window.closeSettings = () => { document.getElementById('settingsModal').classList.add('scale-95','opacity-0'); setTimeout(()=>document.getElementById('settingsOverlay').classList.remove('active'), 200); saveData(); };
window.handleOutsideSettingsClick = (e) => { if(e.target === document.getElementById('settingsOverlay')) closeSettings(); };
window.showSolveDetails = (id) => {
    const s = appState.solves.find(x => x.id === id);
    if (!s) return;
    selectedSolveId = id;
    const timeEl = document.getElementById('modalTime');
    const eventEl = document.getElementById('modalEvent');
    const scrEl = document.getElementById('modalScramble');
    const overlay = document.getElementById('modalOverlay');
    const useBtn = document.querySelector('[data-action="use-this-scramble"]');

    if (s.event === '333mbf' && s.mbf) {
        if (timeEl) timeEl.innerText = s.mbf.resultText || `${s.mbf.solved}/${s.mbf.attempted} ${formatClockTime(s.mbf.timeMs || s.time)}`;
        if (eventEl) eventEl.innerText = '333mbf';
        if (scrEl) scrEl.innerText = (s.scramble || '').toString();
        if (useBtn) useBtn.classList.add('hidden');
    } else {
        const base = (s.penalty === 'DNF') ? 'DNF' : formatTime(s.penalty === '+2' ? s.time + 2000 : s.time);
        if (timeEl) timeEl.innerText = `${base}${s.penalty === '+2' ? '+' : ''}`;
        if (eventEl) eventEl.innerText = s.event;
        if (scrEl) scrEl.innerText = s.scramble;
        if (useBtn) useBtn.classList.remove('hidden');
    }

    const splitSection = document.getElementById('modalSplitSection');
    const splitTextEl = document.getElementById('modalSplitText');
    const splitText = getSplitTextForSolve(s);
    if (splitSection && splitTextEl) {
        splitSection.classList.toggle('hidden', !splitText);
        splitTextEl.innerText = splitText || '-';
    }

    if (overlay) overlay.classList.add('active');
};
window.closeModal = () => document.getElementById('modalOverlay').classList.remove('active');
window.useThisScramble = () => {
    const s = appState.solves.find(x => x.id === selectedSolveId);
    if (s) {
        if (typeof window.setCurrentScramble === 'function') {
            window.setCurrentScramble(s.scramble);
        } else {
            currentScramble = s.scramble;
            scrambleEl.innerText = currentScramble;
        }
        closeModal();
    }
};
precisionToggle.onchange = e => { appState.precision = e.target.checked?3:2; updateUI(); timerEl.innerText=(0).toFixed(appState.precision); saveData(); };
avgModeToggle.onchange = e => { appState.isAo5Mode = e.target.checked; updateUI(); saveData(); };
manualEntryToggle.onchange = e => { isManualMode = e.target.checked; timerEl.classList.toggle('hidden', isManualMode); manualInput.classList.toggle('hidden', !isManualMode); statusHint.innerText = isManualMode ? (currentLang === 'ko' ? '시간 입력 후 Enter' : 'Type time & Enter') : t('holdToReady'); };
if (splitToggle) splitToggle.checked = appState.splitEnabled;
if (splitCountSelect) splitCountSelect.value = String(appState.splitCount || 4);
document.getElementById('clearHistoryBtn').onclick = () => {
  const sid = getCurrentSessionId();
  const msg = 'Clear all history for this session?';
  const customConfirm = document.createElement('div');
  customConfirm.id = 'clearConfirmModal';
  customConfirm.innerHTML = `<div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div class="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-xs shadow-2xl"><p class="text-sm font-bold text-slate-700 dark:text-white mb-6 text-center">${msg}</p><div class="flex gap-2"><button id="cancelClear" class="flex-1 py-3 text-slate-400 font-bold text-sm">Cancel</button><button id="confirmClear" class="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm">Clear All</button></div></div></div>`;
  document.body.appendChild(customConfirm);
  try { applyAutoI18n(customConfirm); } catch (_) {}
  document.getElementById('cancelClear').onclick = () => {
    document.body.removeChild(document.getElementById('clearConfirmModal'));
  };
  document.getElementById('confirmClear').onclick = () => {
    appState.solves = appState.solves.filter(s => !(s.event === appState.currentEvent && s.sessionId === sid));
    updateUI();
    saveData();
    document.body.removeChild(document.getElementById('clearConfirmModal'));
    timerEl.innerText = (0).toFixed(appState.precision);
    resetPenalty();
  };
};

function setupDomEventBindings() {
    const importInputEl = document.getElementById('importInput');
    if (importInputEl) importInputEl.addEventListener('change', importData);

    const darkModeToggleEl = document.getElementById('darkModeToggle');
    if (darkModeToggleEl) darkModeToggleEl.addEventListener('change', (event) => toggleDarkMode(event.target));

    const langSelectEl = document.getElementById('langSelect');
    if (langSelectEl) langSelectEl.addEventListener('change', (event) => setLanguage(event.target.value));

    const wakeLockToggleEl = document.getElementById('wakeLockToggle');
    if (wakeLockToggleEl) wakeLockToggleEl.addEventListener('change', (event) => toggleWakeLock(event.target));

    const inspectionToggleEl = document.getElementById('inspectionToggle');
    if (inspectionToggleEl) inspectionToggleEl.addEventListener('change', (event) => toggleInspection(event.target));

    const holdDurationSliderEl = document.getElementById('holdDurationSlider');
    if (holdDurationSliderEl) holdDurationSliderEl.addEventListener('input', (event) => updateHoldDuration(event.target.value));

    const splitToggleEl = document.getElementById('splitToggle');
    if (splitToggleEl) splitToggleEl.addEventListener('change', (event) => {
        appState.splitEnabled = event.target.checked;
        saveData();
    });

    const splitCountSelectEl = document.getElementById('splitCountSelect');
    if (splitCountSelectEl) splitCountSelectEl.addEventListener('change', (event) => {
        appState.splitCount = Number(event.target.value);
        saveData();
    });

    const eventSelectEl = document.getElementById('eventSelect');
    if (eventSelectEl) eventSelectEl.addEventListener('change', (event) => changeEvent(event.target.value));

    const caseSelectEl = document.getElementById('caseSelect');
    if (caseSelectEl) caseSelectEl.addEventListener('change', (event) => changePracticeCase(event.target.value));

    document.addEventListener('click', (event) => {
        const actionEl = event.target.closest('[data-action]');
        if (!actionEl) return;

        const { action } = actionEl.dataset;
        const isOverlayClick = () => actionEl.classList.contains('modal-overlay') && event.target !== actionEl;
        switch (action) {
            case 'open-bt-modal':
                openBTModal();
                break;
            case 'close-bt-modal':
                if (isOverlayClick()) return;
                closeBTModal();
                break;
            case 'connect-gan-timer':
                connectGanTimer();
                break;
            case 'disconnect-bt':
                disconnectBT();
                break;
            case 'export-data':
                exportData();
                break;
            case 'trigger-import':
                triggerImport();
                break;
            case 'open-settings':
                openSettings();
                break;
            case 'close-settings':
                closeSettings();
                break;
            case 'handle-outside-settings':
                handleOutsideSettingsClick(event);
                break;
            case 'close-theme-settings':
                closeThemeSettings();
                break;
            case 'reset-all-theme-light':
                resetAllThemeLight();
                break;
            case 'open-theme-settings':
                openThemeSettings();
                break;
            case 'open-theme-picker':
                openThemePicker(actionEl.dataset.themeTarget);
                break;
            case 'theme-picker-default':
                themePickerDefault();
                break;
            case 'theme-picker-cancel':
                themePickerCancel();
                break;
            case 'theme-picker-apply':
                themePickerApply();
                break;
            case 'open-update-log':
                openUpdateLog(false);
                break;
            case 'close-update-log':
                if (isOverlayClick()) return;
                closeUpdateLog();
                break;
            case 'open-known-issues':
                openKnownIssues();
                break;
            case 'close-known-issues':
                if (isOverlayClick()) return;
                closeKnownIssues();
                break;
            case 'go-account':
                window.location.href = 'account.html';
                break;
            case 'open-session-modal':
                openSessionModal();
                break;
            case 'close-session-modal':
                if (isOverlayClick()) return;
                closeSessionModal();
                break;
            case 'create-new-session':
                createNewSession();
                break;
            case 'edit-session-name':
                editSessionName(Number(actionEl.dataset.sessionId));
                break;
            case 'save-session-name':
                saveSessionName(Number(actionEl.dataset.sessionId));
                break;
            case 'switch-session':
                switchSession(Number(actionEl.dataset.sessionId));
                break;
            case 'delete-session':
                deleteSession(Number(actionEl.dataset.sessionId));
                break;
            case 'close-mbf-scramble-modal':
                if (isOverlayClick()) return;
                closeMbfScrambleModal();
                break;
            case 'copy-mbf-text':
                copyMbfText();
                break;
            case 'close-mbf-result-modal':
                if (isOverlayClick()) return;
                closeMbfResultModal();
                break;
            case 'save-mbf-result':
                saveMbfResult();
                break;
            case 'close-stats-modal':
                if (isOverlayClick()) return;
                closeStatsModal();
                break;
            case 'close-avg-share':
                if (isOverlayClick()) return;
                closeAvgShare();
                break;
            case 'copy-share-text':
                copyShareText();
                break;
            case 'open-single-share':
                openSingleShare();
                break;
            case 'use-this-scramble':
                useThisScramble();
                break;
            case 'close-modal':
                if (isOverlayClick()) return;
                closeModal();
                break;
            case 'handle-outside-case-pool':
                handleOutsideCasePoolClick(event);
                break;
            case 'close-case-pool-modal':
                closeCasePoolModal();
                break;
            case 'set-case-pool-mode':
                setCasePoolMode(actionEl.dataset.casePoolMode);
                break;
            case 'set-zbls-hand-draft':
                setZblsHandDraft(actionEl.dataset.zblsHand);
                break;
            case 'clear-case-pool-selection':
                clearCasePoolSelection();
                break;
            case 'apply-case-pool-selection':
                applyCasePoolSelection();
                break;
            case 'open-case-pool-modal':
                openCasePoolModal();
                break;
            case 'retry-scramble':
                retryScramble();
                break;
            case 'scramble-prev':
                if (typeof window.showPreviousScramble === 'function') {
                    window.showPreviousScramble();
                }
                break;
            case 'scramble-next':
                if (!isRunning) generateScramble();
                break;
            case 'generate-mbf-scrambles':
                generateMbfScrambles();
                break;
            case 'open-avg-share':
                openAvgShare(actionEl.dataset.shareType);
                break;
            case 'open-extended-avg-share':
                closeStatsModal();
                openAvgShare(actionEl.dataset.shareCount);
                break;
            case 'open-extended-best-avg-share':
                closeStatsModal();
                openExtendedBestAvgShare(actionEl.dataset.shareCount, actionEl.dataset.shareStart);
                break;
            case 'open-history-avg-share':
                openHistoryAvgShare(actionEl.dataset.shareCount, actionEl.dataset.shareStart);
                break;
            case 'show-extended-stats':
                showExtendedStats();
                break;
            case 'open-best-single-share':
                openBestSingleShare();
                break;
            case 'open-best-average-share':
                openBestAverageShare();
                break;
            case 'toggle-tools-menu':
                toggleToolsMenu(event);
                break;
            case 'select-tool':
                selectTool(actionEl.dataset.tool);
                break;
            case 'switch-category':
                switchCategory(actionEl.dataset.category);
                break;
            case 'change-event':
                changeEvent(actionEl.dataset.event);
                break;
            case 'switch-mobile-tab':
                switchMobileTab(actionEl.dataset.tab);
                break;
            case 'show-solve-details':
                showSolveDetails(Number(actionEl.dataset.solveId));
                break;
            case 'toggle-solve-penalty':
                event.stopPropagation();
                toggleSolvePenalty(Number(actionEl.dataset.solveId), actionEl.dataset.penalty);
                break;
            case 'delete-solve':
                event.stopPropagation();
                deleteSolve(Number(actionEl.dataset.solveId));
                break;
            default:
                break;
        }
    });
}

setupDomEventBindings();

/* =========================
   Theme Settings (Light mode only)
   - Dark mode is not modified
   ========================= */
const THEME_STORAGE_KEY = 'cubeTimerLightThemeV1';
const LIGHT_THEME_DEFAULTS = {
  accent: [59, 130, 246],      // #3B82F6
  bg: [248, 250, 252],         // #F8FAFC
  card: [255, 255, 255],       // #FFFFFF
  text: [15, 23, 42],          // #0F172A
  timerText: [15, 23, 42],     // #0F172A
  scramble: [255, 255, 255],   // #FFFFFF
  scrambleText: [71, 85, 105], // #475569
};

let lightTheme = structuredClone(LIGHT_THEME_DEFAULTS);

function clamp255(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(255, Math.max(0, Math.round(x)));
}

function rgbToHex([r, g, b]) {
  const to = (v) => v.toString(16).padStart(2, '0').toUpperCase();
  return `#${to(r)}${to(g)}${to(b)}`;
}

function loadLightTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return structuredClone(LIGHT_THEME_DEFAULTS);
    const parsed = JSON.parse(raw);
    const next = {};
    for (const k of Object.keys(LIGHT_THEME_DEFAULTS)) {
      const v = parsed?.[k];
      if (Array.isArray(v) && v.length === 3) {
        next[k] = [clamp255(v[0]), clamp255(v[1]), clamp255(v[2])];
      } else {
        next[k] = structuredClone(LIGHT_THEME_DEFAULTS[k]);
      }
    }
    return next;
  } catch (_) {
    return structuredClone(LIGHT_THEME_DEFAULTS);
  }
}

function saveLightTheme() {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(lightTheme));
  } catch (_) {}
}

function applyLightTheme() {
  const root = document.documentElement;
  const setRGB = (name, rgb) => {
    root.style.setProperty(name, `${rgb[0]} ${rgb[1]} ${rgb[2]}`);
  };
  setRGB('--ct-accent-rgb', lightTheme.accent);
  setRGB('--ct-bg-rgb', lightTheme.bg);
  setRGB('--ct-card-rgb', lightTheme.card);
  setRGB('--ct-text-rgb', lightTheme.text);
  setRGB('--ct-timer-rgb', lightTheme.timerText);
  setRGB('--ct-scramble-rgb', lightTheme.scramble);
  setRGB('--ct-scramble-text-rgb', lightTheme.scrambleText);

  if (typeof timerEl !== 'undefined' && timerEl) {
    // IMPORTANT:
    // Timer inline color is used only for light theme customization.
    // In dark mode, keep timer color controlled by dark CSS/state classes.
    if (root.classList.contains('dark')) {
      timerEl.style.removeProperty('color');
    } else {
      timerEl.style.setProperty(
        'color',
        `rgb(${lightTheme.timerText[0]}, ${lightTheme.timerText[1]}, ${lightTheme.timerText[2]})`,
        'important'
      );
    }
  }
}

/* =========================
   HSV Color Picker (Theme)
   - Replaces RGB sliders
   - Light mode only (dark mode is not modified)
   ========================= */

function rgbToHsv([r, g, b]) {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function hsvToRgb({ h, s, v }) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rr = 0, gg = 0, bb = 0;
  if (h >= 0 && h < 60) { rr = c; gg = x; bb = 0; }
  else if (h < 120) { rr = x; gg = c; bb = 0; }
  else if (h < 180) { rr = 0; gg = c; bb = x; }
  else if (h < 240) { rr = 0; gg = x; bb = c; }
  else if (h < 300) { rr = x; gg = 0; bb = c; }
  else { rr = c; gg = 0; bb = x; }
  return [
    clamp255((rr + m) * 255),
    clamp255((gg + m) * 255),
    clamp255((bb + m) * 255),
  ];
}

function partLabel(part) {
  const labels = {
    accent: { en: 'Accent', ko: '강조' },
    bg: { en: 'Background', ko: '배경' },
    card: { en: 'Panels', ko: '패널' },
    text: { en: 'Text', ko: '텍스트' },
    timerText: { en: 'Timer', ko: '타이머' },
    scramble: { en: 'Scramble Box', ko: '스크램블 박스' },
    scrambleText: { en: 'Scramble Text', ko: '스크램블 텍스트' },
  };
  const entry = labels[part];
  if (!entry) return currentLang === 'ko' ? '색상' : 'Color';
  return currentLang === 'ko' ? entry.ko : entry.en;
}

function syncThemeRowsUI() {
  const map = {
    accent: 'Accent',
    bg: 'Bg',
    card: 'Card',
    text: 'Text',
    timerText: 'TimerText',
    scramble: 'Scramble',
    scrambleText: 'ScrambleText',
  };
  for (const [part, suf] of Object.entries(map)) {
    const rgb = lightTheme[part];
    if (!rgb) continue;
    const dot = document.getElementById(`themeRow${suf}Dot`);
    const hexEl = document.getElementById(`themeRow${suf}Hex`);
    if (dot) dot.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    if (hexEl) hexEl.textContent = rgbToHex(rgb);
  }
}

window.resetAllThemeLight = () => {
  lightTheme = structuredClone(LIGHT_THEME_DEFAULTS);
  applyLightTheme();
  saveLightTheme();
  syncThemeRowsUI();
};

function normalizeLightThemeFromBackup(theme) {
  if (!theme || typeof theme !== 'object') {
    return structuredClone(LIGHT_THEME_DEFAULTS);
  }
  const next = {};
  for (const key of Object.keys(LIGHT_THEME_DEFAULTS)) {
    const value = theme[key];
    if (Array.isArray(value) && value.length === 3) {
      next[key] = [clamp255(value[0]), clamp255(value[1]), clamp255(value[2])];
    } else {
      next[key] = structuredClone(LIGHT_THEME_DEFAULTS[key]);
    }
  }
  return next;
}

window.getLightThemeForBackup = () => structuredClone(lightTheme);

window.applyLightThemeBackup = (theme) => {
  lightTheme = normalizeLightThemeFromBackup(theme);
  applyLightTheme();
  saveLightTheme();
  syncThemeRowsUI();
};

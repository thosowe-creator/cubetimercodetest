// --- Tools & UI ---
window.toggleToolsMenu = (e) => { e.stopPropagation(); document.getElementById('toolsDropdown').classList.toggle('show'); };
function updateScrambleNavButtons() {
    if (!scramblePrevBtn || !scrambleNextBtn) return;
    const disableForState = isScrambleLoading || isRunning || currentEvent === '333mbf';
    scramblePrevBtn.disabled = disableForState || !previousScramble || isViewingPreviousScramble;
    scrambleNextBtn.disabled = disableForState;
}

function setScrambleDisplay(text) {
    if (scrambleEl) scrambleEl.innerText = text;
}

function setCurrentScramble(nextScramble) {
    const next = String(nextScramble || '').trim();
    if (latestScramble) previousScramble = latestScramble;
    latestScramble = next;
    isViewingPreviousScramble = false;
    currentScramble = latestScramble;
    setScrambleDisplay(currentScramble);
    updateScrambleNavButtons();
}

function showPreviousScramble() {
    if (!previousScramble || isViewingPreviousScramble) return;
    isViewingPreviousScramble = true;
    currentScramble = previousScramble;
    setScrambleDisplay(currentScramble);
    updateScrambleNavButtons();
}

function showLatestScramble() {
    if (!isViewingPreviousScramble) return;
    isViewingPreviousScramble = false;
    currentScramble = latestScramble;
    setScrambleDisplay(currentScramble);
    updateScrambleNavButtons();
}

window.setCurrentScramble = setCurrentScramble;
window.showPreviousScramble = showPreviousScramble;
window.showLatestScramble = showLatestScramble;
window.updateScrambleNavButtons = updateScrambleNavButtons;
window.selectTool = (tool) => {
    activeTool = tool;
    document.getElementById('toolLabel').innerText = tool === 'scramble'
        ? (currentLang === 'ko' ? '스크램블 이미지' : 'Scramble Image')
        : (currentLang === 'ko' ? '그래프(추세)' : 'Graph (Trends)');
    document.getElementById('visualizerWrapper').classList.toggle('hidden', tool !== 'scramble');
    document.getElementById('graphWrapper').classList.toggle('hidden', tool !== 'graph');
    document.querySelectorAll('.tool-option').forEach(opt => opt.classList.remove('active'));
    document.getElementById(`tool-opt-${tool}`).classList.add('active');
    document.getElementById('toolsDropdown').classList.remove('show');
    if (tool !== 'scramble') {
        if (noVisualizerMsg) noVisualizerMsg.classList.add('hidden');
    }
    if (tool === 'graph') renderHistoryGraph();
    else if (tool === 'scramble') {
        drawCube();
        updateScrambleDiagram();
    }
    scheduleLayout('tool');
};
window.addEventListener('click', () => { document.getElementById('toolsDropdown').classList.remove('show'); });
function renderHistoryGraph() {
    if (activeTool !== 'graph') return;
    const sid = getCurrentSessionId();
    const filtered = [...solves].filter(s => s.event === currentEvent && s.sessionId === sid).reverse();
    const polyline = document.getElementById('graphLine');
    if (filtered.length < 2) { polyline.setAttribute('points', ""); return; }
    const validTimes = filtered.map(s => s.penalty === 'DNF' ? null : (s.penalty === '+2' ? s.time + 2000 : s.time));
    const maxTime = Math.max(...validTimes.filter(t => t !== null));
    const minTime = Math.min(...validTimes.filter(t => t !== null));
    const range = maxTime - minTime || 1;
    const points = filtered.map((s, i) => {
        const t = s.penalty === 'DNF' ? maxTime : (s.penalty === '+2' ? s.time + 2000 : s.time);
        const x = (i / (filtered.length - 1)) * 100;
        const y = 90 - ((t - minTime) / range) * 80;
        return `${x},${y}`;
    }).join(' ');
    polyline.setAttribute('points', points);
}
function switchCategory(cat, autoSelectFirst = true) {
    if (isRunning) return;
    // Legacy tab UI is hidden by default. If it doesn't exist, just keep currentEvent as-is.
    const hasLegacy = document.querySelectorAll('.category-btn').length > 0 && document.getElementById('group-standard');
    if (!hasLegacy) return;
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active', 'text-white'));
    const catBtn = document.getElementById(`cat-${cat}`); 
    if (catBtn) { 
        catBtn.classList.add('active', 'text-white'); 
        catBtn.classList.remove('text-slate-500', 'dark:text-slate-400');
    }
    const groups = ['standard', 'nonstandard', 'blind', 'practice'];
    groups.forEach(g => {
        const el = document.getElementById(`group-${g}`);
        if (g === cat) { el.classList.remove('hidden'); el.classList.add('flex'); }
        else { el.classList.add('hidden'); el.classList.remove('flex'); }
    });
    if (autoSelectFirst) {
        const targetGroup = document.getElementById(`group-${cat}`);
        const firstButton = targetGroup ? targetGroup.querySelector('button') : null;
        if (firstButton) changeEvent(firstButton.id.replace('tab-', ''));
    }
}
function changeEvent(e) {
  // Normalize incoming event id (guards against stray whitespace from HTML/select values)
  e = String(e || '').trim();
  ensureCaseSelectorDOM();
    if (isRunning) return;
    currentEvent = e;
    if (eventSelect && eventSelect.value !== e) eventSelect.value = e;
    const conf = configs[e];
    initSessionIfNeeded(e);
    // Practice UI (case selector)
    refreshPracticeUI();
    
    // Reset lazy loading on event change
    displayedSolvesCount = SOLVES_BATCH_SIZE;
    if(historyList) historyList.scrollTop = 0;
    // Legacy tab UI (hidden). Guard to avoid null refs.
    const legacyTabs = document.querySelectorAll('.event-tab');
    if (legacyTabs && legacyTabs.length) {
    document.querySelectorAll('.event-tab').forEach(t => {
        t.classList.remove('active', 'text-white', 'bg-blue-600');
        t.classList.add('text-slate-500', 'dark:text-slate-400');
    });
    const activeTab = document.getElementById(`tab-${e}`); 
    if (activeTab) {
        activeTab.classList.add('active', 'text-white', 'bg-blue-600');
        activeTab.classList.remove('text-slate-500', 'dark:text-slate-400');
    }
    }
    
    if (conf.cat === 'blind') {
        activeTool = 'graph'; 
        selectTool('graph');
    } else {
        if (activeTool === 'graph') selectTool('graph');
        else selectTool('scramble');
    }
    if (['666', '777', '333bf', '444bf', '555bf', '333mbf'].includes(e)) { 
        isAo5Mode = false; avgModeToggle.checked = false; 
    } else { 
        isAo5Mode = true; avgModeToggle.checked = true; 
    }
    if (currentEvent === '333mbf') {
        scrambleEl.classList.add('hidden');
        mbfInputArea.classList.remove('hidden');
        setScrambleLoadingState(false);
        updateScrambleNavButtons();
    } else {
        scrambleEl.classList.remove('hidden');
        mbfInputArea.classList.add('hidden');
        setScrambleLoadingState(true, 'Loading scramble…');
        clearScrambleDiagram();
        generateScramble(); 
    }
    
    updateUI(); timerEl.innerText = (0).toFixed(precision); saveData();
    scheduleLayout('event-change');
}

function clearScrambleDiagram() {
    // 이전 다이어그램/텍스트가 잠깐 보이는 문제 방지
    if (scrambleDiagram) {
        scrambleDiagram.classList.add('hidden');
        scrambleDiagram.removeAttribute('scramble');
    }
}

function setScrambleLoadingState(isLoading, message = 'Loading scramble…', showRetry = false) {
    isScrambleLoading = isLoading;
    // null guard: 일부 레이아웃/버전에서 요소가 없을 수 있음
    if (scrambleRetryBtn) {
        scrambleRetryBtn.classList.toggle('hidden', !showRetry);
    }
    if (scrambleLoadingRow) {
        scrambleLoadingRow.classList.toggle('hidden', !isLoading);
        scrambleLoadingRow.classList.toggle('flex', isLoading);
    }
    if (scrambleLoadingText) {
        scrambleLoadingText.innerText = message || 'Loading scramble…';
    }
    if (scrambleDiagramSkeleton) {
        scrambleDiagramSkeleton.classList.toggle('hidden', !isLoading);
    }
    if (isLoading) {
        lockTimerLayout();
        // 종목 변경/재생성 시 이전 내용 즉시 숨김
        if (scrambleEl) scrambleEl.innerText = '';
        updateScrambleNavButtons();
        clearScrambleDiagram();
        // Prevent blind-only message from sticking across events
        if (noVisualizerMsg) noVisualizerMsg.classList.add('hidden');
    }
    updateScrambleNavButtons();
    scheduleLayout(isLoading ? 'scramble-loading' : 'scramble-ready');
}

window.retryScramble = () => {
    if (isRunning) return;
    setScrambleLoadingState(true, 'Retrying…');
    if (typeof lastScrambleTrigger === 'function') {
        lastScrambleTrigger();
    } else {
        generateScramble();
    }
}
async function generate3bldScrambleText() {
    const conf = configs['333bf'];
    const cubingFn = window.__randomScrambleForEvent;
    if (currentEvent !== '666' && typeof cubingFn === 'function') {
        try {
            const alg = await cubingFn('333bf');
            return alg.toString();
        } catch (err) {
            console.warn('[CubeTimer] cubing.js 3BLD scramble failed, fallback.', err);
        }
    }
    let res = [];
    let last = "";
    for (let i = 0; i < conf.len; i++) {
        let m; do { m = conf.moves[Math.floor(Math.random() * conf.moves.length)]; } while (m[0] === last[0]);
        res.push(m + suffixes[Math.floor(Math.random() * 3)]); last = m;
    }
    const wideMoveCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < wideMoveCount; i++) {
        const wm = wideMoves[Math.floor(Math.random() * wideMoves.length)];
        const suf = suffixes[Math.floor(Math.random() * 3)];
        res.push(wm + suf);
    }
    return res.join(" ");
}
async function generateScramble() {
    const conf = configs[currentEvent];
    if (!conf || currentEvent === '333mbf') return;
    lastScrambleTrigger = () => generateScramble();
    const reqId = ++scrambleReqId;
    setScrambleLoadingState(true, 'Loading scramble…', false);
    // Practice scrambles (F2L/OLL/PLL/ZBLS/ZBLL) - do NOT affect normal events
    if (isPracticeEvent(currentEvent)) {
        try {
            const txt = await generatePracticeScrambleText();
            if (reqId !== scrambleReqId) return;
            setCurrentScramble(String(txt || '').trim() || 'N/A');
            setScrambleLoadingState(false);
            updateScrambleDiagram();
            resetPenalty();
            if (activeTool === 'graph') renderHistoryGraph();
            return;
        } catch (err) {
            if (reqId !== scrambleReqId) return;
            console.warn('[CubeTimer] practice scramble failed. Falling back to 3x3.', err);
            // fallthrough to existing generator using 3x3
        }
    }
    // Prefer cubing.js (official random-state scrambles) when available.
    const cubingFn = window.__randomScrambleForEvent;
    if (typeof cubingFn === 'function' && currentEvent !== '666' && currentEvent !== 'clock') {
        try {
            const alg = await cubingFn(mapEventIdForCubing(currentEvent));
            if (reqId !== scrambleReqId) return; // stale
            setCurrentScramble(alg.toString());
            setScrambleLoadingState(false);
            updateScrambleDiagram();
            resetPenalty();
            if (activeTool === 'graph') renderHistoryGraph();
            return;
            scheduleLayout('scramble-ready');
        } catch (err) {
            if (reqId !== scrambleReqId) return;
            console.warn('[CubeTimer] cubing.js scramble failed. Falling back to internal generator.', err);
        }
    }
    // Fallback: existing internal generator (keeps app usable offline)
    let res = [];
    if (currentEvent === 'minx') {
        for (let i = 0; i < 7; i++) {
            let line = [];
            for (let j = 0; j < 10; j++) {
                const type = (j % 2 === 0) ? "R" : "D";
                const suffix = (Math.random() < 0.5) ? "++" : "--";
                line.push(type + suffix);
            }
            line.push(Math.random() < 0.5 ? "U" : "U'");
            res.push(line.join(" "));
        }
        setCurrentScramble(res.join("\n"));
    } else if (currentEvent === 'clock') {
        // WCA-style Clock scramble formatting:
        // - First two tokens should be UR... DR...
        // - Use dial format like UR3+ / DR4- (number then sign)
        // - Include y2 and end with an ALL... token (no trailing pin-pattern tokens)
        const dialOrderFront = ["UR", "DR", "DL", "UL", "U", "R", "D", "L", "ALL"];
        const dialOrderBack  = ["U", "R", "D", "L", "ALL"];

        const fmt = (dial, v) => {
            const abs = Math.abs(v);
            return `${dial}${abs}${v >= 0 ? '+' : '-'}`;
        };

        dialOrderFront.forEach((dial) => {
            const v = Math.floor(Math.random() * 12) - 5; // -5..+6
            res.push(fmt(dial, v));
        });

        res.push("y2");

        dialOrderBack.forEach((dial) => {
            const v = Math.floor(Math.random() * 12) - 5; // -5..+6
            res.push(fmt(dial, v));
        });

        setCurrentScramble(res.join(" "));
    } else if (currentEvent === 'sq1') {
        // NOTE: Internal SQ1 generator is kept only as a fallback.
        let topCuts = [true, false, true, true, false, true, true, false, true, true, false, true];
        let botCuts = [true, false, true, true, false, true, true, false, true, true, false, true];
        let movesCount = 0;
        let scrambleOps = [];
        const rotateArray = (arr, amt) => {
            const n = 12;
            let amount = amt % n;
            if (amount < 0) amount += n;
            const spliced = arr.splice(n - amount, amount);
            arr.unshift(...spliced);
        };
        let guard = 0;
        while (movesCount < 12 && guard < 5000) {
            guard++;
            let u = Math.floor(Math.random() * 12) - 5;
            let d = Math.floor(Math.random() * 12) - 5;
            if (u === 0 && d === 0) continue;
            let nextTop = [...topCuts];
            let nextBot = [...botCuts];
            rotateArray(nextTop, u);
            rotateArray(nextBot, d);
            if (nextTop[0] && nextTop[6] && nextBot[0] && nextBot[6]) {
                scrambleOps.push(`(${u},${d})`);
                let topRight = nextTop.slice(6, 12);
                let botRight = nextBot.slice(6, 12);
                let newTop = [...nextTop.slice(0, 6), ...botRight];
                let newBot = [...nextBot.slice(0, 6), ...topRight];
                topCuts = newTop;
                botCuts = newBot;
                scrambleOps.push("/");
                movesCount++;
            }
        }
        setCurrentScramble(scrambleOps.join(" "));
    } else if (['pyra', 'skewb'].includes(currentEvent)) {
        let last = "";
        for (let i = 0; i < conf.len; i++) {
            let m;
            do { m = conf.moves[Math.floor(Math.random() * conf.moves.length)]; } while (m === last);
            res.push(m + (Math.random() < 0.5 ? "'" : ""));
            last = m;
        }
        if (currentEvent === 'pyra') {
            conf.tips.forEach(t => {
                const r = Math.floor(Math.random() * 3);
                if (r === 1) res.push(t);
                else if (r === 2) res.push(t + "'");
            });
        }
        setCurrentScramble(res.join(" "));
    } else {
        let lastAxis = -1;
        let secondLastAxis = -1;
        let lastMoveBase = "";
        const getMoveAxis = (m) => {
            const c = m[0];
            if ("UD".includes(c)) return 0;
            if ("LR".includes(c)) return 1;
            if ("FB".includes(c)) return 2;
            return -1;
        };
        for (let i = 0; i < conf.len; i++) {
            let move, axis, base;
            let valid = false;
            while (!valid) {
                move = conf.moves[Math.floor(Math.random() * conf.moves.length)];
                axis = getMoveAxis(move);
                base = move[0];
                if (base === lastMoveBase) { valid = false; continue; }
                if (axis !== -1 && axis === lastAxis && axis === secondLastAxis) { valid = false; continue; }
                valid = true;
            }
            res.push(move + suffixes[Math.floor(Math.random() * 3)]);
            secondLastAxis = lastAxis;
            lastAxis = axis;
            lastMoveBase = base;
        }
        if (currentEvent === '333bf') {
            const wideMoveCount = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < wideMoveCount; i++) {
                const wm = wideMoves[Math.floor(Math.random() * wideMoves.length)];
                const suf = suffixes[Math.floor(Math.random() * 3)];
                res.push(wm + suf);
            }
        } else if (conf.cat === 'blind') {
            res.push(orientations[Math.floor(Math.random() * orientations.length)]);
            if (Math.random() > 0.5) res.push(orientations[Math.floor(Math.random() * orientations.length)]);
        }
        setCurrentScramble(res.join(" "));
    }
    if (reqId !== scrambleReqId) return; // stale
    setScrambleLoadingState(false);
    updateScrambleDiagram();
    resetPenalty();
    if (activeTool === 'graph') renderHistoryGraph();
    scheduleLayout('scramble-ready');
}
function updateScrambleDiagram() {
    if (!scrambleDiagram) return;
    const conf = configs[currentEvent];
    const isBlind = conf && conf.cat === 'blind';
    // Message should only be shown in Scramble Image tool.
    if (activeTool !== 'scramble') {
        if (noVisualizerMsg) noVisualizerMsg.classList.add('hidden');
        return;
    }
    if (isBlind) {
        scrambleDiagram.classList.add('hidden');
        if (noVisualizerMsg) {
            noVisualizerMsg.classList.remove('hidden');
            noVisualizerMsg.innerText = (currentLang === 'ko')
                ? '블라인드 종목에서는 스크램블 이미지가 비활성화됩니다'
                : 'Scramble images disabled for Blind';
        }
        return;
    }
    if (noVisualizerMsg) noVisualizerMsg.classList.add('hidden');
    scrambleDiagram.classList.remove('hidden');
    // scramble-display auto-updates when attributes change.
    scrambleDiagram.setAttribute('event', mapEventIdForCubing(currentEvent));
    const _scr = String(currentScramble || '').replace(/\n/g, ' ');
    const _diagScr = isPracticeEvent(currentEvent) ? _practiceAlgForDiagram(_scr) : _scr;
    scrambleDiagram.setAttribute('scramble', _diagScr);
}
window.generateMbfScrambles = async () => {
    const count = parseInt(mbfCubeInput.value);
    if (!count || count < 2 || count > 100) return;
    const listContainer = document.getElementById('mbfScrambleList');
    document.getElementById('mbfCubeCountDisplay').innerText = `${count} Cubes`;
    listContainer.innerHTML = "";
    for (let i = 1; i <= count; i++) {
        const scr = await generate3bldScrambleText();
        listContainer.innerHTML += `
            <div class="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl">
                <div class="flex items-center gap-2 mb-2">
                    <span class="w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded-full text-[10px] font-bold">#${i}</span>
                    <span class="text-[10px] font-black uppercase text-slate-400">Scramble</span>
                </div>
                <p class="font-bold text-slate-600 dark:text-slate-300 leading-relaxed scramble-text">${scr}</p>
            </div>`;
    }
    document.getElementById('mbfScrambleOverlay').classList.add('active');
    setCurrentScramble(`Multi-Blind (${count} Cubes Attempt)`);
};
window.closeMbfScrambleModal = () => document.getElementById('mbfScrambleOverlay').classList.remove('active');
window.copyMbfText = () => {
    const texts = Array.from(document.querySelectorAll('.scramble-text')).map((el, i) => `${i+1}. ${el.innerText}`).join('\n\n');
    const countText = document.getElementById('mbfCubeCountDisplay').innerText;
    const fullText = `[CubeTimer] Multi-Blind Scrambles (${countText})\n\n${texts}`;
    const textArea = document.createElement("textarea"); textArea.value = fullText; document.body.appendChild(textArea); textArea.select();
    document.execCommand('copy'); document.body.removeChild(textArea);
    const btn = document.querySelector('[onclick="copyMbfText()"]');
    const original = btn.innerText; btn.innerText = "Copied!"; setTimeout(() => btn.innerText = original, 2000);
};

function formatClockTime(ms) {
    if (ms == null || isNaN(ms)) return '-';
    const totalSec = Math.round(ms / 1000);
    const sec = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    const min = totalMin % 60;
    const hr = Math.floor(totalMin / 60);
    const pad = (n) => String(n).padStart(2, '0');
    if (hr > 0) return `${hr}:${pad(min)}:${pad(sec)}`;
    return `${min}:${pad(sec)}`;
}

function parseClockTimeToMs(str) {
    // Accept: ss, mm:ss, hh:mm:ss
    const s = String(str || '').trim();
    if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) {
        // seconds (allow decimal)
        return Math.round(parseFloat(s) * 1000);
    }
    const parts = s.split(':').map(p => p.trim()).filter(Boolean);
    if (parts.length < 2 || parts.length > 3) return null;
    const nums = parts.map(p => ( /^\d+(\.\d+)?$/.test(p) ? parseFloat(p) : NaN));
    if (nums.some(n => isNaN(n))) return null;
    let hr = 0, min = 0, sec = 0;
    if (nums.length === 2) {
        [min, sec] = nums;
    } else {
        [hr, min, sec] = nums;
    }
    if (sec < 0 || sec >= 60 || min < 0 || min >= 60 || hr < 0) return null;
    return Math.round(((hr * 3600) + (min * 60) + sec) * 1000);
}

window.openMbfResultModal = ({ defaultTimeMs } = {}) => {
    const overlay = document.getElementById('mbfResultOverlay');
    if (!overlay) return;
    const attemptedEl = document.getElementById('mbfAttemptedInput');
    const solvedEl = document.getElementById('mbfSolvedInput');
    const timeEl = document.getElementById('mbfTimeInput');
    const errEl = document.getElementById('mbfResultError');
    if (errEl) { errEl.classList.add('hidden'); errEl.innerText = ''; }

    // Draft 생성 (Save 버튼을 누를 때 실제 solve로 저장)
    pendingMbfDraft = {
        id: Date.now(),
        event: '333mbf',
        sessionId: getCurrentSessionId(),
        date: new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, ""),
        scramble: currentScramble || 'Multi-Blind',
        time: (defaultTimeMs != null ? defaultTimeMs : null),
        penalty: null,
        mbf: {
            attempted: null,
            solved: null,
            timeMs: (defaultTimeMs != null ? defaultTimeMs : null),
            resultText: ''
        }
    };

    // 기본값: mbfCubeInput이 있으면 attempted에 반영
    const defaultAttempted = parseInt(mbfCubeInput?.value);
    if (attemptedEl) attemptedEl.value = Number.isFinite(defaultAttempted) ? String(defaultAttempted) : '';
    if (solvedEl) solvedEl.value = '';
    if (timeEl) timeEl.value = defaultTimeMs != null ? formatClockTime(defaultTimeMs) : '';

    overlay.classList.add('active');
    // focus (모바일)
    setTimeout(() => { attemptedEl?.focus?.(); }, 50);
}
window.closeMbfResultModal = () => {
    const overlay = document.getElementById('mbfResultOverlay');
    if (overlay) overlay.classList.remove('active');
    pendingMbfDraft = null;
    statusHint.innerText = isBtConnected ? "Ready (Bluetooth)" : (isInspectionMode ? "Start Inspection" : "Hold to Ready");
}
window.saveMbfResult = () => {
    const errEl = document.getElementById('mbfResultError');
    const attemptedEl = document.getElementById('mbfAttemptedInput');
    const solvedEl = document.getElementById('mbfSolvedInput');
    const timeEl = document.getElementById('mbfTimeInput');
    const attempted = parseInt(attemptedEl?.value);
    const solved = parseInt(solvedEl?.value);
    const timeMs = parseClockTimeToMs(timeEl?.value);

    const fail = (msg) => {
        if (!errEl) return;
        errEl.innerText = msg;
        errEl.classList.remove('hidden');
    };
    if (!pendingMbfDraft) return fail('저장할 MBF 기록이 없습니다.');
    if (!Number.isFinite(attempted) || attempted < 1) return fail('Attempted는 1 이상이어야 합니다.');
    if (!Number.isFinite(solved) || solved < 0) return fail('Solved는 0 이상이어야 합니다.');
    if (solved > attempted) return fail('Solved는 Attempted를 초과할 수 없습니다.');
    if (timeMs == null) return fail('Time 형식이 올바르지 않습니다. 예) 12:34 또는 1:02:03');

    pendingMbfDraft.mbf.attempted = attempted;
    pendingMbfDraft.mbf.solved = solved;
    pendingMbfDraft.mbf.timeMs = timeMs;
    pendingMbfDraft.mbf.resultText = `${solved}/${attempted} ${formatClockTime(timeMs)}`;
    // 대표 time 필드는 mbf.timeMs로 통일
    pendingMbfDraft.time = timeMs;

    solves.unshift(pendingMbfDraft);
    pendingMbfDraft = null;
    closeMbfResultModal();
    updateUI();
    saveData();
}
// [UPDATED] Format Time to support Minutes:Seconds format
function formatTime(ms) { 
    const minutes = Math.floor(ms / 60000);
    const remainingMs = ms % 60000;
    let seconds;
    if (precision === 3) {
        seconds = (remainingMs / 1000).toFixed(3);
    } else {
        // For 2 decimals, we ignore the last digit (truncate)
        seconds = (Math.floor(remainingMs / 10) / 100).toFixed(2);
    }
    if (minutes > 0) {
        // Add leading zero if seconds is less than 10 (e.g. 1:05.43)
        if (parseFloat(seconds) < 10) {
            seconds = "0" + seconds;
        }
        return `${minutes}:${seconds}`;
    }
    return seconds;
} 

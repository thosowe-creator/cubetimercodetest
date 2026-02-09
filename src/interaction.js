// --- Interaction Logic with configurable Hold Time ---
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
    if (isInspectionMode && inspectionState === 'inspecting') {
        // BT 연결 시에는 키보드로 'Ready' 상태 진입 불가 (오직 간 타이머 핸즈온으로만 가능)
        if (isBtConnected) return;
        // Pressed during inspection -> Ready to solve
        timerEl.style.color = '#ef4444'; 
        timerEl.classList.add('holding-status');
        holdTimer = setTimeout(()=> { 
            isReady=true; 
            timerEl.style.color = '#10b981'; 
            timerEl.classList.replace('holding-status','ready-to-start'); 
            statusHint.innerText="Ready!"; 
        }, holdDuration); 
        return;
    }
    // Standard Logic (BT 연결 시 여기 도달 안함)
    timerEl.style.color = '#ef4444'; 
    timerEl.classList.add('holding-status');
    
    holdTimer = setTimeout(()=> { 
        isReady=true; 
        timerEl.style.color = '#10b981'; 
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
        timerEl.style.color = ''; 
        
        timerEl.classList.remove('holding-status','ready-to-start'); 
        isReady=false; 
        // If inspecting, don't reset to "Hold to Ready"
        if (!isInspectionMode || inspectionState === 'none') {
            statusHint.innerText= isInspectionMode ? "Start Inspection" : "Hold to Ready";
        } else {
            // Returned to inspecting state without starting
            timerEl.style.color = '#ef4444'; 
        }
    }
}
window.openSessionModal = () => { document.getElementById('sessionOverlay').classList.add('active'); renderSessionList(); };
window.closeSessionModal = () => { document.getElementById('sessionOverlay').classList.remove('active'); document.getElementById('newSessionName').value = ""; editingSessionId = null; };
// ... (Session Management Functions - Logic Preserved) ...
function renderSessionList() {
    const listContainer = document.getElementById('sessionList');
    const eventSessions = sessions[currentEvent] || [];
    document.getElementById('sessionCountLabel').innerText = `${eventSessions.length}/10`;
    listContainer.innerHTML = eventSessions.map(s => {
        if (editingSessionId === s.id) {
            return `<div class="flex items-center gap-2"><input type="text" id="editSessionInput" value="${s.name}" class="flex-1 bg-white dark:bg-slate-800 border border-blue-400 rounded-xl px-3 py-2.5 text-xs font-bold outline-none dark:text-white" autofocus onkeydown="if(event.key==='Enter') saveSessionName(${s.id})" onblur="saveSessionName(${s.id})"><button onclick="saveSessionName(${s.id})" class="p-2 text-blue-600"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button></div>`;
        }
        return `<div class="flex items-center gap-2 group"><div class="flex-1 flex items-center gap-2 p-1 rounded-xl border ${s.isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400'} hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"><button onclick="switchSession(${s.id})" class="flex-1 text-left p-2.5 text-xs font-bold truncate">${s.name}</button><button onclick="editSessionName(${s.id})" class="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-blue-500 transition-all"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></div>${eventSessions.length > 1 ? `<button onclick="deleteSession(${s.id})" class="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>` : ''}</div>`;
    }).join('');
    if (editingSessionId) document.getElementById('editSessionInput').focus();
    document.getElementById('sessionCreateForm').classList.toggle('hidden', eventSessions.length >= 10);
}
// ... (Remaining window functions - Logic Preserved) ...
window.editSessionName = (id) => { editingSessionId = id; renderSessionList(); };
window.saveSessionName = (id) => { const input = document.getElementById('editSessionInput'); if (!input) return; const newName = input.value.trim(); if (newName) { const s = sessions[currentEvent].find(x => x.id === id); if (s) s.name = newName; } editingSessionId = null; renderSessionList(); updateUI(); saveData(); };
window.createNewSession = () => { const nameInput = document.getElementById('newSessionName'); const name = nameInput.value.trim() || `Session ${sessions[currentEvent].length + 1}`; if (sessions[currentEvent].length >= 10) return; sessions[currentEvent].forEach(s => s.isActive = false); sessions[currentEvent].push({ id: Date.now(), name: name, isActive: true }); nameInput.value = ""; renderSessionList(); updateUI(); saveData(); timerEl.innerText = (0).toFixed(precision); resetPenalty(); };
window.switchSession = (id) => { sessions[currentEvent].forEach(s => s.isActive = (s.id === id)); renderSessionList(); updateUI(); saveData(); timerEl.innerText = (0).toFixed(precision); resetPenalty(); closeSessionModal(); };
window.deleteSession = (id) => { const eventSessions = sessions[currentEvent]; if (!eventSessions || eventSessions.length <= 1) return; const targetIdx = eventSessions.findIndex(s => s.id === id); if (targetIdx === -1) return; const wasActive = eventSessions[targetIdx].isActive; sessions[currentEvent] = eventSessions.filter(s => s.id !== id); solves = solves.filter(s => !(s.event === currentEvent && s.sessionId === id)); if (wasActive && sessions[currentEvent].length > 0) sessions[currentEvent][0].isActive = true; renderSessionList(); updateUI(); saveData(); };
window.openAvgShare = (type) => {
    const sid = getCurrentSessionId();
    const count = (type === 'primary') ? (isAo5Mode ? 5 : 3) : 12;
    const filtered = solves.filter(s => s.event === currentEvent && s.sessionId === sid);
    if (filtered.length < count) return;
    const list = filtered.slice(0, count);
    const avgValue = calculateAvg(filtered, count, (type === 'primary' && !isAo5Mode));

    const dateStr = list[0].date || new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, "");
    const datePrefix = currentLang === 'ko' ? '날짜 :' : 'Date :';
    document.getElementById('shareDate').innerText = `${datePrefix} ${dateStr}.`;

    const label = (type === 'primary' && !isAo5Mode)
        ? (currentLang === 'ko' ? 'Mo3 :' : 'Mean of 3 :')
        : (currentLang === 'ko' ? `Ao${count} :` : `Average of ${count} :`);
    const overlay = document.getElementById('avgShareOverlay');
    if (overlay) {
        overlay.dataset.shareMode = 'avg';
        overlay.dataset.shareCount = String(count);
    }
    document.getElementById('shareLabel').innerText = label;
    document.getElementById('shareAvg').innerText = avgValue;

    const listContainer = document.getElementById('shareList');
    listContainer.innerHTML = list.map((s, idx) => `<div class="flex flex-col p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700"><div class="flex items-center gap-3"><span class="text-[10px] font-bold text-slate-400 w-4">${count - idx}.</span><span class="font-bold text-slate-800 dark:text-slate-200 text-sm min-w-[50px]">${s.penalty==='DNF'?'DNF':formatTime(s.penalty==='+2'?s.time+2000:s.time)}${s.penalty==='+2'?'+':''}</span><span class="text-[10px] text-slate-400 font-medium italic truncate flex-grow">${s.scramble}</span></div></div>`).reverse().join('');

    document.getElementById('avgShareOverlay').classList.add('active');
};
window.openSingleShare = () => {
    const s = solves.find(x => x.id === selectedSolveId);
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
    }

    const listContainer = document.getElementById('shareList');
    if (s.event === '333mbf' && s.mbf) {
        const res = s.mbf.resultText || `${s.mbf.solved}/${s.mbf.attempted} ${formatClockTime(s.mbf.timeMs || s.time)}`;
        document.getElementById('shareAvg').innerText = res;
        listContainer.innerHTML = `<div class="flex flex-col p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700"><div class="flex items-center gap-3"><span class="text-[10px] font-bold text-slate-400 w-4">1.</span><span class="font-bold text-slate-800 dark:text-slate-200 text-sm min-w-[50px]">${res}</span><span class="text-[10px] text-slate-400 font-medium italic truncate flex-grow">${(s.scramble || '').toString()}</span></div></div>`;
    } else {
        const res = (s.penalty==='DNF') ? 'DNF' : (formatTime(s.penalty==='+2'?s.time+2000:s.time) + (s.penalty==='+2'?'+':''));
        document.getElementById('shareAvg').innerText = res;
        listContainer.innerHTML = `<div class="flex flex-col p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700"><div class="flex items-center gap-3"><span class="text-[10px] font-bold text-slate-400 w-4">1.</span><span class="font-bold text-slate-800 dark:text-slate-200 text-sm min-w-[50px]">${s.penalty==='DNF'?'DNF':formatTime(s.penalty==='+2'?s.time+2000:s.time)}${s.penalty==='+2'?'+':''}</span><span class="text-[10px] text-slate-400 font-medium italic truncate flex-grow">${s.scramble}</span></div></div>`;
    }
    document.getElementById('avgShareOverlay').classList.add('active');
};
window.closeAvgShare = () => document.getElementById('avgShareOverlay').classList.remove('active');
window.copyShareText = () => {
    const date = document.getElementById('shareDate').innerText;
    const avgLabel = document.getElementById('shareLabel').innerText;
    const avgVal = document.getElementById('shareAvg').innerText;
    const overlay = document.getElementById('avgShareOverlay');
    const mode = overlay?.dataset?.shareMode || '';
    const count = parseInt(overlay?.dataset?.shareCount || '0', 10);

    const isSingle = mode === 'single';
    let text = `[CubeTimer]\n\n${date}\n\n${avgLabel} ${avgVal}\n\n`;

    if (isSingle) {
        const s = solves.find(x => x.id === selectedSolveId);
        if (s) text += `1. ${avgVal}   ${s.scramble}\n`;
    } else {
        const n = (Number.isFinite(count) && count > 0) ? count : 12;
        const sid = getCurrentSessionId();
        const filtered = solves.filter(s => s.event === currentEvent && s.sessionId === sid).slice(0, n);
        filtered.reverse().forEach((s, i) => {
            text += `${i + 1}. ${s.penalty === 'DNF' ? 'DNF' : formatTime(s.penalty === '+2' ? s.time + 2000 : s.time)}${s.penalty === '+2' ? '+' : ''}   ${s.scramble}\n`;
        });
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        const btn = document.querySelector('[onclick="copyShareText()"]');
        const original = btn.innerHTML;
        btn.innerHTML = (currentLang === 'ko') ? '복사됨!' : 'Copied!';
        btn.classList.add('bg-green-600');
        setTimeout(() => {
            btn.innerHTML = original;
            btn.classList.remove('bg-green-600');
            try { applyAutoI18n(document); } catch (_) {}
        }, 2000);
    } catch (err) {
        console.error('Copy failed', err);
    }
    document.body.removeChild(textArea);
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
        if (!e.repeat) handleStart(e);
        return;
    }

    if (isManualMode && e.code === 'Enter') {
        let v = parseFloat(manualInput.value);
        if (v > 0) {
            solves.unshift({
                id: Date.now(),
                time: v * 1000,
                scramble: currentScramble,
                event: currentEvent,
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
    const s = solves.find(x => x.id === id);
    if (!s) return;
    selectedSolveId = id;
    const timeEl = document.getElementById('modalTime');
    const eventEl = document.getElementById('modalEvent');
    const scrEl = document.getElementById('modalScramble');
    const overlay = document.getElementById('modalOverlay');
    const useBtn = document.querySelector('[onclick="useThisScramble()"]');

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

    if (overlay) overlay.classList.add('active');
};
window.closeModal = () => document.getElementById('modalOverlay').classList.remove('active');
window.useThisScramble = () => { let s=solves.find(x=>x.id===selectedSolveId); if(s){currentScramble=s.scramble; scrambleEl.innerText=currentScramble; closeModal();} };
precisionToggle.onchange = e => { precision = e.target.checked?3:2; updateUI(); timerEl.innerText=(0).toFixed(precision); saveData(); };
avgModeToggle.onchange = e => { isAo5Mode = e.target.checked; updateUI(); saveData(); };
manualEntryToggle.onchange = e => { isManualMode = e.target.checked; timerEl.classList.toggle('hidden', isManualMode); manualInput.classList.toggle('hidden', !isManualMode); statusHint.innerText = isManualMode ? (currentLang === 'ko' ? '시간 입력 후 Enter' : 'Type time & Enter') : t('holdToReady'); };
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
    solves = solves.filter(s => !(s.event === currentEvent && s.sessionId === sid));
    updateUI();
    saveData();
    document.body.removeChild(document.getElementById('clearConfirmModal'));
    timerEl.innerText = (0).toFixed(precision);
    resetPenalty();
  };
};

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
  scramble: [255, 255, 255],   // #FFFFFF
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
  setRGB('--ct-scramble-rgb', lightTheme.scramble);
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
  return ({
    accent: 'Accent',
    bg: 'Background',
    card: 'Panels',
    text: 'Text',
    scramble: 'Scramble Box',
  })[part] || 'Color';
}

function syncThemeRowsUI() {
  const map = {
    accent: 'Accent',
    bg: 'Bg',
    card: 'Card',
    text: 'Text',
    scramble: 'Scramble',
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


// --- Bluetooth & Timer Logic ---
window.openBTModal = () => document.getElementById('btOverlay').classList.add('active');
window.closeBTModal = () => document.getElementById('btOverlay').classList.remove('active');
async function connectGanTimer() {
    const btBtn = document.getElementById('btConnectBtn');
    const btStatusText = document.getElementById('btStatusText');
    const btIcon = document.getElementById('btModalIcon');
    if (!navigator.bluetooth) {
        btStatusText.innerText = "Web Bluetooth is not supported in this browser.";
        btStatusText.classList.add('text-red-400');
        return;
    }
    try {
        btBtn.disabled = true;
        btBtn.innerText = "Searching...";
        btStatusText.innerText = "Select your GAN Timer in the popup";
        btIcon.classList.add('bt-pulse');
        btDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'GAN' }],
            optionalServices: ['0000fff0-0000-1000-8000-00805f9b34fb']
        });
        const server = await btDevice.gatt.connect();
        const service = await server.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb');
        
        btCharacteristic = await service.getCharacteristic('0000fff5-0000-1000-8000-00805f9b34fb');
        await btCharacteristic.startNotifications();
        btCharacteristic.addEventListener('characteristicvaluechanged', handleGanBTData);
        isBtConnected = true;
        document.getElementById('btStatusIcon').classList.replace('disconnected', 'connected');
        document.getElementById('btInfoPanel').classList.remove('hidden');
        document.getElementById('btDeviceName').innerText = btDevice.name;
        document.getElementById('btDisconnectBtn').classList.remove('hidden');
        btBtn.classList.add('hidden');
        btStatusText.innerText = "Timer Connected & Ready";
        btIcon.classList.remove('bt-pulse');
        
        statusHint.innerText = "Timer Ready (BT)";
        btDevice.addEventListener('gattserverdisconnected', onBTDisconnected);
    } catch (error) {
        console.error("Bluetooth Connection Error:", error);
        btStatusText.innerText = "Connection failed";
        btBtn.disabled = false;
        btBtn.innerText = "Connect Timer";
        btIcon.classList.remove('bt-pulse');
    }
}
function handleGanBTData(event) {
    const data = event.target.value;
    if (data.byteLength < 4) return; 
    const state = data.getUint8(3);
    
    // Sync time when not running (1:GetSet, 2:HandsOff, 4:Stopped)
    if (state !== 3 && !isRunning && data.byteLength >= 8) {
        const min = data.getUint8(4);
        const sec = data.getUint8(5);
        const msec = data.getUint16(6, true);
        const currentMs = (min * 60000) + (sec * 1000) + msec;
        timerEl.innerText = formatTime(currentMs);
    }
    if (state !== lastBtState) {
        if (state === 6) { // HANDS_ON
            // If inspecting, do not reset ready state (user puts hands on timer during inspection)
            if (!isInspectionMode) {
                isReady = false;
                timerEl.classList.add('text-ready'); 
                statusHint.innerText = "Ready!";
            }
        } else if (state === 1) { // GET_SET
        } else if (state === 2) { // HANDS_OFF (Just released)
             // If inspecting, this is where we start the solve and end inspection
             if (!isInspectionMode) {
                 timerEl.classList.remove('text-ready', 'text-running');
                 statusHint.innerText = "Timer Ready (BT)";
             }
        } else if (state === 3) { // RUNNING
            if (!isRunning) {
                // If inspection mode was active, stop it and check penalty
                if (isInspectionMode && inspectionState === 'inspecting') {
                    stopInspection();
                }
                startTime = Date.now();
                isRunning = true;
                if(timerInterval) clearInterval(timerInterval);
                timerInterval = setInterval(() => {
                    timerEl.innerText = formatTime(Date.now() - startTime);
                }, 16);
                
                timerEl.classList.remove('text-ready');
                timerEl.classList.add('text-running');
                statusHint.innerText = "Timing...";
            }
        } else if (state === 4) { // STOPPED
            if (isRunning) {
                clearInterval(timerInterval);
                isRunning = false;
                if (data.byteLength >= 8) {
                    const min = data.getUint8(4);
                    const sec = data.getUint8(5);
                    const msec = data.getUint16(6, true); 
                    const finalMs = (min * 60000) + (sec * 1000) + msec;
                    
                    timerEl.innerText = formatTime(finalMs);
                    stopTimer(finalMs);
                }
                timerEl.classList.remove('text-running');
                statusHint.innerText = "Finished";
            }
        }
        lastBtState = state;
    }
}
function disconnectBT() {
    if (btDevice && btDevice.gatt.connected) {
        btDevice.gatt.disconnect();
    }
}
function onBTDisconnected() {
    isBtConnected = false;
    lastBtState = null;
    document.getElementById('btStatusIcon').classList.replace('connected', 'disconnected');
    document.getElementById('btInfoPanel').classList.add('hidden');
    document.getElementById('btDisconnectBtn').classList.add('hidden');
    const btBtn = document.getElementById('btConnectBtn');
    btBtn.classList.remove('hidden');
    btBtn.disabled = false;
    btBtn.innerText = "Connect Timer";
    document.getElementById('btStatusText').innerText = "Timer Disconnected";
    statusHint.innerText = "Hold to Ready";
}
function setControlsLocked(locked) {
    // RUNNING 중 실수 방지 (모바일 한 손 사용 가이드)
    const disabled = !!locked;
    if (eventSelect) eventSelect.disabled = disabled;
    if (plus2Btn) plus2Btn.disabled = disabled;
    if (dnfBtn) dnfBtn.disabled = disabled;
}

function startTimer() {
    if(inspectionInterval) clearInterval(inspectionInterval);
    inspectionState = 'none';
    // High-precision timer loop (prevents interval drift)
    startPerf = performance.now();
    isRunning = true;
    // Prevent accidental page scroll while timing on mobile
    document.body.classList.add('no-scroll');
    setControlsLocked(true);
    if (timerRafId) cancelAnimationFrame(timerRafId);
    const tick = () => {
        if (!isRunning) return;
        const elapsed = performance.now() - startPerf;
        timerEl.innerText = formatTime(elapsed);
        timerRafId = requestAnimationFrame(tick);
    };
    timerRafId = requestAnimationFrame(tick);
    timerEl.style.color = '';
    statusHint.innerText = "Timing...";
    timerEl.classList.add('text-running');
    timerEl.classList.remove('text-ready');
}
function stopTimer(forcedTime = null) {
    if (timerRafId) {
        cancelAnimationFrame(timerRafId);
        timerRafId = null;
    }
    clearInterval(timerInterval); // legacy safety (in case any older interval was running)
    const elapsed = forcedTime !== null ? forcedTime : (performance.now() - startPerf);
    lastStopTimestamp = Date.now();

    // Stop timing: restore scroll
    document.body.classList.remove('no-scroll');

    // Multi-Blind: WCA식 입력 모달에서 결과를 완성해야 저장
    if (currentEvent === '333mbf') {
        isRunning = isReady = false;
        inspectionState = 'none';
        inspectionPenalty = null;
        setControlsLocked(false);
        // Ensure we don't keep the "running" (blue) timer color after stopping in MBF.
        timerEl.classList.remove('text-running', 'text-ready', 'text-hold');
        timerEl.style.color = '';
        timerEl.innerText = formatTime(elapsed);
        statusHint.innerText = "Enter MBF Result";
        openMbfResultModal({ defaultTimeMs: elapsed });
        saveData();
        return;
    }
    let finalPenalty = inspectionPenalty;
    if (elapsed > 10 || finalPenalty === 'DNF') {
        solves.unshift({
            id: Date.now(),
            time: elapsed,
            scramble: currentScramble,
            event: currentEvent,
            sessionId: getCurrentSessionId(),
            penalty: finalPenalty,
            date: new Date().toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.$/, "")
        });
        if (finalPenalty === 'DNF') {
            timerEl.innerText = "DNF";
        } else {
            let displayTime = formatTime(elapsed);
            if (finalPenalty === '+2') {
                displayTime = formatTime(elapsed + 2000) + "+";
            }
            timerEl.innerText = displayTime;
        }
    }
    isRunning = isReady = false;
    inspectionState = 'none';
    inspectionPenalty = null;
    setControlsLocked(false);
    updateUI();
    generateScramble();
    statusHint.innerText = isBtConnected ? "Ready (Bluetooth)" : (isInspectionMode ? "Start Inspection" : "Hold to Ready");
    timerEl.classList.remove('text-running', 'text-ready');
    timerEl.style.color = '';
    setControlsLocked(false);
    saveData();
}

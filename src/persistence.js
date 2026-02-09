// --- Data Persistence ---
function buildBackupPayload() {
    return {
        solves: solves,
        sessions: sessions,
        settings: {
            precision,
            isAo5Mode,
            currentEvent,
            holdDuration,
            isDarkMode: document.documentElement.classList.contains('dark'),
            isWakeLockEnabled,
            isInspectionMode
        }
    };
}
function bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
function compressPayload(payload) {
    const json = JSON.stringify(payload);
    const compressed = window.pako.deflate(json, { level: 9 });
    return bytesToBase64(compressed);
}
function decompressPayload(base64) {
    const bytes = base64ToBytes(base64);
    const json = window.pako.inflate(bytes, { to: 'string' });
    return JSON.parse(json);
}
async function exportData() {
    const payload = buildBackupPayload();
    const user = await (window.firebaseAuthReady || Promise.resolve(null));
    if (user) {
        try {
            const { doc, setDoc, serverTimestamp } = window.firebaseDbApi;
            const ref = doc(window.firebaseDb, 'users', user.uid, 'backups', 'latest');
            await setDoc(ref, {
                payload: compressPayload(payload),
                updatedAt: serverTimestamp(),
                version: 1
            }, { merge: true });
            alert('Backup saved to cloud.');
            return;
        } catch (err) {
            alert('Cloud backup failed.');
        }
    }
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cubetimer_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
async function triggerImport() {
    const user = await (window.firebaseAuthReady || Promise.resolve(null));
    if (user) {
        await restoreFromCloud(user.uid);
        return;
    }
    document.getElementById('importInput').click();
}
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            applyRestoredData(data, 'Restore complete.');
        } catch (err) {
            alert("Failed to restore data. Invalid JSON.");
        }
    };
    reader.readAsText(file);
}
async function restoreFromCloud(uid) {
    try {
        const { doc, getDoc } = window.firebaseDbApi;
        const ref = doc(window.firebaseDb, 'users', uid, 'backups', 'latest');
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) {
            alert('No cloud backup found.');
            return;
        }
        const data = snapshot.data();
        if (!data || !data.payload) {
            alert('Cloud backup is empty.');
            return;
        }
        const restored = decompressPayload(data.payload);
        applyRestoredData(restored, 'Cloud restore complete.');
    } catch (err) {
        alert('Cloud restore failed.');
    }
}
function applyRestoredData(data, successMessage) {
    if (data.solves && data.sessions) {
        solves = data.solves;
        sessions = data.sessions;
        if (data.settings) {
            precision = data.settings.precision || 2;
            isAo5Mode = data.settings.isAo5Mode !== undefined ? data.settings.isAo5Mode : true;
            currentEvent = data.settings.currentEvent || '333';
            holdDuration = data.settings.holdDuration || 300;
            isWakeLockEnabled = data.settings.isWakeLockEnabled || false;
            const isDark = data.settings.isDarkMode || false;
            isInspectionMode = data.settings.isInspectionMode || false;

            precisionToggle.checked = (precision === 3);
            avgModeToggle.checked = isAo5Mode;
            darkModeToggle.checked = isDark;
            wakeLockToggle.checked = isWakeLockEnabled;
            inspectionToggle.checked = isInspectionMode;

            toggleInspection(inspectionToggle);
            if (!isInspectionMode) {
                holdDurationSlider.value = holdDuration / 1000;
                updateHoldDuration(holdDurationSlider.value);
            }
            document.documentElement.classList.toggle('dark', isDark);
            if (isWakeLockEnabled) requestWakeLock();
        }
        saveData();
        if (successMessage) {
            alert(successMessage);
        }
        location.reload();
        return;
    }
    throw new Error("Invalid format");
}
function saveData() {
    const data = {
        solves: solves,
        sessions: sessions,
        settings: { 
            precision, 
            isAo5Mode, 
            currentEvent, 
            holdDuration,
            isDarkMode: document.documentElement.classList.contains('dark'),
            isWakeLockEnabled,
            isInspectionMode
        }
    };
    localStorage.setItem('cubeTimerData_v5', JSON.stringify(data));
}
function loadData() {
    const saved = localStorage.getItem('cubeTimerData_v5') || localStorage.getItem('cubeTimerData_v4');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            solves = data.solves || [];
            sessions = data.sessions || {};
            if (data.settings) {
                precision = data.settings.precision || 2;
                isAo5Mode = data.settings.isAo5Mode !== undefined ? data.settings.isAo5Mode : true;
                currentEvent = data.settings.currentEvent || '333';
                holdDuration = data.settings.holdDuration || 300;
                const isDark = data.settings.isDarkMode || false;
                isWakeLockEnabled = data.settings.isWakeLockEnabled || false;
                isInspectionMode = data.settings.isInspectionMode || false;
                precisionToggle.checked = (precision === 3);
                avgModeToggle.checked = isAo5Mode;
                darkModeToggle.checked = isDark;
                wakeLockToggle.checked = isWakeLockEnabled;
                inspectionToggle.checked = isInspectionMode;
                
                if (isInspectionMode) {
                    toggleInspection(inspectionToggle);
                } else {
                    holdDurationSlider.value = holdDuration / 1000;
                    holdDurationValue.innerText = holdDurationSlider.value + "s";
                }
                document.documentElement.classList.toggle('dark', isDark);
                if(isWakeLockEnabled) requestWakeLock();
                const conf = configs[currentEvent];
                if (eventSelect) eventSelect.value = currentEvent;
                if (conf) switchCategory(conf.cat, false);
            }
        } catch (e) { console.error("Load failed", e); }
    }
    initSessionIfNeeded(currentEvent);
    
    if (!isBtConnected) {
        statusHint.innerText = isInspectionMode ? "Start Inspection" : "Hold to Ready";
    }
}
function initSessionIfNeeded(eventId) {
    if (!sessions[eventId] || sessions[eventId].length === 0) {
        sessions[eventId] = [{ id: Date.now(), name: "Session 1", isActive: true }];
    } else if (!sessions[eventId].find(s => s.isActive)) {
        sessions[eventId][0].isActive = true;
    }
}
function getCurrentSessionId() {
    const eventSessions = sessions[currentEvent] || [];
    const active = eventSessions.find(s => s.isActive);
    if (active) return active.id;
    initSessionIfNeeded(currentEvent);
    return sessions[currentEvent][0].id;
}

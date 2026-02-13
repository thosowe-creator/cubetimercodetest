// --- Data Persistence ---
function buildBackupPayload() {
    return {
        solves: appState.solves,
        sessions: appState.sessions,
        settings: {
            precision: appState.precision,
            isAo5Mode: appState.isAo5Mode,
            currentEvent: appState.currentEvent,
            holdDuration: appState.holdDuration,
            isDarkMode: document.documentElement.classList.contains('dark'),
            isWakeLockEnabled: appState.isWakeLockEnabled,
            isInspectionMode: appState.isInspectionMode,
            splitEnabled: appState.splitEnabled,
            splitCount: appState.splitCount,
            lightTheme: typeof window.getLightThemeForBackup === 'function'
                ? window.getLightThemeForBackup()
                : null
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
    return JSON.stringify(payload);
}
function decompressPayload(payload) {
    return JSON.parse(payload);
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
        appState.solves = data.solves;
        appState.sessions = data.sessions;
        if (data.settings) {
            appState.precision = data.settings.precision || 2;
            appState.isAo5Mode = data.settings.isAo5Mode !== undefined ? data.settings.isAo5Mode : true;
            appState.currentEvent = data.settings.currentEvent || '333';
            appState.holdDuration = data.settings.holdDuration || 300;
            appState.isWakeLockEnabled = data.settings.isWakeLockEnabled || false;
            const isDark = data.settings.isDarkMode || false;
            appState.isInspectionMode = data.settings.isInspectionMode || false;
            appState.splitEnabled = data.settings.splitEnabled || false;
            appState.splitCount = data.settings.splitCount || 4;

            precisionToggle.checked = (appState.precision === 3);
            avgModeToggle.checked = appState.isAo5Mode;
            darkModeToggle.checked = isDark;
            wakeLockToggle.checked = appState.isWakeLockEnabled;
            inspectionToggle.checked = appState.isInspectionMode;
            if (splitToggle) splitToggle.checked = appState.splitEnabled;
            if (splitCountSelect) splitCountSelect.value = String(appState.splitCount);

            toggleInspection(inspectionToggle);
            if (!appState.isInspectionMode) {
                holdDurationSlider.value = appState.holdDuration / 1000;
                updateHoldDuration(holdDurationSlider.value);
            }
            document.documentElement.classList.toggle('dark', isDark);
            if (typeof timerEl !== 'undefined' && timerEl) {
                if (isDark) {
                    timerEl.style.removeProperty('color');
                } else if (typeof applyLightTheme === 'function') {
                    applyLightTheme();
                }
            }
            if (typeof window.setThemeSettingsAccess === 'function') {
                window.setThemeSettingsAccess(isDark);
            }
            if (typeof window.applyLightThemeBackup === 'function') {
                window.applyLightThemeBackup(data.settings.lightTheme);
            }
            if (appState.isWakeLockEnabled) requestWakeLock();
        }
        saveData();
        if (successMessage) {
            alert(successMessage);
        }
        initSessionIfNeeded(appState.currentEvent);
        if (eventSelect) eventSelect.value = appState.currentEvent;
        renderSessionList();
        updateUI();
        generateScramble();
        return;
    }
    throw new Error("Invalid format");
}
function saveData() {
    const data = {
        solves: appState.solves,
        sessions: appState.sessions,
        settings: { 
            precision: appState.precision, 
            isAo5Mode: appState.isAo5Mode, 
            currentEvent: appState.currentEvent, 
            holdDuration: appState.holdDuration,
            isDarkMode: document.documentElement.classList.contains('dark'),
            isWakeLockEnabled: appState.isWakeLockEnabled,
            isInspectionMode: appState.isInspectionMode,
            splitEnabled: appState.splitEnabled,
            splitCount: appState.splitCount
        }
    };
    localStorage.setItem('cubeTimerData_v5', JSON.stringify(data));
}
function loadData() {
    const saved = localStorage.getItem('cubeTimerData_v5') || localStorage.getItem('cubeTimerData_v4');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            appState.solves = data.solves || [];
            appState.sessions = data.sessions || {};
            if (data.settings) {
                appState.precision = data.settings.precision || 2;
                appState.isAo5Mode = data.settings.isAo5Mode !== undefined ? data.settings.isAo5Mode : true;
                appState.currentEvent = data.settings.currentEvent || '333';
                appState.holdDuration = data.settings.holdDuration || 300;
                const isDark = data.settings.isDarkMode || false;
                appState.isWakeLockEnabled = data.settings.isWakeLockEnabled || false;
                appState.isInspectionMode = data.settings.isInspectionMode || false;
                appState.splitEnabled = data.settings.splitEnabled || false;
                appState.splitCount = data.settings.splitCount || 4;
                precisionToggle.checked = (appState.precision === 3);
                avgModeToggle.checked = appState.isAo5Mode;
                darkModeToggle.checked = isDark;
                wakeLockToggle.checked = appState.isWakeLockEnabled;
                inspectionToggle.checked = appState.isInspectionMode;
                if (splitToggle) splitToggle.checked = appState.splitEnabled;
                if (splitCountSelect) splitCountSelect.value = String(appState.splitCount);
                
                if (appState.isInspectionMode) {
                    toggleInspection(inspectionToggle);
                } else {
                    holdDurationSlider.value = appState.holdDuration / 1000;
                    holdDurationValue.innerText = holdDurationSlider.value + "s";
                }
                document.documentElement.classList.toggle('dark', isDark);
                if (typeof timerEl !== 'undefined' && timerEl) {
                    if (isDark) {
                        timerEl.style.removeProperty('color');
                    } else if (typeof applyLightTheme === 'function') {
                        applyLightTheme();
                    }
                }
                if (typeof window.setThemeSettingsAccess === 'function') {
                    window.setThemeSettingsAccess(isDark);
                }
                if(appState.isWakeLockEnabled) requestWakeLock();
                const conf = configs[appState.currentEvent];
                if (eventSelect) eventSelect.value = appState.currentEvent;
                if (conf) switchCategory(conf.cat, false);
            }
        } catch (e) { console.error("Load failed", e); }
    }
    initSessionIfNeeded(appState.currentEvent);
    
    if (!isBtConnected) {
        statusHint.innerText = appState.isInspectionMode ? "Start Inspection" : "Hold to Ready";
    }
}
function initSessionIfNeeded(eventId) {
    if (!appState.sessions[eventId] || appState.sessions[eventId].length === 0) {
        appState.sessions[eventId] = [{ id: Date.now(), name: "Session 1", isActive: true }];
    } else if (!appState.sessions[eventId].find(s => s.isActive)) {
        appState.sessions[eventId][0].isActive = true;
    }
}
function getCurrentSessionId() {
    const eventSessions = appState.sessions[appState.currentEvent] || [];
    const active = eventSessions.find(s => s.isActive);
    if (active) return active.id;
    initSessionIfNeeded(appState.currentEvent);
    return appState.sessions[appState.currentEvent][0].id;
}

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
            hideUiDuringSolve: appState.hideUiDuringSolve,
            hideTimerDuringSolve: appState.hideTimerDuringSolve,
            historySortMode: appState.historySortMode,
            timerPauseEnabled: appState.timerPauseEnabled,
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

let autoSyncLastSolveCount = null;
let autoSyncInFlight = false;

function getAutoSyncSettings() {
    const enabled = localStorage.getItem('autoSyncEnabled') === '1';
    const everyRaw = Number(localStorage.getItem('autoSyncEvery'));
    const every = Number.isFinite(everyRaw)
        ? Math.max(5, Math.min(50, Math.round(everyRaw / 5) * 5))
        : 10;
    return { enabled, every };
}

async function maybeRunAutoSync(payload) {
    const { enabled, every } = getAutoSyncSettings();
    const solveCount = Array.isArray(appState.solves) ? appState.solves.length : 0;
    if (autoSyncLastSolveCount === null) {
        autoSyncLastSolveCount = solveCount;
        return;
    }
    const solveDelta = solveCount - autoSyncLastSolveCount;
    autoSyncLastSolveCount = solveCount;
    if (!enabled || solveDelta <= 0) return;

    const pendingRaw = Number(localStorage.getItem('autoSyncPendingSolves'));
    const nextPending = (Number.isFinite(pendingRaw) ? pendingRaw : 0) + solveDelta;
    localStorage.setItem('autoSyncPendingSolves', String(nextPending));
    if (nextPending < every || autoSyncInFlight) return;

    await (window.firebaseReady || Promise.resolve(null));
    const user = await (window.firebaseAuthReady || Promise.resolve(null));
    if (!user || !window.firebaseDbApi || !window.firebaseDb) return;

    autoSyncInFlight = true;
    try {
        const { doc, setDoc, serverTimestamp } = window.firebaseDbApi;
        const ref = doc(window.firebaseDb, 'users', user.uid, 'backups', 'latest');
        await setDoc(ref, {
            payload: compressPayload(payload),
            updatedAt: serverTimestamp(),
            version: 1,
            trigger: 'auto-sync'
        }, { merge: true });
        localStorage.setItem('autoSyncPendingSolves', String(nextPending % every));
    } catch (err) {
        console.error('[Persistence] Auto sync failed', err);
    } finally {
        autoSyncInFlight = false;
    }
}
async function exportData() {
    const payload = buildBackupPayload();
    await (window.firebaseReady || Promise.resolve(null));
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
            console.error('[Persistence] Cloud backup failed', err);
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
    await (window.firebaseReady || Promise.resolve(null));
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
            console.error('[Persistence] Local restore parse failed', err);
            alert("Failed to restore data. Invalid JSON.");
        }
    };
    reader.readAsText(file);
}
async function restoreFromCloud(uid) {
    await (window.firebaseReady || Promise.resolve(null));
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
        console.error('[Persistence] Cloud restore failed', err);
        alert('Cloud restore failed.');
    }
}

function validateRestoredData(data) {
    if (!data || typeof data !== 'object') {
        return { error: 'Failed to restore data. Invalid backup format.' };
    }

    if (!Array.isArray(data.solves)) {
        return { error: 'Failed to restore data. Invalid solves format.' };
    }

    const solves = [];
    for (const solve of data.solves) {
        if (!solve || typeof solve !== 'object') {
            return { error: 'Failed to restore data. Invalid solve entry.' };
        }
        const hasSessionId = Number.isFinite(solve.sessionId) || typeof solve.sessionId === 'string';
        if (!Number.isFinite(solve.time) || typeof solve.event !== 'string' || !solve.event || !hasSessionId) {
            return { error: 'Failed to restore data. Solve entries are missing required fields.' };
        }
        solves.push(solve);
    }

    if (!data.sessions || typeof data.sessions !== 'object' || Array.isArray(data.sessions)) {
        return { error: 'Failed to restore data. Invalid sessions format.' };
    }

    const sessions = {};
    for (const [eventKey, eventSessions] of Object.entries(data.sessions)) {
        if (!Array.isArray(eventSessions)) {
            return { error: 'Failed to restore data. Sessions must be arrays by event.' };
        }

        sessions[eventKey] = [];
        for (const session of eventSessions) {
            if (!session || typeof session !== 'object') {
                return { error: 'Failed to restore data. Invalid session entry.' };
            }
            const hasSessionId = Number.isFinite(session.id) || typeof session.id === 'string';
            if (!hasSessionId || typeof session.name !== 'string' || typeof session.isActive !== 'boolean') {
                return { error: 'Failed to restore data. Session entries are missing required fields.' };
            }
            sessions[eventKey].push(session);
        }
    }

    const settings = {};
    if (data.settings !== undefined) {
        if (!data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) {
            return { error: 'Failed to restore data. Invalid settings format.' };
        }

        if (data.settings.precision !== undefined) {
            if (data.settings.precision !== 2 && data.settings.precision !== 3) {
                return { error: 'Failed to restore data. Invalid precision value.' };
            }
            settings.precision = data.settings.precision;
        }
        if (data.settings.isAo5Mode !== undefined) {
            if (typeof data.settings.isAo5Mode !== 'boolean') return { error: 'Failed to restore data. Invalid isAo5Mode value.' };
            settings.isAo5Mode = data.settings.isAo5Mode;
        }
        if (data.settings.currentEvent !== undefined) {
            if (typeof data.settings.currentEvent !== 'string' || !data.settings.currentEvent) return { error: 'Failed to restore data. Invalid currentEvent value.' };
            settings.currentEvent = data.settings.currentEvent;
        }
        if (data.settings.holdDuration !== undefined) {
            if (!Number.isFinite(data.settings.holdDuration) || data.settings.holdDuration < 0) return { error: 'Failed to restore data. Invalid holdDuration value.' };
            settings.holdDuration = data.settings.holdDuration;
        }
        if (data.settings.isDarkMode !== undefined) {
            if (typeof data.settings.isDarkMode !== 'boolean') return { error: 'Failed to restore data. Invalid isDarkMode value.' };
            settings.isDarkMode = data.settings.isDarkMode;
        }
        if (data.settings.isWakeLockEnabled !== undefined) {
            if (typeof data.settings.isWakeLockEnabled !== 'boolean') return { error: 'Failed to restore data. Invalid isWakeLockEnabled value.' };
            settings.isWakeLockEnabled = data.settings.isWakeLockEnabled;
        }
        if (data.settings.isInspectionMode !== undefined) {
            if (typeof data.settings.isInspectionMode !== 'boolean') return { error: 'Failed to restore data. Invalid isInspectionMode value.' };
            settings.isInspectionMode = data.settings.isInspectionMode;
        }
        if (data.settings.splitEnabled !== undefined) {
            if (typeof data.settings.splitEnabled !== 'boolean') return { error: 'Failed to restore data. Invalid splitEnabled value.' };
            settings.splitEnabled = data.settings.splitEnabled;
        }
        if (data.settings.splitCount !== undefined) {
            const splitCount = Number(data.settings.splitCount);
            if (!Number.isInteger(splitCount) || splitCount < 2 || splitCount > 8) {
                return { error: 'Failed to restore data. Invalid splitCount value.' };
            }
            settings.splitCount = splitCount;
        }
        if (data.settings.hideUiDuringSolve !== undefined) {
            if (typeof data.settings.hideUiDuringSolve !== 'boolean') return { error: 'Failed to restore data. Invalid hideUiDuringSolve value.' };
            settings.hideUiDuringSolve = data.settings.hideUiDuringSolve;
        }
        if (data.settings.hideTimerDuringSolve !== undefined) {
            if (typeof data.settings.hideTimerDuringSolve !== 'boolean') return { error: 'Failed to restore data. Invalid hideTimerDuringSolve value.' };
            settings.hideTimerDuringSolve = data.settings.hideTimerDuringSolve;
        }
        if (data.settings.historySortMode !== undefined) {
            if (!['latest', 'oldest', 'best', 'worst'].includes(data.settings.historySortMode)) {
                return { error: 'Failed to restore data. Invalid historySortMode value.' };
            }
            settings.historySortMode = data.settings.historySortMode;
        }
        if (data.settings.timerPauseEnabled !== undefined) {
            if (typeof data.settings.timerPauseEnabled !== 'boolean') return { error: 'Failed to restore data. Invalid timerPauseEnabled value.' };
            settings.timerPauseEnabled = data.settings.timerPauseEnabled;
        }
        if (data.settings.lightTheme !== undefined) {
            settings.lightTheme = data.settings.lightTheme;
        }
    }

    return { solves, sessions, settings };
}

function applyRestoredData(data, successMessage) {
    if (isRunning) {
        console.warn('[Persistence] Restore blocked while timer is running');
        alert('Stop the timer before restoring data.');
        return;
    }

    const validated = validateRestoredData(data);
    if (validated.error) {
        console.error('[Persistence] Restore validation failed:', validated.error, data);
        alert(validated.error);
        return;
    }

    appState.solves = validated.solves;
    appState.sessions = validated.sessions;

    if (data.settings) {
        appState.precision = validated.settings.precision ?? 2;
        appState.isAo5Mode = validated.settings.isAo5Mode !== undefined ? validated.settings.isAo5Mode : true;
        appState.currentEvent = validated.settings.currentEvent ?? '333';
        appState.holdDuration = validated.settings.holdDuration ?? 300;
        appState.isWakeLockEnabled = validated.settings.isWakeLockEnabled ?? false;
        const isDark = validated.settings.isDarkMode ?? false;
        appState.isInspectionMode = validated.settings.isInspectionMode ?? false;
        appState.splitEnabled = validated.settings.splitEnabled ?? false;
        appState.splitCount = validated.settings.splitCount ?? 4;
        appState.hideUiDuringSolve = validated.settings.hideUiDuringSolve ?? false;
        appState.hideTimerDuringSolve = validated.settings.hideTimerDuringSolve ?? false;
        appState.historySortMode = validated.settings.historySortMode ?? 'latest';
        appState.timerPauseEnabled = validated.settings.timerPauseEnabled ?? false;

        precisionToggle.checked = (appState.precision === 3);
        avgModeToggle.checked = appState.isAo5Mode;
        darkModeToggle.checked = isDark;
        wakeLockToggle.checked = appState.isWakeLockEnabled;
        inspectionToggle.checked = appState.isInspectionMode;
        if (splitToggle) splitToggle.checked = appState.splitEnabled;
        if (splitCountSelect) splitCountSelect.value = String(appState.splitCount);
        if (hideUiDuringSolveToggle) hideUiDuringSolveToggle.checked = appState.hideUiDuringSolve;
        if (hideTimerDuringSolveToggle) hideTimerDuringSolveToggle.checked = appState.hideTimerDuringSolve;
        const timerPauseToggle = document.getElementById('timerPauseToggle');
        if (timerPauseToggle) timerPauseToggle.checked = appState.timerPauseEnabled;

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
            window.applyLightThemeBackup(validated.settings.lightTheme);
        }
        if (appState.isWakeLockEnabled) requestWakeLock();
        if (typeof window.updateSolveUiVisibility === 'function') window.updateSolveUiVisibility();
        if (typeof window.updateTimerMaskVisibility === 'function') window.updateTimerMaskVisibility();
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
            splitCount: appState.splitCount,
            hideUiDuringSolve: appState.hideUiDuringSolve,
            hideTimerDuringSolve: appState.hideTimerDuringSolve,
            historySortMode: appState.historySortMode,
            timerPauseEnabled: appState.timerPauseEnabled
        }
    };
    localStorage.setItem('cubeTimerData_v5', JSON.stringify(data));
    localStorage.setItem('hideUiDuringSolve', appState.hideUiDuringSolve ? '1' : '0');
    maybeRunAutoSync(data);
}
function loadData() {
    const saved = localStorage.getItem('cubeTimerData_v5') || localStorage.getItem('cubeTimerData_v4');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            appState.solves = data.solves ?? [];
            appState.sessions = data.sessions ?? {};
            if (data.settings) {
                appState.precision = data.settings.precision ?? 2;
                appState.isAo5Mode = data.settings.isAo5Mode !== undefined ? data.settings.isAo5Mode : true;
                appState.currentEvent = data.settings.currentEvent ?? '333';
                appState.holdDuration = data.settings.holdDuration ?? 300;
                const isDark = data.settings.isDarkMode ?? false;
                appState.isWakeLockEnabled = data.settings.isWakeLockEnabled ?? false;
                appState.isInspectionMode = data.settings.isInspectionMode ?? false;
                appState.splitEnabled = data.settings.splitEnabled ?? false;
                appState.splitCount = data.settings.splitCount ?? 4;
                const hideUiFromLegacyKey = localStorage.getItem('hideUiDuringSolve');
                appState.hideUiDuringSolve = data.settings.hideUiDuringSolve ?? (hideUiFromLegacyKey === '1');
                appState.hideTimerDuringSolve = data.settings.hideTimerDuringSolve ?? false;
                appState.historySortMode = data.settings.historySortMode ?? 'latest';
                appState.timerPauseEnabled = data.settings.timerPauseEnabled ?? false;
                precisionToggle.checked = (appState.precision === 3);
                avgModeToggle.checked = appState.isAo5Mode;
                darkModeToggle.checked = isDark;
                wakeLockToggle.checked = appState.isWakeLockEnabled;
                inspectionToggle.checked = appState.isInspectionMode;
                if (splitToggle) splitToggle.checked = appState.splitEnabled;
                if (splitCountSelect) splitCountSelect.value = String(appState.splitCount);
                if (hideUiDuringSolveToggle) hideUiDuringSolveToggle.checked = appState.hideUiDuringSolve;
                if (hideTimerDuringSolveToggle) hideTimerDuringSolveToggle.checked = appState.hideTimerDuringSolve;
                const timerPauseToggle = document.getElementById('timerPauseToggle');
                if (timerPauseToggle) timerPauseToggle.checked = appState.timerPauseEnabled;
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
                if (typeof window.updateSolveUiVisibility === 'function') window.updateSolveUiVisibility();
                if (typeof window.updateTimerMaskVisibility === 'function') window.updateTimerMaskVisibility();
                const conf = configs[appState.currentEvent];
                if (eventSelect) eventSelect.value = appState.currentEvent;
                if (conf) switchCategory(conf.cat, false);
            }
        } catch (e) { console.error('[Persistence] Load failed', e); }
    } else {
        const hideUiFromLegacyKey = localStorage.getItem('hideUiDuringSolve');
        appState.hideUiDuringSolve = hideUiFromLegacyKey === '1';
        if (hideUiDuringSolveToggle) hideUiDuringSolveToggle.checked = appState.hideUiDuringSolve;
        appState.hideTimerDuringSolve = false;
        if (hideTimerDuringSolveToggle) hideTimerDuringSolveToggle.checked = appState.hideTimerDuringSolve;
        if (typeof window.updateSolveUiVisibility === 'function') window.updateSolveUiVisibility();
        if (typeof window.updateTimerMaskVisibility === 'function') window.updateTimerMaskVisibility();
    }
    initSessionIfNeeded(appState.currentEvent);
    
    if (!isBtConnected) {
        statusHint.innerText = appState.isInspectionMode ? "Start Inspection" : "Hold to Ready";
    }
    autoSyncLastSolveCount = Array.isArray(appState.solves) ? appState.solves.length : 0;
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

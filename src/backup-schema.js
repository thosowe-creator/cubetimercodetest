(function initBackupSchema() {
    'use strict';

    const DATA_KEY = 'cubeTimerData_v5';
    const PRE_RESTORE_KEY = 'cubeTimerData_before_restore_v1';
    const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
    const MAX_SOLVES = 100000;
    const VALID_EVENTS = new Set([
        '333', '333oh', '222', '444', '555', '666', '777', 'minx', 'pyra',
        'clock', 'skewb', 'sq1', '333bf', '444bf', '555bf', '333mbf',
        'p_oll', 'p_pll', 'p_zbls', 'p_zbll'
    ]);
    const VALID_PENALTIES = new Set([null, '+2', 'DNF']);

    function fail(message) {
        return { error: `Failed to restore data. ${message}` };
    }

    function toSafeId(value) {
        const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
        return Number.isSafeInteger(id) && id > 0 ? id : null;
    }

    function validateSettings(rawSettings) {
        if (rawSettings === undefined) return { settings: {} };
        if (!rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings)) {
            return fail('Invalid settings format.');
        }

        const settings = {};
        const booleanKeys = [
            'isAo5Mode', 'isDarkMode', 'isWakeLockEnabled', 'isInspectionMode',
            'splitEnabled', 'hideUiDuringSolve', 'hideTimerDuringSolve', 'timerPauseEnabled'
        ];
        for (const key of booleanKeys) {
            if (rawSettings[key] !== undefined) {
                if (typeof rawSettings[key] !== 'boolean') return fail(`Invalid ${key} value.`);
                settings[key] = rawSettings[key];
            }
        }
        if (rawSettings.precision !== undefined) {
            if (rawSettings.precision !== 2 && rawSettings.precision !== 3) return fail('Invalid precision value.');
            settings.precision = rawSettings.precision;
        }
        if (rawSettings.currentEvent !== undefined) {
            if (!VALID_EVENTS.has(rawSettings.currentEvent)) return fail('Invalid current event.');
            settings.currentEvent = rawSettings.currentEvent;
        }
        if (rawSettings.holdDuration !== undefined) {
            if (!Number.isFinite(rawSettings.holdDuration) || rawSettings.holdDuration < 0 || rawSettings.holdDuration > 5000) {
                return fail('Invalid hold duration.');
            }
            settings.holdDuration = rawSettings.holdDuration;
        }
        if (rawSettings.splitCount !== undefined) {
            const splitCount = Number(rawSettings.splitCount);
            if (!Number.isInteger(splitCount) || splitCount < 2 || splitCount > 8) return fail('Invalid split count.');
            settings.splitCount = splitCount;
        }
        if (rawSettings.historySortMode !== undefined) {
            if (!['latest', 'oldest', 'best', 'worst'].includes(rawSettings.historySortMode)) {
                return fail('Invalid history sort mode.');
            }
            settings.historySortMode = rawSettings.historySortMode;
        }
        if (rawSettings.lightTheme !== undefined) settings.lightTheme = rawSettings.lightTheme;
        return { settings };
    }

    function validate(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return fail('Invalid backup format.');
        if (!Array.isArray(data.solves) || data.solves.length > MAX_SOLVES) return fail('Invalid solves format or solve count.');
        if (!data.sessions || typeof data.sessions !== 'object' || Array.isArray(data.sessions)) return fail('Invalid sessions format.');

        const sessions = Object.create(null);
        const sessionIdsByEvent = new Map();
        for (const [eventKey, eventSessions] of Object.entries(data.sessions)) {
            if (!VALID_EVENTS.has(eventKey) || !Array.isArray(eventSessions) || eventSessions.length > 100) {
                return fail('Invalid sessions list.');
            }
            const ids = new Set();
            let activeCount = 0;
            sessions[eventKey] = [];
            for (const session of eventSessions) {
                if (!session || typeof session !== 'object' || Array.isArray(session)) return fail('Invalid session entry.');
                const id = toSafeId(session.id);
                const name = typeof session.name === 'string' ? session.name.trim() : '';
                if (id === null || ids.has(id) || !name || name.length > 100 || typeof session.isActive !== 'boolean') {
                    return fail('Session entries are missing or duplicating required fields.');
                }
                ids.add(id);
                if (session.isActive) activeCount += 1;
                sessions[eventKey].push({ ...session, id, name });
            }
            if (eventSessions.length > 0 && activeCount > 1) return fail('An event has multiple active sessions.');
            sessionIdsByEvent.set(eventKey, ids);
        }

        const solveIds = new Set();
        const solves = [];
        for (const solve of data.solves) {
            if (!solve || typeof solve !== 'object' || Array.isArray(solve)) return fail('Invalid solve entry.');
            const id = toSafeId(solve.id);
            const sessionId = toSafeId(solve.sessionId);
            if (id === null || solveIds.has(id) || sessionId === null || !VALID_EVENTS.has(solve.event)) {
                return fail('Solve entries contain invalid identifiers or events.');
            }
            if (!Number.isFinite(solve.time) || solve.time < 0 || !VALID_PENALTIES.has(solve.penalty ?? null)) {
                return fail('Solve entries contain invalid times or penalties.');
            }
            if (!sessionIdsByEvent.get(solve.event)?.has(sessionId)) return fail('A solve refers to a missing session.');
            if (solve.scramble !== undefined && typeof solve.scramble !== 'string') return fail('Invalid scramble value.');
            if (solve.date !== undefined && typeof solve.date !== 'string') return fail('Invalid solve date.');
            if (solve.splitMarks != null) {
                if (!Array.isArray(solve.splitMarks) || solve.splitMarks.length > 8) return fail('Invalid split marks.');
                let previous = -1;
                for (const mark of solve.splitMarks) {
                    if (!Number.isFinite(mark) || mark < previous || mark < 0 || mark > solve.time) return fail('Invalid split mark value.');
                    previous = mark;
                }
            }
            if (solve.event === '333mbf') {
                const mbf = solve.mbf;
                if (!mbf || !Number.isInteger(mbf.attempted) || !Number.isInteger(mbf.solved)
                    || mbf.attempted < 2 || mbf.solved < 0 || mbf.solved > mbf.attempted
                    || !Number.isFinite(mbf.timeMs) || mbf.timeMs < 0
                    || (mbf.resultText !== undefined && typeof mbf.resultText !== 'string')) {
                    return fail('Invalid multi-blind result.');
                }
            }
            solveIds.add(id);
            solves.push({ ...solve, id, sessionId, penalty: solve.penalty ?? null });
        }

        const settingsResult = validateSettings(data.settings);
        if (settingsResult.error) return settingsResult;
        return { solves, sessions, settings: settingsResult.settings };
    }

    function backupCurrentData() {
        const currentRaw = localStorage.getItem(DATA_KEY);
        if (!currentRaw) return false;
        localStorage.setItem(PRE_RESTORE_KEY, JSON.stringify({
            savedAt: new Date().toISOString(),
            raw: currentRaw
        }));
        return true;
    }

    function confirmRestore() {
        const lang = (localStorage.getItem('lang') || navigator.language || '').toLowerCase();
        return window.confirm(lang.startsWith('ko')
            ? '현재 기록을 교체하고 백업을 복원할까요? 기존 기록은 복원 직전 백업으로 보관됩니다.'
            : 'Replace current records with this backup? Existing records will be saved as a pre-restore backup.');
    }

    window.CubeTimerBackupSchema = {
        DATA_KEY,
        PRE_RESTORE_KEY,
        MAX_IMPORT_BYTES,
        validate,
        backupCurrentData,
        confirmRestore
    };
})();

let solves = [];
let sessions = {};
let currentEvent = '333';
let isRunning = false;
let isReady = false;
let startTime;
let timerInterval;
let timerRafId = null;
let startPerf = 0;
let currentScramble = "";
let latestScramble = "";
let previousScramble = "";
let isViewingPreviousScramble = false;
let isScrambleLoading = false;
let precision = 2;
let isManualMode = false;
let holdTimer = null;
let selectedSolveId = null;
let isAo5Mode = true;
let editingSessionId = null; 
let activeTool = 'scramble';
let holdDuration = 300; // ms
let wakeLock = null;
let isWakeLockEnabled = false;
// Inspection Logic Vars
let isInspectionMode = false;
let inspectionState = 'none'; // 'none', 'inspecting', 'holding'
let inspectionStartTime = 0;
let inspectionInterval = null;
let inspectionPenalty = null; // null, '+2', 'DNF'
let hasSpoken8 = false;
let hasSpoken12 = false;
let lastStopTimestamp = 0;
let splitEnabled = false;
let splitCount = 4;

const appState = {
    get solves() {
        return solves;
    },
    set solves(value) {
        solves = value;
    },
    get sessions() {
        return sessions;
    },
    set sessions(value) {
        sessions = value;
    },
    get currentEvent() {
        return currentEvent;
    },
    set currentEvent(value) {
        currentEvent = value;
    },
    get precision() {
        return precision;
    },
    set precision(value) {
        precision = value;
    },
    get isAo5Mode() {
        return isAo5Mode;
    },
    set isAo5Mode(value) {
        isAo5Mode = value;
    },
    get holdDuration() {
        return holdDuration;
    },
    set holdDuration(value) {
        holdDuration = value;
    },
    get isWakeLockEnabled() {
        return isWakeLockEnabled;
    },
    set isWakeLockEnabled(value) {
        isWakeLockEnabled = value;
    },
    get isInspectionMode() {
        return isInspectionMode;
    },
    set isInspectionMode(value) {
        isInspectionMode = value;
    },
    get splitEnabled() {
        return splitEnabled;
    },
    set splitEnabled(value) {
        splitEnabled = !!value;
    },
    get splitCount() {
        return splitCount;
    },
    set splitCount(value) {
        const n = Number(value);
        splitCount = Number.isFinite(n) ? Math.min(8, Math.max(2, Math.round(n))) : 4;
    },
};

window.appState = appState;


const cubeTimerActions = {
    setRunning(value) {
        isRunning = !!value;
    },
    setReady(value) {
        isReady = !!value;
    },
    setCurrentEvent(value) {
        appState.currentEvent = value;
    },
};

window.CubeTimer = {
    state: appState,
    actions: cubeTimerActions,
};

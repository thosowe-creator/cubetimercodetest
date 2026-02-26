// --- Layout: viewport-centered timer + dynamic scramble sizing (no scroll / no "more") ---
const scrambleBoxEl = document.getElementById('scrambleBox');
const scrambleBottomAreaEl = document.querySelector('.scramble-bottom-area');
const timerContainerEl = document.getElementById('timerContainer');
let __layoutRAF = 0;
let __timerLayoutLocked = false;

if (scrambleBoxEl) {
    // Capture the default scramble-box height once the first paint is done.
    // This value is used as the fixed mobile scramble-box height baseline.
    requestAnimationFrame(() => {
        const initialH = Math.round(scrambleBoxEl.getBoundingClientRect().height);
        if (initialH > 0) scrambleBoxEl.dataset.baseHeightPx = String(initialH);
    });
}

/** Lock timer recentering while scramble/diagram is regenerating (prevents oscillation). */
function lockTimerLayout() { __timerLayoutLocked = true; }
/** Unlock and request a single recenter on next layout pass. */
function unlockTimerLayoutAndRecenter(reason='scramble-ready') {
    __timerLayoutLocked = false;
    scheduleLayout(reason);
}

function scheduleLayout(reason = '') {
    if (__layoutRAF) cancelAnimationFrame(__layoutRAF);
    __layoutRAF = requestAnimationFrame(() => {
        __layoutRAF = 0;
        applyLayoutBudgets(reason);
    });
}

function applyLayoutBudgets(reason = '') {
    try {
        updateScrambleBottomAreaBudget();
        fitScrambleTextToBudget();
        if (!__timerLayoutLocked) positionTimerToViewportCenter();
    } catch (e) {
        // Never break the timer if layout calc fails
        console.warn('[CubeTimer] layout budget error', e);
    }
}

function updateScrambleBottomAreaBudget() {
    // Reduce the huge "dead space" below scramble text.
    // Only keep extra space when showing loading skeleton / retry button.
    const root = document.documentElement;
    const isSkeletonVisible = scrambleDiagramSkeleton && !scrambleDiagramSkeleton.classList.contains('hidden');
    const isRetryVisible = scrambleRetryBtn && !scrambleRetryBtn.classList.contains('hidden');

    if (isSkeletonVisible || isRetryVisible) {
        // Match skeleton's rendered height (fallback to 160)
        const rect = scrambleDiagramSkeleton ? scrambleDiagramSkeleton.getBoundingClientRect() : null;
        const h = rect && rect.height ? rect.height : (window.innerWidth >= 768 ? 220 : 190);
        root.style.setProperty('--scrambleBottomH', `${Math.round(h)}px`);
    } else {
        // Keep a small cushion so the layout doesn't feel cramped
        root.style.setProperty('--scrambleBottomH', '10px');
    }
}

function fitScrambleTextToBudget() {
    if (!scrambleEl) return;

    if (scrambleBoxEl) {
        scrambleBoxEl.style.maxHeight = '';
        scrambleBoxEl.style.height = '';
        scrambleBoxEl.style.minHeight = '';
        scrambleBoxEl.style.overflowY = '';
        scrambleBoxEl.style.removeProperty('padding-top');
        scrambleBoxEl.style.removeProperty('padding-bottom');
    }

    // Reset to CSS baseline typography.
    scrambleEl.style.fontSize = '';
    scrambleEl.style.lineHeight = '';
    scrambleEl.style.letterSpacing = '';
    scrambleEl.style.maxHeight = '';
    scrambleEl.style.overflowY = '';

    if (typeof scrambleLoadingRow !== 'undefined' && scrambleLoadingRow && scrambleLoadingRow.parentElement) {
        scrambleLoadingRow.parentElement.style.removeProperty('height');
    }

    // Keep non-standard events from inheriting aggressive compact styles.
    if (scrambleEl.classList.contains('hidden') || currentEvent === '333mbf') {
        return;
    }

    const isMobile = window.innerWidth < 768;
    const compactEvents = new Set(['666', '777', 'minx']);

    // Mobile: make scramble box feel more vertically packed (less top/bottom empty space).
    if (scrambleBoxEl) {
        if (isMobile) {
            scrambleBoxEl.style.setProperty('padding-top', '0.45rem', 'important');
            scrambleBoxEl.style.setProperty('padding-bottom', '0.45rem', 'important');
            if (typeof scrambleLoadingRow !== 'undefined' && scrambleLoadingRow && scrambleLoadingRow.parentElement && scrambleLoadingRow.classList.contains('hidden')) {
                scrambleLoadingRow.parentElement.style.setProperty('height', '0px');
            }
        } else {
            scrambleBoxEl.style.removeProperty('padding-top');
            scrambleBoxEl.style.removeProperty('padding-bottom');
        }
    }

    scrambleEl.style.textAlign = '';
    scrambleEl.style.lineHeight = isMobile ? '1.2' : '';

    const computed = window.getComputedStyle(scrambleEl);
    const baseFontPx = parseFloat(computed.fontSize) || 16;

    // Desktop only: make scramble font about 10% larger.
    let scale = isMobile ? 1.26 : 1.26 * 1.1;

    // 6x6/7x7/megaminx scrambles should look about 20% smaller.
    if (compactEvents.has(currentEvent)) scale *= 0.8;

    scrambleEl.style.fontSize = `${baseFontPx * scale}px`;
}

function positionTimerToViewportCenter() {
    if (!timerContainerEl || !scrambleBoxEl) return;
    // If the timer section is hidden (mobile history tab), don't fight layout.
    if (timerSection && timerSection.classList.contains('hidden')) return;

    const viewportCenterY = window.innerHeight / 2;
    const scrambleRect = scrambleBoxEl.getBoundingClientRect();
    const timerRect = timerContainerEl.getBoundingClientRect();
    const timerHalf = timerRect.height / 2;

    const gap = 14; // keep same spacing policy across mobile/desktop
    const minCenterY = scrambleRect.bottom + gap + timerHalf;

    // Target center is viewport center, but never collide with scramble area
    let targetCenterY = Math.max(viewportCenterY, minCenterY);

    // Prevent pushing past bottom (keep at least a small margin)
    const bottomMargin = 22;
    const maxCenterY = window.innerHeight - bottomMargin - timerHalf;
    targetCenterY = Math.min(targetCenterY, maxCenterY);

    const currentCenterY = timerRect.top + timerHalf;
    const dy = Math.round(targetCenterY - currentCenterY);

    // Apply translation
    timerContainerEl.style.transform = `translateY(${dy}px)`;
    timerContainerEl.style.transition = 'transform 160ms ease';
}

;

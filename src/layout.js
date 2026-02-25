// --- Layout: viewport-centered timer + dynamic scramble sizing (no scroll / no "more") ---
const scrambleBoxEl = document.getElementById('scrambleBox');
const scrambleBottomAreaEl = document.querySelector('.scramble-bottom-area');
const timerContainerEl = document.getElementById('timerContainer');
let __layoutRAF = 0;
let __timerLayoutLocked = false;

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
    if (!scrambleEl || scrambleEl.classList.contains('hidden')) return;
    if (currentEvent === '333mbf') return;

    // Let scramble box grow naturally when text gets long.
    // This avoids internal scrolling and keeps full scramble visible.
    scrambleEl.style.maxHeight = 'none';
    scrambleEl.style.overflowX = 'visible';
    scrambleEl.style.overflowY = 'visible';

    // Reset to CSS baseline typography.
    scrambleEl.style.fontSize = '';
    scrambleEl.style.lineHeight = '';
    scrambleEl.style.letterSpacing = '';

    // Mobile: keep a fixed baseline font so event/scramble length does not make
    // the "starting" text size jump around. Only shrink from this baseline.
    // Desktop: tone down scramble text by ~10% for a less crowded look.
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        const fixedMobileBase = 15.5;
        scrambleEl.style.fontSize = `${fixedMobileBase}px`;
    } else {
        const computed = window.getComputedStyle(scrambleEl);
        const baseFontPx = parseFloat(computed.fontSize) || 16;
        scrambleEl.style.fontSize = `${baseFontPx * 1.26}px`;
    }

    // Keep prior mobile readability behavior: if text is very long,
    // we may shrink font a bit (without forcing internal scroll).
    if (!isMobile) return;

    const vh = window.innerHeight || 0;
    // Keep the shrink trigger consistent across events so text size does not
    // jump just because the event changed.
    const legacyCap = Math.max(52, Math.min(120, Math.floor(vh * 0.18)));

    let fontPx = parseFloat(window.getComputedStyle(scrambleEl).fontSize) || 16;
    const minFont = 16; // readability floor (mobile), unified across events
    const step = 0.75;

    const tighten = (scale) => {
        scrambleEl.style.lineHeight = scale < 0.9 ? '1.15' : '1.3';
        scrambleEl.style.letterSpacing = scale < 0.85 ? '-0.02em' : '0';
    };

    let safety = 0;
    while (safety++ < 60) {
        // We only use legacy cap as a shrink trigger, not as a hard height limit.
        if (scrambleEl.scrollHeight <= legacyCap + 1) break;
        const next = fontPx - step;
        if (next < minFont) {
            scrambleEl.style.fontSize = `${minFont}px`;
            tighten(minFont / 16);
            break;
        }
        fontPx = next;
        scrambleEl.style.fontSize = `${fontPx}px`;
        tighten(fontPx / 16);
    }
}

function positionTimerToViewportCenter() {
    if (!timerContainerEl || !scrambleBoxEl) return;
    // If the timer section is hidden (mobile history tab), don't fight layout.
    if (timerSection && timerSection.classList.contains('hidden')) return;

    const viewportCenterY = window.innerHeight / 2;
    const scrambleRect = scrambleBoxEl.getBoundingClientRect();
    const timerRect = timerContainerEl.getBoundingClientRect();
    const timerHalf = timerRect.height / 2;

    const gap = window.innerWidth < 768 ? 10 : 14; // breathing room between scramble box and timer block
    const minCenterY = scrambleRect.bottom + gap + timerHalf;

    // Target center is viewport center, but never collide with scramble area
    let targetCenterY = Math.max(viewportCenterY, minCenterY);

    // Prevent pushing past bottom (keep at least a small margin)
    const bottomMargin = (window.innerWidth < 768 ? 18 : 22);
    const maxCenterY = window.innerHeight - bottomMargin - timerHalf;
    targetCenterY = Math.min(targetCenterY, maxCenterY);

    const currentCenterY = timerRect.top + timerHalf;
    const dy = Math.round(targetCenterY - currentCenterY);

    // Apply translation
    timerContainerEl.style.transform = `translateY(${dy}px)`;
    timerContainerEl.style.transition = 'transform 160ms ease';
}

;

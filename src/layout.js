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
    if (!scrambleEl || scrambleEl.classList.contains('hidden')) return;
    if (currentEvent === '333mbf') return;

    if (scrambleBoxEl) {
        scrambleBoxEl.style.maxHeight = '';
        scrambleBoxEl.style.height = '';
        scrambleBoxEl.style.minHeight = '';
        scrambleBoxEl.style.overflowY = '';
    }

    // Reset to CSS baseline typography.
    scrambleEl.style.fontSize = '';
    scrambleEl.style.lineHeight = '';
    scrambleEl.style.letterSpacing = '';
    scrambleEl.style.maxHeight = '';
    scrambleEl.style.overflowY = '';

    // Mobile: keep a fixed baseline font so event/scramble length never changes
    // scramble text size by event/length.
    // Desktop: tone down scramble text by ~10% for a less crowded look.
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        const fixedMobileBase = 15.5;
        const minFontPx = 5;
        scrambleEl.style.fontSize = `${fixedMobileBase}px`;
        scrambleEl.style.lineHeight = '1.32';
        scrambleEl.style.letterSpacing = '0';

        if (!scrambleBoxEl) return;

        // Mobile policy:
        // 1) keep scramble box height fixed to the baseline (no vertical movement)
        // 2) if content overflows, shrink scramble typography to fit inside
        const measuredHeight = Math.round(scrambleBoxEl.getBoundingClientRect().height);
        const storedBaseline = Number(scrambleBoxEl.dataset.baseHeightPx) || 0;
        const baselineHeight = storedBaseline > 0 ? storedBaseline : measuredHeight;
        if (baselineHeight > 0) {
            scrambleBoxEl.dataset.baseHeightPx = String(baselineHeight);
            scrambleBoxEl.style.height = `${baselineHeight}px`;
            scrambleBoxEl.style.maxHeight = `${baselineHeight}px`;
            scrambleBoxEl.style.minHeight = `${baselineHeight}px`;
            scrambleBoxEl.style.overflowY = 'hidden';
        }

        // Constrain scramble text area itself, then compact until the text node fits.
        const visibleChildren = Array.from(scrambleBoxEl.children || []).filter((el) => {
            if (!el || el === scrambleEl) return false;
            if (el.classList && el.classList.contains('hidden')) return false;
            const pos = window.getComputedStyle(el).position;
            // Exclude absolutely-positioned controls (prev/next arrows) from vertical budget.
            return pos !== 'absolute' && pos !== 'fixed';
        });
        const fixedChildrenHeight = visibleChildren.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0);
        const boxStyle = window.getComputedStyle(scrambleBoxEl);
        const boxPaddingY = (parseFloat(boxStyle.paddingTop) || 0) + (parseFloat(boxStyle.paddingBottom) || 0);
        const availableTextHeight = Math.max(8, Math.floor(scrambleBoxEl.clientHeight - fixedChildrenHeight - boxPaddingY));

        scrambleEl.style.maxHeight = `${availableTextHeight}px`;
        scrambleEl.style.overflowY = 'hidden';

        const compactSteps = [
            { lineHeight: '1.24', letterSpacing: '0' },
            { lineHeight: '1.14', letterSpacing: '-0.01em' },
            { lineHeight: '1.04', letterSpacing: '-0.015em' },
            { lineHeight: '0.96', letterSpacing: '-0.02em' },
            { lineHeight: '0.90', letterSpacing: '-0.025em' }
        ];

        let fontPx = fixedMobileBase;
        for (const step of compactSteps) {
            scrambleEl.style.lineHeight = step.lineHeight;
            scrambleEl.style.letterSpacing = step.letterSpacing;
            while (fontPx > minFontPx && scrambleEl.scrollHeight > scrambleEl.clientHeight) {
                fontPx -= 0.5;
                scrambleEl.style.fontSize = `${fontPx}px`;
            }
            if (scrambleEl.scrollHeight <= scrambleEl.clientHeight) break;
        }

        // Extreme fallback for unusually long custom scrambles.
        if (scrambleEl.scrollHeight > scrambleEl.clientHeight) {
            scrambleEl.style.lineHeight = '0.80';
            scrambleEl.style.letterSpacing = '-0.03em';
            let emergencyFontPx = fontPx;
            while (emergencyFontPx > 1 && scrambleEl.scrollHeight > scrambleEl.clientHeight) {
                emergencyFontPx -= 0.2;
                scrambleEl.style.fontSize = `${emergencyFontPx}px`;
            }
        }
    } else {
        const computed = window.getComputedStyle(scrambleEl);
        const baseFontPx = parseFloat(computed.fontSize) || 16;
        scrambleEl.style.fontSize = `${baseFontPx * 1.26}px`;
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

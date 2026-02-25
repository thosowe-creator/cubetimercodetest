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

    // Width: use as much as possible, but keep comfortable side padding via scrambleBox padding var.
    // Height: keep scramble text from pushing the timer off-screen.
    const isMobile = window.innerWidth < 768;
    const vh = window.innerHeight || 0;
    const isMinx = typeof currentEvent === 'string' && currentEvent.includes('minx');
    const cap = isMobile ? (isMinx ? 160 : 120) : (isMinx ? 220 : 170);
    const maxTextH = Math.max(52, Math.min(cap, Math.floor(vh * (isMobile ? 0.18 : 0.20))));
    scrambleEl.style.maxHeight = `${maxTextH}px`;
    scrambleEl.style.overflowX = 'hidden';
    scrambleEl.style.overflowY = 'auto';

    // Reset to CSS baseline before measuring
    scrambleEl.style.fontSize = '';
    scrambleEl.style.lineHeight = '';
    scrambleEl.style.letterSpacing = '';

    const computed = window.getComputedStyle(scrambleEl);
    let fontPx = parseFloat(computed.fontSize) || (isMobile ? 16 : 20);
    const minFont = isMobile ? 12 : 16; // readability floor
    const step = isMobile ? 0.75 : 0.6;

    // Slightly tighten when we have to shrink
    const tighten = (scale) => {
        scrambleEl.style.lineHeight = scale < 0.9 ? '1.15' : '1.3';
        scrambleEl.style.letterSpacing = scale < 0.85 ? '-0.02em' : '0';
    };

    // Iterate down until it fits
    let safety = 0;
    while (safety++ < 60) {
        const fits = scrambleEl.scrollHeight <= maxTextH + 1;
        if (fits) break;
        const next = fontPx - step;
        if (next < minFont) {
            // Hard stop: keep min font; overflow stays hidden but should be rare.
            scrambleEl.style.fontSize = `${minFont}px`;
            tighten(minFont / (isMobile ? 16 : 20));
            break;
        }
        fontPx = next;
        scrambleEl.style.fontSize = `${fontPx}px`;
        tighten(fontPx / (isMobile ? 16 : 20));
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

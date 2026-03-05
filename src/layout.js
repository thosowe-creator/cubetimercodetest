// --- Layout: viewport-centered timer + dynamic scramble sizing (no scroll / no "more") ---
const scrambleBoxEl = document.getElementById('scrambleBox');
const scrambleBottomAreaEl = document.querySelector('.scramble-bottom-area');
const timerContainerEl = document.getElementById('timerContainer');
const avgBadgeRowEl = document.getElementById('avgBadgeRow');
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
        if (!__timerLayoutLocked) positionTimerToViewportCenter();
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
        scrambleBoxEl.style.overflow = '';
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
    scrambleEl.style.marginTop = isMobile ? '0.28rem' : '';
    scrambleEl.style.marginBottom = isMobile ? '-0.12rem' : '';

    const computed = window.getComputedStyle(scrambleEl);
    const baseFontPx = parseFloat(computed.fontSize) || 16;

    // Desktop only: make scramble font about 10% larger.
    let scale = isMobile ? 1.26 : 1.26 * 1.1;

    // 6x6/7x7/megaminx scrambles should be compact, but slightly larger on mobile.
    if (compactEvents.has(currentEvent)) scale *= isMobile ? 0.92 : 0.8;

    scrambleEl.style.fontSize = `${baseFontPx * scale}px`;

    const scrambleConstraint = constrainScrambleBoxToKeepAveragesVisible();
    fitScrambleTypographyInsideBox(scrambleConstraint);
}

function constrainScrambleBoxToKeepAveragesVisible() {
    if (!scrambleBoxEl || !avgBadgeRowEl) {
        return { isConstrained: false, originalHeight: 0, constrainedHeight: 0, overflowPx: 0 };
    }

    // Measure overflow after timer is centered for current frame.
    if (!__timerLayoutLocked) positionTimerToViewportCenter();

    const viewportH = window.innerHeight;
    const scrambleRect = scrambleBoxEl.getBoundingClientRect();
    const originalHeight = Math.round(scrambleRect.height);
    const avgRect = avgBadgeRowEl.getBoundingClientRect();

    const bottomMargin = 22;
    const avgSafeMargin = 12;
    const overflowToViewportBottom = Math.ceil((avgRect.bottom + bottomMargin) - viewportH);

    // Keep default scramble size when averages are already visible.
    if (overflowToViewportBottom <= 0) {
        return { isConstrained: false, originalHeight, constrainedHeight: originalHeight, overflowPx: 0 };
    }

    const minScrambleHeight = window.innerWidth < 768 ? 84 : 92;
    const targetHeight = Math.max(minScrambleHeight, Math.floor(originalHeight - overflowToViewportBottom - avgSafeMargin));

    if (targetHeight >= originalHeight) {
        // Already at minimum scramble-box size for this viewport: keep box, but still shrink text smoothly.
        return { isConstrained: true, originalHeight, constrainedHeight: originalHeight, overflowPx: overflowToViewportBottom };
    }

    // Prevent one-frame "jump" while still reacting enough when overflow is large.
    const maxStepBasePx = window.innerWidth < 768 ? 20 : 26;
    const adaptiveStepPx = maxStepBasePx + Math.round(Math.max(0, overflowToViewportBottom) * 0.72);
    const maxStepPx = Math.min(originalHeight - targetHeight, adaptiveStepPx);
    const constrainedHeight = Math.max(targetHeight, originalHeight - maxStepPx);

    scrambleBoxEl.style.height = `${constrainedHeight}px`;
    scrambleBoxEl.style.maxHeight = `${constrainedHeight}px`;
    scrambleBoxEl.style.overflow = 'hidden';
    return { isConstrained: true, originalHeight, constrainedHeight, overflowPx: overflowToViewportBottom };
}

function fitScrambleTypographyInsideBox(constraint = null) {
    if (!scrambleEl || !scrambleBoxEl || scrambleEl.classList.contains('hidden')) return;

    const currentBoxHeight = Math.max(1, scrambleBoxEl.getBoundingClientRect().height || scrambleBoxEl.clientHeight || 1);
    const isConstrained = Boolean(constraint && constraint.isConstrained);

    if (!isConstrained) return;

    const referenceFromConstraint = Number(constraint && constraint.originalHeight) || 0;
    const referenceHeight = Math.max(referenceFromConstraint, currentBoxHeight);

    const overflowPx = Math.max(0, Number(constraint && constraint.overflowPx) || 0);

    const boxStyle = window.getComputedStyle(scrambleBoxEl);
    const boxPaddingTop = parseFloat(boxStyle.paddingTop) || 0;
    const boxPaddingBottom = parseFloat(boxStyle.paddingBottom) || 0;

    // Exclude non-text blocks from the scramble text budget (loading row / diagram area / mbf input area).
    const fixedContentHeight = Array.from(scrambleBoxEl.children)
        .filter((child) => child !== scrambleEl && !child.classList.contains('hidden'))
        .reduce((sum, child) => sum + child.getBoundingClientRect().height, 0);

    const textBudget = Math.floor(scrambleBoxEl.clientHeight - boxPaddingTop - boxPaddingBottom - fixedContentHeight);
    const hasTextBudget = Number.isFinite(textBudget) && textBudget >= 24;
    if (hasTextBudget) {
        scrambleEl.style.maxHeight = `${textBudget}px`;
        scrambleEl.style.overflowY = 'hidden';
    } else {
        // Very tight layouts: prefer readable scaling over hard clipping.
        scrambleEl.style.maxHeight = '';
        scrambleEl.style.overflowY = '';
    }

    const computed = window.getComputedStyle(scrambleEl);
    const initialFont = parseFloat(computed.fontSize) || 16;
    const initialLine = parseFloat(computed.lineHeight) || initialFont * 1.28;

    const minFont = window.innerWidth < 768 ? 10 : 11;
    const heightRatio = currentBoxHeight / referenceHeight;
    const overflowRatio = overflowPx / referenceHeight;
    const pressureRatio = Math.max(0.62, Math.min(1, 1 - (overflowRatio * 0.55)));
    const smoothRatio = Math.max(0.62, Math.min(1, Math.min(heightRatio, pressureRatio)));

    let font = Math.max(minFont, initialFont * smoothRatio);
    let line = Math.max(minFont * 1.08, initialLine * smoothRatio);
    scrambleEl.style.fontSize = `${font}px`;
    scrambleEl.style.lineHeight = `${line}px`;
    scrambleEl.style.marginBottom = '0px';

    // Final safety loop for very long scrambles (gentle slope to avoid step-like jumps).
    if (hasTextBudget) {
        for (let i = 0; i < 8; i += 1) {
            const overflowPxNow = scrambleEl.scrollHeight - scrambleEl.clientHeight;
            if (overflowPxNow <= 1 || font <= minFont) break;

            const fontStep = overflowPxNow > 24 ? 0.985 : 0.993;
            const lineStep = overflowPxNow > 24 ? 0.988 : 0.994;
            font = Math.max(minFont, font * fontStep);
            line = Math.max(minFont * 1.08, line * lineStep);
            scrambleEl.style.fontSize = `${font}px`;
            scrambleEl.style.lineHeight = `${line}px`;
        }
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

// --- Layout: viewport-centered timer + dynamic scramble sizing (no scroll / no "more") ---
const scrambleBoxEl = document.getElementById('scrambleBox');
const scrambleBottomAreaEl = document.querySelector('.scramble-bottom-area');
const timerContainerEl = document.getElementById('timerContainer');
const avgBadgeRowEl = document.getElementById('avgBadgeRow');
let __layoutRAF = 0;
let __timerLayoutLocked = false;
let __scrambleBoxReferenceHeight = 0;

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
        const constraint = fitScrambleTextToBudget();
        if (!__timerLayoutLocked) positionTimerToViewportCenter();
        return constraint;
    } catch (e) {
        // Never break the timer if layout calc fails
        console.warn('[CubeTimer] layout budget error', e);
        return null;
    }
}

function updateScrambleBottomAreaBudget() {
    // Reduce the huge "dead space" below scramble text.
    // Keep budgets separated so tool/diagram reserve doesn't inflate scramble-bottom space.
    const root = document.documentElement;

    const isDiagramVisible = typeof scrambleDiagram !== 'undefined'
        && scrambleDiagram
        && !scrambleDiagram.classList.contains('hidden');
    const isSkeletonVisible = scrambleDiagramSkeleton && !scrambleDiagramSkeleton.classList.contains('hidden');
    const isRetryVisible = scrambleRetryBtn && !scrambleRetryBtn.classList.contains('hidden');

    const isDiagramInBottomArea = Boolean(
        scrambleBottomAreaEl
        && isDiagramVisible
        && scrambleBottomAreaEl.contains(scrambleDiagram)
    );

    const needsBottomBudget = isDiagramInBottomArea || isSkeletonVisible || isRetryVisible;
    const needsToolBudget = isDiagramVisible || isSkeletonVisible || isRetryVisible;

    if (needsBottomBudget) {
        const bottomHeights = [];
        if (isDiagramInBottomArea && scrambleDiagram) {
            bottomHeights.push(scrambleDiagram.getBoundingClientRect().height);
        }
        if (isSkeletonVisible && scrambleDiagramSkeleton) {
            bottomHeights.push(scrambleDiagramSkeleton.getBoundingClientRect().height);
        }
        if (isRetryVisible && scrambleRetryBtn) {
            bottomHeights.push(scrambleRetryBtn.getBoundingClientRect().height + 18);
        }

        const measuredBottom = Math.max(...bottomHeights.filter((v) => Number.isFinite(v) && v > 0), 0);
        const fallbackBottom = window.innerWidth >= 768 ? 220 : 190;
        const rawBottom = measuredBottom || fallbackBottom;

        // Keep the visual spacer under scramble around half of the tool height,
        // and damp viewport-based jitter so resize feels less awkward.
        const viewportDamping = Math.min(1.06, Math.max(0.92, window.innerHeight / 900));
        const reducedBottom = rawBottom * 0.5 * viewportDamping;
        const bottomH = Math.min(120, Math.max(Math.round(reducedBottom), 20));
        root.style.setProperty('--scrambleBottomH', `${bottomH}px`);
    } else {
        // Keep a small cushion so the layout doesn't feel cramped.
        root.style.setProperty('--scrambleBottomH', '4px');
    }

    if (needsToolBudget) {
        const toolHeights = [];
        if (isDiagramVisible && scrambleDiagram) {
            toolHeights.push(scrambleDiagram.getBoundingClientRect().height);
        }
        if (isSkeletonVisible && scrambleDiagramSkeleton) {
            toolHeights.push(scrambleDiagramSkeleton.getBoundingClientRect().height);
        }
        if (isRetryVisible && scrambleRetryBtn) {
            toolHeights.push(scrambleRetryBtn.getBoundingClientRect().height + 18);
        }

        const measuredTool = Math.max(...toolHeights.filter((v) => Number.isFinite(v) && v > 0), 0);
        const fallbackTool = window.innerWidth >= 768 ? 220 : 190;
        const toolH = Math.max(Math.round(measuredTool || fallbackTool), 44);
        root.style.setProperty('--toolMinH', `${toolH}px`);
    } else {
        root.style.setProperty('--toolMinH', '24px');
    }
}

function fitScrambleTextToBudget() {
    if (!scrambleEl) return null;

    if (scrambleBoxEl) {
        scrambleBoxEl.style.height = '';
        scrambleBoxEl.style.maxHeight = '';
        scrambleBoxEl.style.minHeight = '';
        scrambleBoxEl.style.overflow = '';
        scrambleBoxEl.style.overflowY = '';
        scrambleBoxEl.style.removeProperty('padding-top');
        scrambleBoxEl.style.removeProperty('padding-bottom');
        scrambleBoxEl.style.justifyContent = '';
    }

    // Keep scramble typography stable unless we hit viewport constraints.
    scrambleEl.style.fontSize = '';
    scrambleEl.style.lineHeight = '';
    scrambleEl.style.letterSpacing = '';
    scrambleEl.style.maxHeight = '';
    scrambleEl.style.overflowY = '';
    scrambleEl.style.overflow = '';
    scrambleEl.style.textAlign = '';
    scrambleEl.style.alignSelf = '';
    scrambleEl.style.marginTop = '';
    scrambleEl.style.marginBottom = '';
    scrambleEl.classList.remove('is-constrained');

    if (typeof scrambleLoadingRow !== 'undefined' && scrambleLoadingRow && scrambleLoadingRow.parentElement) {
        scrambleLoadingRow.parentElement.style.removeProperty('height');
    }

    // Scramble text must stay consistently visible and large.
    if (scrambleEl.classList.contains('hidden') || currentEvent === '333mbf') {
        return null;
    }

    const constraint = constrainScrambleBoxToKeepAveragesVisible();
    fitScrambleTypographyInsideBox(constraint);
    return constraint;
}

function constrainScrambleBoxToKeepAveragesVisible() {
    if (!scrambleBoxEl || !avgBadgeRowEl || !timerContainerEl) {
        return {
            isConstrained: false,
            overflowPx: 0,
            safeAreaTop: 0,
            safeAreaBottom: 0,
            safeAreaHeight: 0,
            badgeOverflowPx: 0,
            badgeTriggerPx: 38,
            textBudgetWidth: 0,
            textBudgetHeight: 0
        };
    }

    if (!__timerLayoutLocked) positionTimerToViewportCenter();

    const viewportH = window.innerHeight;
    const timerRect = timerContainerEl.getBoundingClientRect();
    const avgRect = avgBadgeRowEl.getBoundingClientRect();
    const boxStyle = window.getComputedStyle(scrambleBoxEl);
    const boxPaddingTop = parseFloat(boxStyle.paddingTop) || 0;
    const boxPaddingBottom = parseFloat(boxStyle.paddingBottom) || 0;
    const boxPaddingLeft = parseFloat(boxStyle.paddingLeft) || 0;
    const boxPaddingRight = parseFloat(boxStyle.paddingRight) || 0;

    const eventBottomCandidates = [];
    if (eventSelect) eventBottomCandidates.push(eventSelect.getBoundingClientRect().bottom);
    if (typeof caseSelectWrap !== 'undefined' && caseSelectWrap && !caseSelectWrap.classList.contains('hidden')) {
        eventBottomCandidates.push(caseSelectWrap.getBoundingClientRect().bottom);
    }
    if (typeof legacyCategorySelect !== 'undefined' && legacyCategorySelect && !legacyCategorySelect.classList.contains('hidden')) {
        eventBottomCandidates.push(legacyCategorySelect.getBoundingClientRect().bottom);
    }
    const eventUiBottom = eventBottomCandidates.length ? Math.max(...eventBottomCandidates) : 0;

    const safeMarginTop = 10;
    const safeMarginBottom = 12;
    const safeAreaTop = Math.round(eventUiBottom + safeMarginTop);
    const safeAreaBottom = Math.round(timerRect.top - safeMarginBottom);
    const safeAreaHeight = Math.max(0, safeAreaBottom - safeAreaTop);

    const fixedContentHeight = Array.from(scrambleBoxEl.children)
        .filter((child) => child !== scrambleEl && !child.classList.contains('hidden'))
        .reduce((sum, child) => sum + child.getBoundingClientRect().height, 0);

    const textBudgetWidth = Math.max(0, scrambleBoxEl.clientWidth - boxPaddingLeft - boxPaddingRight);
    const textBudgetHeight = Math.max(0, safeAreaHeight - boxPaddingTop - boxPaddingBottom - fixedContentHeight);

    const badgeTriggerPx = 38; // ~1cm overflow tolerance before shrinking starts
    const badgeOverflowPx = Math.max(0, Math.ceil(avgRect.bottom - viewportH));
    const overflowPx = Math.max(0, badgeOverflowPx - badgeTriggerPx);

    return {
        isConstrained: overflowPx > 0 || textBudgetHeight <= 0,
        overflowPx,
        safeAreaTop,
        safeAreaBottom,
        safeAreaHeight,
        badgeOverflowPx,
        badgeTriggerPx,
        textBudgetWidth,
        textBudgetHeight
    };
}

function fitScrambleTypographyInsideBox(constraint = null) {
    if (!scrambleEl || !scrambleBoxEl || scrambleEl.classList.contains('hidden')) return;

    const textBudgetWidth = Math.max(0, Number(constraint && constraint.textBudgetWidth) || 0);
    const textBudgetHeight = Math.max(0, Number(constraint && constraint.textBudgetHeight) || 0);
    const safeAreaTop = Number(constraint && constraint.safeAreaTop) || 0;
    const safeAreaBottom = Number(constraint && constraint.safeAreaBottom) || 0;
    const badgeTriggerPx = Number(constraint && constraint.badgeTriggerPx) || 38;
    const hasTextBudget = textBudgetWidth >= 20 && textBudgetHeight >= 20;
    const hasSafeArea = (safeAreaBottom - safeAreaTop) > 0;
    if (!hasTextBudget || !hasSafeArea) return;

    scrambleEl.classList.add('is-constrained');

    const computed = window.getComputedStyle(scrambleEl);
    const baseFont = parseFloat(computed.fontSize) || 16;
    const baseLine = parseFloat(computed.lineHeight) || baseFont * 1.28;
    const reducedStartEvents = new Set(['666', '777', 'minx']);
    const startScale = reducedStartEvents.has(currentEvent) ? 0.7 : 1;
    const initialFont = baseFont * startScale;
    const initialLine = baseLine * startScale;

    const minFont = window.innerWidth < 768 ? 10 : 11;

    const minLineHeightRatio = window.innerWidth < 768 ? 1.02 : 1.0;
    const minLine = Math.max(minFont * minLineHeightRatio, initialLine * 0.62);
    const minScale = Math.max(minFont / initialFont, minLine / initialLine, 0.45);

    const fitsAtScale = (scale) => {
        scrambleEl.style.fontSize = `${initialFont * scale}px`;
        scrambleEl.style.lineHeight = `${initialLine * scale}px`;

        if (!__timerLayoutLocked) positionTimerToViewportCenter();

        const scrambleRect = scrambleEl.getBoundingClientRect();
        const avgRect = avgBadgeRowEl ? avgBadgeRowEl.getBoundingClientRect() : { bottom: 0 };
        const badgeOverflow = Math.max(0, avgRect.bottom - window.innerHeight);

        const fitsHeight = scrambleEl.scrollHeight <= textBudgetHeight + 0.5;
        const fitsWidth = scrambleEl.scrollWidth <= textBudgetWidth + 0.5;
        const fitsVerticalSafeArea = scrambleRect.top >= (safeAreaTop - 0.5) && scrambleRect.bottom <= (safeAreaBottom + 0.5);
        const fitsBadgeBudget = badgeOverflow <= (badgeTriggerPx + 0.5);
        return fitsHeight && fitsWidth && fitsVerticalSafeArea && fitsBadgeBudget;
    };

    scrambleEl.style.overflow = '';
    scrambleEl.style.overflowY = '';
    scrambleEl.style.maxHeight = '';
    scrambleEl.style.marginBottom = '3px';

    if (fitsAtScale(1)) {
        scrambleEl.style.fontSize = `${initialFont}px`;
        scrambleEl.style.lineHeight = `${initialLine}px`;
        return;
    }

    let lo = minScale;
    let hi = 1;
    if (!fitsAtScale(lo)) {
        scrambleEl.style.fontSize = `${initialFont * lo}px`;
        scrambleEl.style.lineHeight = `${initialLine * lo}px`;
        return;
    }

    for (let i = 0; i < 16; i += 1) {
        const mid = (lo + hi) / 2;
        if (fitsAtScale(mid)) {
            lo = mid;
        } else {
            hi = mid;
        }
    }

    scrambleEl.style.fontSize = `${initialFont * lo}px`;
    scrambleEl.style.lineHeight = `${initialLine * lo}px`;
}

function positionTimerToViewportCenter() {
    if (!timerContainerEl || !scrambleBoxEl) return;
    // If the timer section is hidden (mobile history tab), don't fight layout.
    if (timerSection && timerSection.classList.contains('hidden')) return;

    const viewportCenterY = window.innerHeight / 2;
    const scrambleRect = scrambleBoxEl.getBoundingClientRect();
    const timerRect = timerContainerEl.getBoundingClientRect();
    const timerHalf = timerRect.height / 2;

    const gap = 6; // tighter visual spacing between scramble block and timer
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


// Recalculate on viewport + layout mutations affecting safe-area math.
window.addEventListener('resize', () => scheduleLayout('resize'), { passive: true });
window.addEventListener('orientationchange', () => scheduleLayout('orientation-change'), { passive: true });

if (typeof ResizeObserver !== 'undefined') {
    const layoutObserver = new ResizeObserver(() => scheduleLayout('layout-observer'));
    if (scrambleBoxEl) layoutObserver.observe(scrambleBoxEl);
    if (timerContainerEl) layoutObserver.observe(timerContainerEl);
    if (avgBadgeRowEl) layoutObserver.observe(avgBadgeRowEl);
    if (eventSelect) layoutObserver.observe(eventSelect);
    if (typeof caseSelectWrap !== 'undefined' && caseSelectWrap) layoutObserver.observe(caseSelectWrap);
    if (typeof legacyCategorySelect !== 'undefined' && legacyCategorySelect) layoutObserver.observe(legacyCategorySelect);
}

;

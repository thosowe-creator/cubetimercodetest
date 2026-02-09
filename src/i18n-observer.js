// Keep UI translated even when other render functions overwrite text later.
// (e.g. switching tabs, re-rendering history/settings)
let i18nObserver = null;
let i18nRaf = 0;
function ensureI18nObserver() {
  if (i18nObserver) return;

  const roots = () => {
    // Only watch/translate areas where text is actually replaced dynamically
    // (Modals / overlays). Avoid scanning the entire app during rapid timer UI updates.
    return [
      'btOverlay',
      'sessionOverlay',
      'mbfScrambleOverlay',
      'mbfResultOverlay',
      'statsOverlay',
      'settingsOverlay',
      'avgShareOverlay',
      'modalOverlay',
      'updateLogOverlay',
      'knownIssuesOverlay',
    ]
      .map(id => document.getElementById(id))
      .filter(Boolean);
  };

  const debounced = () => {
    if (i18nRaf) cancelAnimationFrame(i18nRaf);
    i18nRaf = requestAnimationFrame(() => {
      try {
        // Translate only modal roots (fast)
        for (const r of roots()) applyAutoI18n(r);
      } catch (_) {}
    });
  };

  i18nObserver = new MutationObserver(debounced);
  try {
    for (const r of roots()) {
      i18nObserver.observe(r, { childList: true, subtree: true, characterData: true });
    }
  } catch (_) {}
}

window.setLanguage = (lang) => {
  if (lang !== 'ko' && lang !== 'en') return;
  currentLang = lang;
  localStorage.setItem('lang', lang);
  applyLanguageToUI();
  // Refresh modals content if open
  try { renderUpdateLog(true); } catch (_) {}
  try {
    const overlay = document.getElementById('knownIssuesOverlay');
    if (overlay && overlay.classList.contains('active')) window.openKnownIssues();
  } catch (_) {}
};
function applyLanguageToUI() {
  // Keep translations applied even if later renders overwrite texts.
  try { ensureI18nObserver(); } catch (_) {}
  document.documentElement.lang = currentLang;
  const langSelect = document.getElementById('langSelect');
  if (langSelect) langSelect.value = currentLang;
  const langLabel = document.getElementById('langLabel');
  if (langLabel) langLabel.textContent = t('language');
  const scrambleLoadingText = document.getElementById('scrambleLoadingText');
  if (scrambleLoadingText) scrambleLoadingText.textContent = t('scrambleLoading');
  const scrambleRetryBtn = document.getElementById('scrambleRetryBtn');
  if (scrambleRetryBtn) scrambleRetryBtn.textContent = t('scrambleRetry');
  const statusHint = document.getElementById('statusHint');
  if (statusHint && !isRunning && !isReady) statusHint.textContent = t('holdToReady');

  // Update Log modal labels
  const updateOverlay = document.getElementById('updateLogOverlay');
  if (updateOverlay) {
    const title = updateOverlay.querySelector('h3');
    if (title) title.textContent = t('updateLog');
    const latestLabel = updateOverlay.querySelector('.tracking-widest');
    if (latestLabel) latestLabel.textContent = t('latest');
    const okBtn = updateOverlay.querySelector('button');
    if (okBtn) okBtn.textContent = t('okGotIt');
  }

  // Developer Log modal labels
  const devOverlay = document.getElementById('knownIssuesOverlay');
  if (devOverlay) {
    const title = devOverlay.querySelector('h3');
    if (title) title.textContent = t('devLog');
    const closeBtn = devOverlay.querySelector('button');
    if (closeBtn) closeBtn.textContent = currentLang === 'ko' ? '닫기' : 'Close';
  }

  // Finally, auto-translate remaining static UI strings & placeholders.
  // This is what makes the whole UI actually switch languages.
  try { applyAutoI18n(document); } catch (_) {}
}


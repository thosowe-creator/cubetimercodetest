// --- Update Log / Known Issues ---
function renderUpdateLog(latestOnly = true) {
    const overlay = document.getElementById('updateLogOverlay');
    const versionEl = document.getElementById('updateVersion');
    const listEl = document.getElementById('updateList');
    if (!overlay || !versionEl || !listEl) return;

    const notes = latestOnly ? RELEASE_NOTES.slice(0, 1) : RELEASE_NOTES;
    const latest = RELEASE_NOTES[0];

    // Emphasize V2 in the badge
    const badgeText = latest ? (latest.version === '2' ? `V${latest.version}` : `v${latest.version}`) : `v${APP_VERSION}`;
    versionEl.innerText = badgeText;
    versionEl.classList.toggle('text-sm', latest && latest.version === '2');
    versionEl.classList.toggle('px-3', latest && latest.version === '2');

    listEl.innerHTML = notes.map((r, idx) => {
        const header = latestOnly ? '' : `<li class="list-none -ml-4 mb-1"><span class="text-[11px] font-black text-slate-500 dark:text-slate-400">${r.date} · ${r.version === '2' ? 'V2' : 'v' + r.version}</span></li>`;
        const items = (r.items && (r.items[currentLang] || r.items.ko) ? (r.items[currentLang] || r.items.ko) : []).map(it => `<li>${it}</li>`).join('');
        return `${header}${items}${idx < notes.length - 1 ? '<li class="list-none -ml-4 my-3 border-t border-slate-100 dark:border-slate-800"></li>' : ''}`;
    }).join('');
}
window.openUpdateLog = (auto = false) => {
    if (isRunning) return;
    renderUpdateLog(!auto ? false : true);
    const overlay = document.getElementById('updateLogOverlay');
    if (overlay) overlay.classList.add('active');
}
function checkUpdateLog() {
    const savedVersion = localStorage.getItem('appVersion');
    if (savedVersion !== APP_VERSION) {
        renderUpdateLog(true);
        const overlay = document.getElementById('updateLogOverlay');
        if (overlay) overlay.classList.add('active');
    }
}
window.closeUpdateLog = () => {
    const overlay = document.getElementById('updateLogOverlay');
    if (overlay) overlay.classList.remove('active');
    localStorage.setItem('appVersion', APP_VERSION);
};
window.openKnownIssues = () => {
    if (isRunning) return;
    const overlay = document.getElementById('knownIssuesOverlay');
    const listEl = document.getElementById('knownIssuesList');
    if (!overlay || !listEl) return;
    if (!KNOWN_ISSUES.length) {
        listEl.innerHTML = `<li class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-400">${t('noDevLog')}</li>`;
    } else {
        listEl.innerHTML = KNOWN_ISSUES.map(ki => {
            const status = ki.status ? String(ki.status) : 'open';
            const titleObj = ki.title || {};
            const title = (typeof titleObj === 'string') ? titleObj : (titleObj[currentLang] || titleObj.ko || ki.id || 'Log');
            return `<li class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700"><div class="flex items-center justify-between"><span class="text-[11px] font-black text-slate-700 dark:text-slate-200">${title}</span><span class="text-[10px] font-black text-slate-400 uppercase">${status}</span></div><div class="mt-1 text-[10px] font-bold text-slate-400">${t('devSince')} ${ki.since || '-'}</div></li>`;
        }).join('');
    }
    overlay.classList.add('active');
}
window.closeKnownIssues = () => {
    const overlay = document.getElementById('knownIssuesOverlay');
    if (overlay) overlay.classList.remove('active');
};

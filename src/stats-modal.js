// Extended Stats Modal Logic
window.showExtendedStats = () => {
    // If Settings is open, close it before showing stats
    try {
        const _so = document.getElementById('settingsOverlay');
        if (_so && _so.classList.contains('active')) closeSettings();
    } catch (e) {}

    const sid = getCurrentSessionId();
    const filtered = solves.filter(s => s.event === currentEvent && s.sessionId === sid);
    
    const ao25 = calculateAvg(filtered, 25);
    const ao50 = calculateAvg(filtered, 50);
    const ao100 = calculateAvg(filtered, 100);
    
    const titleEl = document.getElementById('statsTitle');
    if (titleEl) {
        if (currentLang === 'ko') {
            titleEl.innerText = '평균 더보기';
        } else {
            titleEl.innerText = 'More Average';
        }
    }

    const content = document.getElementById('statsContent');
    content.innerHTML = `
        <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl gap-2">
            <div class="flex flex-col gap-1">
                <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Ao25</span>
                <span class="text-lg font-bold text-slate-700 dark:text-white">${ao25}</span>
            </div>
            <button data-action="open-extended-avg-share" data-share-count="25" class="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-blue-600 text-white">Share</button>
        </div>
        <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl gap-2">
            <div class="flex flex-col gap-1">
                <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Ao50</span>
                <span class="text-lg font-bold text-slate-700 dark:text-white">${ao50}</span>
            </div>
            <button data-action="open-extended-avg-share" data-share-count="50" class="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-blue-600 text-white">Share</button>
        </div>
        <div class="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl gap-2">
            <div class="flex flex-col gap-1">
                <span class="text-xs font-bold text-slate-500 dark:text-slate-400">Ao100</span>
                <span class="text-lg font-bold text-slate-700 dark:text-white">${ao100}</span>
            </div>
            <button data-action="open-extended-avg-share" data-share-count="100" class="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-blue-600 text-white">Share</button>
        </div>
    `;
    document.getElementById('statsOverlay').classList.add('active');
}
window.closeStatsModal = () => document.getElementById('statsOverlay').classList.remove('active');
function calculateAvg(list, count, mean=false) {
    if(list.length < count) return "-";
    let slice = list.slice(0, count); let dnfC = slice.filter(s=>s.penalty==='DNF').length;
    
    // Trim logic: Best 5% and Worst 5% removal for large averages
    let removeCount = Math.ceil(count * 0.05); // 5%
    if (count <= 12) removeCount = 1; 
    if(dnfC >= removeCount + (mean?0:1)) return "DNF"; 
    // Work in milliseconds so averages keep mm:ss.xx formatting consistently
    let nums = slice.map(s => s.penalty==='DNF'?Infinity:(s.penalty==='+2'?s.time+2000:s.time));
    if(mean) {
        const sum = nums.reduce((a,b)=>a+b,0);
        const avgMs = sum / count;
        return formatTime(avgMs);
    }
    
    nums.sort((a,b)=>a-b); 
    // Remove outliers
    for(let i=0; i<removeCount; i++) { nums.pop(); nums.shift(); }
    
    const avgMs = nums.reduce((a,b)=>a+b,0)/nums.length;
    return formatTime(avgMs);
}

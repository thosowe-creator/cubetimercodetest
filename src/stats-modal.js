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
    const overallCount = filtered.length;
    const overallAvg = overallCount > 0 ? calculateAvg(filtered, overallCount) : '-';

    const bestAo25 = findBestAverageWindow(filtered, 25);
    const bestAo50 = findBestAverageWindow(filtered, 50);
    const bestAo100 = findBestAverageWindow(filtered, 100);

    const titleEl = document.getElementById('statsTitle');
    if (titleEl) {
        if (currentLang === 'ko') {
            titleEl.innerText = '평균 상세';
        } else {
            titleEl.innerText = 'Average Details';
        }
    }

    const isKo = currentLang === 'ko';
    const leftTitle = isKo ? '최고' : 'Best';
    const rightTitle = isKo ? '현재' : 'Current';
    const overallTitle = isKo ? '전체 평균' : 'Session Average';

    const renderOverall = () => `
        <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 flex items-center justify-between gap-3">
                <div class="flex flex-col">
                    <span class="text-[10px] font-black uppercase tracking-wide text-slate-400">${overallTitle}</span>
                    <span ${overallCount > 0 ? `data-action="open-extended-avg-share" data-share-count="${overallCount}"` : ''} class="text-base font-bold ${overallCount > 0 ? 'text-blue-600 dark:text-blue-400 cursor-pointer hover:underline' : 'text-slate-700 dark:text-white'}">${overallAvg}</span>
                </div>
            </div>
        </div>
    `;

    const renderRow = (count, best, current) => `
        <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div class="grid grid-cols-2 gap-3">
                <div class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-black uppercase tracking-wide text-slate-400">${leftTitle}</span>
                        <span class="text-[10px] font-black text-slate-500 dark:text-slate-400">Ao${count}</span>
                    </div>
                    <span ${best.canShare ? `data-action="open-extended-best-avg-share" data-share-count="${count}" data-share-start="${best.start}"` : ''} class="text-base font-bold ${best.canShare ? 'text-blue-600 dark:text-blue-400 cursor-pointer hover:underline' : 'text-slate-700 dark:text-white'}">${best.value}</span>
                </div>
                <div class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-black uppercase tracking-wide text-slate-400">${rightTitle}</span>
                        <span class="text-[10px] font-black text-slate-500 dark:text-slate-400">Ao${count}</span>
                    </div>
                    <span ${current !== '-' ? `data-action="open-extended-avg-share" data-share-count="${count}"` : ''} class="text-base font-bold ${current !== '-' ? 'text-blue-600 dark:text-blue-400 cursor-pointer hover:underline' : 'text-slate-700 dark:text-white'}">${current}</span>
                </div>
            </div>
        </div>
    `;

    const content = document.getElementById('statsContent');
    content.innerHTML = `
        ${renderOverall()}
        ${renderRow(25, bestAo25, ao25)}
        ${renderRow(50, bestAo50, ao50)}
        ${renderRow(100, bestAo100, ao100)}
    `;
    document.getElementById('statsOverlay').classList.add('active');
}
window.closeStatsModal = () => document.getElementById('statsOverlay').classList.remove('active');

function calculateWindowAverageMs(slice, count, mean = false) {
    const dnfCount = slice.filter(s => s.penalty === 'DNF').length;
    let removeCount = Math.ceil(count * 0.05);
    if (count <= 12) removeCount = 1;
    if (dnfCount >= removeCount + (mean ? 0 : 1)) return null;

    const nums = slice.map(s => s.penalty === 'DNF' ? Infinity : (s.penalty === '+2' ? s.time + 2000 : s.time));
    if (mean) {
        const sum = nums.reduce((a, b) => a + b, 0);
        if (!Number.isFinite(sum)) return null;
        return sum / count;
    }

    nums.sort((a, b) => a - b);
    for (let i = 0; i < removeCount; i++) {
        nums.pop();
        nums.shift();
    }

    if (!nums.length || nums.some(n => !Number.isFinite(n))) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function findBestAverageWindow(list, count) {
    if (!Array.isArray(list) || list.length < count) {
        return { value: '-', start: -1, canShare: false };
    }

    let bestMs = null;
    let bestStart = -1;
    for (let i = 0; i <= list.length - count; i++) {
        const slice = list.slice(i, i + count);
        const avgMs = calculateWindowAverageMs(slice, count, false);
        if (avgMs === null) continue;
        if (bestMs === null || avgMs < bestMs) {
            bestMs = avgMs;
            bestStart = i;
        }
    }

    if (bestMs === null || bestStart < 0) {
        return { value: '-', start: -1, canShare: false };
    }

    return { value: formatTime(bestMs), start: bestStart, canShare: true };
}

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

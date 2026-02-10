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

    const bestAo25 = findBestAverageWindow(filtered, 25);
    const bestAo50 = findBestAverageWindow(filtered, 50);
    const bestAo100 = findBestAverageWindow(filtered, 100);

    const titleEl = document.getElementById('statsTitle');
    if (titleEl) {
        if (currentLang === 'ko') {
            titleEl.innerText = '평균 더보기';
        } else {
            titleEl.innerText = 'More Average';
        }
    }

    const isKo = currentLang === 'ko';
    const leftTitle = isKo ? '최고' : 'Best';
    const rightTitle = isKo ? '현재' : 'Current';
    const shareText = isKo ? '공유' : 'Share';

    const renderRow = (count, best, current) => `
        <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div class="grid grid-cols-2 gap-3">
                <div class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-black uppercase tracking-wide text-slate-400">${leftTitle}</span>
                        <span class="text-[10px] font-black text-slate-500 dark:text-slate-400">Ao${count}</span>
                    </div>
                    <span class="text-base font-bold text-slate-700 dark:text-white">${best.value}</span>
                    <button data-action="open-extended-best-avg-share" data-share-count="${count}" data-share-start="${best.start}" class="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed" ${best.canShare ? '' : 'disabled'}>${shareText}</button>
                </div>
                <div class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-black uppercase tracking-wide text-slate-400">${rightTitle}</span>
                        <span class="text-[10px] font-black text-slate-500 dark:text-slate-400">Ao${count}</span>
                    </div>
                    <span class="text-base font-bold text-slate-700 dark:text-white">${current}</span>
                    <button data-action="open-extended-avg-share" data-share-count="${count}" class="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed" ${current !== '-' ? '' : 'disabled'}>${shareText}</button>
                </div>
            </div>
        </div>
    `;

    const content = document.getElementById('statsContent');
    content.innerHTML = `
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

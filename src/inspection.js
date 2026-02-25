// --- Inspection Logic ---
function toggleInspection(checkbox) {
    isInspectionMode = checkbox.checked;
    
    // Force set hold duration to ~0 if inspection is ON
    if (isInspectionMode) {
        updateHoldDuration(0.01); // Basically instant
        holdDurationSlider.value = 0.01;
        holdDurationSlider.disabled = true;
        document.getElementById('holdDurationContainer').classList.add('opacity-50', 'pointer-events-none');
    } else {
        updateHoldDuration(0.3);
        holdDurationSlider.value = 0.3;
        holdDurationSlider.disabled = false;
        document.getElementById('holdDurationContainer').classList.remove('opacity-50', 'pointer-events-none');
    }
    
    saveData();
}
function startInspection() {
    inspectionState = 'inspecting';
    inspectionStartTime = Date.now();
    inspectionPenalty = null;
    hasSpoken8 = false;
    hasSpoken12 = false;
    
    timerEl.classList.remove('text-ready');
    timerEl.style.setProperty('color', '#ef4444', 'important'); // Red color for inspection countdown
    statusHint.innerText = "Inspection";
    if (typeof window.updateSolveUiVisibility === 'function') window.updateSolveUiVisibility();
    if(inspectionInterval) clearInterval(inspectionInterval);
    inspectionInterval = setInterval(() => {
        const elapsed = (Date.now() - inspectionStartTime) / 1000;
        const remaining = 15 - elapsed;
        
        if (remaining > 0) {
            timerEl.innerText = Math.ceil(remaining);
        } else if (remaining > -2) {
            timerEl.innerText = "+2";
            inspectionPenalty = '+2';
        } else {
            timerEl.innerText = "DNF";
            inspectionPenalty = 'DNF';
        }
        // TTS
        if (elapsed >= 8 && !hasSpoken8) {
            speak("Eight seconds");
            hasSpoken8 = true;
        }
        if (elapsed >= 12 && !hasSpoken12) {
            speak("Twelve seconds");
            hasSpoken12 = true;
        }
    }, 100);
}
function stopInspection() {
    if(inspectionInterval) clearInterval(inspectionInterval);
    inspectionState = 'none';
    timerEl.style.removeProperty('color');
    // Calculate penalty one last time to be precise
    if (isInspectionMode && inspectionStartTime > 0) {
        const elapsed = (Date.now() - inspectionStartTime) / 1000;
        if (elapsed > 17) inspectionPenalty = 'DNF';
        else if (elapsed > 15) inspectionPenalty = '+2';
        else inspectionPenalty = null;
    }
    if (typeof window.updateSolveUiVisibility === 'function') window.updateSolveUiVisibility();
}
function speak(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.2;
        window.speechSynthesis.speak(utterance);
    }
}

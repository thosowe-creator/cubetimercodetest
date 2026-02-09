// Check for updates on load
checkUpdateLog();

// [FIX] Ensure inline HTML handlers can always find these (in case of bundling/scoping changes)
window.changeEvent = window.changeEvent || changeEvent;
window.changePracticeCase = window.changePracticeCase || changePracticeCase;

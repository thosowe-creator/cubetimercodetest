// Check for updates on load
checkUpdateLog();

// [FIX] Ensure inline HTML handlers can always find these (in case of bundling/scoping changes)
if (typeof window.changeEvent !== 'function' && typeof changeEvent === 'function') {
  window.changeEvent = changeEvent;
}
if (typeof window.changePracticeCase !== 'function' && typeof changePracticeCase === 'function') {
  window.changePracticeCase = changePracticeCase;
}

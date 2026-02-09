// Picker state
const themePickerState = {
  part: null,
  prevRgb: null,
  hsv: { h: 200, s: 0.4, v: 1 },
  dragging: null, // 'sv' | 'hue'
};

function getCanvasPos(canvas, clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const x = Math.min(r.width, Math.max(0, clientX - r.left));
  const y = Math.min(r.height, Math.max(0, clientY - r.top));
  // map to canvas internal pixels
  return {
    x: x * (canvas.width / r.width),
    y: y * (canvas.height / r.height),
    w: canvas.width,
    h: canvas.height,
  };
}

function drawHue(canvas, hue) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  for (let i = 0; i <= 360; i += 60) {
    grad.addColorStop(i / 360, `hsl(${i}, 100%, 50%)`);
  }
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // indicator line
  const y = (hue / 360) * h;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(1, y - 2, w - 2, 4);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, y - 2, w - 2, 4);
}

function drawSV(canvas, hsv) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);

  // base hue
  ctx.fillStyle = `hsl(${hsv.h}, 100%, 50%)`;
  ctx.fillRect(0, 0, w, h);

  // white overlay (saturation)
  const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
  whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
  whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = whiteGrad;
  ctx.fillRect(0, 0, w, h);

  // black overlay (value)
  const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
  blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
  blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = blackGrad;
  ctx.fillRect(0, 0, w, h);

  // picker circle
  const x = hsv.s * w;
  const y = (1 - hsv.v) * h;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 8.5, 0, Math.PI * 2);
  ctx.stroke();
}

function setPickerUIFromHsv() {
  const rgb = hsvToRgb(themePickerState.hsv);
  // live apply
  if (themePickerState.part && lightTheme[themePickerState.part]) {
    lightTheme[themePickerState.part] = rgb;
    applyLightTheme();
    saveLightTheme();
  }

  const dot = document.getElementById('themePickerDot');
  const hexEl = document.getElementById('themePickerHex');
  const rgbEl = document.getElementById('themePickerRgb');
  if (dot) dot.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  if (hexEl) hexEl.textContent = rgbToHex(rgb);
  if (rgbEl) rgbEl.textContent = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  syncThemeRowsUI();

  const sv = document.getElementById('themeSV');
  const hue = document.getElementById('themeHue');
  if (sv) drawSV(sv, themePickerState.hsv);
  if (hue) drawHue(hue, themePickerState.hsv.h);
}

function setPickerForPart(part) {
  themePickerState.part = part;
  themePickerState.prevRgb = structuredClone(lightTheme[part]);
  themePickerState.hsv = rgbToHsv(lightTheme[part]);
  const title = document.getElementById('themePickerTitle');
  if (title) title.textContent = partLabel(part);
  setPickerUIFromHsv();
}

function ensurePickerEvents() {
  const sv = document.getElementById('themeSV');
  const hue = document.getElementById('themeHue');
  if (!sv || !hue) return;

  const onDownSV = (e) => {
    themePickerState.dragging = 'sv';
    onMoveSV(e);
  };
  const onMoveSV = (e) => {
    if (themePickerState.dragging !== 'sv') return;
    const p = getCanvasPos(sv, e.clientX, e.clientY);
    themePickerState.hsv.s = Math.min(1, Math.max(0, p.x / p.w));
    themePickerState.hsv.v = Math.min(1, Math.max(0, 1 - (p.y / p.h)));
    setPickerUIFromHsv();
  };
  const onDownHue = (e) => {
    themePickerState.dragging = 'hue';
    onMoveHue(e);
  };
  const onMoveHue = (e) => {
    if (themePickerState.dragging !== 'hue') return;
    const p = getCanvasPos(hue, e.clientX, e.clientY);
    themePickerState.hsv.h = Math.min(360, Math.max(0, (p.y / p.h) * 360));
    setPickerUIFromHsv();
  };
  const onUp = () => {
    themePickerState.dragging = null;
  };

  // prevent duplicate wiring
  if (!sv.__ctBound) {
    sv.__ctBound = true;
    sv.addEventListener('pointerdown', (e) => { sv.setPointerCapture(e.pointerId); onDownSV(e); });
    sv.addEventListener('pointermove', onMoveSV);
    sv.addEventListener('pointerup', onUp);
    sv.addEventListener('pointercancel', onUp);
  }
  if (!hue.__ctBound) {
    hue.__ctBound = true;
    hue.addEventListener('pointerdown', (e) => { hue.setPointerCapture(e.pointerId); onDownHue(e); });
    hue.addEventListener('pointermove', onMoveHue);
    hue.addEventListener('pointerup', onUp);
    hue.addEventListener('pointercancel', onUp);
  }
}

window.openThemePicker = (part) => {
  if (!LIGHT_THEME_DEFAULTS[part]) return;
  const themeList = document.getElementById('themeSettingsView');
  const picker = document.getElementById('themePickerView');
  if (themeList) themeList.classList.add('hidden');
  if (picker) picker.classList.remove('hidden');
  // header back should go back to theme list
  const title = document.getElementById('settingsTitle');
  if (title) title.textContent = '테마';
  setPickerForPart(part);
  ensurePickerEvents();
  const sc = document.getElementById('settingsScroll');
  if (sc) sc.scrollTop = 0;
};

window.themePickerCancel = () => {
  const part = themePickerState.part;
  if (part && themePickerState.prevRgb) {
    lightTheme[part] = structuredClone(themePickerState.prevRgb);
    applyLightTheme();
    saveLightTheme();
  }
  window.closeThemePicker();
};

window.themePickerApply = () => {
  // already live-applied; just close
  window.closeThemePicker();
};

window.themePickerDefault = () => {
  const part = themePickerState.part;
  if (!part) return;
  lightTheme[part] = structuredClone(LIGHT_THEME_DEFAULTS[part]);
  themePickerState.hsv = rgbToHsv(lightTheme[part]);
  applyLightTheme();
  saveLightTheme();
  setPickerUIFromHsv();
};

window.closeThemePicker = () => {
  const themeList = document.getElementById('themeSettingsView');
  const picker = document.getElementById('themePickerView');
  if (picker) picker.classList.add('hidden');
  if (themeList) themeList.classList.remove('hidden');
  syncThemeRowsUI();
  const sc = document.getElementById('settingsScroll');
  if (sc) sc.scrollTop = 0;
};

window.openThemeSettings = () => {
  const main = document.getElementById('settingsMainView');
  const theme = document.getElementById('themeSettingsView');
  const back = document.getElementById('themeBackBtn');
  const resetAll = document.getElementById('themeResetAllBtn');
  const title = document.getElementById('settingsTitle');

  if (main) main.classList.add('hidden');
  const lic = document.getElementById('licenseBlock');
  if (lic) lic.classList.add('hidden');
  if (theme) theme.classList.remove('hidden');
  if (back) back.classList.remove('hidden');
  if (resetAll) resetAll.classList.remove('hidden');
  if (title) title.textContent = '테마';
  // ensure picker is closed when entering theme list
  const picker = document.getElementById('themePickerView');
  if (picker) picker.classList.add('hidden');
  syncThemeRowsUI();
  // keep scroll at top when entering theme view
  const sc = document.getElementById('settingsScroll');
  if (sc) sc.scrollTop = 0;
};

window.closeThemeSettings = () => {
  // if picker is open, go back to theme list first
  const picker = document.getElementById('themePickerView');
  if (picker && !picker.classList.contains('hidden')) {
    window.closeThemePicker();
    return;
  }
  const main = document.getElementById('settingsMainView');
  const theme = document.getElementById('themeSettingsView');
  const back = document.getElementById('themeBackBtn');
  const resetAll = document.getElementById('themeResetAllBtn');
  const title = document.getElementById('settingsTitle');

  if (theme) theme.classList.add('hidden');
  if (main) main.classList.remove('hidden');
  const lic = document.getElementById('licenseBlock');
  if (lic) lic.classList.remove('hidden');
  if (back) back.classList.add('hidden');
  if (resetAll) resetAll.classList.add('hidden');
  if (title) title.textContent = 'Settings';
  // restore scroll top as well
  const sc = document.getElementById('settingsScroll');
  if (sc) sc.scrollTop = 0;
};

// init theme once per load
lightTheme = loadLightTheme();
applyLightTheme();

loadData();
applyLanguageToUI();
changeEvent(currentEvent);

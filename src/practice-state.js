// --- Practice state ---
const PRACTICE_EVENTS = {  'p_oll': { label: 'OLL', cubeEvent: '333' },
  'p_pll': { label: 'PLL', cubeEvent: '333' },
  'p_zbls': { label: 'ZBLS', cubeEvent: '333' },
  'p_zbll': { label: 'ZBLL', cubeEvent: '333' },
};
// Register practice events in configs (so the app doesn't early-return)
Object.assign(configs, {  'p_oll': { moves: configs['333'].moves, len: configs['333'].len, n: 3, cat: 'practice' },
  'p_pll': { moves: configs['333'].moves, len: configs['333'].len, n: 3, cat: 'practice' },
  'p_zbls': { moves: configs['333'].moves, len: configs['333'].len, n: 3, cat: 'practice' },
  'p_zbll': { moves: configs['333'].moves, len: configs['333'].len, n: 3, cat: 'practice' },
});

let currentPracticeCase = 'any';

// --- ZBLS Hand (R/L) ---
const PRACTICE_ZBLS_HAND_KEY = 'practiceZblsHand';
let practiceZblsHand = (() => {
  try {
    const v = String(localStorage.getItem(PRACTICE_ZBLS_HAND_KEY) || 'R').toUpperCase();
    return (v === 'L') ? 'L' : 'R';
  } catch (_) {
    return 'R';
  }
})();
let _zblsHandDraft = practiceZblsHand;

function _saveZblsHand(value) {
  practiceZblsHand = (value === 'L') ? 'L' : 'R';
  try { localStorage.setItem(PRACTICE_ZBLS_HAND_KEY, practiceZblsHand); } catch (_) {}
}

function _updateZblsHandUI() {
  const row = document.getElementById('zblsHandRow');
  if (!row) return;
  const r = document.getElementById('zblsHandR');
  const l = document.getElementById('zblsHandL');
  if (r) r.classList.toggle('active', _zblsHandDraft !== 'L');
  if (l) l.classList.toggle('active', _zblsHandDraft === 'L');
}

window.setZblsHandDraft = (value) => {
  _zblsHandDraft = (String(value || '').toUpperCase() === 'L') ? 'L' : 'R';
  _updateZblsHandUI();
};

// --- Practice case pool (per-event, stored separately to prevent overlap) ---
const PRACTICE_CASE_POOL_PREFIX = 'practiceCasePool:';
const practiceCasePoolState = {
  'p_zbls': { mode: 'any', selected: [] },
  'p_zbll': { mode: 'any', selected: [] },
};

function _poolKey(eventId) {
  return PRACTICE_CASE_POOL_PREFIX + String(eventId || '').trim();
}

function _loadCasePoolState(eventId) {
  const id = String(eventId || '').trim();
  if (!practiceCasePoolState[id]) return;
  try {
    const raw = localStorage.getItem(_poolKey(id));
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const mode = (parsed && (parsed.mode === 'pool')) ? 'pool' : 'any';
    const selected = Array.isArray(parsed?.selected) ? parsed.selected.map(String) : [];
    practiceCasePoolState[id].mode = mode;
    practiceCasePoolState[id].selected = selected;
  } catch (_) {
    // ignore corrupt storage
  }
}

function _saveCasePoolState(eventId) {
  const id = String(eventId || '').trim();
  if (!practiceCasePoolState[id]) return;
  try {
    const st = practiceCasePoolState[id];
    localStorage.setItem(_poolKey(id), JSON.stringify({
      mode: (st.mode === 'pool') ? 'pool' : 'any',
      selected: Array.isArray(st.selected) ? st.selected.map(String) : [],
    }));
  } catch (_) {}
}

function _getAllowedCaseKeys(eventId) {
  const options = getPracticeCaseOptions(eventId) || [];
  return options.filter(k => k !== 'any').map(String);
}

function _sanitizeCasePoolSelection(eventId) {
  const id = String(eventId || '').trim();
  if (!practiceCasePoolState[id]) return;
  const allowed = new Set(_getAllowedCaseKeys(id));
  const uniq = [];
  const seen = new Set();
  for (const k of (practiceCasePoolState[id].selected || [])) {
    const kk = String(k);
    if (!allowed.has(kk)) continue;
    if (seen.has(kk)) continue;
    seen.add(kk);
    uniq.push(kk);
  }
  practiceCasePoolState[id].selected = uniq;
  // If pool mode but nothing selected, fall back to any to avoid silent "empty random"
  if (practiceCasePoolState[id].mode === 'pool' && uniq.length === 0) {
    practiceCasePoolState[id].mode = 'any';
  }
}

function _ensureCasePoolLoaded(eventId) {
  const id = String(eventId || '').trim();
  if (!practiceCasePoolState[id]) return;
  // Load once lazily
  if (practiceCasePoolState[id]._loaded) return;
  practiceCasePoolState[id]._loaded = true;
  _loadCasePoolState(id);
  _sanitizeCasePoolSelection(id);
}

function _getPracticeCaseKeyForScramble(eventId, keysAll) {
  const id = String(eventId || '').trim();
  const keys = (keysAll || []).map(String);
  _ensureCasePoolLoaded(id);

  // For ZBLS/ZBLL: only two modes are supported here:
  // - any  : random from all cases
  // - pool : random from selected cases
  // Legacy single-case selection (currentPracticeCase) is intentionally ignored
  // to prevent "random -> stuck on one case" behavior.
  if (id === 'p_zbls' || id === 'p_zbll') {
    if (practiceCasePoolState[id]?.mode === 'pool') {
      const pool = (practiceCasePoolState[id].selected || [])
        .map(String)
        .filter(k => keys.includes(k));
      if (pool.length) return pool[_randInt(pool.length)];
      // If pool is empty, fall back to all-random (sanitizer should avoid this anyway)
    }
    return keys[_randInt(keys.length)];
  }

  // 1) Pool mode (multi-select) has priority: random from selected cases.
  if (practiceCasePoolState[id]?.mode === 'pool') {
    const pool = (practiceCasePoolState[id].selected || []).map(String).filter(k => keys.includes(k));
    if (pool.length) return pool[_randInt(pool.length)];
  }

  // 2) Legacy single-case selection.
  if (currentPracticeCase && currentPracticeCase !== 'any') {
    return String(currentPracticeCase);
  }

  // 3) Otherwise random from all.
  return keys[_randInt(keys.length)];
}

function updateCasePoolSummary(eventId) {
  const btn = document.getElementById('casePoolOpenBtn');
  const sum = document.getElementById('casePoolSummary');
  if (!btn || !sum) return;

  const id = String(eventId || '').trim();
  if (id !== 'p_zbls' && id !== 'p_zbll') {
    btn.textContent = (currentLang === 'ko') ? '랜덤' : 'Random';
    sum.textContent = '';
    return;
  }

  _ensureCasePoolLoaded(id);
  const st = practiceCasePoolState[id];
  const count = (st.selected || []).length;

  // Button label
  btn.textContent = (currentLang === 'ko') ? '선택…' : 'Select…';

  // Summary
  if (st.mode === 'pool') {
    sum.textContent = (currentLang === 'ko') ? `선택 ${count}개` : `${count} selected`;
  } else {
    sum.textContent = (currentLang === 'ko') ? '전체 랜덤' : 'All random';
  }
}


// [FIX] Some deployed HTML variants contain an empty #caseSelectWrap without required children.
// This helper ensures the required DOM exists so case tabs can render.
function ensureCaseSelectorDOM() {
  const wrap = document.getElementById('caseSelectWrap');
  if (!wrap) return;

  // --- [FIX] Ensure the case selector is placed inside a visible container ---
  // In this UI, #caseSelectWrap was originally located under #group-practice,
  // which is hidden by default (legacy tab UI). When the user selects ZBLS/ZBLL
  // via the main dropdown, the parent stays hidden, so the case selector never
  // appears even though we remove 'hidden' from the wrap itself.
  //
  // Move #caseSelectWrap right under the main event selector section (always visible),
  // unless it is already there.
  try {
    const evSel = document.getElementById('eventSelect');
    if (evSel) {
      // Prefer the immediate container around the select
      const anchor = evSel.closest('div.w-full') || evSel.parentElement;
      if (anchor && wrap.parentElement !== anchor.parentElement) {
        // Insert wrap right after the anchor container
        anchor.insertAdjacentElement('afterend', wrap);
      }
    }
  } catch (_) {}

  // If a full layout is already present, do nothing.
  let tabs = document.getElementById('caseTabs');
  let sel = document.getElementById('caseSelect');

  if (!tabs) {
    tabs = document.createElement('div');
    tabs.id = 'caseTabs';
    // keep styling reasonably consistent even if HTML was missing
    tabs.className = 'flex items-center gap-1 overflow-x-auto whitespace-nowrap no-scrollbar py-2';
    wrap.appendChild(tabs);
  }

  if (!sel) {
    sel = document.createElement('select');
    sel.id = 'caseSelect';
    sel.className = 'hidden';
    sel.onchange = () => changePracticeCase(sel.value);
    wrap.appendChild(sel);
  }
}

function isPracticeEvent(eventId) {
  return !!PRACTICE_EVENTS[eventId];
}

window.changePracticeCase = (val) => {
  currentPracticeCase = val || 'any';
  // Sync UI state for tabs/select
  updateCaseTabActive();
  const sel = document.getElementById('caseSelect');
  if (sel) sel.value = currentPracticeCase;
  if (isPracticeEvent(currentEvent)) generateScramble();
};

function getPracticeCaseOptions(eventId) {
  if (eventId === 'p_zbls') {
    // keys: "1".."41"
    const keys = Object.keys(ZBLS || {}).sort((a,b) => (parseInt(a,10)||0) - (parseInt(b,10)||0));
    return ['any', ...keys];
  }
  if (eventId === 'p_zbll') {
    // subsets: T, U, L, ... H (and any other keys present in the dataset)
    const keys = Object.keys(algdbZBLL || {});
    const preferred = ['T','U','L','S','AS','A','E','F','G','H','PI'];
    keys.sort((a,b) => {
      const ia = preferred.indexOf(a);
      const ib = preferred.indexOf(b);
      if (ia !== -1 || ib !== -1) {
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      }
      return String(a).localeCompare(String(b));
    });
    return ['any', ...keys];
  }
  return null;
}

function updateCaseTabActive() {
  const tabs = document.getElementById('caseTabs');
  if (!tabs) return;
  tabs.querySelectorAll('button.case-tab').forEach(btn => {
    const key = btn.getAttribute('data-case');
    if ((key || 'any') === (currentPracticeCase || 'any')) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

// --- Case pool modal (Settings-style) ---
let _casePoolModalEventId = null;
let _casePoolDraft = { mode: 'any', selected: new Set() };

window.openCasePoolModal = () => {
  const eventId = String(currentEvent || '').trim();
  if (eventId !== 'p_zbls' && eventId !== 'p_zbll') return;
  _ensureCasePoolLoaded(eventId);
  _casePoolModalEventId = eventId;

  // ZBLS Hand (draft only; commit on Apply)
  const handRow = document.getElementById('zblsHandRow');
  if (handRow) {
    if (eventId === 'p_zbls') {
      handRow.classList.remove('hidden');
      _zblsHandDraft = (practiceZblsHand === 'L') ? 'L' : 'R';
      _updateZblsHandUI();
    } else {
      handRow.classList.add('hidden');
    }
  }

  // Draft from stored state
  const st = practiceCasePoolState[eventId];
  _casePoolDraft = {
    mode: st.mode === 'pool' ? 'pool' : 'any',
    selected: new Set((st.selected || []).map(String)),
  };

  // Title
  const title = document.getElementById('casePoolTitle');
  if (title) {
    const label = PRACTICE_EVENTS?.[eventId]?.label || 'Case';
    title.textContent = (currentLang === 'ko') ? `${label} 케이스 선택` : `${label} Case Selection`;
  }

  // Render list
  _renderCasePoolList();

  // Show modal
  const overlay = document.getElementById('casePoolOverlay');
  const modal = document.getElementById('casePoolModal');
  if (overlay && modal) {
    overlay.classList.add('active');
    requestAnimationFrame(() => {
      modal.classList.remove('scale-95', 'opacity-0');
      modal.classList.add('scale-100', 'opacity-100');
    });
  }

  // Initialize mode UI
  window.setCasePoolMode(_casePoolDraft.mode);
};

window.closeCasePoolModal = () => {
  const overlay = document.getElementById('casePoolOverlay');
  const modal = document.getElementById('casePoolModal');
  if (overlay && modal) {
    modal.classList.add('scale-95', 'opacity-0');
    modal.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
      overlay.classList.remove('active');
    }, 150);
  }
  // Hide hand row when closing (prevents flashing when switching events)
  const handRow = document.getElementById('zblsHandRow');
  if (handRow) handRow.classList.add('hidden');
  _casePoolModalEventId = null;
};

window.handleOutsideCasePoolClick = (event) => {
  if (event?.target?.id === 'casePoolOverlay') window.closeCasePoolModal();
};

function _renderCasePoolList() {
  const eventId = _casePoolModalEventId;
  if (!eventId) return;

  const list = document.getElementById('casePoolList');
  const hint = document.getElementById('casePoolModeHint');
  if (!list) return;

  const keys = _getAllowedCaseKeys(eventId);
  list.innerHTML = '';
  list.className = 'case-pool-list grid grid-cols-5 gap-2 custom-scroll pr-1';

  const selectable = (_casePoolDraft?.mode === 'pool');

  keys.forEach(k => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'case-pool-item rounded-2xl px-2 py-2 text-xs font-black active:scale-95 transition-all';
    btn.textContent = String(k);

    const key = String(k);
    if (_casePoolDraft.selected.has(key)) btn.classList.add('selected');

    // In "Random (any)" mode, prevent individual selection changes.
    if (!selectable) {
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      btn.onclick = () => {
        if (_casePoolDraft.selected.has(key)) _casePoolDraft.selected.delete(key);
        else _casePoolDraft.selected.add(key);
        btn.classList.toggle('selected');
        _updateCasePoolCount();
      };
    }

    list.appendChild(btn);
  });

  _updateCasePoolCount();

  if (hint) {
    hint.textContent = (_casePoolDraft.mode === 'pool')
      ? ((currentLang === 'ko') ? '선택한 케이스 안에서 랜덤' : 'Random from selected cases')
      : ((currentLang === 'ko') ? '전체 케이스에서 랜덤' : 'Random from all cases');
  }
}

function _updateCasePoolCount() {
  const cnt = document.getElementById('casePoolCount');
  if (!cnt) return;

  const n = _casePoolDraft.selected ? _casePoolDraft.selected.size : 0;

  // Count is only meaningful in "Selected" (pool) mode.
  if (_casePoolDraft.mode === 'pool') {
    cnt.textContent = (currentLang === 'ko') ? `선택 ${n}개` : `${n} selected`;
  } else {
    cnt.textContent = '';
  }

  const applyBtn = document.getElementById('casePoolApplyBtn');
  if (!applyBtn) return;
  const disabled = (_casePoolDraft.mode === 'pool' && n === 0);
  applyBtn.disabled = disabled;
  applyBtn.classList.toggle('opacity-50', disabled);
  applyBtn.classList.toggle('cursor-not-allowed', disabled);

  // In "Random" mode, prevent editing actions (Clear) because individual selection is disabled.
  const clearBtn = document.getElementById('casePoolClearBtn');
  if (clearBtn) {
    const lock = (_casePoolDraft.mode !== 'pool');
    clearBtn.disabled = lock;
    clearBtn.classList.toggle('opacity-50', lock);
    clearBtn.classList.toggle('cursor-not-allowed', lock);
  }
}

window.setCasePoolMode = (mode) => {
  _casePoolDraft.mode = (mode === 'pool') ? 'pool' : 'any';
  const anyBtn = document.getElementById('casePoolModeAny');
  const poolBtn = document.getElementById('casePoolModePool');
  const hint = document.getElementById('casePoolModeHint');

  if (anyBtn) anyBtn.classList.toggle('active', _casePoolDraft.mode === 'any');
  if (poolBtn) poolBtn.classList.toggle('active', _casePoolDraft.mode === 'pool');

  if (hint) {
    hint.textContent = (_casePoolDraft.mode === 'pool')
      ? ((currentLang === 'ko') ? '선택한 케이스 안에서 랜덤' : 'Random from selected cases')
      : ((currentLang === 'ko') ? '전체 케이스에서 랜덤' : 'Random from all cases');
  }

  // Re-render to reflect disabled/enabled case list behavior.
  _renderCasePoolList();
};

window.clearCasePoolSelection = () => {
  if (_casePoolDraft?.selected) _casePoolDraft.selected.clear();
  _renderCasePoolList();
};

window.applyCasePoolSelection = () => {
  const eventId = _casePoolModalEventId;
  if (!eventId) return;

  const selected = Array.from(_casePoolDraft.selected || []).map(String);
  const mode = (_casePoolDraft.mode === 'pool') ? 'pool' : 'any';

  if (mode === 'pool' && selected.length === 0) return;

  _ensureCasePoolLoaded(eventId);
  practiceCasePoolState[eventId].mode = mode;
  practiceCasePoolState[eventId].selected = selected;
  _sanitizeCasePoolSelection(eventId);
  _saveCasePoolState(eventId);

  // Commit ZBLS hand choice
  if (eventId === 'p_zbls') {
    _saveZblsHand(_zblsHandDraft);
  }

  // Avoid overriding pool mode by legacy single-case selection
  currentPracticeCase = 'any';

  updateCasePoolSummary(eventId);
  window.closeCasePoolModal();
  if (isPracticeEvent(currentEvent)) generateScramble();
};


function renderCaseTabs(options) {
  const tabs = document.getElementById('caseTabs');
  if (!tabs) return;
  tabs.innerHTML = '';
  (options || ['any']).forEach(k => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'case-tab';
    btn.setAttribute('data-case', k);
    btn.textContent = (k === 'any') ? ((currentLang === 'ko') ? '랜덤' : 'Random') : String(k);
    btn.onclick = () => window.changePracticeCase(k);
    tabs.appendChild(btn);
  });
  updateCaseTabActive();
}

function setCaseSelectorVisible(visible, options = null) {
  const wrap = document.getElementById('caseSelectWrap');
  const sel = document.getElementById('caseSelect');
  const tabs = document.getElementById('caseTabs');
  if (!wrap) return;
  if (!visible) {
    wrap.classList.add('hidden');
    if (tabs) tabs.innerHTML = '';
    return;
  }
  // Populate tabs
  renderCaseTabs(options || ['any']);
  // Keep selection if possible
  const exists = (options || []).includes(currentPracticeCase);
  currentPracticeCase = exists ? currentPracticeCase : 'any';
  // Sync hidden <select> for fallback/compat
  if (sel) {
    sel.innerHTML = '';
    (options || ['any']).forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = (k === 'any') ? ((currentLang === 'ko') ? '랜덤' : 'Random') : String(k);
      sel.appendChild(opt);
    });
    sel.value = currentPracticeCase;
  }
  updateCaseTabActive();
  updateCasePoolSummary(currentEvent);
  wrap.classList.remove('hidden');
}

function refreshPracticeUI() {
  ensureCaseSelectorDOM();
  // Show case selector whenever the current event has case options (ZBLS/ZBLL),
  // even if PRACTICE_EVENTS or other metadata is out of sync.
  const eventId = String(currentEvent || '').trim();
  const options = getPracticeCaseOptions(eventId);
  setCaseSelectorVisible(!!options, options);
  updateCasePoolSummary(eventId);
}

// --- Route 1 scramble builders (adapted from Alg-Trainer RubiksCube.js) ---
function _cleanAlg(s) {
  // Alg-Trainer datasets sometimes include multiple variants separated by '/'.
  // For display/diagram we must choose a single variant because '/' is not a valid alg character for cubing.js.
  let str = String(s || '');
  if (str.includes('/')) {
    const parts = str.split('/').map(p => p.trim()).filter(Boolean);
    if (parts.length) str = parts[_randInt(parts.length)];
  }
  return str
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Practice alg helpers (string-level, no cube simulation) ---
// We only use these for practice events (F2L/OLL/PLL/ZBLS/ZBLL) so we don't touch normal scramble logic.
function _invertMoveToken(tok) {
  const t = String(tok || '').trim();
  if (!t) return '';
  // Move token: base + optional suffix (2 or ')
  // Examples: R, R', R2, Rw, Rw', u2, M', x, y2
  const m = t.match(/^([A-Za-z]+)(2|')?$/);
  if (!m) return t; // keep as-is
  const base = m[1];
  const suf = m[2] || '';
  if (suf === '2') return base + '2';
  if (suf === "'") return base;
  return base + "'";
}
function _invertAlgString(algText) {
  const parts = _cleanAlg(algText).split(' ').filter(Boolean);
  const inv = parts.reverse().map(_invertMoveToken);
  return _cleanAlg(inv.join(' '));
}

// ZBLS left-hand mode: swap R<->L (including r/l, Rw/Lw, 3Rw/3Lw...) and invert direction.
// Example: R L U B -> L' R' U' B'
function _swapRLAndInvertAlgString(algText) {
  const parts = _cleanAlg(algText).split(' ').filter(Boolean);
  const out = parts.map((tok) => {
    const m = String(tok).trim().match(/^([0-9]*)([A-Za-z]+)(2|')?$/);
    if (!m) return tok;
    const prefixNum = m[1] || '';
    let base = m[2] || '';
    const suf = m[3] || '';

    // swap only the first face letter if it's R/L (or r/l)
    if (base.length) {
      const first = base[0];
      const rest = base.slice(1);
      if (first === 'R') base = 'L' + rest;
      else if (first === 'L') base = 'R' + rest;
      else if (first === 'r') base = 'l' + rest;
      else if (first === 'l') base = 'r' + rest;
    }

    // invert suffix (keep 2 as-is)
    let nextSuf = '';
    if (suf === '2') nextSuf = '2';
    else if (suf === "'") nextSuf = '';
    else nextSuf = "'";

    return `${prefixNum}${base}${nextSuf}`;
  });
  return _cleanAlg(out.join(' '));
}

// Normalize an alg string (practice only):
// - remove cube rotations (x/y/z)
// - merge consecutive identical bases (U U -> U2, U U' -> removed, etc.)
function _normalizePracticeAlgString(algText) {
  const raw = _cleanAlg(algText);
  if (!raw) return '';

  const tokens = raw.split(' ').filter(Boolean);
  const out = [];

  // Orientation mapping: local face -> global face
  // Start identity and update when we encounter x/y/z.
  let ori = { U:'U', D:'D', F:'F', B:'B', R:'R', L:'L' };

  const applyRotX = () => {
    // x: rotate as R (new U = old F, new F = old D, new D = old B, new B = old U)
    ori = { U: ori.F, F: ori.D, D: ori.B, B: ori.U, R: ori.R, L: ori.L };
  };
  const applyRotY = () => {
    // y: rotate as U (new F = old L, new R = old F, new B = old R, new L = old B)
    ori = { U: ori.U, D: ori.D, F: ori.L, R: ori.F, B: ori.R, L: ori.B };
  };
  const applyRotZ = () => {
    // z: rotate as F (new U = old L, new R = old U, new D = old R, new L = old D)
    ori = { F: ori.F, B: ori.B, U: ori.L, R: ori.U, D: ori.R, L: ori.D };
  };
  const applyRotation = (axis, turns) => {
    const t = ((turns % 4) + 4) % 4;
    for (let i = 0; i < t; i++) {
      if (axis === 'x') applyRotX();
      else if (axis === 'y') applyRotY();
      else if (axis === 'z') applyRotZ();
    }
  };

  const parse = (tok) => {
    const s = String(tok).trim();

    // Fix weird tokens like "U2'" -> treat as "U2"
    const m2 = s.match(/^([A-Za-z]+)2'$/);
    if (m2) return { base: m2[1], suf: '2' };

    const m = s.match(/^([A-Za-z]+)(2|')?$/);
    if (!m) return null;
    return { base: m[1], suf: m[2] || '' };
  };

  const pow = (suf) => (suf === '2' ? 2 : (suf === "'" ? 3 : 1));
  const sufFrom = (p) => {
    const v = ((p % 4) + 4) % 4;
    if (v === 0) return '';
    if (v === 1) return '';
    if (v === 2) return '2';
    return "'"; // 3
  };

  const remapBase = (base) => {
    // Cube rotations are absorbed into `ori` and removed from output.
    if (base === 'x' || base === 'y' || base === 'z') return base;

    // Face turns
    if (base.length === 1) {
      const ch = base;
      if ('URFDLB'.includes(ch)) return ori[ch];
      if ('urfdlb'.includes(ch)) return ori[ch.toUpperCase()].toLowerCase(); // wide (r/l/u/d/f/b)
      return base;
    }

    // Wide turns like Rw, Uw...
    if (base.length === 2 && base[1] === 'w' && 'URFDLB'.includes(base[0])) {
      return ori[base[0]] + 'w';
    }

    // If something else (M/E/S, 3Rw, etc.) slips through, keep it as-is.
    return base;
  };

  for (const tok of tokens) {
    const p = parse(tok);
    if (!p) { out.push(tok); continue; }

    // Absorb cube rotations (x/y/z) into orientation mapping instead of deleting them.
    if (p.base === 'x' || p.base === 'y' || p.base === 'z') {
      applyRotation(p.base, pow(p.suf));
      continue;
    }

    const mappedBase = remapBase(p.base);
    const mappedTok = mappedBase + p.suf;

    const last = out.length ? parse(out[out.length - 1]) : null;
    if (last) {
      const lastMappedBase = last.base; // already mapped in output
      if (lastMappedBase === mappedBase) {
        const merged = (pow(last.suf) + pow(p.suf)) % 4;
        if (merged === 0) out.pop();
        else out[out.length - 1] = mappedBase + sufFrom(merged);
        continue;
      }
    }

    out.push(mappedTok);
  }

  return _cleanAlg(out.join(' '));
}

// Convert practice scramble tokens to a cubing.js-friendly form for scramble-display.
// - lowercase u/r/l/f/b/d => Uw/Rw/Lw/Fw/Bw/Dw
// - slice moves M/E/S => wide + face combos (no slice tokens needed)
// This conversion is ONLY for the scramble image (diagram). Text display stays original.
function _practiceAlgForDiagram(algText) {
  const parts = _cleanAlg(algText).split(' ').filter(Boolean);
  const out = [];
  const invSuffix = (s) => (s === "'") ? '' : (s === '2' ? '2' : "'");
  const parse = (tok) => {
    const m = tok.match(/^([A-Za-z]+)(2|')?$/);
    if (!m) return { base: tok, suf: '' };
    return { base: m[1], suf: m[2] || '' };
  };
  const wideMap = { u: 'Uw', d: 'Dw', l: 'Lw', r: 'Rw', f: 'Fw', b: 'Bw' };

  for (const tok of parts) {
    const { base, suf } = parse(tok);
    // Lowercase single-face = wide move
    if (base.length === 1 && wideMap[base]) {
      out.push(wideMap[base] + suf);
      continue;
    }
    // Slice moves -> (wide + face) decomposition
    if (base === 'M') {
      // M  = Rw' R
      // M' = R' Rw
      // M2 = R2 Rw2
      if (suf === "'") out.push("R'", 'Rw');
      else if (suf === '2') out.push('R2', 'Rw2');
      else out.push("Rw'", 'R');
      continue;
    }
    if (base === 'E') {
      // E  = Uw' U
      // E' = U' Uw
      // E2 = U2 Uw2
      if (suf === "'") out.push("U'", 'Uw');
      else if (suf === '2') out.push('U2', 'Uw2');
      else out.push("Uw'", 'U');
      continue;
    }
    if (base === 'S') {
      // S  = F' Fw
      // S' = Fw' F
      // S2 = F2 Fw2
      if (suf === "'") out.push("Fw'", 'F');
      else if (suf === '2') out.push('F2', 'Fw2');
      else out.push("F'", 'Fw');
      continue;
    }
    // Keep anything else (R, U, x, y, z, Rw, etc.)
    out.push(base + suf);
  }
  return _cleanAlg(out.join(' '));
}
function _randInt(n) { return Math.floor(Math.random() * n); }

function _pickRandomAlgFromSet(eventId) {
  if (eventId === 'p_oll') {
    // OLL.OLL is array of algs
    const arr = (OLL && OLL.OLL) ? OLL.OLL : [];
    return arr.length ? arr[_randInt(arr.length)] : '';
  }
  if (eventId === 'p_pll') {
    const keys = Object.keys(PLL || {});
    const k = keys[_randInt(keys.length)];
    const arr = PLL[k] || [];
    return arr.length ? arr[_randInt(arr.length)] : '';
  }
  if (eventId === 'p_zbls') {
    const keys = Object.keys(ZBLS || {});
    const chosenKey = _getPracticeCaseKeyForScramble(eventId, keys);
    const arr = ZBLS[chosenKey] || [];
    return arr.length ? arr[_randInt(arr.length)] : '';
  }
  if (eventId === 'p_zbll') {
    const keys = Object.keys(algdbZBLL || {});
    const chosenKey = _getPracticeCaseKeyForScramble(eventId, keys);
    const arr = algdbZBLL[chosenKey] || [];
    return arr.length ? arr[_randInt(arr.length)] : '';
  }
  return '';
}

function _preScramble(length, endwith = null) {
  const moves = ["U","D","F","B","L","R"];
  const suffix = ["", "2", "'"];
  let scramble = "";
  let last = "";
  for (let i = 0; i < length; i++) {
    let move;
    do { move = moves[_randInt(moves.length)]; } while (move === last);
    scramble += move + suffix[_randInt(suffix.length)] + " ";
    last = move;
  }
  if (endwith) scramble += endwith;
  return scramble.trim();
}

function _isTopLayerOnly(algText) {
  const txt = String(algText || '');
  // If includes D moves / wide / slice / cube rotations, treat as not top-only
  return !/[dDlLrRfFbB][w]?|M|E|S|x|y|z/.test(txt.replace(/[Uu]\w?/g,''));
}

function _obfuscate(cube, randomstate = false) {
  // cube is in a specific case state.
  // We add a random pre-scramble, then solve back to that state to get a "random-looking" scramble.
  const prec = randomstate ? Cube.random() : new Cube();
  if (!randomstate) {
    // Randomize by applying random moves
    prec.move(_preScramble(20));
  }
  // Apply pre-scramble to case cube
  const target = cube.clone();
  target.multiply(prec);

  // Solve from solved to target (gives alg); invert to get scramble
  const solution = target.solve();
  return invertAlg(solution);
}

function _generateAlgScramble(rawAlg, opts = {}) {
  const { randomstate = true, preLen = 4, auf = true } = opts;
  let algText = _cleanAlg(rawAlg);
  if (!algText) return '';

  // Build a cube that represents "apply alg to solved cube"
  const c = new Cube();
  c.move(algText);

  // Optional random U/AUF at end (keeps last-layer alignment flexible)
  let aufMove = '';
  if (auf) {
    const u = ["", "U", "U2", "U'"];
    aufMove = u[_randInt(u.length)];
  }

  // Pre-scramble: add some random moves first, then solve back.
  const pre = _preScramble(preLen, aufMove ? aufMove : null);
  const preCube = new Cube();
  if (pre) preCube.move(pre);
  const caseCube = c.clone();
  caseCube.multiply(preCube);

  const scramble = _obfuscate(caseCube, randomstate);
  return _cleanAlg(scramble);
}


// --- Alg-Trainer compatible practice scramble engine (OLL/PLL/ZBLL/ZBLS only) ---
// This is a trimmed, DOM-free port of Tao Yu's Alg-Trainer scramble logic.
// It intentionally keeps non-practice scramble logic untouched.
const PRACTICE_AT = (() => {
  // Tokenize an alg string that may or may not contain spaces.
  // Supports: R U F D L B, rotations x y z, slices M E S, lowercase r u f d l b (wide-like).
  function tokenizeAlg(s) {
    const str = String(s || '').replace(/\s+/g, '').trim();
    const tokens = [];
    let i = 0;
    const isFace = (ch) => /[RUFBLDrufbldxyzMES]/.test(ch);
    while (i < str.length) {
      const ch = str[i];
      if (!isFace(ch)) { i++; continue; }
      let tok = ch;
      i++;
      // Optional wide marker (e.g., Rw) - not used by Alg-Trainer's premove/postmove, but kept for safety
      if (str[i] === 'w' || str[i] === 'W') { tok += 'w'; i++; }

      // Optional digits (we care mainly about "2")
      if (i < str.length && /[0-9]/.test(str[i])) {
        // consume all digits but only keep mod 4 semantics later
        let digits = '';
        while (i < str.length && /[0-9]/.test(str[i])) { digits += str[i]; i++; }
        tok += digits;
      }
      // Optional prime
      if (i < str.length && str[i] === "'") { tok += "'"; i++; }

      // Normalize weird "2'" (treat as "2")
      tok = tok.replace(/2'/g, '2');
      tokens.push(tok);
    }
    return tokens;
  }

  
  let _solverReady = false;
  function ensureCubeSolver() {
    if (_solverReady) return;
    try {
      if (typeof Cube !== 'undefined' && typeof Cube.initSolver === 'function') {
        Cube.initSolver();
      }
      _solverReady = true;
    } catch (e) {
      // If solver init fails, keep going; rc.solution() will throw and surface the error.
      _solverReady = false;
    }
  }

function invertToken(tok) {
    tok = String(tok || '').trim();
    if (!tok) return '';
    // split into base + suffix
    const m = tok.match(/^([0-9]*)([A-Za-z]+w?)([0-9]*)(\'?)$/);
    if (!m) {
      // fallback: toggle last prime or append prime
      if (tok.endsWith("2")) return tok;
      if (tok.endsWith("'")) return tok.slice(0, -1);
      return tok + "'";
    }
    const prefixNum = m[1] || '';
    const base = m[2] || '';
    const digits = m[3] || '';
    const prime = m[4] || '';

    // Determine amount (quarter turns)
    let amt = 1;
    if (digits) {
      const n = parseInt(digits, 10);
      if (!Number.isNaN(n)) amt = ((n % 4) + 4) % 4;
      if (amt === 0) amt = 0;
    }
    if (prime === "'") amt = (4 - amt) % 4;

    // Invert amount
    const invAmt = (4 - amt) % 4;

    // Re-encode
    if (invAmt === 0) return ''; // identity, should be dropped by simplify
    if (invAmt === 1) return `${prefixNum}${base}`;
    if (invAmt === 2) return `${prefixNum}${base}2`;
    if (invAmt === 3) return `${prefixNum}${base}'`;
    return `${prefixNum}${base}`;
  }

  // Equivalent to alg.cube.invert, but returns a compact string (no spaces),
  // so concatenation behaves like Alg-Trainer's generators.
  function invertCompact(algText) {
    const tokens = tokenizeAlg(algText);
    const inv = [];
    for (let i = tokens.length - 1; i >= 0; i--) {
      const t = invertToken(tokens[i]);
      if (t) inv.push(t);
    }
    return inv.join('');
  }

  function parseMove(move){
    if (move.trim() == ""){
        return [null, null];
    }

    var myRegexp = /([RUFBLDrufbldxyzEMS])(\d*)('?)/g;
    var match = myRegexp.exec(move.trim());

    if (match!=null) {

        var side = match[1];

        var times = 1;
        if (!match[2]=="") {
            times = match[2] % 4;
        }

        if (match[3]=="'") {
            times = (4 - times) % 4;
        }

        return [side, times];
    }
    else {
        return [null, null];
    }
  }

  function moveRotationsToStart(rotationFreeAlg, rotations){
    // Needs moves of algs to be separated by spaces
    // wide moves not supported (matches Alg-Trainer assumptions)

    let transformDict = {
        "U": "U","R": "R","F": "F","B": "B","L": "L","D": "D"
    };

    let rotationEffectDict = {
        "x": {"U":"B", "B":"D", "D":"F", "F":"U"},
        "y": {"F":"L", "L":"B", "B":"R", "R":"F"},
        "z": {"U":"R", "R":"D", "D":"L", "L":"U"}
    };

    let rotationsArr = rotations.trim().split(" ").filter(Boolean);

    // apply rotations to the transformation dict
    for (let i=0; i<rotationsArr.length; i++){
        let rot = rotationsArr[i];
        let [side, times] = parseMove(rot);
        if (!side || !times) continue;
        for (let t=0; t<times; t++){
            let effect = rotationEffectDict[side];
            if (!effect) continue;
            let newTransformDict = Object.assign({}, transformDict);
            for (let key in effect){
                newTransformDict[key] = transformDict[effect[key]];
            }
            transformDict = newTransformDict;
        }
    }

    // push each rotation onto the start of the alg by transforming the subsequent moves
    let movesArr = rotationFreeAlg.trim().split(" ").filter(Boolean);
    let transformedMoves = [];
    for (let i=0; i<movesArr.length; i++){
        let mv = movesArr[i];
        let [side, times] = parseMove(mv);
        if (!side) continue;
        // skip rotations already (shouldn't exist here)
        if ("xyz".includes(side)) continue;
        let base = transformDict[side] || side;
        // rebuild
        let suf = "";
        if (times === 2) suf = "2";
        else if (times === 3) suf = "'";
        transformedMoves.push(base + suf);
    }

    const rotPrefix = rotationsArr.length ? (rotationsArr.join(" ") + " ") : "";
    return rotPrefix + transformedMoves.join(" ") + (transformedMoves.length ? " " : "");
  }

  // Minimal simplify: merges consecutive identical bases (including x/y/z, M/E/S, lowercases).
  function simplifyAlg(algText) {
    const toks = String(algText || '').trim().split(/\s+/).filter(Boolean).map(t => t.replace(/2'/g,'2'));
    const out = [];
    const parseTok = (tok) => {
      const m = tok.match(/^([A-Za-z]+w?)(2|')?$/);
      if (!m) return { base: tok, amt: 1 };
      const base = m[1];
      const suf = m[2] || '';
      let amt = 1;
      if (suf === "2") amt = 2;
      else if (suf === "'") amt = 3;
      return { base, amt };
    };
    const encode = (base, amt) => {
      const a = ((amt % 4) + 4) % 4;
      if (a === 0) return null;
      if (a === 1) return base;
      if (a === 2) return base + "2";
      if (a === 3) return base + "'";
      return base;
    };
    for (const tok of toks) {
      const cur = parseTok(tok);
      if (out.length > 0) {
        const prev = parseTok(out[out.length-1]);
        if (prev.base === cur.base) {
          const merged = encode(prev.base, prev.amt + cur.amt);
          out.pop();
          if (merged) out.push(merged);
          continue;
        }
      }
      out.push(tok);
    }
    return out.join(" ");
  }

  function getPremoves(length) {
    var previous = "U"; // prevents first move from being U or D
    var moveset = ['U', 'R', 'F', 'D', 'L', 'B'];
    var amts = [" ","' "];
    var randmove = "";
    var sequence = "";
    for (let i=0; i<length; i++) {
        do {
            randmove = moveset[Math.floor(Math.random()*moveset.length)];
        } while (previous != "" && (randmove === previous || Math.abs(moveset.indexOf(randmove) - moveset.indexOf(previous)) === 3))
        previous = randmove;
        sequence += randmove;
        sequence += amts[Math.floor(Math.random()*amts.length)];
    }
    return sequence;
  }
  function getPostmoves(length) {
    var previous = "";
    var moveset = ['U', 'R', 'F', 'D', 'L', 'B'];
    var amts = [" ","' ", "2 "];
    var randmove = "";
    var sequence = "";
    for (let i=0; i<length; i++) {
        do {
            randmove = moveset[Math.floor(Math.random()*moveset.length)];
        } while (previous != "" && (randmove === previous || Math.abs(moveset.indexOf(randmove) - moveset.indexOf(previous)) === 3))
        previous = randmove;
        sequence += randmove;
        sequence += amts[Math.floor(Math.random()*amts.length)];
    }
    return sequence;
  }

  // DOM-free extraction of Alg-Trainer's RubiksCube core (used by obfuscate)
  function RubiksCube() {
    this.cubestate = [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6];

    this.resetCube = function(){
        this.cubestate = [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6];
    }
    this.solution = function(){
        var gcube = Cube.fromString(this.toString());
        return gcube.solve();
    }

    this.isSolved = function(){
        for (var i = 0; i<6;i++){
            var colour1 = this.cubestate[9*i];
            for (var j = 0; j<8; j++){
                if (this.cubestate[9*i + j + 1]!=colour1){
                    return false;
                }
            }
        }
        return true;
    }
    this.wcaOrient = function() {
        // u-r--f--d--l--b
        // 4 13 22 31 40 49
        //
        var moves = "";

        if (this.cubestate[13]==1) {//R face
            this.doAlgorithm("z'");
            moves +="z'";
            moves += " ";
        } else if (this.cubestate[22]==1) {//on F face
            this.doAlgorithm("x");
            moves+="x";
            moves += " ";
        } else if (this.cubestate[31]==1) {//on D face
            this.doAlgorithm("x2");
            moves+="x2";
            moves += " ";
        } else if (this.cubestate[40]==1) {//on L face
            this.doAlgorithm("z");
            moves+="z";
            moves += " ";
        } else if (this.cubestate[49]==1) {//on B face
            this.doAlgorithm("x'");
            moves+="x'";
            moves += " ";
        }

        if (this.cubestate[13]==3) {//R face
            this.doAlgorithm("y");
            moves+="y";
            moves += " ";
        } else if (this.cubestate[40]==3) {//on L face
            this.doAlgorithm("y'");
            moves+="y'";
            moves += " ";
        } else if (this.cubestate[49]==3) {//on B face
            this.doAlgorithm("y2");
            moves+="y2";
            moves += " ";
        }

        return moves;
    }
    this.toString = function(){
        var str = "";
        var i;
        var sides = ["U","R","F","D","L","B"]
        for(i=0;i<this.cubestate.length;i++){
            str+=sides[this.cubestate[i]-1];
        }
        return str;

    }


    this.test = function(alg){
        this.doAlgorithm(alg);
        drawCube(this.cubestate);
    }

    this.doAlgorithm = function(alg) {
        if (alg == "") return;

        var moveArr = alg.split(/(?=[A-Za-z])/);
        var i;

        for (i = 0;i<moveArr.length;i++) {
            var move = moveArr[i];
            var myRegexp = /([RUFBLDrufbldxyzEMS])(\d*)('?)/g;
            var match = myRegexp.exec(move.trim());


            if (match!=null) {

                var side = match[1];

                var times = 1;
                if (!match[2]=="") {
                    times = match[2] % 4;
                }

                if (match[3]=="'") {
                    times = (4 - times) % 4;
                }

                switch (side) {
                    case "R":
                        this.doR(times);
                        break;
                    case "U":
                        this.doU(times);
                        break;
                    case "F":
                        this.doF(times);
                        break;
                    case "B":
                        this.doB(times);
                        break;
                    case "L":
                        this.doL(times);
                        break;
                    case "D":
                        this.doD(times);
                        break;
                    case "r":
                        this.doRw(times);
                        break;
                    case "u":
                        this.doUw(times);
                        break;
                    case "f":
                        this.doFw(times);
                        break;
                    case "b":
                        this.doBw(times);
                        break;
                    case "l":
                        this.doLw(times);
                        break;
                    case "d":
                        this.doDw(times);
                        break;
                    case "x":
                        this.doX(times);
                        break;
                    case "y":
                        this.doY(times);
                        break;
                    case "z":
                        this.doZ(times);
                        break;
                    case "E":
                        this.doE(times);
                        break;
                    case "M":
                        this.doM(times);
                        break;
                    case "S":
                        this.doS(times);
                        break;

                }
            } else {

                console.log("Invalid alg, or no alg specified:" + alg + "|");

            }

        }

    }

    this.solveNoRotate = function(){
        //Center sticker indexes: 4, 13, 22, 31, 40, 49
        cubestate = this.cubestate;
        this.cubestate = [cubestate[4],cubestate[4],cubestate[4],cubestate[4],cubestate[4],cubestate[4],cubestate[4],cubestate[4],cubestate[4],
                          cubestate[13],cubestate[13],cubestate[13],cubestate[13],cubestate[13],cubestate[13],cubestate[13],cubestate[13],cubestate[13],
                          cubestate[22],cubestate[22],cubestate[22],cubestate[22],cubestate[22],cubestate[22],cubestate[22],cubestate[22],cubestate[22],
                          cubestate[31],cubestate[31],cubestate[31],cubestate[31],cubestate[31],cubestate[31],cubestate[31],cubestate[31],cubestate[31],
                          cubestate[40],cubestate[40],cubestate[40],cubestate[40],cubestate[40],cubestate[40],cubestate[40],cubestate[40],cubestate[40],
                          cubestate[49],cubestate[49],cubestate[49],cubestate[49],cubestate[49],cubestate[49],cubestate[49],cubestate[49],cubestate[49]];
    }

    this.doU = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[6], cubestate[3], cubestate[0], cubestate[7], cubestate[4], cubestate[1], cubestate[8], cubestate[5], cubestate[2], cubestate[45], cubestate[46], cubestate[47], cubestate[12], cubestate[13], cubestate[14], cubestate[15], cubestate[16], cubestate[17], cubestate[9], cubestate[10], cubestate[11], cubestate[21], cubestate[22], cubestate[23], cubestate[24], cubestate[25], cubestate[26], cubestate[27], cubestate[28], cubestate[29], cubestate[30], cubestate[31], cubestate[32], cubestate[33], cubestate[34], cubestate[35], cubestate[18], cubestate[19], cubestate[20], cubestate[39], cubestate[40], cubestate[41], cubestate[42], cubestate[43], cubestate[44], cubestate[36], cubestate[37], cubestate[38], cubestate[48], cubestate[49], cubestate[50], cubestate[51], cubestate[52], cubestate[53]];
        }

    }

    this.doR = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;

            this.cubestate = [cubestate[0], cubestate[1], cubestate[20], cubestate[3], cubestate[4], cubestate[23], cubestate[6], cubestate[7], cubestate[26], cubestate[15], cubestate[12], cubestate[9], cubestate[16], cubestate[13], cubestate[10], cubestate[17], cubestate[14], cubestate[11], cubestate[18], cubestate[19], cubestate[29], cubestate[21], cubestate[22], cubestate[32], cubestate[24], cubestate[25], cubestate[35], cubestate[27], cubestate[28], cubestate[51], cubestate[30], cubestate[31], cubestate[48], cubestate[33], cubestate[34], cubestate[45], cubestate[36], cubestate[37], cubestate[38], cubestate[39], cubestate[40], cubestate[41], cubestate[42], cubestate[43], cubestate[44], cubestate[8], cubestate[46], cubestate[47], cubestate[5], cubestate[49], cubestate[50], cubestate[2], cubestate[52], cubestate[53]]
        }

    }

    this.doF = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[0], cubestate[1], cubestate[2], cubestate[3], cubestate[4], cubestate[5], cubestate[44], cubestate[41], cubestate[38], cubestate[6], cubestate[10], cubestate[11], cubestate[7], cubestate[13], cubestate[14], cubestate[8], cubestate[16], cubestate[17], cubestate[24], cubestate[21], cubestate[18], cubestate[25], cubestate[22], cubestate[19], cubestate[26], cubestate[23], cubestate[20], cubestate[15], cubestate[12], cubestate[9], cubestate[30], cubestate[31], cubestate[32], cubestate[33], cubestate[34], cubestate[35], cubestate[36], cubestate[37], cubestate[27], cubestate[39], cubestate[40], cubestate[28], cubestate[42], cubestate[43], cubestate[29], cubestate[45], cubestate[46], cubestate[47], cubestate[48], cubestate[49], cubestate[50], cubestate[51], cubestate[52], cubestate[53]];
        }

    }

    this.doD = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[0], cubestate[1], cubestate[2], cubestate[3], cubestate[4], cubestate[5], cubestate[6], cubestate[7], cubestate[8], cubestate[9], cubestate[10], cubestate[11], cubestate[12], cubestate[13], cubestate[14], cubestate[24], cubestate[25], cubestate[26], cubestate[18], cubestate[19], cubestate[20], cubestate[21], cubestate[22], cubestate[23], cubestate[42], cubestate[43], cubestate[44], cubestate[33], cubestate[30], cubestate[27], cubestate[34], cubestate[31], cubestate[28], cubestate[35], cubestate[32], cubestate[29], cubestate[36], cubestate[37], cubestate[38], cubestate[39], cubestate[40], cubestate[41], cubestate[51], cubestate[52], cubestate[53], cubestate[45], cubestate[46], cubestate[47], cubestate[48], cubestate[49], cubestate[50], cubestate[15], cubestate[16], cubestate[17]];
        }

    }

    this.doL = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[53], cubestate[1], cubestate[2], cubestate[50], cubestate[4], cubestate[5], cubestate[47], cubestate[7], cubestate[8], cubestate[9], cubestate[10], cubestate[11], cubestate[12], cubestate[13], cubestate[14], cubestate[15], cubestate[16], cubestate[17], cubestate[0], cubestate[19], cubestate[20], cubestate[3], cubestate[22], cubestate[23], cubestate[6], cubestate[25], cubestate[26], cubestate[18], cubestate[28], cubestate[29], cubestate[21], cubestate[31], cubestate[32], cubestate[24], cubestate[34], cubestate[35], cubestate[42], cubestate[39], cubestate[36], cubestate[43], cubestate[40], cubestate[37], cubestate[44], cubestate[41], cubestate[38], cubestate[45], cubestate[46], cubestate[33], cubestate[48], cubestate[49], cubestate[30], cubestate[51], cubestate[52], cubestate[27]];
        }

    }

    this.doB = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[11], cubestate[14], cubestate[17], cubestate[3], cubestate[4], cubestate[5], cubestate[6], cubestate[7], cubestate[8], cubestate[9], cubestate[10], cubestate[35], cubestate[12], cubestate[13], cubestate[34], cubestate[15], cubestate[16], cubestate[33], cubestate[18], cubestate[19], cubestate[20], cubestate[21], cubestate[22], cubestate[23], cubestate[24], cubestate[25], cubestate[26], cubestate[27], cubestate[28], cubestate[29], cubestate[30], cubestate[31], cubestate[32], cubestate[36], cubestate[39], cubestate[42], cubestate[2], cubestate[37], cubestate[38], cubestate[1], cubestate[40], cubestate[41], cubestate[0], cubestate[43], cubestate[44], cubestate[51], cubestate[48], cubestate[45], cubestate[52], cubestate[49], cubestate[46], cubestate[53], cubestate[50], cubestate[47]];
        }

    }

    this.doE = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[0], cubestate[1], cubestate[2], cubestate[3], cubestate[4], cubestate[5], cubestate[6], cubestate[7], cubestate[8], cubestate[9], cubestate[10], cubestate[11], cubestate[21], cubestate[22], cubestate[23], cubestate[15], cubestate[16], cubestate[17], cubestate[18], cubestate[19], cubestate[20], cubestate[39], cubestate[40], cubestate[41], cubestate[24], cubestate[25], cubestate[26], cubestate[27], cubestate[28], cubestate[29], cubestate[30], cubestate[31], cubestate[32], cubestate[33], cubestate[34], cubestate[35], cubestate[36], cubestate[37], cubestate[38], cubestate[48], cubestate[49], cubestate[50], cubestate[42], cubestate[43], cubestate[44], cubestate[45], cubestate[46], cubestate[47], cubestate[12], cubestate[13], cubestate[14], cubestate[51], cubestate[52], cubestate[53]];
        }

    }

    this.doM = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[0], cubestate[52], cubestate[2], cubestate[3], cubestate[49], cubestate[5], cubestate[6], cubestate[46], cubestate[8], cubestate[9], cubestate[10], cubestate[11], cubestate[12], cubestate[13], cubestate[14], cubestate[15], cubestate[16], cubestate[17], cubestate[18], cubestate[1], cubestate[20], cubestate[21], cubestate[4], cubestate[23], cubestate[24], cubestate[7], cubestate[26], cubestate[27], cubestate[19], cubestate[29], cubestate[30], cubestate[22], cubestate[32], cubestate[33], cubestate[25], cubestate[35], cubestate[36], cubestate[37], cubestate[38], cubestate[39], cubestate[40], cubestate[41], cubestate[42], cubestate[43], cubestate[44], cubestate[45], cubestate[34], cubestate[47], cubestate[48], cubestate[31], cubestate[50], cubestate[51], cubestate[28], cubestate[53]];
        }

    }

    this.doS = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.cubestate = [cubestate[0], cubestate[1], cubestate[2], cubestate[43], cubestate[40], cubestate[37], cubestate[6], cubestate[7], cubestate[8], cubestate[9], cubestate[3], cubestate[11], cubestate[12], cubestate[4], cubestate[14], cubestate[15], cubestate[5], cubestate[17], cubestate[18], cubestate[19], cubestate[20], cubestate[21], cubestate[22], cubestate[23], cubestate[24], cubestate[25], cubestate[26], cubestate[27], cubestate[28], cubestate[29], cubestate[16], cubestate[13], cubestate[10], cubestate[33], cubestate[34], cubestate[35], cubestate[36], cubestate[30], cubestate[38], cubestate[39], cubestate[31], cubestate[41], cubestate[42], cubestate[32], cubestate[44], cubestate[45], cubestate[46], cubestate[47], cubestate[48], cubestate[49], cubestate[50], cubestate[51], cubestate[52], cubestate[53]];
        }

    }

    this.doX = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.doR(1);
            this.doM(3);
            this.doL(3);
        }
    }

    this.doY = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;

            this.doU(1);
            this.doE(3);
            this.doD(3);
        }
    }

    this.doZ = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;

            this.doF(1);
            this.doS(1);
            this.doB(3);
        }
    }

    this.doUw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.doE(3);
            this.doU(1);

        }

    }

    this.doRw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.doM(3);
            this.doR(1);
        }

    }

    this.doFw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.doS(1);
            this.doF(1);
        }

    }

    this.doDw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.doE(1);
            this.doD(1);
        }

    }

    this.doLw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.doM(1);
            this.doL(1);
        }

    }

    this.doBw = function(times) {
        var i;
        for (i = 0; i < times; i++) {
            cubestate = this.cubestate;
            this.doS(3);
            this.doB(1);
        }

    }
}

  function obfuscate(algorithm, numPremoves=3, minLength=16, numPostmoves=0){
    var premoves = getPremoves(numPremoves);
    var postmoves = getPostmoves(numPostmoves);

    const rc = new RubiksCube();
    // Alg-Trainer expects `algorithm` to be a scramble. It inverts it internally.
    rc.doAlgorithm(postmoves + invertCompact(algorithm) + premoves);
    var o = rc.wcaOrient(); 
    ensureCubeSolver();
    var solution = rc.solution();

    var obAlg = moveRotationsToStart(premoves, o) + solution  + postmoves;
    obAlg = simplifyAlg(obAlg).replace(/2'/g, "2").trim();
    return obAlg.split(" ").length >= minLength ? obAlg : obfuscate(algorithm, numPremoves+1, minLength, numPostmoves);
  }

  function generatePreScrambleFromSolution(rawSolutionAlg, generatorCSV, times){
    const genArray = String(generatorCSV || '').split(',').filter(Boolean);
    let scramble = "";
    for (let i=0; i<times; i++){
      const rand = Math.floor(Math.random()*genArray.length);
      scramble += String(genArray[rand] || '').replace(/\s+/g,'').replace(/2'/g,'2');
    }
    scramble += invertCompact(rawSolutionAlg);
    return obfuscate(scramble);
  }

  return {
    obfuscate,
    invertCompact,
    generatePreScrambleFromSolution,
    simplifyAlg
  };
})();

async function generatePracticeScrambleText() {
  const raw = _pickRandomAlgFromSet(currentEvent);
  if (!raw) return '';

  // Practice events (OLL/PLL/ZBLS/ZBLL):
  // Use Alg-Trainer compatible "real scramble" generation for stability.
  // Keep case selection logic intact; only the conversion from case-alg -> scramble is swapped.
  let solAlg = _cleanAlg(raw).replace(/2'/g, '2');

  const ev = String(currentEvent || '').trim();
  let scramble = '';

  // Alg-Trainer preset generators
  const GEN_ZBLL = "RBR'FRB'R'F',RUR'URU2R',U,R'U'RU'R'U2R,F2U'R'LF2L'RU'F2";
  const GEN_PLL  = "R'FR'B2'RF'R'B2'R2,F2U'R'LF2RL'U'F2,U";

  if (ev === 'p_oll' || ev === 'p_pll') {
    // Alg-Trainer: OLL/PLL => PLL-style prescramble, then obfuscate
    scramble = PRACTICE_AT.generatePreScrambleFromSolution(solAlg, GEN_PLL, 100);
  } else if (ev === 'p_zbls' || ev === 'p_zbll') {
    // Alg-Trainer: ZBLS/ZBLL => heavier prescramble, then obfuscate
    scramble = PRACTICE_AT.generatePreScrambleFromSolution(solAlg, GEN_ZBLL, 1000);
  } else {
    // Fallback (shouldn't happen): mimic Alg-Trainer "obfuscate inverse"
    const baseScramble = PRACTICE_AT.invertCompact(solAlg);
    scramble = PRACTICE_AT.obfuscate(baseScramble);
  }

  // ZBLS hand mode (R/L): mirror the *scramble* (swap R/L and invert each token)
  // after generation for more stable results.
  if (ev === 'p_zbls' && practiceZblsHand === 'L') {
    scramble = _swapRLAndInvertAlgString(scramble).replace(/2'/g, '2');
  }

  return scramble;
}

const suffixes = ["", "'", "2"];
const orientations = ["x", "x'", "x2", "y", "y'", "y2", "z", "z'", "z2"];
const wideMoves = ["Uw", "Dw", "Lw", "Rw", "Fw", "Bw"]; 
function mapEventIdForCubing(eventId){
    // cubing.js / scramble-display uses WCA event IDs. Pyraminx is "pyram".
    if (isPracticeEvent(eventId)) return '333';
    if (eventId === 'pyra') return 'pyram';
    return eventId;
}
let cubeState = {};
const COLORS = { U: '#FFFFFF', D: '#FFD500', L: '#FF8C00', R: '#DC2626', F: '#16A34A', B: '#2563EB' };

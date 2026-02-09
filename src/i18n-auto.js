// Full-UI i18n helper
// 기존 HTML의 문구를 전부 data-i18n으로 바꾸지 않아도 되도록,
// 버튼/라벨/설명 등 고정 문구는 텍스트 매칭으로 일괄 번역합니다.
// (동적 값/숫자는 매칭되지 않도록 "완전 일치"만 처리)
const AUTO_I18N_PAIRS = [
  // Header / common
  { en: 'Backup', ko: '백업' },
  { en: 'Restore', ko: '복원' },
  { en: 'Close', ko: '닫기' },
  { en: 'Cancel', ko: '취소' },
  { en: 'Save', ko: '저장' },
  { en: 'Add', ko: '추가' },
  { en: 'Clear', ko: '초기화' },
  { en: 'Clear All', ko: '전체 삭제' },
  { en: 'Clear all history for this session?', ko: '이 세션의 기록을 모두 삭제할까요?' },
  { en: 'Timer', ko: '타이머' },
  { en: 'Stats', ko: '기록' },
  { en: 'History', ko: '기록' },
  { en: 'Settings', ko: '설정' },
  { en: 'Update Log', ko: '업데이트' },
  { en: 'Developer Log', ko: '개발자 로그' },
  { en: 'Event', ko: '종목' },
  { en: 'Scramble', ko: '스크램블' },
  { en: 'Tools', ko: '도구' },
  { en: 'Scramble Image', ko: '스크램블 이미지' },
  { en: 'Graph (Trends)', ko: '그래프(추세)' },
  { en: 'Visualizer for standard cubes only', ko: '기본 큐브 종목만 지원합니다' },

  // Bluetooth
  { en: 'Bluetooth Timer', ko: '블루투스 타이머' },
  { en: 'Connect your Gan Smart Timer', ko: 'Gan Smart Timer를 연결하세요' },
  { en: 'Device', ko: '기기' },
  { en: 'Connect Timer', ko: '타이머 연결' },
  { en: 'Disconnect', ko: '연결 해제' },

  // Sessions
  { en: 'Sessions', ko: '세션' },
  { en: 'Create New Session', ko: '새 세션 만들기' },
  { en: 'Session Name', ko: '세션 이름' },

  // MBF
  { en: 'Multi-Blind Scrambles', ko: '멀티블라인드 스크램블' },
  { en: 'Cubes', ko: '개' },
  { en: 'Copy All', ko: '전체 복사' },
  { en: 'MBF Result', ko: 'MBF 결과' },
  { en: 'WCA 형식(Attempted / Solved / Time)을 입력해 주세요.', ko: 'WCA 형식(시도 / 성공 / 시간)을 입력해 주세요.' },
  { en: 'Attempted', ko: '시도' },
  { en: 'Solved', ko: '성공' },
  { en: 'Time', ko: '시간' },
  { en: 'Enter number of cubes', ko: '큐브 개수 입력' },
  { en: 'e.g. 10', ko: '예: 10' },
  { en: 'mm:ss', ko: '분:초' },

  // Settings rows
  { en: 'Dark Mode', ko: '다크 모드' },
  { en: 'Prevent Sleep (Wake Lock)', ko: '화면 꺼짐 방지(Wake Lock)' },
  { en: 'Inspection', ko: '인스펙션' },
  { en: '15s countdown + voice', ko: '15초 카운트다운 + 음성' },
  { en: 'Hold Duration', ko: '홀드 시간' },
  { en: 'Average Mode', ko: '평균 모드' },
  { en: 'Manual Entry', ko: '수동 입력' },
  { en: 'Precision', ko: '소숫점' },
  { en: 'Account', ko: '계정' },
  { en: 'Login', ko: '로그인' },
  { en: 'Sign Up', ko: '가입' },
  { en: 'Forgot password?', ko: '비밀번호를 잊으셨나요?' },
  { en: 'Password', ko: '비밀번호' },
  { en: 'Email', ko: '이메일' },
  { en: 'Password reset email sent.', ko: '비밀번호 초기화 이메일이 발송되었습니다.' },

  // History footer
  { en: 'Avg of All', ko: '전체 평균' },
  { en: '(More)', ko: '(더보기)' },
  { en: 'Personal Best', ko: '개인 최고' },

  // Scramble status defaults
  { en: 'Generating...', ko: '생성 중…' },
  { en: 'Loading scramble…', ko: '스크램블 로딩 중…' },
  { en: 'Failed. Tap to retry.', ko: '실패. 탭해서 재시도' },
  { en: 'Hold to Ready', ko: '길게 눌러 Ready' },

  // Share / Settings
  { en: 'Save & Close', ko: '저장하고 닫기' },
  { en: 'Share Single', ko: '싱글 공유' },
  { en: 'Copy Text', ko: '텍스트 복사' },
  { en: 'Copied!', ko: '복사됨!' },
  { en: 'Date :', ko: '날짜 :' },
];

const AUTO_I18N_LOOKUP = (() => {
  const map = new Map();
  for (const p of AUTO_I18N_PAIRS) {
    map.set(p.en, p);
    map.set(p.ko, p);
  }
  return map;
})();

function applyAutoI18n(root = document) {
  // NOTE:
  // 기존 버전은 "자식 엘리먼트가 없는 요소"만 번역해서,
  // 아이콘(svg) + 텍스트 구조의 버튼/탭 라벨이 거의 번역되지 않았습니다.
  // -> 텍스트 노드(TreeWalker) 단위로 정확히 치환하도록 변경.
  if (!root) return;
  const targetLang = currentLang === 'ko' ? 'ko' : 'en';

  // Translate placeholders (inputs / textareas)
  try {
    const scope = root.querySelectorAll ? root : document;
    for (const el of scope.querySelectorAll('input[placeholder], textarea[placeholder]')) {
      const ph = (el.getAttribute('placeholder') || '').trim();
      const pair = AUTO_I18N_LOOKUP.get(ph);
      if (pair) el.setAttribute('placeholder', pair[targetLang]);
    }

    // Translate common label attributes
    for (const el of scope.querySelectorAll('[aria-label],[title]')) {
      const aria = (el.getAttribute('aria-label') || '').trim();
      const pairA = aria ? AUTO_I18N_LOOKUP.get(aria) : null;
      if (pairA) el.setAttribute('aria-label', pairA[targetLang]);
      const title = (el.getAttribute('title') || '').trim();
      const pairT = title ? AUTO_I18N_LOOKUP.get(title) : null;
      if (pairT) el.setAttribute('title', pairT[targetLang]);
    }

    // Translate visible value text on <input> buttons (value="...")
    for (const el of scope.querySelectorAll('input[value]')) {
      const type = (el.getAttribute('type') || '').toLowerCase();
      // Only touch value for button-like inputs to avoid corrupting user data.
      if (!['button', 'submit', 'reset'].includes(type)) continue;
      const v = (el.getAttribute('value') || '').trim();
      const pairV = v ? AUTO_I18N_LOOKUP.get(v) : null;
      if (pairV) el.setAttribute('value', pairV[targetLang]);
    }

    // Translate data-* label helpers if present
    for (const el of scope.querySelectorAll('[data-label]')) {
      const v = (el.getAttribute('data-label') || '').trim();
      const pairV = v ? AUTO_I18N_LOOKUP.get(v) : null;
      if (pairV) el.setAttribute('data-label', pairV[targetLang]);
    }
  } catch (_) {}

  // Translate text nodes (including buttons with svg + text)
  const walkerRoot = root.nodeType === 9 ? root.body : root; // document -> body
  if (!walkerRoot) return;

  const walker = document.createTreeWalker(
    walkerRoot,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node || !node.parentNode) return NodeFilter.FILTER_REJECT;
        const parent = node.parentNode;
        // Skip script/style/noscript
        const tag = (parent.tagName || '').toUpperCase();
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
        const txt = (node.nodeValue || '').trim();
        if (!txt) return NodeFilter.FILTER_REJECT;
        // Exact-match only (avoid touching dynamic numbers)
        if (!AUTO_I18N_LOOKUP.has(txt)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );

  let node;
  while ((node = walker.nextNode())) {
    const raw = (node.nodeValue || '');
    const trimmed = raw.trim();
    const pair = AUTO_I18N_LOOKUP.get(trimmed);
    if (!pair) continue;
    // Preserve leading/trailing whitespace
    const leading = raw.match(/^\s*/)?.[0] ?? '';
    const trailing = raw.match(/\s*$/)?.[0] ?? '';
    node.nodeValue = `${leading}${pair[targetLang]}${trailing}`;
  }
}

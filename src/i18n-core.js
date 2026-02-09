// i18n (Korean / English)
let currentLang = (localStorage.getItem('lang') || '').toLowerCase();
if (currentLang !== 'ko' && currentLang !== 'en') {
  const nav = (navigator.language || '').toLowerCase();
  currentLang = nav.startsWith('ko') ? 'ko' : 'en';
}
const I18N = {
  ko: {
    language: '언어',
    updateLog: '업데이트',
    latest: '최신',
    okGotIt: '확인',
    devLog: '개발자 로그',
    noDevLog: '현재 등록된 개발자 로그가 없습니다.',
    devSince: '시작:',
    scrambleLoading: '스크램블 로딩 중…',
    scrambleRetry: '실패. 탭해서 재시도',
    holdToReady: '길게 눌러 Ready',
    ready: 'Ready',
    running: 'RUNNING',
    stopped: 'STOPPED',
  },
  en: {
    language: 'Language',
    updateLog: 'Update Log',
    latest: 'Latest',
    okGotIt: 'Okay, got it!',
    devLog: 'Developer Log',
    noDevLog: 'No developer logs currently.',
    devSince: 'Since:',
    scrambleLoading: 'Loading scramble…',
    scrambleRetry: 'Failed. Tap to retry.',
    holdToReady: 'Hold to Ready',
    ready: 'Ready',
    running: 'RUNNING',
    stopped: 'STOPPED',
  }
};
function t(key) {
  const table = I18N[currentLang] || I18N.ko;
  return table[key] ?? key;
}


// Release Notes / Developer Log
const APP_VERSION = '2.1';
const RELEASE_NOTES = [
   {
    version: '2.1',
    date: '2026.02.09',
    items: {
      ko: [
        '연습용 종목 및 스크램블 추가',
        '테마 사용자 지정 기능 추가',
        '로그인 / 클라우드 저장 기능 추가',
        '기타 UI 개선',
      ],
      en: [
        'Added practice events and scrambles',
        'Added theme customization',
        'Added Login / Cloud Storage Feature',
        'Misc UI improvements',
      ]
    }
  },
  {
    version: '2.1',
    date: '2026.02.05',
    items: {
      ko: [
        '연습용 종목 및 스크램블 추가',
        '테마 사용자 지정 기능 추가',
        '기타 UI 개선',
      ],
      en: [
        'Added practice events and scrambles',
        'Added theme customization',
        'Misc UI improvements',
      ]
    }
  },
  {
    version: '2.1',
    date: '2026.02.05',
    items: {
      ko: [
        '연습용 종목 및 스크램블 추가',
        '테마 사용자 지정 기능 추가',
        '기타 UI 개선',
      ],
      en: [
        'Added practice events and scrambles',
        'Added theme customization',
        'Misc UI improvements',
      ]
    }
  },
  {
    version: '2',
    date: '2026.01.22',
    items: {
      ko: [
        'PC, 모바일 UI/UX 개편',
        '모든 종목에서 스크램블 시각화 지원',
        '멀티블라인드 스코어 입력 기능 추가',
        '한국어 지원',
        '스페이스바를 통한 측정 정확도 개선',
      ],
      en: [
        'PC & Mobile UI/UX overhaul',
        'Scramble visualization support for all events',
        'Multi-Blind score input feature added',
        'Korean language support',
        'Improved measurement accuracy using the spacebar',
      ]
    }
  },
  {
    version: '1.1.1',
    date: '2025.12.22',
    items: {
      ko: ['스페이스바를 통한 측정 불가 현상 수정'],
      en: ['Fixed issue where timing did not work via Space key'],
    }
  },
  {
    version: '1.1',
    date: '2025.12.21',
    items: {
      ko: ['모바일 UI 개선', '인스펙션 기능 추가 (설정 탭)', '간 타이머 로직 수정'],
      en: ['Improved mobile UI', 'Added WCA inspection (Settings)', 'Adjusted GAN timer logic'],
    }
  },
  {
    version: 'BETA',
    date: '2025.12.20',
    items: {
      ko: ['BETA 공개'],
      en: ['BETA release'],
    }
  }
];
const KNOWN_ISSUES = [
  {
    id: 'DL-001',
    title: {
      ko: '모바일 UI가 여전히 모바일친화적이지 않아 수정 계획중입니다.',
      en: 'Mobile UI is still not fully mobile-friendly; improvements are planned.',
    },
    status: 'planning',
    since: '2026.01.22'
  }
];

const loginTab = document.getElementById('accountTabLogin');
const signupTab = document.getElementById('accountTabSignup');
const loginView = document.getElementById('accountLoginView');
const signupView = document.getElementById('accountSignupView');
const accountMessage = document.getElementById('accountMessage');
const logoutBtn = document.getElementById('logoutBtn');
const loginSubmit = document.getElementById('loginSubmit');
const signupSubmit = document.getElementById('signupSubmit');
const passwordReset = document.getElementById('passwordReset');
const accountAuthViews = document.getElementById('accountAuthViews');
const accountDashboard = document.getElementById('accountDashboard');

const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupPasswordConfirm = document.getElementById('signupPasswordConfirm');

const dashboardEmail = document.getElementById('dashboardEmail');
const dashboardBackupAt = document.getElementById('dashboardBackupAt');
const dashboardBackupBtn = document.getElementById('dashboardBackupBtn');
const dashboardRestoreBtn = document.getElementById('dashboardRestoreBtn');
const currentPassword = document.getElementById('currentPassword');
const newPassword = document.getElementById('newPassword');
const newPasswordConfirm = document.getElementById('newPasswordConfirm');
const changePasswordBtn = document.getElementById('changePasswordBtn');

const LOCAL_BACKUP_KEY = 'cubeTimerData_v5';

function isKorean() {
  const lang = (localStorage.getItem('lang') || '').toLowerCase();
  if (lang === 'ko') return true;
  if (lang === 'en') return false;
  return (navigator.language || '').toLowerCase().startsWith('ko');
}

function t(en, ko) {
  return isKorean() ? ko : en;
}

function setAccountTab(tab) {
  const isLogin = tab === 'login';
  loginView.classList.toggle('hidden', !isLogin);
  signupView.classList.toggle('hidden', isLogin);

  loginTab.classList.toggle('bg-slate-800', isLogin);
  loginTab.classList.toggle('text-white', isLogin);
  loginTab.classList.toggle('bg-slate-100', !isLogin);
  loginTab.classList.toggle('dark:bg-slate-800', !isLogin);
  loginTab.classList.toggle('text-slate-600', !isLogin);
  loginTab.classList.toggle('dark:text-slate-300', !isLogin);

  signupTab.classList.toggle('bg-slate-800', !isLogin);
  signupTab.classList.toggle('text-white', !isLogin);
  signupTab.classList.toggle('bg-slate-100', isLogin);
  signupTab.classList.toggle('dark:bg-slate-800', isLogin);
  signupTab.classList.toggle('text-slate-600', isLogin);
  signupTab.classList.toggle('dark:text-slate-300', isLogin);
}

function showMessage(message, isError = false) {
  accountMessage.textContent = message || '';
  accountMessage.classList.toggle('text-red-500', isError);
  accountMessage.classList.toggle('text-slate-400', !isError);
  if (window.applyAutoI18n) {
    try { window.applyAutoI18n(accountMessage); } catch (_) {}
  }
}

function reportAccountError(context, err, fallbackMessage) {
  console.error(`[Account] ${context}`, err);
  showMessage((err && err.message) || fallbackMessage, true);
}

function toDateLabel(updatedAt) {
  try {
    if (!updatedAt) return t('No cloud backup yet.', '클라우드 백업 기록이 없습니다.');
    const d = typeof updatedAt.toDate === 'function' ? updatedAt.toDate() : new Date(updatedAt);
    if (!d || Number.isNaN(d.getTime())) return t('No cloud backup yet.', '클라우드 백업 기록이 없습니다.');
    return `${t('Last backup:', '최근 백업:')} ${d.toLocaleString()}`;
  } catch (_) {
    return t('No cloud backup yet.', '클라우드 백업 기록이 없습니다.');
  }
}

async function refreshBackupMeta(uid) {
  if (!uid || !window.firebaseDbApi || !window.firebaseDb) return;
  const { doc, getDoc } = window.firebaseDbApi;
  try {
    const ref = doc(window.firebaseDb, 'users', uid, 'backups', 'latest');
    const snapshot = await getDoc(ref);
    dashboardBackupAt.textContent = snapshot.exists()
      ? toDateLabel(snapshot.data()?.updatedAt)
      : t('No cloud backup yet.', '클라우드 백업 기록이 없습니다.');
  } catch (err) {
    console.error('[Account] Backup metadata load failed', err);
    dashboardBackupAt.textContent = t('Failed to load backup info.', '백업 정보를 불러오지 못했습니다.');
  }
}

function openPasswordResetModal() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4';
    overlay.innerHTML = `
      <div class="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl p-5">
        <p class="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Reset Password</p>
        <p class="text-[11px] font-bold text-slate-400 mb-3">Enter your account email.</p>
        <input type="email" id="resetEmailInput" placeholder="you@example.com" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-600 dark:text-slate-200 outline-none focus:border-blue-400 transition-all" />
        <div class="mt-4 grid grid-cols-2 gap-2">
          <button type="button" id="resetCancelBtn" class="py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black">Cancel</button>
          <button type="button" id="resetSendBtn" class="py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black">Send Reset Email</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    if (window.applyAutoI18n) {
      try { window.applyAutoI18n(overlay); } catch (_) {}
    }

    const input = overlay.querySelector('#resetEmailInput');
    const cancelBtn = overlay.querySelector('#resetCancelBtn');
    const sendBtn = overlay.querySelector('#resetSendBtn');

    const cleanup = (value) => {
      overlay.remove();
      resolve(value);
    };

    cancelBtn?.addEventListener('click', () => cleanup(null));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(null);
    });
    sendBtn?.addEventListener('click', () => {
      const email = (input?.value || '').trim();
      if (!email) {
        showMessage('Enter your account email.', true);
        return;
      }
      cleanup(email);
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendBtn?.click();
      if (e.key === 'Escape') cleanup(null);
    });

    input?.focus();
  });
}

function setLoggedInUI(user) {
  if (user) {
    logoutBtn.classList.remove('hidden');
    accountAuthViews.classList.add('hidden');
    accountDashboard.classList.remove('hidden');
    dashboardEmail.textContent = user.email || '-';
    refreshBackupMeta(user.uid);
  } else {
    logoutBtn.classList.add('hidden');
    accountAuthViews.classList.remove('hidden');
    accountDashboard.classList.add('hidden');
    setAccountTab('login');
  }
}

loginTab.addEventListener('click', () => setAccountTab('login'));
signupTab.addEventListener('click', () => setAccountTab('signup'));

async function initAccountPage() {
  const firebase = await (window.firebaseReady || Promise.resolve(null));
  if (!firebase || !window.firebaseAuthApi || !window.firebaseDbApi || !window.firebaseAuth || !window.firebaseDb) {
    reportAccountError('Firebase bootstrap failed', null, 'Firebase initialization failed. Reload and try again.');
    return;
  }

  const {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    onAuthStateChanged,
  } = window.firebaseAuthApi;
  const { doc, setDoc, serverTimestamp, getDoc } = window.firebaseDbApi;

  loginSubmit.addEventListener('click', async () => {
    showMessage('');
    const email = loginEmail.value.trim();
    const password = loginPassword.value.trim();
    if (!email || !password) {
      showMessage('Enter email and password.', true);
      return;
    }
    try {
      await signInWithEmailAndPassword(window.firebaseAuth, email, password);
      showMessage(t('Logged in.', '로그인되었습니다.'));
    } catch (err) {
      reportAccountError('Login failed', err, 'Login failed.');
    }
  });

  signupSubmit.addEventListener('click', async () => {
    showMessage('');
    const email = signupEmail.value.trim();
    const password = signupPassword.value.trim();
    const confirm = signupPasswordConfirm.value.trim();
    if (!email || !password || !confirm) {
      showMessage('Fill in all fields.', true);
      return;
    }
    if (password !== confirm) {
      showMessage('Passwords do not match.', true);
      return;
    }
    try {
      const result = await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
      await setDoc(doc(window.firebaseDb, 'users', result.user.uid), {
        email: result.user.email,
        createdAt: serverTimestamp(),
      }, { merge: true });
      showMessage(t('Account created.', '계정이 생성되었습니다.'));
    } catch (err) {
      reportAccountError('Signup failed', err, 'Sign up failed.');
    }
  });

  passwordReset.addEventListener('click', async () => {
    showMessage('');
    const email = await openPasswordResetModal();
    if (!email) return;
    try {
      await sendPasswordResetEmail(window.firebaseAuth, email);
      showMessage('Password reset email sent.');
    } catch (err) {
      reportAccountError('Password reset failed', err, 'Reset failed.');
    }
  });

  dashboardBackupBtn?.addEventListener('click', async () => {
    showMessage('');
    const user = window.firebaseAuth.currentUser;
    if (!user) {
      showMessage(t('Login required.', '로그인이 필요합니다.'), true);
      return;
    }
    const localRaw = localStorage.getItem(LOCAL_BACKUP_KEY);
    if (!localRaw) {
      showMessage(t('No local timer data to back up.', '백업할 로컬 타이머 데이터가 없습니다.'), true);
      return;
    }
    try {
      const parsed = JSON.parse(localRaw);
      const ref = doc(window.firebaseDb, 'users', user.uid, 'backups', 'latest');
      await setDoc(ref, {
        payload: JSON.stringify(parsed),
        updatedAt: serverTimestamp(),
        version: 1,
      }, { merge: true });
      await refreshBackupMeta(user.uid);
      showMessage(t('Backup saved to cloud.', '클라우드에 백업되었습니다.'));
    } catch (err) {
      reportAccountError('Dashboard backup failed', err, t('Cloud backup failed.', '클라우드 백업에 실패했습니다.'));
    }
  });

  dashboardRestoreBtn?.addEventListener('click', async () => {
    showMessage('');
    const user = window.firebaseAuth.currentUser;
    if (!user) {
      showMessage(t('Login required.', '로그인이 필요합니다.'), true);
      return;
    }
    try {
      const ref = doc(window.firebaseDb, 'users', user.uid, 'backups', 'latest');
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) {
        showMessage(t('No cloud backup found.', '클라우드 백업이 없습니다.'), true);
        return;
      }
      const data = snapshot.data();
      if (!data || !data.payload) {
        showMessage(t('Cloud backup is empty.', '클라우드 백업이 비어 있습니다.'), true);
        return;
      }
      const restored = JSON.parse(data.payload);
      localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(restored));
      showMessage(t('Restore complete. Open timer page to apply.', '복원이 완료되었습니다. 타이머 페이지에서 적용됩니다.'));
    } catch (err) {
      reportAccountError('Dashboard restore failed', err, t('Cloud restore failed.', '클라우드 복원에 실패했습니다.'));
    }
  });

  changePasswordBtn?.addEventListener('click', async () => {
    showMessage('');
    const user = window.firebaseAuth.currentUser;
    const oldPw = (currentPassword?.value || '').trim();
    const nextPw = (newPassword?.value || '').trim();
    const nextPwConfirm = (newPasswordConfirm?.value || '').trim();

    if (!user || !user.email) {
      showMessage(t('Login required.', '로그인이 필요합니다.'), true);
      return;
    }
    if (!oldPw || !nextPw || !nextPwConfirm) {
      showMessage(t('Fill in all password fields.', '비밀번호 항목을 모두 입력해 주세요.'), true);
      return;
    }
    if (nextPw !== nextPwConfirm) {
      showMessage(t('New passwords do not match.', '새 비밀번호가 일치하지 않습니다.'), true);
      return;
    }
    if (nextPw.length < 6) {
      showMessage(t('New password must be at least 6 characters.', '새 비밀번호는 6자 이상이어야 합니다.'), true);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, oldPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, nextPw);
      if (currentPassword) currentPassword.value = '';
      if (newPassword) newPassword.value = '';
      if (newPasswordConfirm) newPasswordConfirm.value = '';
      showMessage(t('Password updated successfully.', '비밀번호가 변경되었습니다.'));
    } catch (err) {
      reportAccountError('Password update failed', err, t('Failed to update password.', '비밀번호 변경에 실패했습니다.'));
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(window.firebaseAuth);
      showMessage(t('Logged out.', '로그아웃되었습니다.'));
    } catch (err) {
      reportAccountError('Logout failed', err, 'Logout failed.');
    }
  });

  onAuthStateChanged(window.firebaseAuth, (user) => {
    setLoggedInUI(user);
  });
}

initAccountPage();

if (window.applyAutoI18n) {
  try { window.applyAutoI18n(document); } catch (_) {}
}

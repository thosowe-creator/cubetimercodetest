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
const signupPasswordHint = document.getElementById('signupPasswordHint');

const dashboardEmail = document.getElementById('dashboardEmail');
const dashboardBackupAt = document.getElementById('dashboardBackupAt');
const dashboardBackupBtn = document.getElementById('dashboardBackupBtn');
const dashboardRestoreBtn = document.getElementById('dashboardRestoreBtn');
const autoSyncToggle = document.getElementById('autoSyncToggle');
const autoSyncRange = document.getElementById('autoSyncRange');
const autoSyncValue = document.getElementById('autoSyncValue');
const autoSyncHint = document.getElementById('autoSyncHint');
const currentPassword = document.getElementById('currentPassword');
const newPassword = document.getElementById('newPassword');
const newPasswordConfirm = document.getElementById('newPasswordConfirm');
const changePasswordBtn = document.getElementById('changePasswordBtn');

const LOCAL_BACKUP_KEY = 'cubeTimerData_v5';
const AUTO_SYNC_ENABLED_KEY = 'autoSyncEnabled';
const AUTO_SYNC_EVERY_KEY = 'autoSyncEvery';

function normalizeAutoSyncEvery(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 10;
  return Math.max(5, Math.min(50, Math.round(n / 5) * 5));
}

function isKorean() {
  const lang = (localStorage.getItem('lang') || '').toLowerCase();
  if (lang === 'ko') return true;
  if (lang === 'en') return false;
  return (navigator.language || '').toLowerCase().startsWith('ko');
}

function t(en, ko) {
  return isKorean() ? ko : en;
}

function getPasswordPolicyHintText() {
  return t(
    'For account security, include uppercase/lowercase English letters, at least one number, and at least one special character.',
    '계정 보안을 위해 비밀번호에 영문 대/소문자, 숫자 1개 이상, 특수문자 1개 이상을 포함해 주세요.'
  );
}

function isPasswordPolicySatisfied(password) {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasUpper && hasLower && hasDigit && hasSpecial;
}

function setAccountTab(tab) {
  const isLogin = tab === 'login';
  loginView.classList.toggle('hidden', !isLogin);
  signupView.classList.toggle('hidden', isLogin);

  loginTab.classList.toggle('account-tab-active', isLogin);
  loginTab.classList.toggle('account-tab-inactive', !isLogin);

  signupTab.classList.toggle('account-tab-active', !isLogin);
  signupTab.classList.toggle('account-tab-inactive', isLogin);
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

function setManualBackupButtonsDisabled(disabled) {
  [dashboardBackupBtn, dashboardRestoreBtn].forEach((btn) => {
    if (!btn) return;
    btn.disabled = disabled;
    btn.classList.toggle('opacity-50', disabled);
    btn.classList.toggle('cursor-not-allowed', disabled);
  });
}

function syncAutoSyncUi() {
  const enabled = !!autoSyncToggle?.checked;
  const every = normalizeAutoSyncEvery(autoSyncRange?.value);
  if (autoSyncRange) autoSyncRange.disabled = !enabled;
  if (autoSyncValue) autoSyncValue.textContent = t(`Every ${every} solves`, `${every}회마다 동기화`);
  if (autoSyncHint) {
    autoSyncHint.textContent = enabled
      ? t('Manual backup/restore are disabled while Auto Sync is on.', '자동 동기화가 켜져 있으면 수동 백업/복원은 비활성화됩니다.')
      : t('Manual backup/restore are enabled while Auto Sync is off.', '자동 동기화가 꺼져 있으면 수동 백업/복원을 사용할 수 있습니다.');
  }
  setManualBackupButtonsDisabled(enabled);
}

async function persistAutoSyncPreference() {
  const user = window.firebaseAuth?.currentUser;
  if (!user || !window.firebaseDbApi || !window.firebaseDb) return;
  const enabled = !!autoSyncToggle?.checked;
  const every = normalizeAutoSyncEvery(autoSyncRange?.value);
  localStorage.setItem(AUTO_SYNC_ENABLED_KEY, enabled ? '1' : '0');
  localStorage.setItem(AUTO_SYNC_EVERY_KEY, String(every));
  const { doc, setDoc, serverTimestamp } = window.firebaseDbApi;
  const userRef = doc(window.firebaseDb, 'users', user.uid);
  await setDoc(userRef, {
    autoSyncEnabled: enabled,
    autoSyncEvery: every,
    autoSyncUpdatedAt: serverTimestamp(),
  }, { merge: true });
}

async function refreshAutoSyncPreference(uid) {
  const localEnabled = localStorage.getItem(AUTO_SYNC_ENABLED_KEY) === '1';
  const localEvery = normalizeAutoSyncEvery(localStorage.getItem(AUTO_SYNC_EVERY_KEY));
  if (autoSyncToggle) autoSyncToggle.checked = localEnabled;
  if (autoSyncRange) autoSyncRange.value = String(localEvery);
  syncAutoSyncUi();

  if (!uid || !window.firebaseDbApi || !window.firebaseDb) return;

  try {
    const { doc, getDoc } = window.firebaseDbApi;
    const userRef = doc(window.firebaseDb, 'users', uid);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) return;
    const data = snapshot.data() || {};
    const enabled = !!data.autoSyncEnabled;
    const every = normalizeAutoSyncEvery(data.autoSyncEvery);
    if (autoSyncToggle) autoSyncToggle.checked = enabled;
    if (autoSyncRange) autoSyncRange.value = String(every);
    localStorage.setItem(AUTO_SYNC_ENABLED_KEY, enabled ? '1' : '0');
    localStorage.setItem(AUTO_SYNC_EVERY_KEY, String(every));
    syncAutoSyncUi();
  } catch (err) {
    console.error('[Account] Auto sync preference load failed', err);
  }
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
    const overlay = document.getElementById('passwordResetOverlay');
    const input = document.getElementById('resetEmailInput');
    const cancelBtn = document.getElementById('resetCancelBtn');
    const sendBtn = document.getElementById('resetSendBtn');
    if (!overlay || !input || !cancelBtn || !sendBtn) {
      resolve(null);
      return;
    }
    overlay.classList.add('active');
    input.value = loginEmail?.value?.trim() || '';

    const cleanup = (value) => {
      cancelBtn.removeEventListener('click', handleCancel);
      overlay.removeEventListener('click', handleOverlay);
      sendBtn.removeEventListener('click', handleSend);
      input.removeEventListener('keydown', handleKeydown);
      overlay.classList.remove('active');
      resolve(value);
    };

    const handleCancel = () => cleanup(null);
    const handleOverlay = (e) => {
      if (e.target === overlay) cleanup(null);
    };
    const handleSend = () => {
      const email = (input.value || '').trim();
      if (!email) {
        showMessage('Enter your account email.', true);
        return;
      }
      cleanup(email);
    };
    const handleKeydown = (e) => {
      if (e.key === 'Enter') handleSend();
      if (e.key === 'Escape') cleanup(null);
    };

    cancelBtn.addEventListener('click', handleCancel);
    overlay.addEventListener('click', handleOverlay);
    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', handleKeydown);
    input.focus();
  });
}

function setLoggedInUI(user) {
  if (user) {
    logoutBtn.classList.remove('hidden');
    accountAuthViews.classList.add('hidden');
    accountDashboard.classList.remove('hidden');
    dashboardEmail.textContent = user.email || '-';
    refreshBackupMeta(user.uid);
    refreshAutoSyncPreference(user.uid);
  } else {
    logoutBtn.classList.add('hidden');
    accountAuthViews.classList.remove('hidden');
    accountDashboard.classList.add('hidden');
    setAccountTab('login');
    if (autoSyncToggle) autoSyncToggle.checked = false;
    if (autoSyncRange) autoSyncRange.value = '10';
    syncAutoSyncUi();
  }
}

loginTab.addEventListener('click', () => setAccountTab('login'));
signupTab.addEventListener('click', () => setAccountTab('signup'));

async function initAccountPage() {
  syncAutoSyncUi();
  if (signupPasswordHint) {
    signupPasswordHint.textContent = getPasswordPolicyHintText();
  }
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
    if (!isPasswordPolicySatisfied(password)) {
      showMessage(getPasswordPolicyHintText(), true);
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

  autoSyncToggle?.addEventListener('change', async () => {
    syncAutoSyncUi();
    try {
      await persistAutoSyncPreference();
      showMessage(t('Auto sync setting saved.', '자동 동기화 설정이 저장되었습니다.'));
    } catch (err) {
      reportAccountError('Auto sync toggle save failed', err, t('Failed to save auto sync setting.', '자동 동기화 설정 저장에 실패했습니다.'));
    }
  });

  autoSyncRange?.addEventListener('input', () => {
    autoSyncRange.value = String(normalizeAutoSyncEvery(autoSyncRange.value));
    syncAutoSyncUi();
  });

  autoSyncRange?.addEventListener('change', async () => {
    syncAutoSyncUi();
    try {
      await persistAutoSyncPreference();
      showMessage(t('Auto sync frequency saved.', '자동 동기화 주기가 저장되었습니다.'));
    } catch (err) {
      reportAccountError('Auto sync range save failed', err, t('Failed to save auto sync frequency.', '자동 동기화 주기 저장에 실패했습니다.'));
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

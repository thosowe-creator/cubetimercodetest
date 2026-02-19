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

const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupPasswordConfirm = document.getElementById('signupPasswordConfirm');

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
  } else {
    logoutBtn.classList.add('hidden');
    accountAuthViews.classList.remove('hidden');
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

  const { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged } = window.firebaseAuthApi;
  const { doc, setDoc, serverTimestamp } = window.firebaseDbApi;

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
      showMessage('Logged in.');
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
      showMessage('Account created.');
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

  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(window.firebaseAuth);
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

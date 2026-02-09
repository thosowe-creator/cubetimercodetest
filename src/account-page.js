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
    showMessage(err.message || 'Login failed.', true);
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
    showMessage(err.message || 'Sign up failed.', true);
  }
});

passwordReset.addEventListener('click', async () => {
  showMessage('');
  const email = loginEmail.value.trim();
  if (!email) {
    showMessage('Enter your email first.', true);
    return;
  }
  try {
    await sendPasswordResetEmail(window.firebaseAuth, email);
    showMessage('Password reset email sent.');
  } catch (err) {
    showMessage(err.message || 'Reset failed.', true);
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(window.firebaseAuth);
  } catch (err) {
    showMessage(err.message || 'Logout failed.', true);
  }
});

onAuthStateChanged(window.firebaseAuth, (user) => {
  setLoggedInUI(user);
});

if (window.applyAutoI18n) {
  try { window.applyAutoI18n(document); } catch (_) {}
}

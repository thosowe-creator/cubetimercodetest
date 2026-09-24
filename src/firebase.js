import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCgmcfp1xHF9C-5705mfJDaujL3BaLkEs8",
  authDomain: "cubetimerdb.firebaseapp.com",
  projectId: "cubetimerdb",
  storageBucket: "cubetimerdb.firebasestorage.app",
  messagingSenderId: "1032993772532",
  appId: "1:1032993772532:web:5d2953aca5fa06da779fa1",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let resolveFirebaseReady;
window.firebaseReady = new Promise((resolve) => {
  resolveFirebaseReady = resolve;
});

window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseAuthReady = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    window.firebaseCurrentUser = user || null;
    resolve(user || null);
  });
});

window.firebaseAuthApi = {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
};
window.firebaseDbApi = {
  doc,
  setDoc,
  getDoc,
  runTransaction,
  serverTimestamp,
};

function cloudRevisionKey(uid) {
  return `cubeTimerCloudRevision:${uid}`;
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function markCloudRevisionSeen(uid, updatedAt) {
  const millis = timestampToMillis(updatedAt);
  if (uid && millis > 0) {
    localStorage.setItem(cloudRevisionKey(uid), String(millis));
    localStorage.removeItem('cubeTimerCloudConflict');
  }
}

async function writeLatestBackupSafely(user, backup) {
  if (!user) throw new Error('Authentication required');
  if (!user.emailVerified) throw new Error('Verified email required');
  const ref = doc(db, 'users', user.uid, 'backups', 'latest');
  const knownRevision = Number(localStorage.getItem(cloudRevisionKey(user.uid))) || 0;

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    const remoteRevision = snapshot.exists()
      ? timestampToMillis(snapshot.data()?.updatedAt)
      : 0;

    if (remoteRevision > knownRevision) {
      const conflict = new Error('A newer cloud backup exists. Restore it before backing up this device.');
      conflict.code = 'cloud-backup-conflict';
      throw conflict;
    }

    transaction.set(ref, {
      ...backup,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });

  const saved = await getDoc(ref);
  if (saved.exists()) markCloudRevisionSeen(user.uid, saved.data()?.updatedAt);
}

window.firebaseCloudApi = {
  writeLatestBackupSafely,
  markCloudRevisionSeen,
};


if (typeof resolveFirebaseReady === 'function') {
  resolveFirebaseReady({
    app,
    auth,
    db,
    authApi: window.firebaseAuthApi,
    dbApi: window.firebaseDbApi,
  });
}

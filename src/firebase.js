import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
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
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
};
window.firebaseDbApi = {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
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

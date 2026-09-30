// Firebase ist nur für Kontensynchronisierung erforderlich. Das Laden des SDKs
// läuft im Hintergrund, damit ein blockiertes CDN den Kalenderstart nicht stoppt.
let authSdk, firestoreSdk;
export let auth = null;
export let db = null;
export let firebaseAvailable = false;

const unavailable = () => Promise.reject(Object.assign(new Error('Firebase ist in diesem Browser nicht erreichbar. Änderungen bleiben auf diesem Gerät gespeichert.'), { code: 'firebase/unavailable' }));

export const firebaseReady = Promise.all([
  import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
]).then(([appSdk, loadedAuthSdk, loadedFirestoreSdk]) => {
  const app = appSdk.initializeApp({
    apiKey: 'AIzaSyA5x2cmUHLewZmJY0VYeb0Yvp3nol3nZDk',
    authDomain: 'learningapps-thomaeum.firebaseapp.com',
    projectId: 'learningapps-thomaeum',
    storageBucket: 'learningapps-thomaeum.firebasestorage.app',
    messagingSenderId: '325344785257',
    appId: '1:325344785257:web:ceec069f658002424a03f8'
  });
  authSdk = loadedAuthSdk;
  firestoreSdk = loadedFirestoreSdk;
  auth = authSdk.getAuth(app);
  db = firestoreSdk.getFirestore(app);
  firebaseAvailable = true;
}).catch(error => {
  console.warn('Firebase ist nicht erreichbar; der Fachkalender läuft lokal weiter.', error);
});

const authCall = name => (...args) => firebaseReady.then(() => firebaseAvailable ? authSdk[name](...args) : unavailable());
const firestoreCall = name => (...args) => firebaseReady.then(() => firebaseAvailable ? firestoreSdk[name](...args) : unavailable());

export const onAuthStateChanged = (instance, callback) => {
  let cancelled = false, unsubscribe = null;
  // Sofort freigeben: Die Oberfläche bleibt im lokalen Gastmodus, auch wenn
  // ein blockierter Netzwerkrequest nie mit einem Fehler beantwortet wird.
  queueMicrotask(() => { if (!cancelled) callback(null); });
  firebaseReady.then(() => {
    if (cancelled) return;
    if (firebaseAvailable) unsubscribe = authSdk.onAuthStateChanged(auth, callback);
  });
  return () => { cancelled = true; unsubscribe?.(); };
};

export const createUserWithEmailAndPassword = authCall('createUserWithEmailAndPassword');
export const signInWithEmailAndPassword = authCall('signInWithEmailAndPassword');
export const signOut = authCall('signOut');
export const sendEmailVerification = authCall('sendEmailVerification');
export const sendPasswordResetEmail = authCall('sendPasswordResetEmail');
export const reload = authCall('reload');
export const getIdToken = authCall('getIdToken');
export const doc = (...args) => firebaseAvailable ? firestoreSdk.doc(...args) : null;
export const getDoc = firestoreCall('getDoc');
export const setDoc = firestoreCall('setDoc');
export const serverTimestamp = () => firebaseAvailable ? firestoreSdk.serverTimestamp() : null;

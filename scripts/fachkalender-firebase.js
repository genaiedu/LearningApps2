// Firebase ist für Kontensynchronisierung optional. Wenn ein Browser das CDN
// blockiert oder offline ist, muss die lokale Kalenderplanung trotzdem starten.
let authSdk, firestoreSdk, firebaseAvailable = false;
export let auth = null;
export let db = null;

try {
  const [appSdk, loadedAuthSdk, loadedFirestoreSdk] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
  ]);
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
} catch (error) {
  console.warn('Firebase ist nicht erreichbar; der Fachkalender läuft lokal weiter.', error);
}

export { firebaseAvailable };
const unavailable = () => Promise.reject(Object.assign(new Error('Firebase ist in diesem Browser nicht erreichbar. Änderungen bleiben auf diesem Gerät gespeichert.'), { code: 'firebase/unavailable' }));
const authCall = name => (...args) => firebaseAvailable ? authSdk[name](...args) : unavailable();
const firestoreCall = name => (...args) => firebaseAvailable ? firestoreSdk[name](...args) : unavailable();

export const onAuthStateChanged = (instance, callback) => {
  if (firebaseAvailable) return authSdk.onAuthStateChanged(instance, callback);
  queueMicrotask(() => callback(null));
  return () => {};
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

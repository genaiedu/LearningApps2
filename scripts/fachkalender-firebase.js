import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification, sendPasswordResetEmail, reload, getIdToken } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

// Firebase Web-Konfiguration: für Browser-Apps bestimmt. Zugriffsrechte regeln
// ausschließlich Authentication und die veröffentlichten Firestore-Regeln.
const firebaseApp = initializeApp({
  apiKey: 'AIzaSyA5x2cmUHLewZmJY0VYeb0Yvp3nol3nZDk',
  authDomain: 'learningapps-thomaeum.firebaseapp.com',
  projectId: 'learningapps-thomaeum',
  storageBucket: 'learningapps-thomaeum.firebasestorage.app',
  messagingSenderId: '325344785257',
  appId: '1:325344785257:web:ceec069f658002424a03f8'
});

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification, sendPasswordResetEmail, reload, getIdToken, doc, getDoc, setDoc, onSnapshot, serverTimestamp };

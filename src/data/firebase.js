import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

/**
 * Firebase config is read from Vite env vars (VITE_FIREBASE_*).
 * See .env.example for the required keys.
 *
 * All values are considered public (they identify the project, not
 * secrets). Real security is enforced by Firestore rules + anonymous auth.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** True only when the app was built with real Firebase creds. */
export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let _app = null;
let _db = null;
let _auth = null;
let _authReadyPromise = null;

/** Idempotent app + Firestore + Auth init. Returns null if creds missing. */
export function getFirebase() {
  if (!firebaseEnabled) return null;
  if (!_app) {
    _app = getApps()[0] || initializeApp(firebaseConfig);
  }
  if (!_db) {
    _db = initializeFirestore(_app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  }
  if (!_auth) {
    _auth = getAuth(_app);
  }
  return { app: _app, db: _db, auth: _auth };
}

/** Ensures the current device is signed in anonymously and returns the uid. */
export function ensureAnonymousAuth() {
  if (!firebaseEnabled) return Promise.resolve(null);
  const { auth } = getFirebase();
  if (_authReadyPromise) return _authReadyPromise;
  _authReadyPromise = new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsub();
          resolve(user.uid);
        } else {
          signInAnonymously(auth).catch((err) => {
            unsub();
            reject(err);
          });
        }
      },
      (err) => {
        unsub();
        reject(err);
      }
    );
  });
  return _authReadyPromise;
}

/** Simple SHA-256 hex helper for PIN hashing. */
export async function hashPin(pin) {
  const enc = new TextEncoder().encode(String(pin ?? ''));
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Room codes: 5 chars, no confusing letters. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateRoomCode(len = 5) {
  let out = '';
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  return out;
}

export function generatePin(len = 4) {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < len; i++) out += String(buf[i] % 10);
  return out;
}

/**
 * Cloud layer (web) — Firebase Auth (Google) + Firestore history sync.
 *
 * This is the WEB implementation; `cloud.native.ts` provides matching no-op
 * stubs so native builds never bundle Firebase (Metro picks the .native file).
 * Everything degrades gracefully: with no Firebase config the app runs fully as
 * a local guest (isCloudConfigured() === false and the sign-in UI stays hidden).
 *
 * Config comes from EXPO_PUBLIC_FIREBASE_* env vars, embedded at build time.
 * These values are NOT secrets (a web Firebase config is public by design —
 * Firestore security rules protect the data, not the config).
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
} from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc, type Firestore } from 'firebase/firestore';
import type { ProgressBlob } from './db/store';

export interface CloudUser {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
}

const cfg = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** True only when the minimum Firebase config needed for auth + Firestore is present. */
export function isCloudConfigured(): boolean {
  return Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

function ensure(): { auth: Auth; db: Firestore } | null {
  if (!isCloudConfigured()) return null;
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(cfg);
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { auth: auth!, db: db! };
}

/** Idempotent — Firebase initializes lazily on first use; nothing to do eagerly. */
export function initCloud(): void {
  ensure();
}

/** Subscribe to sign-in state. Fires immediately with the current user (or null). */
export function subscribeAuth(cb: (user: CloudUser | null) => void): () => void {
  const c = ensure();
  if (!c) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(c.auth, (u) =>
    cb(u ? { uid: u.uid, name: u.displayName, email: u.email, photoURL: u.photoURL } : null),
  );
}

export async function signInWithGoogle(): Promise<void> {
  const c = ensure();
  if (!c) throw new Error('Cloud sign-in is not configured');
  const provider = new GoogleAuthProvider();
  await signInWithPopup(c.auth, provider);
}

export async function signOutUser(): Promise<void> {
  const c = ensure();
  if (!c) return;
  await signOut(c.auth);
}

/** Read a user's cloud progress blob, or null if they have none yet. */
export async function pullProgress(uid: string): Promise<Partial<ProgressBlob> | null> {
  const c = ensure();
  if (!c) return null;
  const snap = await getDoc(doc(c.db, 'users', uid));
  if (!snap.exists()) return null;
  const raw = snap.data()?.blob;
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as Partial<ProgressBlob>;
  } catch {
    return null;
  }
}

/** Write a user's progress blob (stored as a JSON string — Firestore-safe). */
export async function pushProgress(uid: string, blob: Omit<ProgressBlob, 'analytics'>): Promise<void> {
  const c = ensure();
  if (!c) return;
  await setDoc(doc(c.db, 'users', uid), { blob: JSON.stringify(blob), updatedAt: Date.now() });
}

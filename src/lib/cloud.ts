/**
 * Cloud layer (web) — Firebase Auth (Google) + Firestore history sync.
 *
 * This is the WEB implementation; `cloud.native.ts` provides matching no-op
 * stubs so native builds never bundle Firebase (Metro picks the .native file).
 * Everything degrades gracefully: with no Firebase config the app runs fully as
 * a local guest (isCloudConfigured() === false and the sign-in UI stays hidden).
 *
 * Firebase is loaded via dynamic import() on first use, so the (large) SDK
 * stays out of the initial web bundle entirely — and out of unconfigured
 * builds' network traffic too, since ensure() never imports it without config.
 *
 * Config comes from EXPO_PUBLIC_FIREBASE_* env vars, embedded at build time.
 * These values are NOT secrets (a web Firebase config is public by design —
 * Firestore security rules protect the data, not the config).
 */
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
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

interface Fire {
  auth: Auth;
  db: Firestore;
  fbAuth: typeof import('firebase/auth');
  fbFs: typeof import('firebase/firestore');
}

let firePromise: Promise<Fire | null> | null = null;

function ensure(): Promise<Fire | null> {
  if (!isCloudConfigured()) return Promise.resolve(null);
  if (!firePromise) {
    firePromise = (async () => {
      const [fbApp, fbAuth, fbFs] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const app = fbApp.getApps().length ? fbApp.getApps()[0]! : fbApp.initializeApp(cfg);
      return { auth: fbAuth.getAuth(app), db: fbFs.getFirestore(app), fbAuth, fbFs };
    })();
  }
  return firePromise;
}

/** Idempotent — kicks off the lazy SDK load so a returning session restores promptly. */
export function initCloud(): void {
  void ensure();
}

/** Subscribe to sign-in state. Fires with the current user (or null) once known. */
export function subscribeAuth(cb: (user: CloudUser | null) => void): () => void {
  let unsub: (() => void) | null = null;
  let cancelled = false;
  void ensure().then((c) => {
    if (!c) {
      cb(null);
      return;
    }
    if (cancelled) return;
    unsub = c.fbAuth.onAuthStateChanged(c.auth, (u) =>
      cb(u ? { uid: u.uid, name: u.displayName, email: u.email, photoURL: u.photoURL } : null),
    );
  });
  return () => {
    cancelled = true;
    unsub?.();
  };
}

export async function signInWithGoogle(): Promise<void> {
  const c = await ensure();
  if (!c) throw new Error('Cloud sign-in is not configured');
  const provider = new c.fbAuth.GoogleAuthProvider();
  await c.fbAuth.signInWithPopup(c.auth, provider);
}

export async function signOutUser(): Promise<void> {
  const c = await ensure();
  if (!c) return;
  await c.fbAuth.signOut(c.auth);
}

/** Read a user's cloud progress blob, or null if they have none yet. */
export async function pullProgress(uid: string): Promise<Partial<ProgressBlob> | null> {
  const c = await ensure();
  if (!c) return null;
  const snap = await c.fbFs.getDoc(c.fbFs.doc(c.db, 'users', uid));
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
  const c = await ensure();
  if (!c) return;
  await c.fbFs.setDoc(c.fbFs.doc(c.db, 'users', uid), {
    blob: JSON.stringify(blob),
    updatedAt: Date.now(),
  });
}

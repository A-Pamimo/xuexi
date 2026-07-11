/**
 * Cloud layer (native stub). Native builds are web-first for now: Google sign-in
 * on iOS/Android needs dev builds + native OAuth clients, which is a separate,
 * heavier setup. Until then native runs as a local guest — these no-ops keep
 * Firebase out of the native bundle while matching cloud.ts's signature exactly.
 */
import type { ProgressBlob } from './db/store';

export interface CloudUser {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
}

export function isCloudConfigured(): boolean {
  return false;
}

export function initCloud(): void {
  /* no-op on native */
}

export function subscribeAuth(cb: (user: CloudUser | null) => void): () => void {
  cb(null);
  return () => {};
}

export async function signInWithGoogle(): Promise<void> {
  throw new Error('Cloud sign-in is not available on native yet');
}

export async function signOutUser(): Promise<void> {
  /* no-op */
}

export async function pullProgress(_uid: string): Promise<Partial<ProgressBlob> | null> {
  return null;
}

export async function pushProgress(
  _uid: string,
  _blob: Omit<ProgressBlob, 'analytics'>,
): Promise<void> {
  /* no-op */
}

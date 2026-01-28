/**
 * Auth Service Switcher
 *
 * Automatically selects between Google Sheets auth and Supabase auth
 * based on VITE_USE_SUPABASE environment variable
 */

import type { User } from '../../types';

const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

// Log which backend is being used
if (USE_SUPABASE) {
  console.log('🟢 Using Supabase Auth (Google OAuth via Supabase)');
} else {
  console.log('🔵 Using Google Sheets Auth (Direct Google OAuth)');
}

// Lazy imports to avoid loading both modules
let supabaseAuth: typeof import('./supabaseAuth') | null = null;
let sheetsAuth: typeof import('../authService') | null = null;

async function getSupabaseAuth() {
  if (!supabaseAuth) {
    supabaseAuth = await import('./supabaseAuth');
  }
  return supabaseAuth;
}

async function getSheetsAuth() {
  if (!sheetsAuth) {
    sheetsAuth = await import('../authService');
  }
  return sheetsAuth;
}

// Export unified auth functions that delegate to the correct implementation

export async function initiateGoogleLogin(): Promise<string | void> {
  if (USE_SUPABASE) {
    const auth = await getSupabaseAuth();
    return auth.initiateGoogleLogin();
  }
  // Google Sheets doesn't have this - uses Google Sign-In button directly
  throw new Error('initiateGoogleLogin is only available with Supabase');
}

export async function getSession() {
  if (USE_SUPABASE) {
    const auth = await getSupabaseAuth();
    return auth.getSession();
  }
  return null;
}

export async function fetchUserRole(email: string, accessToken?: string): Promise<string> {
  if (USE_SUPABASE) {
    const auth = await getSupabaseAuth();
    return auth.fetchUserRole(email);
  } else {
    const auth = await getSheetsAuth();
    if (!accessToken) {
      throw new Error('accessToken is required for Google Sheets auth');
    }
    return auth.fetchUserRole(email, accessToken);
  }
}

export async function createUserFromSession(): Promise<User | null> {
  if (USE_SUPABASE) {
    const auth = await getSupabaseAuth();
    return auth.createUserFromSession();
  }
  return null;
}

export async function signOut(): Promise<void> {
  if (USE_SUPABASE) {
    const auth = await getSupabaseAuth();
    return auth.signOut();
  }
  // Google Sheets: just clear localStorage (handled by authStore)
}

export async function isAuthenticated(): Promise<boolean> {
  if (USE_SUPABASE) {
    const auth = await getSupabaseAuth();
    return auth.isAuthenticated();
  }
  return false;
}

// Re-export for Google Sheets auth (only used when USE_SUPABASE is false)
export async function decodeCredential(credential: string) {
  if (!USE_SUPABASE) {
    const auth = await getSheetsAuth();
    return auth.decodeCredential(credential);
  }
  throw new Error('decodeCredential is only available with Google Sheets auth');
}

export async function verifySheetAccess(accessToken: string) {
  if (!USE_SUPABASE) {
    const auth = await getSheetsAuth();
    return auth.verifySheetAccess(accessToken);
  }
  throw new Error('verifySheetAccess is only available with Google Sheets auth');
}

export async function createUser(credential: string, accessToken: string): Promise<User> {
  if (!USE_SUPABASE) {
    const auth = await getSheetsAuth();
    return auth.createUser(credential, accessToken);
  }
  throw new Error('createUser is only available with Google Sheets auth');
}

// Common type exports
export type { User } from '../../types';

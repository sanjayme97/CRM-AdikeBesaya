/**
 * Auth Service Switcher
 *
 * Automatically selects between Google Sheets auth and Supabase auth
 * based on VITE_USE_SUPABASE environment variable
 */

const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

if (USE_SUPABASE) {
  console.log('🟢 Using Supabase Auth (Google OAuth via Supabase)');

  // Re-export Supabase auth functions
  export {
    initiateGoogleLogin,
    getSession,
    fetchUserRole,
    createUserFromSession,
    signOut,
    isAuthenticated,
  } from './supabaseAuth';

} else {
  console.log('🔵 Using Google Sheets Auth (Direct Google OAuth)');

  // Re-export Google Sheets auth functions
  export {
    decodeCredential,
    fetchUserRole,
    verifySheetAccess,
    createUser,
  } from '../authService';
}

// Common type exports
export type { User } from '../../types';

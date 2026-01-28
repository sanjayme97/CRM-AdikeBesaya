/**
 * Supabase Authentication Service
 * Handles Google OAuth via Supabase Auth
 */

import { supabase } from '../supabase/client';
import type { User } from '../../types';

/**
 * Initiate Google OAuth login with Supabase
 * Returns redirect URL that should be opened
 */
export async function initiateGoogleLogin(): Promise<string> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw new Error(`OAuth initialization failed: ${error.message}`);
  }

  if (!data.url) {
    throw new Error('No OAuth URL received from Supabase');
  }

  return data.url;
}

/**
 * Get current session from Supabase
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Failed to get session: ${error.message}`);
  }

  return session;
}

/**
 * Fetch user role from Supabase users table
 */
export async function fetchUserRole(email: string): Promise<string> {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('email', email)
    .single();

  if (error) {
    // If user not found, return default role
    if (error.code === 'PGRST116') {
      console.warn(`User ${email} not found in users table, assigning default role`);
      return 'Field Agronomist';
    }
    throw new Error(`Failed to fetch user role: ${error.message}`);
  }

  return data.role || 'Field Agronomist';
}

/**
 * Check if user email is in allowed_users table
 */
async function checkUserAllowed(email: string): Promise<{ allowed: boolean; role?: string }> {
  const { data, error } = await supabase
    .from('allowed_users')
    .select('role, is_active')
    .eq('email', email)
    .eq('is_active', true)
    .single();

  if (error) {
    // User not found in allowlist
    if (error.code === 'PGRST116') {
      return { allowed: false };
    }
    throw new Error(`Failed to check user access: ${error.message}`);
  }

  return { allowed: true, role: data.role };
}

/**
 * Create User object from Supabase session
 */
export async function createUserFromSession(): Promise<User | null> {
  const session = await getSession();

  if (!session || !session.user) {
    return null;
  }

  const { user } = session;

  // Get user metadata from Google OAuth
  const email = user.email || '';
  const name = user.user_metadata?.full_name || user.user_metadata?.name || email;
  const picture = user.user_metadata?.avatar_url || user.user_metadata?.picture;

  // Check if user is in allowed_users table
  const { allowed, role } = await checkUserAllowed(email);

  if (!allowed) {
    // User is not authorized - sign them out immediately
    await signOut();
    throw new Error(
      'Access Denied: Your email address is not authorized to access this system. ' +
      'Please contact your manager to request access.'
    );
  }

  // User is allowed - create user object with their role
  return {
    email,
    name,
    picture,
    role: role || 'Field Agronomist',
  };
}

/**
 * Sign out from Supabase
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(`Sign out failed: ${error.message}`);
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

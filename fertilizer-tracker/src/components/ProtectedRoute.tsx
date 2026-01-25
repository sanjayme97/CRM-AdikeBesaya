/**
 * Protected Route Component
 *
 * Wraps routes that require authentication
 * Redirects to login if user not authenticated
 * Handles token refresh when 401 errors occur
 */

import { useEffect, useCallback, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import type { ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';
import { registerAuthCallbacks } from '../services/tokenService';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { isAuthenticated, signOut, setAccessToken } = useAuthStore();
  const resolveRef = useRef<((token: string | null) => void) | null>(null);

  // Silent login - used for token refresh
  // Uses prompt: 'none' to skip consent screen (user already granted permission)
  const silentLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      const newToken = tokenResponse.access_token;
      const expiresIn = tokenResponse.expires_in || 3600;
      if (newToken) {
        setAccessToken(newToken, expiresIn);
        // Resolve the pending promise with new token
        if (resolveRef.current) {
          resolveRef.current(newToken);
          resolveRef.current = null;
        }
      }
    },
    onError: () => {
      console.log('Silent login failed - user needs to re-authenticate');
      // Resolve with null to trigger logout immediately
      if (resolveRef.current) {
        resolveRef.current(null);
        resolveRef.current = null;
      }
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    prompt: 'none', // Skip consent screen - faster refresh
  });

  // Token refresh callback - returns promise that resolves with new token or null
  const handleTokenRefresh = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;

      // Trigger Google login (will call onSuccess or onError)
      silentLogin();

      // Timeout after 5 seconds - fail fast instead of leaving user waiting
      setTimeout(() => {
        if (resolveRef.current) {
          resolveRef.current(null);
          resolveRef.current = null;
        }
      }, 5000);
    });
  }, [silentLogin]);

  // Logout callback - accepts optional reason for logout
  const handleLogout = useCallback((reason?: 'session_expired') => {
    signOut(reason);
    navigate('/login');
  }, [signOut, navigate]);

  // Register callbacks on mount
  useEffect(() => {
    registerAuthCallbacks(handleTokenRefresh, handleLogout);
  }, [handleTokenRefresh, handleLogout]);

  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}

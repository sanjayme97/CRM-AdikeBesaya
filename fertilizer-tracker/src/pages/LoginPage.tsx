/**
 * Login Page
 *
 * Shows Google Sign In button
 * Handles OAuth flow and verifies Sheet access
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import type { TokenResponse } from '@react-oauth/google';
import { useAuthStore } from '../store/authStore';
import { verifySheetAccess, fetchUserRole } from '../services/authService';
import './LoginPage.css';

// Check which backend is being used
const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

// Dynamically import Supabase auth if needed
let supabaseAuth: any = null;
if (USE_SUPABASE) {
  import('../services/auth/supabaseAuth').then(module => {
    supabaseAuth = module;
  });
}

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser, setAccessToken, setLoading, isLoading, logoutReason, clearLogoutReason } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  // Show session expired message if user was logged out due to token expiration
  useEffect(() => {
    if (logoutReason === 'session_expired') {
      setError('Your session has expired. Please sign in again.');
      clearLogoutReason();
    }
  }, [logoutReason, clearLogoutReason]);

  // Google Sheets auth flow (using @react-oauth/google)
  const loginWithSheets = useGoogleLogin({
    onSuccess: async (tokenResponse: TokenResponse) => {
      setLoading(true);
      setError(null);

      try {
        const accessToken = tokenResponse.access_token;

        if (!accessToken) {
          throw new Error('No access token received');
        }

        // Verify user has access to the Google Sheet
        const hasAccess = await verifySheetAccess(accessToken);

        if (!hasAccess) {
          setError(
            'You do not have access to the Fertilizer Tracker sheet. ' +
            'Please contact your manager to get access.'
          );
          setLoading(false);
          return;
        }

        // Get user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userInfoResponse.ok) {
          throw new Error('Failed to fetch user info');
        }

        const userInfo = await userInfoResponse.json();

        // Fetch user role from Roles sheet
        const role = await fetchUserRole(userInfo.email, accessToken);

        // Create user object
        const user = {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          role,
        };

        // Save to store (include token expiration time)
        setUser(user);
        setAccessToken(accessToken, tokenResponse.expires_in);

        // Navigate to dashboard
        navigate('/dashboard');

      } catch (err) {
        console.error('Login error:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'An error occurred during login. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError('Google Sign In failed. Please try again.');
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
  });

  // Supabase auth flow (redirect-based OAuth)
  const loginWithSupabase = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!supabaseAuth) {
        throw new Error('Supabase auth module not loaded');
      }

      // Initiate OAuth redirect
      const redirectUrl = await supabaseAuth.initiateGoogleLogin();

      // Redirect to Google OAuth
      window.location.href = redirectUrl;

    } catch (err) {
      console.error('Supabase login error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred during login. Please try again.'
      );
      setLoading(false);
    }
  };

  // Unified login handler
  const handleLogin = () => {
    if (USE_SUPABASE) {
      loginWithSupabase();
    } else {
      loginWithSheets();
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <img src="/logo.jpg" alt="Adike Besaya" className="login-logo" />
          <h1>Adike Besaya</h1>
          <p>Sales & Field Visit Management System</p>
        </div>

        <div className="login-content">
          <h2>Sign In</h2>
          <p>Sign in with your Google account to continue</p>

          <div className="login-button">
            {isLoading ? (
              <div className="login-loading">
                <div className="login-spinner"></div>
                <p>Signing you in...</p>
              </div>
            ) : (
              <button onClick={handleLogin} className="google-signin-btn">
                <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                Sign in with Google
              </button>
            )}
          </div>

          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="login-footer">
          <p>
            By signing in, you agree to use this application in accordance with
            your company's data policies.
          </p>
        </div>
      </div>

    </div>
  );
}

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

      <style>{`
        .login-page {
          min-height: 100vh;
          min-height: 100dvh; /* Dynamic viewport height for mobile browsers */
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          box-sizing: border-box;
        }

        .login-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 450px;
          width: 100%;
          padding: 40px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .login-logo {
          width: 80px;
          height: 80px;
          object-fit: contain;
          border-radius: 12px;
          margin-bottom: 15px;
        }

        .login-header h1 {
          font-size: 28px;
          margin: 0 0 10px 0;
          color: #333;
        }

        .login-header p {
          font-size: 16px;
          color: #666;
          margin: 0;
        }

        .login-content {
          text-align: center;
          margin-bottom: 30px;
        }

        .login-content h2 {
          font-size: 24px;
          margin: 0 0 10px 0;
          color: #333;
        }

        .login-content > p {
          font-size: 14px;
          color: #666;
          margin: 0 0 30px 0;
        }

        .login-button {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .google-signin-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          color: #3c4043;
          border: 1px solid #dadce0;
          border-radius: 4px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 500;
          font-family: 'Roboto', arial, sans-serif;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .google-signin-btn:hover {
          background: #f8f9fa;
          border-color: #c6c6c6;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }

        .google-signin-btn:active {
          background: #f1f3f4;
        }

        .login-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px;
        }

        .login-loading p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .login-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f0f0f0;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 6px;
          padding: 12px;
          margin-top: 20px;
        }

        .error-message p {
          color: #c33;
          margin: 0;
          font-size: 14px;
        }

        .login-footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .login-footer p {
          font-size: 12px;
          color: #999;
          margin: 0;
          line-height: 1.5;
        }

        @media (max-width: 480px) {
          .login-page {
            padding: 16px;
          }

          .login-container {
            padding: 24px 20px;
          }

          .login-header {
            margin-bottom: 24px;
          }

          .login-logo {
            width: 70px;
            height: 70px;
          }

          .login-header h1 {
            font-size: 24px;
          }

          .login-header p {
            font-size: 14px;
          }

          .login-content {
            margin-bottom: 20px;
          }

          .login-content h2 {
            font-size: 20px;
          }

          .login-content > p {
            margin-bottom: 20px;
          }

          .login-footer {
            padding-top: 16px;
          }

          .login-footer p {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Session Expiry Warning Component
 *
 * Shows a warning banner when the user's session is about to expire.
 * Allows user to extend their session without losing form data.
 */

import { useState, useEffect, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '../store/authStore';

// Show warning 5 minutes before expiration
const WARNING_THRESHOLD_MS = 5 * 60 * 1000;
// Check every 30 seconds
const CHECK_INTERVAL_MS = 30 * 1000;

export function SessionExpiryWarning() {
  const { tokenExpiresAt, setAccessToken } = useAuthStore();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Google login for extending session
  const extendSession = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      const newToken = tokenResponse.access_token;
      const expiresIn = tokenResponse.expires_in || 3600;
      if (newToken) {
        setAccessToken(newToken, expiresIn);
        setIsRefreshing(false);
        setIsDismissed(false); // Reset dismissed state on successful refresh
      }
    },
    onError: () => {
      console.error('Failed to extend session');
      setIsRefreshing(false);
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
  });

  const handleExtendSession = useCallback(() => {
    setIsRefreshing(true);
    extendSession();
  }, [extendSession]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // Check token expiration periodically
  useEffect(() => {
    const checkExpiration = () => {
      if (!tokenExpiresAt) {
        setTimeRemaining(null);
        return;
      }

      const remaining = tokenExpiresAt - Date.now();

      if (remaining <= 0) {
        // Token already expired - will be handled by 401 interceptor
        setTimeRemaining(null);
      } else if (remaining <= WARNING_THRESHOLD_MS) {
        // Show warning
        setTimeRemaining(remaining);
        // Un-dismiss if we're getting close to expiration (< 1 minute)
        if (remaining < 60 * 1000) {
          setIsDismissed(false);
        }
      } else {
        // Not yet time to warn
        setTimeRemaining(null);
        setIsDismissed(false);
      }
    };

    // Check immediately
    checkExpiration();

    // Then check periodically
    const interval = setInterval(checkExpiration, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [tokenExpiresAt]);

  // Don't render if no warning needed or dismissed
  if (timeRemaining === null || isDismissed) {
    return null;
  }

  // Format time remaining
  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const timeString = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;

  return (
    <div className="session-expiry-warning">
      <div className="warning-content">
        <span className="warning-icon">⚠️</span>
        <span className="warning-text">
          Your session will expire in <strong>{timeString}</strong>
        </span>
        <button
          onClick={handleExtendSession}
          disabled={isRefreshing}
          className="extend-btn"
        >
          {isRefreshing ? 'Extending...' : 'Extend Session'}
        </button>
        <button onClick={handleDismiss} className="dismiss-btn">
          ✕
        </button>
      </div>

      <style>{`
        .session-expiry-warning {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 12px 20px;
          z-index: 9999;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .warning-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          max-width: 800px;
          margin: 0 auto;
        }

        .warning-icon {
          font-size: 20px;
        }

        .warning-text {
          font-size: 14px;
        }

        .warning-text strong {
          font-weight: 600;
        }

        .extend-btn {
          background: white;
          color: #d97706;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .extend-btn:hover:not(:disabled) {
          background: #fef3c7;
        }

        .extend-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .dismiss-btn {
          background: transparent;
          color: white;
          border: none;
          padding: 4px 8px;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .dismiss-btn:hover {
          opacity: 1;
        }

        @media (max-width: 600px) {
          .warning-content {
            flex-wrap: wrap;
            gap: 10px;
          }

          .warning-text {
            flex: 1 1 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}

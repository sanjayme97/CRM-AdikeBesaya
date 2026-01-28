/**
 * Auth Callback Page
 *
 * Handles OAuth redirect from Supabase
 * Extracts session and redirects to dashboard
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { createUserFromSession } from '../services/auth/supabaseAuth';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setUser, setLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      setLoading(true);

      try {
        // Get user from Supabase session
        const user = await createUserFromSession();

        if (!user) {
          throw new Error('No user session found');
        }

        // Save user to store
        setUser(user);

        // Redirect to dashboard
        navigate('/dashboard');

      } catch (err) {
        console.error('Auth callback error:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Authentication failed. Please try again.'
        );

        // Redirect to login after showing error
        setTimeout(() => {
          navigate('/login');
        }, 6000);

      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate, setUser, setLoading]);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        textAlign: 'center',
      }}>
        <div style={{
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '400px',
        }}>
          <h2 style={{ color: '#c33', margin: '0 0 10px 0' }}>Authentication Error</h2>
          <p style={{ color: '#c33', margin: '0' }}>{error}</p>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #f0f0f0',
        borderTop: '3px solid #667eea',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <p style={{ marginTop: '20px', color: '#666' }}>Completing sign in...</p>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * Authentication Store (Zustand)
 *
 * Manages authentication state: user info, tokens, login/logout
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  tokenExpiresAt: number | null; // Unix timestamp (ms) when token expires
  isAuthenticated: boolean;
  isLoading: boolean;
  logoutReason: 'manual' | 'session_expired' | null;

  // Actions
  setUser: (user: User) => void;
  setAccessToken: (token: string, expiresIn?: number) => void;
  signOut: (reason?: 'manual' | 'session_expired') => void;
  setLoading: (loading: boolean) => void;
  clearLogoutReason: () => void;
}

/**
 * Auth store with persistence
 * Saves to localStorage so user stays logged in on page refresh
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      accessToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      isLoading: false,
      logoutReason: null,

      // Set user after successful login
      setUser: (user) => set({ user, isAuthenticated: true }),

      // Set access token with optional expiration (Google tokens expire in 3600 seconds)
      setAccessToken: (token, expiresIn = 3600) =>
        set({
          accessToken: token,
          tokenExpiresAt: Date.now() + expiresIn * 1000,
        }),

      // Sign out - clear all auth data, optionally track reason
      signOut: (reason) =>
        set({
          user: null,
          accessToken: null,
          tokenExpiresAt: null,
          isAuthenticated: false,
          logoutReason: reason || 'manual',
        }),

      // Set loading state
      setLoading: (loading) => set({ isLoading: loading }),

      // Clear logout reason (after showing message)
      clearLogoutReason: () => set({ logoutReason: null }),
    }),
    {
      name: 'fertilizer-tracker-auth', // localStorage key
      // Only persist user, token, and expiry - not loading states
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        tokenExpiresAt: state.tokenExpiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

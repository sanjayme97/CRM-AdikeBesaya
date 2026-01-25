/**
 * Token Service
 *
 * Handles OAuth token refresh using Google's silent authentication
 * When access token expires (401 error), attempts to get a new token silently
 *
 * Uses Axios interceptors for automatic token injection and 401 handling
 */

import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

// Store the token refresh callback (set by ProtectedRoute)
let tokenRefreshCallback: (() => Promise<string | null>) | null = null;
let logoutCallback: ((reason?: 'session_expired') => void) | null = null;

/**
 * Register callbacks for token refresh and logout
 * Called from ProtectedRoute during initialization
 *
 * @param onRefresh - Function that attempts silent re-auth and returns new token
 * @param onLogout - Function that clears auth state and redirects to login
 */
export function registerAuthCallbacks(
  onRefresh: () => Promise<string | null>,
  onLogout: (reason?: 'session_expired') => void
): void {
  tokenRefreshCallback = onRefresh;
  logoutCallback = onLogout;
}

/**
 * Custom error class for authentication errors (401)
 */
export class AuthError extends Error {
  constructor(message: string = 'Session expired. Please login again.') {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Attempt to refresh the access token silently
 * Returns new token if successful, null if failed
 */
export async function refreshToken(): Promise<string | null> {
  if (!tokenRefreshCallback) {
    console.warn('Token refresh callback not registered');
    return null;
  }

  try {
    const newToken = await tokenRefreshCallback();
    return newToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

/**
 * Trigger logout (clears auth state and redirects to login)
 * @param reason - Optional reason for logout ('session_expired' for 401 errors)
 */
export function triggerLogout(reason?: 'session_expired'): void {
  if (logoutCallback) {
    logoutCallback(reason);
  }
}

// ============================================================================
// AXIOS INSTANCE WITH INTERCEPTORS
// ============================================================================

const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;

/**
 * Axios instance for Google Sheets API calls
 * Automatically adds access token and handles 401 errors
 */
export const sheetsApi = axios.create({
  baseURL: `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - adds access token to all requests
 */
sheetsApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get current access token from auth store
    const accessToken = useAuthStore.getState().accessToken;

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Flag to prevent multiple refresh attempts simultaneously
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Subscribe to token refresh - queued requests wait for new token
 */
function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers with new token
 */
function onTokenRefreshed(newToken: string): void {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

/**
 * Response interceptor - handles 401 errors with token refresh
 */
sheetsApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Check if it's a 401 error and we haven't already retried
    if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(sheetsApi(originalRequest));
          });
        });
      }

      (originalRequest as any)._retry = true;
      isRefreshing = true;

      console.log('401 Unauthorized - attempting token refresh...');

      try {
        const newToken = await refreshToken();

        if (newToken) {
          console.log('Token refreshed successfully, retrying request...');

          // Update the store with new token
          useAuthStore.getState().setAccessToken(newToken);

          // Notify queued requests
          onTokenRefreshed(newToken);
          isRefreshing = false;

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return sheetsApi(originalRequest);
        }

        // Refresh failed
        throw new AuthError();
      } catch (refreshError) {
        isRefreshing = false;
        console.log('Token refresh failed - logging out');
        triggerLogout('session_expired');
        return Promise.reject(new AuthError());
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Axios instance for Google Visualization API (query endpoint)
 * Uses different base URL and passes token in URL params
 */
export const sheetsQueryApi = axios.create({
  baseURL: `https://docs.google.com/spreadsheets/d/${SHEET_ID}`,
});

/**
 * Request interceptor for query API - adds token to URL params
 */
sheetsQueryApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().accessToken;

    // For gviz/tq endpoint, token goes in URL params
    if (accessToken && config.url) {
      const separator = config.url.includes('?') ? '&' : '?';
      config.url = `${config.url}${separator}access_token=${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor for query API - handles 401 errors
 */
sheetsQueryApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            // Update URL with new token
            if (originalRequest.url) {
              originalRequest.url = originalRequest.url.replace(
                /access_token=[^&]*/,
                `access_token=${newToken}`
              );
            }
            resolve(sheetsQueryApi(originalRequest));
          });
        });
      }

      (originalRequest as any)._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshToken();

        if (newToken) {
          useAuthStore.getState().setAccessToken(newToken);
          onTokenRefreshed(newToken);
          isRefreshing = false;

          // Update URL with new token
          if (originalRequest.url) {
            originalRequest.url = originalRequest.url.replace(
              /access_token=[^&]*/,
              `access_token=${newToken}`
            );
          }
          return sheetsQueryApi(originalRequest);
        }

        throw new AuthError();
      } catch (refreshError) {
        isRefreshing = false;
        triggerLogout('session_expired');
        return Promise.reject(new AuthError());
      }
    }

    return Promise.reject(error);
  }
);

// Legacy exports for backward compatibility (can be removed later)
export async function fetchWithAuth(
  url: string,
  options: RequestInit,
  accessToken: string
): Promise<Response> {
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    console.log('401 Unauthorized - attempting token refresh...');
    const newToken = await refreshToken();

    if (newToken) {
      const retryHeaders = {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
      };
      return fetch(url, { ...options, headers: retryHeaders });
    }

    triggerLogout('session_expired');
    throw new AuthError();
  }

  return response;
}

/**
 * Authentication Service
 *
 * Handles Google OAuth authentication using @react-oauth/google
 */

import type { User } from '../types';

/**
 * Decodes JWT token to get user information
 * Google OAuth returns a JWT token with user info
 */
export function decodeCredential(credential: string): {
  email: string;
  name: string;
  picture?: string;
} {
  // JWT is base64 encoded, format: header.payload.signature
  const parts = credential.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid credential format');
  }

  // Decode the payload (middle part)
  const payload = parts[1];
  const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  const userInfo = JSON.parse(decoded);

  return {
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
  };
}

/**
 * Fetches user role from Roles sheet in Google Sheets
 *
 * @param email - User's email address
 * @param accessToken - Google OAuth access token
 * @returns User's role string
 */
export async function fetchUserRole(
  email: string,
  accessToken: string
): Promise<string> {
  const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;

  try {
    // Read Roles sheet (columns: Email, Role)
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Roles!A:B`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch roles: ${response.statusText}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    // Skip header row, find user's email
    for (let i = 1; i < rows.length; i++) {
      const [roleEmail, role] = rows[i];
      if (roleEmail?.toLowerCase() === email.toLowerCase()) {
        return role || 'Field Agronomist'; // Default role
      }
    }

    // If user not found in Roles sheet, assign default role
    console.warn(`User ${email} not found in Roles sheet, assigning default role`);
    return 'Field Agronomist';

  } catch (error) {
    console.error('Error fetching user role:', error);
    // On error, return default role (fail gracefully)
    return 'Field Agronomist';
  }
}

/**
 * Verifies user has access to the Google Sheet
 *
 * @param accessToken - Google OAuth access token
 * @returns true if user has access, false otherwise
 */
export async function verifySheetAccess(accessToken: string): Promise<boolean> {
  const sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;

  try {
    // Try to read just the sheet title (minimal permission check)
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // If 403 (Forbidden) or 404 (Not Found), user doesn't have access
    if (response.status === 403 || response.status === 404) {
      return false;
    }

    return response.ok;

  } catch (error) {
    console.error('Error verifying sheet access:', error);
    return false;
  }
}

/**
 * Creates a User object from OAuth credential and role
 */
export async function createUser(
  credential: string,
  accessToken: string
): Promise<User> {
  // Decode JWT to get user info
  const { email, name, picture } = decodeCredential(credential);

  // Fetch user's role from Roles sheet
  const role = await fetchUserRole(email, accessToken);

  return {
    email,
    name,
    picture,
    role,
  };
}

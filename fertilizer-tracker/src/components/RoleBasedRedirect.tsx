/**
 * Role-Based Redirect Component
 * Redirects users to their default page based on role
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getDefaultPageForRole, type UserRole } from '../config/roles';

export function RoleBasedRedirect() {
  const { user } = useAuthStore();

  if (!user) {
    // Not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Redirect to user's default page based on role
  const defaultPage = getDefaultPageForRole(user.role as UserRole);
  return <Navigate to={defaultPage} replace />;
}

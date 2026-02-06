/**
 * Role-Protected Route Component
 *
 * Wraps ProtectedRoute and adds role-based access control
 * Redirects unauthorized users to their default page
 */

import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';
import { ProtectedRoute } from './ProtectedRoute';
import { hasPageAccess, getDefaultPageForRole, type PageRoute, type UserRole } from '../config/roles';

interface RoleProtectedRouteProps {
  children: ReactNode;
  requiredPage: PageRoute;
}

export function RoleProtectedRoute({ children, requiredPage }: RoleProtectedRouteProps) {
  const { user } = useAuthStore();

  return (
    <ProtectedRoute>
      {user && !hasPageAccess(user.role as UserRole, requiredPage) ? (
        // User doesn't have access - redirect to their default page
        <Navigate to={getDefaultPageForRole(user.role as UserRole)} replace />
      ) : (
        // User has access - render the page
        <>{children}</>
      )}
    </ProtectedRoute>
  );
}

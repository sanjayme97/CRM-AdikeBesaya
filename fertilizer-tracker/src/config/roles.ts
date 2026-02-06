/**
 * Role-Based Access Control (RBAC) Configuration
 * Defines which roles can access which pages
 */

export type UserRole = 'Field Agronomist' | 'Sales Executive' | 'Manager';

export type PageRoute =
  | '/dashboard'
  | '/leads'
  | '/visits'
  | '/quotations'
  | '/payments';

/**
 * Role permissions for each page
 * true = full access, false = no access
 */
export const ROLE_PERMISSIONS: Record<PageRoute, UserRole[]> = {
  '/dashboard': ['Sales Executive', 'Manager'],
  '/leads': ['Field Agronomist', 'Sales Executive', 'Manager'],
  '/visits': ['Field Agronomist', 'Sales Executive', 'Manager'],
  '/quotations': ['Sales Executive', 'Manager'],
  '/payments': ['Sales Executive', 'Manager'],
};

/**
 * Check if a role has access to a specific page
 */
export function hasPageAccess(role: UserRole, page: PageRoute): boolean {
  return ROLE_PERMISSIONS[page]?.includes(role) ?? false;
}

/**
 * Get all accessible pages for a role
 */
export function getAccessiblePages(role: UserRole): PageRoute[] {
  return Object.entries(ROLE_PERMISSIONS)
    .filter(([_page, allowedRoles]) => allowedRoles.includes(role))
    .map(([page]) => page as PageRoute);
}

/**
 * Get redirect path when user doesn't have access
 * Managers → Dashboard
 * Sales Executive → Quotations
 * Field Agronomist → Leads
 */
export function getDefaultPageForRole(role: UserRole): PageRoute {
  switch (role) {
    case 'Manager':
      return '/dashboard';
    case 'Sales Executive':
      return '/quotations';
    case 'Field Agronomist':
      return '/leads';
    default:
      return '/dashboard';
  }
}

/**
 * Navigation items configuration
 */
export interface NavItem {
  path: PageRoute;
  label: string;
  icon?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/leads', label: 'Leads' },
  { path: '/visits', label: 'Field Visits' },
  { path: '/quotations', label: 'Quotations' },
  { path: '/payments', label: 'Payments' },
];

/**
 * Get navigation items accessible to a role
 */
export function getAccessibleNavItems(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter(item => hasPageAccess(role, item.path));
}

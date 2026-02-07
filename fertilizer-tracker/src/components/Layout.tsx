/**
 * Main Layout Component
 *
 * Provides consistent header with navigation tabs and user menu
 * Used across all authenticated pages
 * Supports swipe gestures for mobile navigation
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useModalStore } from '../store/modalStore';
import { useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { getAccessibleNavItems, type UserRole} from '../config/roles';
import { AskDatabase } from './AskDatabase';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const isModalOpen = useModalStore((state) => state.isModalOpen);

  // Get accessible navigation items based on user's role
  const accessibleNavItems = useMemo(() => {
    if (!user) return [];
    return getAccessibleNavItems(user.role as UserRole);
  }, [user]);

  // Get accessible tabs for swipe navigation
  const accessibleTabs = useMemo(() => {
    return accessibleNavItems.map(item => item.path);
  }, [accessibleNavItems]);

  const isActive = (path: string) => location.pathname === path;

  // Swipe gesture state
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const mainContentRef = useRef<HTMLElement>(null);

  // Get current tab index (from accessible tabs only)
  const getCurrentTabIndex = useCallback(() => {
    return accessibleTabs.findIndex(tab => location.pathname === tab);
  }, [location.pathname, accessibleTabs]);

  // Handle swipe navigation
  const handleSwipe = useCallback(() => {
    // Don't navigate when modal is open
    if (isModalOpen) return;

    const swipeThreshold = 50; // Minimum swipe distance
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;

    // Only trigger horizontal swipe if it's primarily horizontal (not vertical scrolling)
    if (Math.abs(diffX) < swipeThreshold) return;
    if (Math.abs(diffY) > Math.abs(diffX)) return; // Vertical swipe, ignore

    const currentIndex = getCurrentTabIndex();
    if (currentIndex === -1) return;

    if (diffX > 0 && currentIndex < accessibleTabs.length - 1) {
      // Swipe left - go to next tab
      navigate(accessibleTabs[currentIndex + 1]);
    } else if (diffX < 0 && currentIndex > 0) {
      // Swipe right - go to previous tab
      navigate(accessibleTabs[currentIndex - 1]);
    }
  }, [getCurrentTabIndex, navigate, isModalOpen, accessibleTabs]);

  // Touch event handlers
  useEffect(() => {
    const mainContent = mainContentRef.current;
    if (!mainContent) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX.current = e.changedTouches[0].clientX;
      touchEndY.current = e.changedTouches[0].clientY;
      handleSwipe();
    };

    mainContent.addEventListener('touchstart', handleTouchStart, { passive: true });
    mainContent.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      mainContent.removeEventListener('touchstart', handleTouchStart);
      mainContent.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleSwipe]);

  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <img src="/logo.jpg" alt="Adike Besaya" className="logo-img" />
            <span>Adike Besaya</span>
          </div>
          <nav className="nav-tabs">
            {accessibleNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-tab ${isActive(item.path) ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="header-right">
          {user?.picture && (
            <img src={user.picture} alt={user.name} className="user-avatar" />
          )}
          <div className="user-info">
            <p className="user-name">{user?.name}</p>
            <p className="user-role">{user?.role}</p>
          </div>
          <button onClick={() => signOut('manual')} className="sign-out-btn">
            Sign Out
          </button>
        </div>
      </header>

      <main className="main-content" ref={mainContentRef}>
        {children}
        <footer className="app-footer">
          Developed by <span className="brand-name">HexagonalPlane</span>
        </footer>
      </main>

      <AskDatabase />
    </div>
  );
}

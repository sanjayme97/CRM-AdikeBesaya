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
import { useRef, useEffect, useCallback, type ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

// Navigation tabs in order
const NAV_TABS = [
  '/dashboard',
  '/leads',
  '/visits',
  '/quotations',
  '/payments',
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const isModalOpen = useModalStore((state) => state.isModalOpen);

  const isActive = (path: string) => location.pathname === path;

  // Swipe gesture state
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const mainContentRef = useRef<HTMLElement>(null);

  // Get current tab index
  const getCurrentTabIndex = useCallback(() => {
    return NAV_TABS.findIndex(tab => location.pathname === tab);
  }, [location.pathname]);

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

    if (diffX > 0 && currentIndex < NAV_TABS.length - 1) {
      // Swipe left - go to next tab
      navigate(NAV_TABS[currentIndex + 1]);
    } else if (diffX < 0 && currentIndex > 0) {
      // Swipe right - go to previous tab
      navigate(NAV_TABS[currentIndex - 1]);
    }
  }, [getCurrentTabIndex, navigate, isModalOpen]);

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
            <Link
              to="/dashboard"
              className={`nav-tab ${isActive('/dashboard') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
            <Link
              to="/leads"
              className={`nav-tab ${isActive('/leads') ? 'active' : ''}`}
            >
              Leads
            </Link>
            <Link
              to="/visits"
              className={`nav-tab ${isActive('/visits') ? 'active' : ''}`}
            >
              Visits
            </Link>
            <Link
              to="/quotations"
              className={`nav-tab ${isActive('/quotations') ? 'active' : ''}`}
            >
              Quotations
            </Link>
            <Link
              to="/payments"
              className={`nav-tab ${isActive('/payments') ? 'active' : ''}`}
            >
              Payments
            </Link>
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

      <style>{`
        .layout {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f5f5f5;
          overflow: hidden;
        }

        .header {
          flex-shrink: 0;
          z-index: 100;
          background: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 40px;
          height: 70px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 30px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .logo-img {
          width: 40px;
          height: 40px;
          object-fit: contain;
          border-radius: 6px;
        }

        .nav-tabs {
          display: flex;
          gap: 5px;
        }

        .nav-tab {
          padding: 10px 20px;
          text-decoration: none;
          color: #666;
          font-weight: 500;
          font-size: 14px;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .nav-tab:hover {
          background: #f0f0f0;
          color: #333;
        }

        .nav-tab.active {
          background: #667eea;
          color: white;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
        }

        .user-info {
          text-align: right;
        }

        .user-name {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .user-role {
          margin: 0;
          font-size: 12px;
          color: #666;
        }

        .sign-out-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .sign-out-btn:hover {
          background: #5568d3;
        }

        .main-content {
          flex: 1;
          padding: 30px 40px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow-y: auto;
        }

        .app-footer {
          text-align: center;
          padding: 20px;
          margin-top: 40px;
          font-size: 12px;
          color: #999;
        }

        .app-footer .brand-name {
          color: #667eea;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .layout {
            padding-bottom: 65px; /* Space for bottom nav */
          }

          .header {
            flex-direction: row;
            height: 60px;
            padding: 0 15px;
            gap: 10px;
          }

          .header-left {
            flex: 1;
          }

          .logo span {
            display: inline; /* Show text on mobile */
            font-size: 16px;
          }

          .logo-img {
            width: 36px;
            height: 36px;
          }

          /* Hide nav tabs in header on mobile */
          .nav-tabs {
            display: none;
          }

          .header-right {
            gap: 10px;
          }

          .user-info {
            display: none; /* Hide user info on mobile */
          }

          .user-avatar {
            width: 32px;
            height: 32px;
          }

          .sign-out-btn {
            padding: 6px 12px;
            font-size: 12px;
          }

          .main-content {
            padding: 15px;
            padding-bottom: 80px; /* Extra space for bottom nav */
          }
        }

        /* Mobile Bottom Navigation */
        @media (max-width: 768px) {
          .nav-tabs {
            display: flex !important;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
            padding: 8px 5px;
            justify-content: space-around;
            z-index: 1000;
            gap: 2px;
          }

          .nav-tab {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 8px 4px;
            font-size: 11px;
            border-radius: 8px;
            text-align: center;
            min-width: 0;
          }

          .nav-tab.active {
            background: #667eea;
            color: white;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Loading Spinner Component
 *
 * Displays a centered loading spinner with optional message
 * Used across pages during data fetching
 */

import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  message?: string;
  fullPage?: boolean; // If true, centers in the full viewport
}

export function LoadingSpinner({ message = 'Loading...', fullPage = false }: LoadingSpinnerProps) {
  return (
    <div className={`loading-container ${fullPage ? 'full-page' : ''}`}>
      <div className="spinner"></div>
      <p className="loading-message">{message}</p>

    </div>
  );
}

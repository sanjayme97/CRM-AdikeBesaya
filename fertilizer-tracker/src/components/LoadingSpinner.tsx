/**
 * Loading Spinner Component
 *
 * Displays a centered loading spinner with optional message
 * Used across pages during data fetching
 */

interface LoadingSpinnerProps {
  message?: string;
  fullPage?: boolean; // If true, centers in the full viewport
}

export function LoadingSpinner({ message = 'Loading...', fullPage = false }: LoadingSpinnerProps) {
  return (
    <div className={`loading-container ${fullPage ? 'full-page' : ''}`}>
      <div className="spinner"></div>
      <p className="loading-message">{message}</p>

      <style>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 16px;
        }

        .loading-container.full-page {
          min-height: 50vh;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e9ecef;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-message {
          margin: 0;
          font-size: 16px;
          color: #666;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

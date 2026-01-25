import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { LeadsPage } from './pages/LeadsPage';
import { FieldVisitsPage } from './pages/FieldVisitsPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SessionExpiryWarning } from './components/SessionExpiryWarning';

function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Configuration Error</h1>
        <p>Missing VITE_GOOGLE_CLIENT_ID in .env file</p>
        <p>Please follow the setup guide in docs/google-cloud-setup.md</p>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <BrowserRouter>
        <SessionExpiryWarning />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leads"
            element={
              <ProtectedRoute>
                <LeadsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/visits"
            element={
              <ProtectedRoute>
                <FieldVisitsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/quotations"
            element={
              <ProtectedRoute>
                <QuotationsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <PaymentsPage />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;

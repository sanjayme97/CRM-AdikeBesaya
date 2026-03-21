import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { DashboardPage } from './pages/DashboardPage';
import { LeadsPage } from './pages/LeadsPage';
import { FieldVisitsPage } from './pages/FieldVisitsPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ProductsPage } from './pages/ProductsPage';
import { UsersPage } from './pages/UsersPage';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { RoleBasedRedirect } from './components/RoleBasedRedirect';
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
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <RoleProtectedRoute requiredPage="/dashboard">
                <DashboardPage />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/leads"
            element={
              <RoleProtectedRoute requiredPage="/leads">
                <LeadsPage />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/visits"
            element={
              <RoleProtectedRoute requiredPage="/visits">
                <FieldVisitsPage />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/quotations"
            element={
              <RoleProtectedRoute requiredPage="/quotations">
                <QuotationsPage />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/payments"
            element={
              <RoleProtectedRoute requiredPage="/payments">
                <PaymentsPage />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/products"
            element={
              <RoleProtectedRoute requiredPage="/products">
                <ProductsPage />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <RoleProtectedRoute requiredPage="/users">
                <UsersPage />
              </RoleProtectedRoute>
            }
          />

          {/* Default redirect - based on user role */}
          <Route path="/" element={<RoleBasedRedirect />} />

          {/* 404 - redirect to user's default page */}
          <Route path="*" element={<RoleBasedRedirect />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;

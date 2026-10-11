import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { FullPageSpinner } from '../components/ui.jsx';
import { ParticipantLayout } from '../components/ParticipantLayout.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { GuestOnly, ProtectedRoute } from './guards.jsx';

// Everything admin (including Google Sign-In) is code-split so none of it ships in the participant bundle.
const AdminLoginPage = lazy(() => import('../features/auth/AdminLoginPage.jsx'));
const AdminApp = lazy(() => import('../features/admin/AdminApp.jsx'));
// The test screen (Markdown, KaTeX, highlighting) loads on demand so sign-in and the dashboard stay light.
const AttemptPage = lazy(() => import('../features/attempt/AttemptPage.jsx').then((m) => ({ default: m.AttemptPage })));
const ResultPage = lazy(() => import('../features/results/ResultPage.jsx').then((m) => ({ default: m.ResultPage })));

const page = (element) => <Suspense fallback={<FullPageSpinner />}>{element}</Suspense>;

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/admin/login"
        element={
          <GuestOnly>
            <Suspense fallback={<FullPageSpinner />}>
              <AdminLoginPage />
            </Suspense>
          </GuestOnly>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute role="admin">
            <Suspense fallback={<FullPageSpinner />}>
              <AdminApp />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute role="participant">
            <ParticipantLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="test/:id" element={page(<AttemptPage />)} />
        <Route path="test/:id/result" element={page(<ResultPage />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

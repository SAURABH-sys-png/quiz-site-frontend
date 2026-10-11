import { Navigate, useLocation } from 'react-router';
import { FullPageSpinner } from '../components/ui.jsx';
import { useAuth } from './auth.jsx';

/** Unauthenticated -> the matching login page; wrong role -> that role's home. */
export function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) {
    return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} replace state={{ from: location.pathname }} />;
  }
  if (user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  return children;
}

/** Login pages: already signed in -> go home. */
export function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />;
  return children;
}

import { Link, Outlet } from 'react-router';
import { useAuth } from '../app/auth.jsx';
import { useSocketEvent } from '../lib/socket.js';
import { Button } from './ui.jsx';

const REVOKED_MESSAGES = {
  session_revoked: 'You were signed out because your account signed in on another device.',
  deactivated: 'Your account has been deactivated. Contact the organizers.',
  ended_by_admin: 'An organizer ended your session. Please sign in again.',
};

export function ParticipantLayout() {
  const { user, logout, endSession } = useAuth();
  useSocketEvent('session:revoked', ({ reason } = {}) => {
    if (reason === 'logged_out') return;
    endSession(REVOKED_MESSAGES[reason] ?? 'Your session has ended. Please sign in again.');
  });
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="grid size-7 place-items-center rounded-lg bg-indigo-600 text-sm text-white">Q</span>
            <span className="hidden sm:inline">Quiz Platform</span>
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 text-right leading-tight">
              <p className="truncate text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="truncate font-mono text-xs text-slate-500">{user?.urn}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

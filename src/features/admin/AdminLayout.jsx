import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../../app/auth.jsx';
import { Button, cx } from '../../components/ui.jsx';

const NAV = [
  { to: '/admin/tests', label: 'Tests' },
  { to: '/admin/participants', label: 'Participants' },
  { to: '/admin/access-keys', label: 'Access keys' },
  { to: '/admin/slides', label: 'Slides' },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white print:hidden">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <span className="flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-lg bg-indigo-500 text-sm">Q</span>
            <span className="hidden md:inline">Quiz Admin</span>
          </span>
          <nav className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cx(
                    'rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap',
                    isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <span className="hidden truncate text-xs text-slate-400 lg:block">{user?.email}</span>
          <Button size="sm" variant="secondary" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 print:max-w-none print:p-0">
        <Outlet />
      </main>
    </div>
  );
}

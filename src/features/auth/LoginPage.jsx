import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../app/auth.jsx';
import { Alert, Button, Field, Input } from '../../components/ui.jsx';
import { api, errorMessage } from '../../lib/api.js';

/** Participant login: URN, mobile and password only. No Google, no sign-up, no password reset. */
export function LoginPage() {
  const { signedIn, notice, clearNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ urn: '', mobile: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api('/auth/participant/login', { method: 'POST', body: form });
      signedIn(user);
      const from = location.state?.from;
      navigate(from && !from.startsWith('/admin') ? from : '/', { replace: true });
    } catch (err) {
      setError(
        err.status === 401 ? 'Invalid credentials. Check your URN, mobile number and password.' : errorMessage(err),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-indigo-50 to-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-600/30">
            Q
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in to your test</h1>
          <p className="mt-1 text-sm text-slate-500">Use the details registered for this event.</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          {notice && (
            <Alert tone="warning" onClose={clearNotice}>
              {notice}
            </Alert>
          )}
          {error && <Alert>{error}</Alert>}
          <Field label="URN">
            {(id) => (
              <Input
                id={id}
                name="urn"
                value={form.urn}
                onChange={update('urn')}
                autoComplete="username"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="E25B002749"
                required
                className="font-mono uppercase"
              />
            )}
          </Field>
          <Field label="Mobile number">
            {(id) => (
              <Input
                id={id}
                name="mobile"
                type="tel"
                inputMode="tel"
                value={form.mobile}
                onChange={update('mobile')}
                autoComplete="tel"
                placeholder="10-digit mobile number"
                required
              />
            )}
          </Field>
          <Field label="Password" hint="Your URN followed by today's access key, e.g. E25B002749K7Q2">
            {(id) => (
              <Input
                id={id}
                name="password"
                type="password"
                value={form.password}
                onChange={update('password')}
                autoComplete="current-password"
                autoCapitalize="none"
                spellCheck={false}
                required
                className="font-mono"
              />
            )}
          </Field>
          <Button type="submit" size="lg" loading={busy} className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../app/auth.jsx';
import { Alert, Spinner } from '../../components/ui.jsx';
import { api, errorMessage } from '../../lib/api.js';

// Google Identity Services is loaded only on this (lazy) page, so the participant bundle has no Google code.
const GIS_SRC = 'https://accounts.google.com/gsi/client';

function loadGoogleIdentity() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    let script = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('Could not load Google Sign-In. Check your connection.')));
  });
}

/** Admin login: Google Sign-In only. */
export default function AdminLoginPage() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const { signedIn, notice, clearNotice } = useAuth();
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const callbacksRef = useRef({ signedIn, navigate });
  useEffect(() => {
    callbacksRef.current = { signedIn, navigate };
  });

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    loadGoogleIdentity()
      .then(() => {
        if (cancelled || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          auto_select: false,
          callback: async ({ credential }) => {
            setBusy(true);
            setError(null);
            try {
              const { user } = await api('/auth/admin/google', { method: 'POST', body: { credential } });
              callbacksRef.current.signedIn(user);
              callbacksRef.current.navigate('/admin', { replace: true });
            } catch (err) {
              setError(errorMessage(err));
            } finally {
              setBusy(false);
            }
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          width: 280,
        });
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-900 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">
          Q
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Admin sign-in</h1>
        <p className="mt-1 mb-5 text-sm text-slate-500">Only approved organizer Google accounts can sign in.</p>
        <div className="space-y-3 text-left">
          {notice && (
            <Alert tone="warning" onClose={clearNotice}>
              {notice}
            </Alert>
          )}
          {!clientId && (
            <Alert title="Google Sign-In is not configured">Set VITE_GOOGLE_CLIENT_ID in frontend/.env.</Alert>
          )}
          {error && <Alert>{error}</Alert>}
        </div>
        <div className="mt-4 flex min-h-11 items-center justify-center">
          {busy && <Spinner />}
          {/* Keep the Google button mounted so it survives a failed attempt. */}
          <div ref={buttonRef} className={busy ? 'hidden' : undefined} />
        </div>
      </div>
    </div>
  );
}

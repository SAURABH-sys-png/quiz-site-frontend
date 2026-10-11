import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler } from '../lib/api.js';
import { disconnectSocket } from '../lib/socket.js';

const AuthContext = createContext(null);

async function fetchMe() {
  try {
    const { user } = await api('/auth/me');
    return user;
  } catch (err) {
    if (err.status === 401) return null;
    throw err;
  }
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState(null);
  const me = useQuery({ queryKey: ['me'], queryFn: fetchMe, staleTime: Infinity, retry: 1 });

  const resetSession = useCallback(() => {
    disconnectSocket();
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' });
    queryClient.setQueryData(['me'], null);
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler((error) => {
      setNotice(error.message);
      resetSession();
    });
  }, [resetSession]);

  const value = useMemo(
    () => ({
      user: me.data ?? null,
      loading: me.isPending,
      error: me.error,
      notice,
      clearNotice: () => setNotice(null),
      /** Drop the local session (e.g. the server revoked it over the socket). */
      endSession(message) {
        setNotice(message);
        resetSession();
      },
      signedIn(user) {
        setNotice(null);
        queryClient.setQueryData(['me'], user);
      },
      async logout() {
        await api('/auth/logout', { method: 'POST' }).catch(() => {});
        resetSession();
      },
    }),
    [me.data, me.isPending, me.error, notice, queryClient, resetSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

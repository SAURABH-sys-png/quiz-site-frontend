import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../test/utils.jsx';
import { api, ApiError, setUnauthorizedHandler } from './api.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  setUnauthorizedHandler(() => {});
});

describe('api client', () => {
  it('sends cookies and JSON, and parses responses', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api('/tests/1/start', { method: 'POST', body: { a: 1 } })).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/tests\/1\/start$/);
    expect(init).toMatchObject({ method: 'POST', credentials: 'include', body: '{"a":1}' });
  });

  it('keeps API requests on the page origin even when VITE_API_URL is set (first-party auth cookie)', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
    vi.resetModules();
    const { api: configuredApi } = await import('./api.js');
    const fetchMock = vi.fn(async () => jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await configuredApi('/tests');

    const [url] = fetchMock.mock.calls[0];
    expect(new URL(url).origin).toBe(window.location.origin);
    expect(new URL(url).pathname).toBe('/api/tests');
  });

  it('turns error bodies into ApiError and signals 401s outside /auth', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(401, { error: { code: 'SESSION_REPLACED', message: 'Signed in elsewhere' } })),
    );
    const error = await api('/tests').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, code: 'SESSION_REPLACED', message: 'Signed in elsewhere' });
    expect(onUnauthorized).toHaveBeenCalledOnce();

    await api('/auth/me').catch(() => {});
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('reports network failures with status 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    await expect(api('/tests')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});

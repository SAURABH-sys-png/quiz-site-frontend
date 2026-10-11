export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let unauthorizedHandler = () => {};
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/** Called when an authenticated request gets 401 (session expired or replaced). */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

function buildUrl(path, query) {
  const url = new URL(`/api${path}`, API_BASE_URL || window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url;
}

/**
 * fetch wrapper: same-origin cookie auth, JSON in/out, { error: { code, message } } -> ApiError.
 * @param {string} path path under /api, e.g. "/tests"
 * @param {{ method?: string, body?: unknown, form?: FormData, query?: Record<string, unknown>, signal?: AbortSignal, raw?: boolean }} [options]
 */
export async function api(path, { method = 'GET', body, form, query, signal, raw = false } = {}) {
  const headers = {};
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(buildUrl(path, query), { method, headers, body: payload, credentials: 'include', signal });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Network error. Check your connection and try again.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const error = new ApiError(
      res.status,
      data?.error?.code ?? 'HTTP_ERROR',
      data?.error?.message ?? `Request failed (${res.status})`,
      data?.error?.details,
    );
    // Login/logout/me failures are handled by their callers; anything else means the session is gone.
    if (res.status === 401 && !path.startsWith('/auth/')) unauthorizedHandler(error);
    throw error;
  }
  if (raw) return res;
  if (res.status === 204) return null;
  return res.json();
}

/** Human-readable message for any error thrown by api(). */
export function errorMessage(error) {
  if (!error) return '';
  if (error instanceof ApiError && error.details?.length) {
    return `${error.message}: ${error.details.map((d) => (d.path ? `${d.path} ${d.message}` : d.message)).join('; ')}`;
  }
  return error.message ?? 'Something went wrong';
}

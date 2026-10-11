/**
 * Estimate server clock offset (server - client) from a response timestamp, assuming symmetric latency.
 * @param {string} serverNowIso
 * @param {number} sentAt Date.now() before the request
 * @param {number} receivedAt Date.now() after the response
 */
export function clockOffset(serverNowIso, sentAt, receivedAt) {
  return Date.parse(serverNowIso) - (sentAt + receivedAt) / 2;
}

/** Milliseconds left until `expiresAt` on the server clock. */
export function remainingMs(expiresAt, offsetMs, now = Date.now()) {
  return Math.max(0, Date.parse(expiresAt) - (now + offsetMs));
}

/** 754000 -> "12:34", 3723000 -> "1:02:03" */
export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 754000 -> "12m 34s" */
export function formatDuration(ms) {
  if (ms == null) return '—';
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function formatDateTime(value) {
  return value ? dateFormat.format(new Date(value)) : '—';
}

/** Date -> value for <input type="datetime-local"> (local time). */
export function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value -> ISO string (or null when empty). */
export function fromLocalInput(value) {
  return value ? new Date(value).toISOString() : null;
}

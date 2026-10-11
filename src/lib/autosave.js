/**
 * Per-question debounced autosave with ordering, retry and flush.
 * - Saves for the same question never overlap; the latest value always wins.
 * - Network errors and 429s retry automatically; closed/expired attempts call onFatal.
 * @param {{
 *   save: (questionId: string) => Promise<unknown>,
 *   delayMs?: number,
 *   retryMs?: number,
 *   onStatus?: (questionId: string, status: 'dirty' | 'saving' | 'saved' | 'error', detail?: unknown) => void,
 *   onFatal?: (error: any) => void,
 * }} options  `save` reads the latest value itself, so a retry always sends the newest answer.
 */
export function createAutosaver({ save, delayMs = 800, retryMs = 3000, onStatus = () => {}, onFatal = () => {} }) {
  const dirty = new Set();
  const timers = new Map();
  const inFlight = new Map();

  const FATAL = new Set(['ATTEMPT_CLOSED', 'ATTEMPT_EXPIRED']);
  const isRetryable = (err) => err?.status === 0 || err?.status === 429 || err?.status >= 500;

  function clearTimer(qid) {
    clearTimeout(timers.get(qid));
    timers.delete(qid);
  }

  function schedule(qid, delay = delayMs) {
    dirty.add(qid);
    onStatus(qid, 'dirty');
    clearTimer(qid);
    timers.set(
      qid,
      setTimeout(() => send(qid), delay),
    );
  }

  async function send(qid) {
    clearTimer(qid);
    if (inFlight.has(qid)) {
      await inFlight.get(qid);
      if (!dirty.has(qid) || timers.has(qid)) return;
    }
    if (!dirty.has(qid)) return;
    dirty.delete(qid);
    onStatus(qid, 'saving');

    const promise = save(qid).then(
      (result) => {
        if (!dirty.has(qid)) onStatus(qid, 'saved', result);
        return { ok: true, result };
      },
      (error) => {
        if (FATAL.has(error?.code)) {
          onFatal(error);
        } else if (isRetryable(error)) {
          dirty.add(qid);
          onStatus(qid, 'error', error);
          if (!timers.has(qid))
            timers.set(
              qid,
              setTimeout(() => send(qid), retryMs),
            );
        } else {
          onStatus(qid, 'error', error);
        }
        return { ok: false, error };
      },
    );
    inFlight.set(qid, promise);
    const outcome = await promise;
    if (inFlight.get(qid) === promise) inFlight.delete(qid);
    return outcome;
  }

  /** Save everything now and wait. Resolves true when nothing is left unsaved. */
  async function flush() {
    const ids = new Set([...dirty, ...timers.keys()]);
    await Promise.all([...ids].map((qid) => send(qid)));
    await Promise.all([...inFlight.values()]);
    return dirty.size === 0;
  }

  return {
    schedule,
    saveNow: (qid) => {
      dirty.add(qid);
      return send(qid);
    },
    flush,
    hasUnsaved: () => dirty.size > 0 || inFlight.size > 0,
  };
}

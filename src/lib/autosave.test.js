import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutosaver } from './autosave.js';

describe('createAutosaver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces changes per question', async () => {
    const save = vi.fn(async () => ({ ok: true }));
    const saver = createAutosaver({ save, delayMs: 500 });
    saver.schedule('q1');
    saver.schedule('q1');
    saver.schedule('q2');
    await vi.advanceTimersByTimeAsync(499);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save.mock.calls.map((c) => c[0]).sort()).toEqual(['q1', 'q2']);
  });

  it('never overlaps saves for the same question and sends the latest value last', async () => {
    let value = 'a';
    const sent = [];
    let release;
    const save = vi.fn(() => {
      sent.push(value);
      return new Promise((resolve) => (release = resolve));
    });
    const saver = createAutosaver({ save, delayMs: 10 });
    saver.schedule('q1');
    await vi.advanceTimersByTimeAsync(10);
    value = 'b';
    saver.schedule('q1');
    await vi.advanceTimersByTimeAsync(10);
    expect(save).toHaveBeenCalledTimes(1);
    release({});
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toEqual(['a', 'b']);
  });

  it('retries network errors and reports status', async () => {
    const statuses = [];
    const save = vi
      .fn()
      .mockImplementationOnce(async () => {
        throw Object.assign(new Error('offline'), { status: 0 });
      })
      .mockImplementation(async () => ({ ok: true }));
    const saver = createAutosaver({ save, delayMs: 10, retryMs: 100, onStatus: (q, s) => statuses.push(s) });
    saver.schedule('q1');
    await vi.advanceTimersByTimeAsync(10);
    expect(statuses).toEqual(['dirty', 'saving', 'error']);
    expect(saver.hasUnsaved()).toBe(true);
    await vi.advanceTimersByTimeAsync(100);
    expect(save).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe('saved');
    expect(saver.hasUnsaved()).toBe(false);
  });

  it('stops and calls onFatal when the attempt is closed', async () => {
    const onFatal = vi.fn();
    const save = vi.fn(async () => {
      throw Object.assign(new Error('closed'), { status: 409, code: 'ATTEMPT_EXPIRED' });
    });
    const saver = createAutosaver({ save, delayMs: 10, onFatal });
    saver.schedule('q1');
    await vi.advanceTimersByTimeAsync(10);
    expect(onFatal).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(save).toHaveBeenCalledOnce();
  });

  it('flush saves pending changes immediately', async () => {
    const save = vi.fn(async () => ({}));
    const saver = createAutosaver({ save, delayMs: 10_000 });
    saver.schedule('q1');
    saver.schedule('q2');
    await expect(saver.flush()).resolves.toBe(true);
    expect(save).toHaveBeenCalledTimes(2);
  });
});

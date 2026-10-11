import { describe, expect, it } from 'vitest';
import { clockOffset, formatClock, formatDuration, remainingMs } from './time.js';

describe('time helpers', () => {
  it('estimates the server clock offset from the request midpoint', () => {
    expect(
      clockOffset('2026-01-01T00:00:10.000Z', Date.parse('2026-01-01T00:00:00Z'), Date.parse('2026-01-01T00:00:02Z')),
    ).toBe(9000);
  });

  it('computes the remaining time on the server clock', () => {
    const now = Date.parse('2026-01-01T00:00:00Z');
    expect(remainingMs('2026-01-01T00:10:00Z', 0, now)).toBe(600_000);
    expect(remainingMs('2026-01-01T00:10:00Z', 60_000, now)).toBe(540_000);
    expect(remainingMs('2026-01-01T00:00:00Z', 5000, now)).toBe(0);
  });

  it('formats clocks and durations', () => {
    expect(formatClock(754_000)).toBe('12:34');
    expect(formatClock(3_723_000)).toBe('1:02:03');
    expect(formatClock(0)).toBe('0:00');
    expect(formatDuration(65_000)).toBe('1m 05s');
    expect(formatDuration(null)).toBe('—');
  });
});

import { useEffect, useRef, useState } from 'react';
import { formatClock, remainingMs } from '../lib/time.js';
import { cx } from './ui.jsx';

/** Countdown driven by the server's expiresAt, corrected for the client/server clock offset. */
export function Countdown({ expiresAt, offsetMs, onExpire, className }) {
  const [remaining, setRemaining] = useState(() => remainingMs(expiresAt, offsetMs));
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    let fired = false;
    const tick = () => {
      const left = remainingMs(expiresAt, offsetMs);
      setRemaining(left);
      if (left <= 0 && !fired) {
        fired = true;
        onExpireRef.current?.();
      }
    };
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [expiresAt, offsetMs]);

  const tone =
    remaining <= 60_000
      ? 'bg-rose-600 text-white animate-pulse'
      : remaining <= 5 * 60_000
        ? 'bg-amber-100 text-amber-900'
        : 'bg-slate-100 text-slate-800';
  return (
    <div
      role="timer"
      aria-label="Time remaining"
      className={cx('rounded-lg px-2.5 py-1 font-mono text-sm font-semibold tabular-nums', tone, className)}
    >
      ⏱ {formatClock(remaining)}
    </div>
  );
}

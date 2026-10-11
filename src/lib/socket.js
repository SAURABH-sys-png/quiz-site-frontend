import { io } from 'socket.io-client';
import { useEffect, useRef } from 'react';

let socket = null;
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/** Lazily connect (same origin; the httpOnly auth cookie authenticates the handshake). */
export function getSocket() {
  if (!socket) {
    socket = io(API_BASE_URL || undefined, { withCredentials: true, transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/** Subscribe to a socket event for the lifetime of the component. */
export function useSocketEvent(event, handler) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });
  useEffect(() => {
    const s = getSocket();
    const listener = (payload) => handlerRef.current(payload);
    s.on(event, listener);
    return () => {
      s.off(event, listener);
    };
  }, [event]);
}

/** Join a test's live rooms (re-joins after reconnects). The server decides which rooms are allowed. */
export function useTestSubscription(testId, { enabled = true, onAck } = {}) {
  const ackRef = useRef(onAck);
  useEffect(() => {
    ackRef.current = onAck;
  });
  useEffect(() => {
    if (!enabled || !testId) return undefined;
    const s = getSocket();
    const subscribe = () => s.emit('test:subscribe', { testId }, (ack) => ackRef.current?.(ack));
    if (s.connected) subscribe();
    s.on('connect', subscribe);
    return () => {
      s.off('connect', subscribe);
      s.emit('test:unsubscribe', { testId });
    };
  }, [testId, enabled]);
}

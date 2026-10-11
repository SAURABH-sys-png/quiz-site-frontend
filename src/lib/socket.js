import { io } from 'socket.io-client';
import { useEffect, useRef } from 'react';

let socket = null;

/**
 * Origin only: Socket.IO reads a URL path as a namespace, so "https://api.example.com/api" would connect to the
 * "/api" namespace instead of "/". Empty means same origin (the Vite dev proxy).
 */
export function socketOrigin(apiUrl = import.meta.env.VITE_API_URL) {
  if (!apiUrl) return undefined;
  try {
    return new URL(apiUrl).origin;
  } catch {
    return undefined;
  }
}

/** Lazily connect (the httpOnly auth cookie authenticates the handshake). */
export function getSocket() {
  if (!socket) {
    socket = io(socketOrigin(), { withCredentials: true, transports: ['websocket', 'polling'] });
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

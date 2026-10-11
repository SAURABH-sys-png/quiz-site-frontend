import { io } from 'socket.io-client';
import { useEffect, useRef } from 'react';
import { api } from './api.js';

let socket = null;

/**
 * Where Socket.IO connects. Vercel cannot proxy WebSockets, so in production this is the backend's own origin
 * (VITE_API_URL); empty means same origin (the Vite dev proxy). Origin only: Socket.IO reads a URL path as a
 * namespace, so "https://api.example.com/api" would connect to the "/api" namespace instead of "/".
 */
export function socketOrigin(apiUrl = import.meta.env.VITE_API_URL) {
  if (!apiUrl) return undefined;
  try {
    return new URL(apiUrl).origin;
  } catch {
    return undefined;
  }
}

/** Fetch a short-lived socket token through the same-origin API (sent with the first-party auth cookie). */
function socketAuth(callback) {
  api('/auth/socket-token').then(
    ({ token }) => callback({ token }),
    () => callback({}),
  );
}

/**
 * Lazily connect. The auth cookie belongs to the frontend's domain and never reaches a socket host on another
 * domain, so every (re)connect authenticates with a fresh socket token instead.
 */
export function getSocket() {
  if (!socket) {
    socket = io(socketOrigin(), { withCredentials: true, transports: ['websocket', 'polling'], auth: socketAuth });
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

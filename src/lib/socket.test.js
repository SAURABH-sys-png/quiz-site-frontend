import { describe, expect, it } from 'vitest';
import { socketOrigin } from './socket.js';

describe('socketOrigin', () => {
  it('uses only the origin of VITE_API_URL (a path would become a Socket.IO namespace)', () => {
    expect(socketOrigin('https://api.example.com')).toBe('https://api.example.com');
    expect(socketOrigin('https://api.example.com/')).toBe('https://api.example.com');
    expect(socketOrigin('https://api.example.com/api')).toBe('https://api.example.com');
  });

  it('falls back to same origin when unset or invalid', () => {
    expect(socketOrigin('')).toBeUndefined();
    expect(socketOrigin(undefined)).toBeUndefined();
    expect(socketOrigin('not a url')).toBeUndefined();
  });
});

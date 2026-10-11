import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, renderWithProviders } from '../../test/utils.jsx';
import { LoginPage } from './LoginPage.jsx';

afterEach(() => vi.unstubAllGlobals());

function mockFetch(handler) {
  const fetchMock = vi.fn(async (url, init) => handler(String(url), init));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('participant LoginPage', () => {
  it('asks for URN, mobile and password only: no Google, no sign-up', async () => {
    mockFetch(() => jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'x' } }));
    const { container } = renderWithProviders(<LoginPage />, { route: '/login' });
    expect(screen.getByLabelText('URN')).toBeInTheDocument();
    expect(screen.getByLabelText('Mobile number')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(container.querySelectorAll('input')).toHaveLength(3);
    expect(container.textContent).not.toMatch(/google|sign up|create account|\bregister\b|forgot/i);
    expect(document.querySelector('script[src*="accounts.google.com"]')).toBeNull();
  });

  it('posts exactly the three fields and shows a generic error on 401', async () => {
    const fetchMock = mockFetch((url) =>
      url.endsWith('/api/auth/me')
        ? jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'x' } })
        : jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } }),
    );
    renderWithProviders(<LoginPage />, { route: '/login' });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('URN'), 'E25B002749');
    await user.type(screen.getByLabelText('Mobile number'), '9876543210');
    await user.type(screen.getByLabelText('Password'), 'E25B002749WRONG');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials'));
    const loginCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/api/auth/participant/login'));
    expect(JSON.parse(loginCall[1].body)).toEqual({
      urn: 'E25B002749',
      mobile: '9876543210',
      password: 'E25B002749WRONG',
    });
    expect(loginCall[1].credentials).toBe('include');
  });
});

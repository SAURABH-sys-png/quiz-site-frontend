import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, renderWithProviders } from '../../../test/utils.jsx';
import { TestDetailPage } from './TestDetailPage.jsx';

afterEach(() => vi.unstubAllGlobals());

function testDoc(overrides = {}) {
  return {
    id: 't1',
    title: 'C++ quiz',
    status: 'ended',
    durationMinutes: 40,
    questionCount: 40,
    totalMarks: 40,
    attempts: { started: 3, submitted: 3 },
    updatedAt: String(Math.random()),
    settings: { feedbackMode: 'after_test', maxAttempts: 1 },
    ...overrides,
  };
}

/** Fake API for one test; returns the fetch mock so calls can be inspected. */
function mockApi(initial) {
  let current = initial;
  const fetchMock = vi.fn(async (url, init) => {
    const path = new URL(String(url)).pathname;
    const method = init?.method ?? 'GET';
    if (path === '/api/auth/me') return jsonResponse(200, { user: { role: 'admin', email: 'a@b.co' } });
    if (path === '/api/admin/tests/t1/questions') return jsonResponse(200, { questions: [] });
    if (path === '/api/admin/tests/t1/restart' && method === 'POST') {
      current = testDoc({ status: 'draft', attempts: { started: 0, submitted: 0 } });
      return jsonResponse(200, { test: current });
    }
    if (path === '/api/admin/tests/t1' && method === 'DELETE') return new Response(null, { status: 204 });
    if (path === '/api/admin/tests/t1') return jsonResponse(200, { test: current });
    if (path === '/api/admin/tests') return jsonResponse(200, { tests: [] });
    return jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'x' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/tests/:id" element={<TestDetailPage />} />
      <Route path="/admin/tests" element={<p>All tests list</p>} />
    </Routes>,
    { route: '/admin/tests/t1' },
  );
}

const calls = (fetchMock, method, suffix) =>
  fetchMock.mock.calls.filter(([url, init]) => (init?.method ?? 'GET') === method && String(url).endsWith(suffix));

describe('admin test page: restart and delete', () => {
  it('restarts an ended test after warning how many attempts are lost', async () => {
    const fetchMock = mockApi(testDoc());
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Restart test' }));
    const dialog = screen.getByRole('dialog', { name: 'Restart test?' });
    expect(dialog).toHaveTextContent('3 attempt(s) will be lost');
    expect(within(dialog).getByRole('button', { name: 'Download results (.xlsx)' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Restart test' }));
    await waitFor(() => expect(calls(fetchMock, 'POST', '/api/admin/tests/t1/restart')).toHaveLength(1));
    // Back to draft: it can be started again with the usual buttons.
    expect(await screen.findByRole('button', { name: 'Start now' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Restart test' })).toBeNull();
  });

  it('offers no restart before a test has run', async () => {
    mockApi(testDoc({ status: 'draft', attempts: { started: 0, submitted: 0 } }));
    renderPage();
    expect(await screen.findByRole('button', { name: 'Start now' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Restart test' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('deletes a test that has attempts, then returns to the test list', async () => {
    const fetchMock = mockApi(testDoc());
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete test?' });
    expect(dialog).toHaveTextContent('3 attempt(s) will be lost');
    await user.click(within(dialog).getByRole('button', { name: 'Delete test' }));

    expect(await screen.findByText('All tests list')).toBeInTheDocument();
    expect(calls(fetchMock, 'DELETE', '/api/admin/tests/t1')).toHaveLength(1);
  });
});

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, renderWithProviders } from '../../../test/utils.jsx';
import { TestDetailPage } from './TestDetailPage.jsx';

afterEach(() => vi.unstubAllGlobals());

function testDoc(settings) {
  return {
    id: 't1',
    title: 'C++ quiz',
    status: 'live',
    durationMinutes: 40,
    questionCount: 0,
    totalMarks: 0,
    attempts: { started: 0, submitted: 0 },
    updatedAt: String(Date.now()),
    settings: { feedbackMode: 'after_test', maxAttempts: 1, allowRetakes: false, ...settings },
  };
}

describe('admin retake switch', () => {
  it('turns retakes on with one tap and shows the new state', async () => {
    let current = testDoc({ allowRetakes: false });
    const fetchMock = vi.fn(async (url, init) => {
      const path = new URL(String(url)).pathname;
      if (path === '/api/auth/me') return jsonResponse(200, { user: { role: 'admin', email: 'a@b.co' } });
      if (path === '/api/admin/tests/t1/questions') return jsonResponse(200, { questions: [] });
      if (path === '/api/admin/tests/t1' && init?.method === 'PATCH') {
        current = testDoc(JSON.parse(init.body).settings);
        return jsonResponse(200, { test: current });
      }
      if (path === '/api/admin/tests/t1') return jsonResponse(200, { test: current });
      return jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'x' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(
      <Routes>
        <Route path="/admin/tests/:id" element={<TestDetailPage />} />
      </Routes>,
      { route: '/admin/tests/t1' },
    );

    const toggle = await screen.findByRole('switch', { name: /Retakes off/ });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.setup().click(toggle);

    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(patch[1].body)).toEqual({ settings: { allowRetakes: true } });
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: /Retakes on/ })).toHaveAttribute('aria-checked', 'true'),
    );
  });
});

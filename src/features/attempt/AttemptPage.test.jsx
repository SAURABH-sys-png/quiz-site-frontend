import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from '../../test/utils.jsx';
import { AttemptPage } from './AttemptPage.jsx';

vi.mock('../../lib/socket.js', () => ({
  useSocketEvent: () => {},
  useTestSubscription: () => {},
  getSocket: () => ({ on() {}, off() {}, emit() {} }),
  disconnectSocket: () => {},
}));

afterEach(() => vi.unstubAllGlobals());

const startPayload = {
  serverNow: new Date().toISOString(),
  test: {
    id: 'T1',
    title: 'Round 1',
    totalMarks: 2,
    settings: { feedbackMode: 'after_submit', liveScoreVisible: true, leaderboardVisible: false, maxAttempts: 1 },
  },
  attempt: {
    id: 'A1',
    status: 'in_progress',
    attemptNumber: 1,
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    score: 0,
  },
  questions: [
    {
      id: 'Q1',
      type: 'mcq',
      statement: 'Pick B',
      marks: 2,
      negativeMarks: 0,
      multiSelect: false,
      options: [
        { id: 'A', text: 'Alpha' },
        { id: 'B', text: 'Beta' },
      ],
    },
  ],
  answers: [],
};

describe('AttemptPage', () => {
  it('autosaves answers even under StrictMode double-mounting', async () => {
    const fetchMock = vi.fn(async (url, init) => {
      const path = new URL(String(url)).pathname;
      if (path === '/api/tests/T1/start') return jsonResponse(200, startPayload);
      if (path === '/api/attempts/A1/answers/Q1')
        return jsonResponse(200, { questionId: 'Q1', answered: true, score: 2, savedAt: new Date().toISOString() });
      return jsonResponse(404, { error: { code: 'NOT_FOUND', message: `unexpected ${init?.method} ${path}` } });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <StrictMode>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <MemoryRouter initialEntries={['/test/T1']}>
            <Routes>
              <Route path="/test/:id" element={<AttemptPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>,
    );

    await userEvent.click(await screen.findByRole('radio', { name: /Beta/ }));
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument(), { timeout: 3000 });

    const save = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/api/attempts/A1/answers/Q1'));
    expect(save[1].method).toBe('PUT');
    expect(JSON.parse(save[1].body)).toMatchObject({ response: { selected: ['B'] } });
    expect(screen.getByText(/Score 2/)).toBeInTheDocument();
  });
});

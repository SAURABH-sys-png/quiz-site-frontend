import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  FullPageSpinner,
  Modal,
  PageHeader,
} from '../../components/ui.jsx';
import { api, errorMessage } from '../../lib/api.js';
import { useSocketEvent, useTestSubscription } from '../../lib/socket.js';
import { formatDateTime } from '../../lib/time.js';

function statusBadge(test) {
  if (test.status === 'ended') return <Badge>Ended</Badge>;
  if (test.isOpen) return <Badge tone="green">● Live</Badge>;
  if (test.status === 'live') return <Badge tone="amber">Not open</Badge>;
  return <Badge tone="sky">Upcoming</Badge>;
}

function attemptBadge(attempt) {
  if (!attempt) return null;
  if (attempt.status === 'in_progress') return <Badge tone="amber">In progress</Badge>;
  if (attempt.status === 'auto_submitted') return <Badge tone="indigo">Auto-submitted</Badge>;
  return <Badge tone="indigo">Submitted</Badge>;
}

function TestCard({ test, onStart }) {
  const attempt = test.myAttempt;
  const watchScore = Boolean(attempt) && test.settings.liveScoreVisible && test.status !== 'ended';
  const [live, setLive] = useState(null);
  useTestSubscription(test.id, { enabled: watchScore });
  useSocketEvent('score:update', (e) => e.testId === test.id && setLive(e));

  const score = live?.score ?? attempt?.score;
  const inProgress = attempt?.status === 'in_progress';
  const finished = attempt && !inProgress;

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">{test.title}</h2>
          {test.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{test.description}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {statusBadge(test)}
          {attemptBadge(attempt)}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-slate-50 px-2 py-2">
          <dt className="text-slate-500">Duration</dt>
          <dd className="font-semibold text-slate-800">{test.durationMinutes} min</dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-2">
          <dt className="text-slate-500">Questions</dt>
          <dd className="font-semibold text-slate-800">{test.questionCount}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-2 py-2">
          <dt className="text-slate-500">Marks</dt>
          <dd className="font-semibold text-slate-800">{test.totalMarks}</dd>
        </div>
      </dl>

      <div className="text-xs text-slate-500">
        {test.startsAt && <p>Opens: {formatDateTime(test.startsAt)}</p>}
        {test.endsAt && <p>Closes: {formatDateTime(test.endsAt)}</p>}
      </div>

      {score != null && (
        <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
          <span>
            Your score: <strong className="tabular-nums">{score}</strong> / {test.totalMarks}
          </span>
          {live?.rank != null && <span className="font-medium">Rank #{live.rank}</span>}
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-2">
        {inProgress && (
          <ButtonLink to={`/test/${test.id}`} className="flex-1">
            Resume test
          </ButtonLink>
        )}
        {!attempt && test.canStart && (
          <Button className="flex-1" onClick={() => onStart(test)}>
            Start test
          </Button>
        )}
        {finished && (
          <ButtonLink to={`/test/${test.id}/result`} variant="secondary" className="flex-1">
            View result
          </ButtonLink>
        )}
        {finished && test.canStart && (
          <Button variant="secondary" className="flex-1" onClick={() => onStart(test)}>
            Retake ({attempt.attemptNumber}/{test.settings.maxAttempts} used)
          </Button>
        )}
        {!attempt && !test.canStart && (
          <p className="text-sm text-slate-500">
            {test.status === 'published' ? 'This test has not started yet.' : 'This test is not open right now.'}
          </p>
        )}
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(null);
  const tests = useQuery({ queryKey: ['tests'], queryFn: () => api('/tests'), refetchInterval: 30_000 });
  useSocketEvent('test:status', () => queryClient.invalidateQueries({ queryKey: ['tests'] }));

  if (tests.isPending) return <FullPageSpinner />;

  return (
    <>
      <PageHeader title="Your tests" subtitle="Tests open to you appear here. Live scores update automatically." />
      {tests.error && <Alert>{errorMessage(tests.error)}</Alert>}
      {tests.data?.tests.length === 0 && (
        <EmptyState
          title="No tests yet"
          description="When an organizer publishes a test for you, it will show up here."
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {tests.data?.tests.map((t) => (
          <TestCard key={t.id} test={t} onStart={setConfirm} />
        ))}
      </div>

      <Modal
        open={Boolean(confirm)}
        title="Start this test?"
        onClose={() => setConfirm(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button onClick={() => navigate(`/test/${confirm.id}`)}>Start now</Button>
          </>
        }
      >
        {confirm && (
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <strong>{confirm.title}</strong> has {confirm.questionCount} questions and a time limit of{' '}
              <strong>{confirm.durationMinutes} minutes</strong>.
            </p>
            <p>
              The timer starts as soon as you begin and keeps running if you close the page. Answers save automatically.
            </p>
            {confirm.endsAt && <p>The test closes at {formatDateTime(confirm.endsAt)}, even if you have time left.</p>}
          </div>
        )}
      </Modal>
    </>
  );
}

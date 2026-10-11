import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  FullPageSpinner,
  PageHeader,
  Select,
  Stat,
  TableWrap,
  Td,
  Th,
} from '../../../components/ui.jsx';
import { api, errorMessage } from '../../../lib/api.js';
import { useSocketEvent, useTestSubscription } from '../../../lib/socket.js';
import { formatDuration } from '../../../lib/time.js';
import { TestStatusBadge } from '../common.jsx';

const STATUS = {
  in_progress: <Badge tone="amber">In progress</Badge>,
  submitted: <Badge tone="green">Submitted</Badge>,
  auto_submitted: <Badge tone="indigo">Auto-submitted</Badge>,
};

export function LiveDashboardPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [section, setSection] = useState('');
  const [connected, setConnected] = useState(false);

  const test = useQuery({
    queryKey: ['admin', 'test', id],
    queryFn: () => api(`/admin/tests/${id}`).then((r) => r.test),
  });
  const questions = useQuery({
    queryKey: ['admin', 'test', id, 'questions'],
    queryFn: () => api(`/admin/tests/${id}/questions`).then((r) => r.questions),
  });
  const board = useQuery({
    queryKey: ['admin', 'leaderboard', id],
    queryFn: () => api(`/admin/tests/${id}/leaderboard`),
  });

  useTestSubscription(id, { onAck: (ack) => setConnected(Boolean(ack?.ok)) });
  useSocketEvent('leaderboard:update', (payload) => {
    if (payload.testId === id && payload.counts) queryClient.setQueryData(['admin', 'leaderboard', id], payload);
  });
  useSocketEvent(
    'test:status',
    (e) => e.testId === id && queryClient.invalidateQueries({ queryKey: ['admin', 'test', id] }),
  );
  useSocketEvent('disconnect', () => setConnected(false));

  const data = board.data;
  const sections = useMemo(
    () => [...new Set((data?.entries ?? []).map((e) => e.section).filter(Boolean))].sort(),
    [data],
  );
  const entries = section ? data?.entries.filter((e) => e.section === section) : data?.entries;
  const statsById = new Map((data?.questionStats ?? []).map((s) => [s.questionId, s]));

  if (test.isPending || board.isPending) return <FullPageSpinner />;
  if (test.error || board.error) return <Alert>{errorMessage(test.error ?? board.error)}</Alert>;

  return (
    <>
      <PageHeader
        title={`Live: ${test.data.title}`}
        subtitle={
          <span className="flex items-center gap-2">
            <TestStatusBadge status={test.data.status} />
            {connected ? <Badge tone="green">Realtime connected</Badge> : <Badge tone="amber">Connecting…</Badge>}
          </span>
        }
        actions={
          <ButtonLink to={`/admin/tests/${id}/analytics`} variant="secondary">
            Analytics & export
          </ButtonLink>
        }
      >
        <Link to={`/admin/tests/${id}`} className="mb-1 inline-block text-sm text-slate-500 hover:text-slate-700">
          ← Back to test
        </Link>
      </PageHeader>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat label="Started" value={data.counts.started} />
        <Stat label="In progress" value={data.counts.inProgress} />
        <Stat label="Submitted" value={data.counts.submitted} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-800">Leaderboard</h2>
            <Select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-40"
              aria-label="Section filter"
            >
              <option value="">All sections</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <TableWrap>
            <thead className="bg-slate-50">
              <tr>
                <Th>Rank</Th>
                <Th>URN</Th>
                <Th>Name</Th>
                <Th>Section</Th>
                <Th className="text-right">Score</Th>
                <Th className="text-right">Time</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <tr key={e.attemptId}>
                  <Td className="font-semibold tabular-nums">#{e.rank}</Td>
                  <Td className="font-mono">{e.urn}</Td>
                  <Td>{e.name}</Td>
                  <Td>{e.section || '—'}</Td>
                  <Td className="text-right font-semibold tabular-nums">{e.score}</Td>
                  <Td className="text-right tabular-nums">{formatDuration(e.timeTakenMs)}</Td>
                  <Td>{STATUS[e.status]}</Td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <Td colSpan={7} className="py-8 text-center text-slate-500">
                    Nobody has started yet.
                  </Td>
                </tr>
              )}
            </tbody>
          </TableWrap>
        </div>

        <Card className="p-4">
          <h2 className="mb-3 font-semibold text-slate-800">Correct rate per question</h2>
          <ol className="space-y-2.5">
            {(questions.data ?? []).map((q, i) => {
              const s = statsById.get(q.id);
              const pct = s?.correctRate != null ? Math.round(s.correctRate * 100) : null;
              return (
                <li key={q.id}>
                  <div className="mb-1 flex justify-between text-xs text-slate-600">
                    <span>Q{i + 1}</span>
                    <span className="tabular-nums">
                      {pct != null ? `${pct}%` : '—'} · {s?.answered ?? 0} answered
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${pct ?? 0}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </>
  );
}

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Alert,
  Button,
  EmptyState,
  Field,
  FullPageSpinner,
  Input,
  Modal,
  PageHeader,
  TableWrap,
  Td,
  Th,
} from '../../../components/ui.jsx';
import { api, errorMessage } from '../../../lib/api.js';
import { formatDateTime } from '../../../lib/time.js';
import { TestStatusBadge } from '../common.jsx';

function NewTestModal({ open, onClose }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { test } = await api('/admin/tests', {
        method: 'POST',
        body: { title, durationMinutes: Number(duration) },
      });
      navigate(`/admin/tests/${test.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New test">
      <form onSubmit={create} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Title">
          {(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />}
        </Field>
        <Field label="Duration (minutes)" hint="Each participant gets this much time from the moment they start.">
          {(id) => (
            <Input
              id={id}
              type="number"
              min={1}
              max={1440}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Create test
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function TestsPage() {
  const [creating, setCreating] = useState(false);
  const tests = useQuery({ queryKey: ['admin', 'tests'], queryFn: () => api('/admin/tests') });

  if (tests.isPending) return <FullPageSpinner />;
  return (
    <>
      <PageHeader
        title="Tests"
        subtitle="Create tests, add questions, run them live and export results."
        actions={<Button onClick={() => setCreating(true)}>+ New test</Button>}
      />
      {tests.error && <Alert>{errorMessage(tests.error)}</Alert>}
      {tests.data?.tests.length === 0 ? (
        <EmptyState
          title="No tests yet"
          description="Create your first test to start adding questions."
          action={<Button onClick={() => setCreating(true)}>+ New test</Button>}
        />
      ) : (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr>
              <Th>Test</Th>
              <Th>Status</Th>
              <Th>Window</Th>
              <Th className="text-right">Questions</Th>
              <Th className="text-right">Marks</Th>
              <Th className="text-right">Started / Submitted</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tests.data?.tests.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <Td>
                  <Link to={`/admin/tests/${t.id}`} className="font-medium text-indigo-700 hover:underline">
                    {t.title}
                  </Link>
                  <p className="text-xs text-slate-500">{t.durationMinutes} min</p>
                </Td>
                <Td>
                  <TestStatusBadge status={t.status} />
                </Td>
                <Td className="text-xs whitespace-nowrap text-slate-500">
                  {t.startsAt ? formatDateTime(t.startsAt) : 'Manual start'}
                  <br />
                  {t.endsAt ? `→ ${formatDateTime(t.endsAt)}` : 'Manual end'}
                </Td>
                <Td className="text-right tabular-nums">{t.questionCount}</Td>
                <Td className="text-right tabular-nums">{t.totalMarks}</Td>
                <Td className="text-right tabular-nums">
                  {t.attempts.started} / {t.attempts.submitted}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      {creating && <NewTestModal open onClose={() => setCreating(false)} />}
    </>
  );
}

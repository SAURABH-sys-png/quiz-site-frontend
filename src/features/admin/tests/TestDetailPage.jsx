import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Markdown } from '../../../components/Markdown.jsx';
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  cx,
  EmptyState,
  FullPageSpinner,
  Modal,
  PageHeader,
  TableWrap,
  Td,
  Th,
} from '../../../components/ui.jsx';
import { api, errorMessage } from '../../../lib/api.js';
import { TYPE_LABELS } from '../../attempt/answers.js';
import { DownloadButton, ImportPanel, TestStatusBadge } from '../common.jsx';
import { TestSettingsForm } from './TestSettingsForm.jsx';

const ACTIONS = {
  publish: {
    label: 'Publish',
    confirm: 'Participants will see this test as upcoming. It goes live at its start time, or when you press Start.',
  },
  unpublish: { label: 'Back to draft', confirm: 'Participants will no longer see this test.' },
  start: { label: 'Start now', confirm: 'The test opens immediately for all allowed participants.' },
  end: {
    label: 'End test',
    confirm: 'The test closes now and every attempt still in progress is submitted automatically.',
  },
};

function availableActions(status) {
  return { draft: ['publish', 'start'], published: ['unpublish', 'start', 'end'], live: ['end'], ended: [] }[status];
}

/** One-tap switch: when on, participants can retake this test (as often as they like) while it is open. */
function RetakeToggle({ test, onChanged, onError }) {
  const [busy, setBusy] = useState(false);
  const on = Boolean(test.settings?.allowRetakes);

  async function toggle() {
    setBusy(true);
    onError(null);
    try {
      await api(`/admin/tests/${test.id}`, { method: 'PATCH', body: { settings: { allowRetakes: !on } } });
      onChanged();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={busy}
      onClick={toggle}
      title={
        on
          ? 'Participants can take this test again after submitting. Tap to turn off.'
          : 'Tap to let participants take this test again after submitting.'
      }
      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 ring-inset hover:bg-slate-50 disabled:opacity-60"
    >
      <span
        className={cx(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
          on ? 'bg-emerald-500' : 'bg-slate-300',
        )}
        aria-hidden="true"
      >
        <span
          className={cx(
            'absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform',
            on ? 'translate-x-4.5' : 'translate-x-0.5',
          )}
        />
      </span>
      Retakes {on ? 'on' : 'off'}
    </button>
  );
}

function QuestionsPanel({ test, questions, refresh }) {
  const navigate = useNavigate();
  const locked = test.status === 'live' || test.status === 'ended';
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function move(index, delta) {
    const order = questions.map((q) => q.id);
    const [item] = order.splice(index, 1);
    order.splice(index + delta, 0, item);
    try {
      await api(`/admin/tests/${test.id}/question-order`, { method: 'PUT', body: { questionOrder: order } });
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function remove() {
    try {
      await api(`/admin/tests/${test.id}/questions/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      {locked && <Alert tone="info">Questions are locked because this test has started.</Alert>}
      {error && <Alert onClose={() => setError(null)}>{error}</Alert>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {questions.length} question(s) · {test.totalMarks} marks
        </p>
        {!locked && <ButtonLink to={`/admin/tests/${test.id}/questions/new`}>+ Add question</ButtonLink>}
      </div>

      {questions.length === 0 ? (
        <EmptyState title="No questions yet" description="Add questions one by one or import them in bulk below." />
      ) : (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr>
              <Th className="w-10">#</Th>
              <Th>Question</Th>
              <Th>Type</Th>
              <Th className="text-right">Marks</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {questions.map((q, i) => (
              <tr key={q.id}>
                <Td className="font-mono text-slate-500">{i + 1}</Td>
                <Td className="max-w-xl">
                  <div className="line-clamp-3">
                    <Markdown className="!text-sm">{q.statement}</Markdown>
                  </div>
                </Td>
                <Td>
                  <Badge tone="indigo">{TYPE_LABELS[q.type]}</Badge>
                  {q.type === 'debug' && <span className="ml-1 text-xs text-slate-500">({q.grading})</span>}
                </Td>
                <Td className="text-right tabular-nums">
                  {q.marks}
                  {q.negativeMarks > 0 && <span className="text-rose-600"> / −{q.negativeMarks}</span>}
                </Td>
                <Td className="text-right whitespace-nowrap">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={locked || i === 0}
                    onClick={() => move(i, -1)}
                    aria-label="Move up"
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={locked || i === questions.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/admin/tests/${test.id}/questions/${q.id}`)}
                  >
                    {locked ? 'View' : 'Edit'}
                  </Button>
                  {!locked && (
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setDeleting(q)}>
                      Delete
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {!locked && (
        <Card className="p-4">
          <h3 className="mb-1 font-semibold text-slate-800">Bulk import</h3>
          <ImportPanel
            endpoint={`/admin/tests/${test.id}/questions/import`}
            accept=".json,.csv,.xlsx"
            onImported={refresh}
            help={
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span>JSON supports all four types; .xlsx/.csv support MCQ and fill-in-the-blank.</span>
                <DownloadButton path="/admin/templates/questions.json">JSON template</DownloadButton>
                <DownloadButton path="/admin/templates/questions.xlsx">Excel template</DownloadButton>
              </div>
            }
            renderPreview={(p) =>
              p.preview.length > 0 && (
                <ol className="max-h-72 list-decimal space-y-1 overflow-auto rounded-lg bg-white p-3 pl-8 text-sm">
                  {p.preview.map((row) => (
                    <li key={row.row}>
                      <Badge tone="indigo" className="mr-2">
                        {TYPE_LABELS[row.question.type]}
                      </Badge>
                      <span className="text-slate-700">{row.question.statement.slice(0, 120)}</span>
                      <span className="ml-1 text-slate-400">({row.question.marks} marks)</span>
                    </li>
                  ))}
                </ol>
              )
            }
          />
        </Card>
      )}

      <Modal
        open={Boolean(deleting)}
        title="Delete question?"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">This cannot be undone.</p>
      </Modal>
    </div>
  );
}

export function TestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('questions');
  const [pending, setPending] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);

  const test = useQuery({
    queryKey: ['admin', 'test', id],
    queryFn: () => api(`/admin/tests/${id}`).then((r) => r.test),
  });
  const questions = useQuery({
    queryKey: ['admin', 'test', id, 'questions'],
    queryFn: () => api(`/admin/tests/${id}/questions`).then((r) => r.questions),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'test', id] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'tests'] });
  };

  async function runAction(action) {
    setBusy(true);
    setActionError(null);
    try {
      if (action === 'delete') {
        await api(`/admin/tests/${id}`, { method: 'DELETE' });
        queryClient.invalidateQueries({ queryKey: ['admin', 'tests'] });
        navigate('/admin/tests');
        return;
      }
      await api(`/admin/tests/${id}/${action}`, { method: 'POST' });
      setPending(null);
      refresh();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (test.isPending) return <FullPageSpinner />;
  if (test.error) return <Alert>{errorMessage(test.error)}</Alert>;
  const t = test.data;

  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <TestStatusBadge status={t.status} />
            <span>
              {t.durationMinutes} min · {t.questionCount} questions · {t.totalMarks} marks · {t.attempts.started}{' '}
              started, {t.attempts.submitted} submitted
            </span>
          </span>
        }
        actions={
          <>
            {t.status !== 'ended' && <RetakeToggle test={t} onChanged={refresh} onError={setActionError} />}
            {(t.status === 'live' || t.status === 'ended') && (
              <ButtonLink to={`/admin/tests/${id}/live`} variant="secondary">
                Live dashboard
              </ButtonLink>
            )}
            {t.attempts.started > 0 && (
              <ButtonLink to={`/admin/tests/${id}/analytics`} variant="secondary">
                Analytics & export
              </ButtonLink>
            )}
            {availableActions(t.status).map((a) => (
              <Button
                key={a}
                variant={a === 'end' ? 'danger' : a === 'unpublish' ? 'secondary' : 'primary'}
                onClick={() => setPending(a)}
              >
                {ACTIONS[a].label}
              </Button>
            ))}
          </>
        }
      >
        <Link to="/admin/tests" className="mb-1 inline-block text-sm text-slate-500 hover:text-slate-700">
          ← All tests
        </Link>
      </PageHeader>

      {actionError && (
        <Alert className="mb-4" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {['questions', 'settings'].map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={cx(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize',
              tab === name
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            {name}
          </button>
        ))}
      </div>

      {tab === 'questions' &&
        (questions.isPending ? (
          <FullPageSpinner />
        ) : (
          <QuestionsPanel test={t} questions={questions.data ?? []} refresh={refresh} />
        ))}
      {tab === 'settings' && (
        <Card className="p-5">
          <TestSettingsForm key={t.updatedAt} test={t} onSaved={refresh} />
          {t.attempts.started === 0 && (
            <div className="mt-8 border-t border-slate-200 pt-4">
              <Button variant="danger" size="sm" onClick={() => setPending('delete')}>
                Delete test
              </Button>
            </div>
          )}
        </Card>
      )}

      <Modal
        open={Boolean(pending)}
        title={pending === 'delete' ? 'Delete this test?' : `${ACTIONS[pending]?.label}?`}
        onClose={() => setPending(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant={pending === 'end' || pending === 'delete' ? 'danger' : 'primary'}
              loading={busy}
              onClick={() => runAction(pending)}
            >
              {pending === 'delete' ? 'Delete' : ACTIONS[pending]?.label}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          {pending === 'delete'
            ? 'The test and all its questions will be deleted permanently.'
            : ACTIONS[pending]?.confirm}
        </p>
      </Modal>
    </>
  );
}

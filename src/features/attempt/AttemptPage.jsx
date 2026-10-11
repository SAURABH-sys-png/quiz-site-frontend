import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Countdown } from '../../components/Countdown.jsx';
import { Alert, Badge, Button, ButtonLink, Card, cx, FullPageSpinner, Modal } from '../../components/ui.jsx';
import { api, errorMessage } from '../../lib/api.js';
import { createAutosaver } from '../../lib/autosave.js';
import { useSocketEvent, useTestSubscription } from '../../lib/socket.js';
import { clockOffset } from '../../lib/time.js';
import { isAnswered } from './answers.js';
import { QuestionView } from './QuestionView.jsx';

async function startAttempt(testId) {
  const sentAt = Date.now();
  const data = await api(`/tests/${testId}/start`, { method: 'POST' });
  return { ...data, clockOffsetMs: clockOffset(data.serverNow, sentAt, Date.now()) };
}

export function AttemptPage() {
  const { id: testId } = useParams();
  const start = useQuery({
    queryKey: ['attempt', testId],
    queryFn: () => startAttempt(testId),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });

  if (start.isPending) return <FullPageSpinner label="Loading your test…" />;
  if (start.error) {
    const code = start.error.code;
    return (
      <Card className="mx-auto max-w-lg space-y-4 p-6 text-center">
        <p className="text-lg font-semibold text-slate-900">
          {code === 'NO_ATTEMPTS_LEFT' ? 'Already submitted' : 'Cannot open this test'}
        </p>
        <p className="text-sm text-slate-600">{errorMessage(start.error)}</p>
        <div className="flex justify-center gap-2">
          <ButtonLink to="/" variant="secondary">
            Back to tests
          </ButtonLink>
          {code === 'NO_ATTEMPTS_LEFT' && <ButtonLink to={`/test/${testId}/result`}>View result</ButtonLink>}
        </div>
      </Card>
    );
  }
  const { attempt } = start.data;
  return <AttemptRunner key={`${attempt.id}:${attempt.attemptNumber}`} testId={testId} data={start.data} />;
}

function paletteTone(state) {
  if (state === 'current') return 'bg-indigo-600 text-white ring-2 ring-indigo-300';
  if (state === 'error') return 'bg-rose-100 text-rose-800 ring-1 ring-rose-300';
  if (state === 'answered') return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300';
  return 'bg-white text-slate-600 ring-1 ring-slate-300';
}

function AttemptRunner({ testId, data }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { test, attempt, questions } = data;
  const immediate = test.settings.feedbackMode === 'immediate';

  const [responses, setResponses] = useState(() =>
    Object.fromEntries(data.answers.map((a) => [a.questionId, a.response])),
  );
  const [saveState, setSaveState] = useState({});
  const [feedback, setFeedback] = useState(() =>
    immediate ? Object.fromEntries(data.answers.filter((a) => a.answered).map((a) => [a.questionId, a])) : {},
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(attempt.score);
  const [rank, setRank] = useState(null);
  const [board, setBoard] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [offline, setOffline] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const responsesRef = useRef(responses);
  const timeSpentRef = useRef(Object.fromEntries(data.answers.map((a) => [a.questionId, a.timeSpentMs ?? 0])));
  const viewingRef = useRef({ questionId: null, since: 0 });
  const submittingRef = useRef(false);
  const current = questions[index];

  // Time spent per question (analytics only; the server enforces the real time limit).
  useEffect(() => {
    const spent = timeSpentRef.current;
    const viewing = { questionId: current?.id, since: Date.now() };
    viewingRef.current = viewing;
    return () => {
      if (viewing.questionId)
        spent[viewing.questionId] = (spent[viewing.questionId] ?? 0) + (Date.now() - viewing.since);
    };
  }, [current?.id]);

  const goToResult = useRef(() => {});
  useEffect(() => {
    goToResult.current = () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      navigate(`/test/${testId}/result`, { replace: true, state: { attemptId: attempt.id } });
    };
  });

  const [saver] = useState(() =>
    createAutosaver({
      async save(questionId) {
        const viewing = viewingRef.current;
        const extra = viewing.questionId === questionId ? Date.now() - viewing.since : 0;
        const result = await api(`/attempts/${attempt.id}/answers/${questionId}`, {
          method: 'PUT',
          body: {
            response: responsesRef.current[questionId] ?? null,
            timeSpentMs: Math.round((timeSpentRef.current[questionId] ?? 0) + extra),
          },
        });
        if (result.score !== undefined) setScore(result.score);
        if (result.isCorrect !== undefined && result.answered) {
          setFeedback((f) => ({ ...f, [questionId]: result }));
        }
        return result;
      },
      onStatus(questionId, status, detail) {
        setSaveState((s) => ({
          ...s,
          [questionId]: { status, error: status === 'error' ? errorMessage(detail) : null },
        }));
        if (status === 'saved') setOffline(false);
        if (status === 'error' && detail?.status === 0) setOffline(true);
      },
      onFatal() {
        goToResult.current();
      },
    }),
  );
  // Leaving the page (or React's dev double-mount) must never drop answers: save whatever is pending.
  useEffect(
    () => () => {
      saver.flush();
    },
    [saver],
  );

  // Warn before leaving with unsaved answers.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (saver.hasUnsaved()) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saver]);

  const live = test.settings.liveScoreVisible || test.settings.leaderboardVisible;
  useTestSubscription(testId, { enabled: live });
  useSocketEvent('score:update', (e) => {
    if (e.testId !== testId) return;
    setScore(e.score);
    setRank(e.rank);
  });
  useSocketEvent('leaderboard:update', (e) => e.testId === testId && setBoard(e.entries));
  useSocketEvent('test:status', (e) => {
    if (e.testId !== testId) return;
    if (e.status === 'ended') submit({ auto: true });
    // The admin restarted or deleted the test: this attempt no longer exists.
    if (e.status === 'draft' || e.status === 'deleted') {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      navigate('/', { replace: true });
    }
  });

  function updateResponse(question, response) {
    responsesRef.current = { ...responsesRef.current, [question.id]: response };
    setResponses(responsesRef.current);
    if (!immediate) saver.schedule(question.id, question.type === 'debug' ? 1500 : 800);
  }

  async function submit({ auto = false } = {}) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    await saver.flush();
    try {
      const result = await api(`/attempts/${attempt.id}/submit`, { method: 'POST' });
      queryClient.setQueryData(['result', attempt.id], result);
      goToResult.current();
    } catch (err) {
      if (auto && err.status === 0) {
        // Offline at the deadline: the server auto-submits anyway; keep retrying quietly.
        setTimeout(() => {
          submittingRef.current = false;
          submit({ auto: true });
        }, 3000);
        return;
      }
      submittingRef.current = false;
      setSubmitting(false);
      setSubmitError(errorMessage(err));
    }
  }

  const stateOf = (q, i) => {
    if (i === index) return 'current';
    if (saveState[q.id]?.status === 'error') return 'error';
    return isAnswered(q, responses[q.id]) ? 'answered' : 'unanswered';
  };
  const answeredCount = questions.filter((q) => isAnswered(q, responses[q.id])).length;
  const currentSave = saveState[current.id];
  const currentFeedback = feedback[current.id];
  const locked = immediate && Boolean(currentFeedback);

  const palette = (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5">
      {questions.map((q, i) => (
        <button
          key={q.id}
          type="button"
          onClick={() => {
            setIndex(i);
            setPaletteOpen(false);
          }}
          className={cx('h-9 rounded-lg text-sm font-semibold tabular-nums transition', paletteTone(stateOf(q, i)))}
          aria-label={`Question ${i + 1}`}
          aria-current={i === index ? 'step' : undefined}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );

  return (
    <div className="pb-24 lg:pb-0">
      {/* Sticky header: title, timer, live score, submit */}
      <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{test.title}</p>
            <p className="text-xs text-slate-500">
              {answeredCount}/{questions.length} answered
              {score != null && (
                <>
                  {' · '}
                  <span className="font-medium text-indigo-700">
                    Score {score}
                    {rank != null && ` · Rank #${rank}`}
                  </span>
                </>
              )}
            </p>
          </div>
          <Countdown
            expiresAt={attempt.expiresAt}
            offsetMs={data.clockOffsetMs}
            onExpire={() => submit({ auto: true })}
          />
          {/* Phones use the bottom bar's Submit instead. */}
          <div className="hidden sm:block">
            <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={submitting}>
              Submit
            </Button>
          </div>
        </div>
      </div>

      {offline && (
        <Alert tone="warning" className="mb-4">
          You appear to be offline. Your answers are kept on this device and will be saved when the connection returns.
        </Alert>
      )}
      {submitError && (
        <Alert className="mb-4" onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <Card className="min-w-0 p-4 sm:p-6">
          <QuestionView
            question={current}
            number={index + 1}
            total={questions.length}
            response={responses[current.id]}
            onChange={(r) => updateResponse(current, r)}
            disabled={locked || submitting}
            attemptId={attempt.id}
            aside={<SaveIndicator state={currentSave} />}
          />

          {immediate && (
            <div className="mt-4">
              {currentFeedback ? (
                <Alert
                  tone={currentFeedback.isCorrect ? 'success' : currentFeedback.status === 'pending' ? 'info' : 'error'}
                >
                  {currentFeedback.status === 'pending'
                    ? 'Saved. Code answers are graded after you submit.'
                    : currentFeedback.isCorrect
                      ? `Correct! +${currentFeedback.marksAwarded}`
                      : `Not correct (${currentFeedback.marksAwarded} marks). The answer is locked.`}
                </Alert>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => saver.saveNow(current.id)}
                  disabled={!isAnswered(current, responses[current.id])}
                  loading={currentSave?.status === 'saving'}
                >
                  Check answer
                </Button>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
              ← Previous
            </Button>
            {index < questions.length - 1 ? (
              <Button variant="secondary" onClick={() => setIndex((i) => i + 1)}>
                Next →
              </Button>
            ) : (
              <Button onClick={() => setConfirmOpen(true)}>Finish</Button>
            )}
          </div>
        </Card>

        <aside className="hidden space-y-4 lg:block">
          <Card className="p-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">Questions</p>
            {palette}
            <Legend />
          </Card>
          {board && <Leaderboard entries={board} />}
        </aside>
      </div>

      {board && (
        <div className="mt-4 lg:hidden">
          <Leaderboard entries={board} />
        </div>
      )}

      {/* Mobile bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 py-2.5 lg:hidden">
        <div className="mx-auto flex max-w-5xl gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setPaletteOpen(true)}>
            Q {index + 1}/{questions.length}
          </Button>
          <Button className="flex-1" onClick={() => setConfirmOpen(true)} disabled={submitting}>
            Submit
          </Button>
        </div>
      </div>

      <Modal open={paletteOpen} title="Jump to question" onClose={() => setPaletteOpen(false)}>
        {palette}
        <Legend />
      </Modal>

      <Modal
        open={confirmOpen}
        title="Submit your test?"
        onClose={() => !submitting && setConfirmOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Keep working
            </Button>
            <Button onClick={() => submit()} loading={submitting}>
              Submit now
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
          {answeredCount < questions.length && ' Unanswered questions score zero.'} You cannot change your answers after
          submitting.
        </p>
      </Modal>
    </div>
  );
}

function SaveIndicator({ state }) {
  if (!state) return null;
  if (state.status === 'saving' || state.status === 'dirty') return <Badge tone="slate">Saving…</Badge>;
  if (state.status === 'saved') return <Badge tone="green">Saved</Badge>;
  return (
    <Badge tone="red" className="max-w-full">
      <span className="truncate">Not saved{state.error ? `: ${state.error}` : ''}</span>
    </Badge>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded bg-emerald-200" /> Answered
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded ring-1 ring-slate-300" /> Not answered
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded bg-rose-200" /> Not saved
      </span>
    </div>
  );
}

function Leaderboard({ entries }) {
  return (
    <Card className="p-4">
      <p className="mb-2 text-sm font-semibold text-slate-700">Leaderboard</p>
      <ol className="space-y-1 text-sm">
        {entries.slice(0, 10).map((e, i) => (
          <li key={`${e.rank}-${i}`} className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate">
              <span className="mr-1.5 font-mono text-xs text-slate-500">#{e.rank}</span>
              {e.displayName}
            </span>
            <span className="font-semibold tabular-nums">{e.score}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

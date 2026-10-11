import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router';
import { CodeBlock } from '../../components/CodeBlock.jsx';
import { Markdown, markBlanks } from '../../components/Markdown.jsx';
import { Alert, Badge, Button, ButtonLink, Card, cx, FullPageSpinner } from '../../components/ui.jsx';
import { api, errorMessage } from '../../lib/api.js';
import { formatDateTime, formatDuration } from '../../lib/time.js';
import { TYPE_LABELS } from '../attempt/answers.js';

function verdictBadge(feedback) {
  if (!feedback.answered) return <Badge>Not answered</Badge>;
  if (feedback.status === 'pending') return <Badge tone="sky">Being graded</Badge>;
  if (feedback.isCorrect) return <Badge tone="green">✓ Correct</Badge>;
  if (feedback.marksAwarded > 0) return <Badge tone="amber">Partly correct</Badge>;
  return <Badge tone="red">✗ Wrong</Badge>;
}

function OptionsReview({ options, selected, correct }) {
  return (
    <ul className="space-y-1.5">
      {options.map((o, i) => {
        const isSelected = selected.includes(o.id);
        const isCorrect = correct.includes(o.id);
        return (
          <li
            key={o.id}
            className={cx(
              'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
              isCorrect
                ? 'border-emerald-300 bg-emerald-50'
                : isSelected
                  ? 'border-rose-300 bg-rose-50'
                  : 'border-slate-200',
            )}
          >
            <span className="font-mono text-xs font-semibold text-slate-500">{String.fromCharCode(65 + i)}.</span>
            <Markdown className="min-w-0 flex-1 !text-sm">{o.text}</Markdown>
            <span className="shrink-0 text-xs font-medium">
              {isSelected && <span className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>Your answer </span>}
              {isCorrect && <span className="text-emerald-700">✓ Correct</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Labeled({ label, children }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
      {children}
    </div>
  );
}

function AnswerReview({ question, feedback }) {
  const response = feedback.response ?? {};
  const correct = feedback.correctAnswer ?? {};

  switch (question.type) {
    case 'mcq':
      return (
        <OptionsReview
          options={question.options}
          selected={response.selected ?? []}
          correct={correct.correctOptionIds ?? []}
        />
      );
    case 'fill_blank':
      return (
        <div className="space-y-2">
          {correct.blanks?.map((blank, i) => (
            <div
              key={blank.id}
              className="grid gap-1 rounded-lg border border-slate-200 p-2.5 text-sm sm:grid-cols-[6rem_1fr_1fr]"
            >
              <span className="font-medium text-slate-600">Blank {i + 1}</span>
              <span>
                <span className="text-slate-500">You: </span>
                <span className="font-mono">{response.values?.[blank.id] || '—'}</span>
              </span>
              <span>
                <span className="text-slate-500">Accepted: </span>
                <span className="font-mono text-emerald-700">{blank.acceptedAnswers.join(' / ')}</span>
              </span>
            </div>
          ))}
        </div>
      );
    case 'debug':
      return (
        <div className="space-y-3">
          <Labeled label={question.grading === 'run' ? 'Your code' : 'Your fix'}>
            {response.code || response.answer ? (
              <CodeBlock code={response.code ?? response.answer} language={question.language} />
            ) : (
              <p className="text-sm text-slate-500">—</p>
            )}
          </Labeled>
          {feedback.totalCases != null && (
            <p className="text-sm text-slate-600">
              Passed {feedback.passedCases} of {feedback.totalCases} test cases.
            </p>
          )}
          <Labeled label={question.grading === 'run' ? 'Reference solution' : 'Accepted fixes'}>
            {question.grading === 'run' ? (
              <CodeBlock code={correct.fixedCode ?? ''} language={question.language} />
            ) : (
              correct.acceptedFixes?.map((fix, i) => <CodeBlock key={i} code={fix} language={question.language} />)
            )}
          </Labeled>
        </div>
      );
    case 'snippet':
      if (question.answerMode === 'mcq') {
        return (
          <OptionsReview
            options={question.options}
            selected={response.answer ? [response.answer] : []}
            correct={correct.correctOptionIds ?? []}
          />
        );
      }
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Labeled label="Your answer">
            <pre className="overflow-x-auto rounded-lg bg-slate-100 p-2.5 font-mono text-sm whitespace-pre">
              {response.answer || '—'}
            </pre>
          </Labeled>
          <Labeled label="Expected output">
            <pre className="overflow-x-auto rounded-lg bg-emerald-50 p-2.5 font-mono text-sm whitespace-pre text-emerald-900">
              {correct.expectedOutput}
            </pre>
          </Labeled>
        </div>
      );
    default:
      return null;
  }
}

function QuestionReview({ item, number }) {
  const { question, feedback } = item;
  const statement =
    question.type === 'fill_blank'
      ? markBlanks(
          question.statement,
          question.blanks.map((b) => b.id),
        )
      : question.statement;
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Question {number}</span>
          <Badge tone="indigo">{TYPE_LABELS[question.type]}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {verdictBadge(feedback)}
          {feedback.marksAwarded != null && (
            <span className="text-sm font-semibold tabular-nums text-slate-700">
              {feedback.marksAwarded} / {question.marks}
            </span>
          )}
        </div>
      </div>
      <Markdown>{statement}</Markdown>
      {(question.type === 'snippet' || (question.type === 'debug' && question.grading === 'answer')) && (
        <CodeBlock code={question.code} language={question.language} />
      )}
      <AnswerReview question={question} feedback={feedback} />
      {feedback.explanation && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
          <p className="mb-1 text-xs font-semibold tracking-wide text-sky-800 uppercase">Explanation</p>
          <Markdown className="!text-sm">{feedback.explanation}</Markdown>
        </div>
      )}
    </Card>
  );
}

export function ResultPage() {
  const { id: testId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const tests = useQuery({ queryKey: ['tests'], queryFn: () => api('/tests'), enabled: !location.state?.attemptId });
  const attemptId = location.state?.attemptId ?? tests.data?.tests.find((t) => t.id === testId)?.myAttempt?.id;

  const result = useQuery({
    queryKey: ['result', attemptId],
    queryFn: () => api(`/attempts/${attemptId}/result`),
    enabled: Boolean(attemptId),
    refetchInterval: (query) => (query.state.data?.attempt.pendingCount > 0 ? 5000 : false),
  });

  if (tests.isPending && !location.state?.attemptId) return <FullPageSpinner />;
  if (!attemptId) {
    return (
      <Card className="mx-auto max-w-lg p-6 text-center">
        <p className="font-medium text-slate-800">No attempt found for this test.</p>
        <ButtonLink to="/" variant="secondary" className="mt-4">
          Back to tests
        </ButtonLink>
      </Card>
    );
  }
  if (result.isPending) return <FullPageSpinner label="Loading your result…" />;
  if (result.error) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Alert>{errorMessage(result.error)}</Alert>
        {result.error.code === 'ATTEMPT_IN_PROGRESS' && (
          <ButtonLink to={`/test/${testId}`}>Return to the test</ButtonLink>
        )}
      </div>
    );
  }

  const { test, attempt, feedbackAvailable, questions, canRetake } = result.data;
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-5 text-white sm:px-6">
          <p className="text-sm text-indigo-100">
            {attempt.status === 'auto_submitted' ? 'Time up: submitted automatically' : 'Submitted'}
          </p>
          <h1 className="mt-1 text-xl font-semibold sm:text-2xl">{test.title}</h1>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
          <div className="px-2 py-4">
            <p className="text-xs text-slate-500 uppercase">Score</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {attempt.score != null ? (
                <>
                  {attempt.score}
                  <span className="text-sm font-normal text-slate-500"> / {test.totalMarks}</span>
                </>
              ) : (
                '—'
              )}
            </p>
          </div>
          <div className="px-2 py-4">
            <p className="text-xs text-slate-500 uppercase">Rank</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{attempt.rank != null ? `#${attempt.rank}` : '—'}</p>
          </div>
          <div className="px-2 py-4">
            <p className="text-xs text-slate-500 uppercase">Time</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatDuration(attempt.timeTakenMs)}</p>
          </div>
        </div>
      </Card>

      {attempt.pendingCount > 0 && (
        <Alert tone="info">Your code answers are still being graded. This page updates automatically.</Alert>
      )}
      {!feedbackAvailable && (
        <Alert tone="info" title="Feedback is not available yet">
          Correct answers will be shown after the test ends{test.endsAt ? ` (${formatDateTime(test.endsAt)})` : ''}.
        </Alert>
      )}

      {questions.map((item, i) => (
        <QuestionReview key={item.question.id} item={item} number={i + 1} />
      ))}

      <div className="flex flex-wrap gap-2">
        <ButtonLink to="/" variant="secondary">
          Back to tests
        </ButtonLink>
        {canRetake && <Button onClick={() => navigate(`/test/${testId}`)}>Retake test</Button>}
      </div>
    </div>
  );
}

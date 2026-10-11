import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { CodeBlock } from '../../../components/CodeBlock.jsx';
import { Markdown } from '../../../components/Markdown.jsx';
import {
  Alert,
  Badge,
  cx,
  FullPageSpinner,
  Modal,
  PageHeader,
  Select,
  Stat,
  TableWrap,
  Td,
  Th,
} from '../../../components/ui.jsx';
import { api, errorMessage } from '../../../lib/api.js';
import { formatDuration } from '../../../lib/time.js';
import { TYPE_LABELS } from '../../attempt/answers.js';
import { DownloadButton } from '../common.jsx';

const STATUS = { in_progress: 'In progress', submitted: 'Submitted', auto_submitted: 'Auto-submitted' };

function resultBadge(answer) {
  if (!answer?.answered) return <Badge>Unanswered</Badge>;
  if (answer.status === 'pending') return <Badge tone="sky">Pending</Badge>;
  if (answer.isCorrect) return <Badge tone="green">Correct</Badge>;
  return answer.marksAwarded > 0 ? <Badge tone="amber">Partial</Badge> : <Badge tone="red">Wrong</Badge>;
}

function ResponseView({ question, response }) {
  if (!response) return <span className="text-slate-400">—</span>;
  switch (question.type) {
    case 'mcq':
      return (
        <span>
          {(response.selected ?? [])
            .map((id) => `${id}) ${question.options.find((o) => o.id === id)?.text ?? ''}`)
            .join('; ') || '—'}
        </span>
      );
    case 'fill_blank':
      return (
        <span className="font-mono">
          {Object.entries(response.values ?? {})
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ') || '—'}
        </span>
      );
    case 'debug':
      return <CodeBlock code={response.code ?? response.answer ?? ''} language={question.language} />;
    case 'snippet':
      return question.answerMode === 'mcq' ? (
        <span>{response.answer || '—'}</span>
      ) : (
        <pre className="font-mono whitespace-pre-wrap">{response.answer || '—'}</pre>
      );
    default:
      return null;
  }
}

function AttemptDetailModal({ testId, attemptId, onClose }) {
  const detail = useQuery({
    queryKey: ['admin', 'attempt', attemptId],
    queryFn: () => api(`/admin/tests/${testId}/attempts/${attemptId}`),
  });
  const d = detail.data;
  return (
    <Modal
      open
      title={d?.participant ? `${d.participant.name} (${d.participant.urn})` : 'Attempt'}
      onClose={onClose}
      size="lg"
    >
      {detail.isPending ? (
        <FullPageSpinner />
      ) : detail.error ? (
        <Alert>{errorMessage(detail.error)}</Alert>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Mobile <span className="font-mono">{d.participant?.mobile}</span> · Section {d.participant?.section || '—'}{' '}
            · Score <strong>{d.attempt.score}</strong> · {STATUS[d.attempt.status]} ·{' '}
            {formatDuration(d.attempt.timeTakenMs)}
          </p>
          {d.items.map((item) => (
            <div key={item.question.id} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  Q{item.number} · {TYPE_LABELS[item.question.type]}
                </span>
                <span className="flex items-center gap-2">
                  {resultBadge(item.answer)}
                  <span className="text-sm tabular-nums">
                    {item.answer?.status === 'graded' ? item.answer.marksAwarded : '—'} / {item.question.marks}
                  </span>
                </span>
              </div>
              <div className="line-clamp-3 text-sm">
                <Markdown className="!text-sm">{item.question.statement}</Markdown>
              </div>
              <div className="mt-2 text-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase">Response: </span>
                <ResponseView question={item.question} response={item.answer?.response} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export function AnalyticsPage() {
  const { id } = useParams();
  const [section, setSection] = useState('');
  const [tab, setTab] = useState('participants');
  const [selected, setSelected] = useState(null);

  const analytics = useQuery({
    queryKey: ['admin', 'analytics', id, section],
    queryFn: () => api(`/admin/tests/${id}/analytics`, { query: { section } }),
    placeholderData: keepPreviousData,
  });
  const allSections = useQuery({
    queryKey: ['admin', 'analytics', id, ''],
    queryFn: () => api(`/admin/tests/${id}/analytics`),
    select: (d) => d.perSection.map((s) => s.section).filter(Boolean),
  });

  if (analytics.isPending) return <FullPageSpinner />;
  if (analytics.error) return <Alert>{errorMessage(analytics.error)}</Alert>;
  const a = analytics.data;

  return (
    <>
      <PageHeader
        title={`Analytics: ${a.test.title}`}
        subtitle="Admin-only. Participants never see these numbers."
        actions={
          <>
            <Select value={section} onChange={(e) => setSection(e.target.value)} className="w-40" aria-label="Section">
              <option value="">All sections</option>
              {allSections.data?.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <DownloadButton path={`/admin/tests/${id}/export.xlsx`} query={{ section }} variant="primary" size="md">
              Export Excel
            </DownloadButton>
          </>
        }
      >
        <Link to={`/admin/tests/${id}`} className="mb-1 inline-block text-sm text-slate-500 hover:text-slate-700">
          ← Back to test
        </Link>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Participants" value={a.totals.participants} hint={`${a.totals.submitted} submitted`} />
        <Stat label="Average" value={a.totals.averageScore ?? '—'} hint={`out of ${a.test.totalMarks}`} />
        <Stat label="Highest" value={a.totals.maxScore ?? '—'} />
        <Stat label="Lowest" value={a.totals.minScore ?? '—'} />
      </div>

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {[
          ['participants', 'Participants'],
          ['questions', 'Questions'],
          ['sections', 'Sections'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cx(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium',
              tab === key
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'participants' && (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr>
              <Th>Rank</Th>
              <Th>URN</Th>
              <Th>Name</Th>
              <Th>Mobile</Th>
              <Th>Section</Th>
              <Th className="text-right">Score</Th>
              <Th className="text-right">Correct</Th>
              <Th className="text-right">Time</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {a.participants.map((p) => (
              <tr
                key={p.attemptId}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => setSelected(p.attemptId)}
              >
                <Td className="font-semibold tabular-nums">#{p.rank}</Td>
                <Td className="font-mono text-indigo-700">{p.urn}</Td>
                <Td>{p.name}</Td>
                <Td className="font-mono">{p.mobile}</Td>
                <Td>{p.section || '—'}</Td>
                <Td className="text-right font-semibold tabular-nums">{p.score}</Td>
                <Td className="text-right tabular-nums">
                  {p.correct}/{p.answered}
                </Td>
                <Td className="text-right tabular-nums">{formatDuration(p.timeTakenMs)}</Td>
                <Td>{STATUS[p.status]}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {tab === 'questions' && (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr>
              <Th>#</Th>
              <Th>Question</Th>
              <Th className="text-right">Attempts</Th>
              <Th className="text-right">% correct</Th>
              <Th className="text-right">Avg time</Th>
              <Th>Most-chosen wrong option</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {a.perQuestion.map((q) => (
              <tr key={q.questionId}>
                <Td className="font-mono">{q.number}</Td>
                <Td className="max-w-md">
                  <Badge tone="indigo" className="mb-1">
                    {TYPE_LABELS[q.type]}
                  </Badge>
                  <div className="line-clamp-2">
                    <Markdown className="!text-sm">{q.statement}</Markdown>
                  </div>
                </Td>
                <Td className="text-right tabular-nums">{q.attempts}</Td>
                <Td className="text-right tabular-nums">{q.percentCorrect != null ? `${q.percentCorrect}%` : '—'}</Td>
                <Td className="text-right tabular-nums">{formatDuration(q.avgTimeMs)}</Td>
                <Td>
                  {q.mostChosenWrongOption
                    ? `${q.mostChosenWrongOption.id}) ${q.mostChosenWrongOption.text} (${q.mostChosenWrongOption.count})`
                    : '—'}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {tab === 'sections' && (
        <TableWrap>
          <thead className="bg-slate-50">
            <tr>
              <Th>Section</Th>
              <Th className="text-right">Participants</Th>
              <Th className="text-right">Submitted</Th>
              <Th className="text-right">Average</Th>
              <Th className="text-right">Max</Th>
              <Th className="text-right">Min</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {a.perSection.map((s) => (
              <tr key={s.section}>
                <Td>{s.section || '(no section)'}</Td>
                <Td className="text-right tabular-nums">{s.participants}</Td>
                <Td className="text-right tabular-nums">{s.submitted}</Td>
                <Td className="text-right tabular-nums">{s.average}</Td>
                <Td className="text-right tabular-nums">{s.max}</Td>
                <Td className="text-right tabular-nums">{s.min}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {selected && <AttemptDetailModal testId={id} attemptId={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
